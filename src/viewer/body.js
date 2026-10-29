// Loads the CC0 MakeHuman-derived body (male base + female morph) and builds
// the skin / garment material. A baked, non-morphed copy is kept in sync for
// raycasting and decal projection, so tattoos always sit on the current body.
import * as THREE from 'three';

export const SKIN_TONES = [
  { id: 'porcelain', name: 'Porcelain', hex: '#f1d3bd' },
  { id: 'ivory', name: 'Ivory', hex: '#e7bf9f' },
  { id: 'wheat', name: 'Wheat', hex: '#d7a47c' },
  { id: 'honey', name: 'Honey', hex: '#c38a5e' },
  { id: 'caramel', name: 'Caramel', hex: '#a96f45' },
  { id: 'cinnamon', name: 'Cinnamon', hex: '#8a5532' },
  { id: 'mocha', name: 'Mocha', hex: '#6b3f25' },
  { id: 'ebony', name: 'Ebony', hex: '#4a2a19' },
];

export async function loadBody(url = '/models/body.bin', metaUrl = '/models/body.json') {
  const [meta, buf] = await Promise.all([
    fetch(metaUrl).then((r) => r.json()),
    fetch(url).then((r) => r.arrayBuffer()),
  ]);
  const n = meta.vertexCount;
  let o = 0;
  const base = new Float32Array(buf, o, n * 3); o += n * 12;
  const delta = new Float32Array(buf, o, n * 3); o += n * 12;
  const bodyIdx = new Uint16Array(buf, o, meta.bodyIndexCount); o += meta.bodyIndexCount * 2;
  const eyeIdx = new Uint16Array(buf.slice(o, o + meta.eyeIndexCount * 2));

  // centre on x / z using the male body
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < meta.bodyIndexCount; i++) {
    const v = bodyIdx[i] * 3;
    minX = Math.min(minX, base[v]); maxX = Math.max(maxX, base[v]);
    minZ = Math.min(minZ, base[v + 2]); maxZ = Math.max(maxZ, base[v + 2]);
  }
  // torso depth is better centred on chest than on the forward-reaching hands
  const cx = (minX + maxX) / 2;
  const cz = 0.02;
  const pos = new Float32Array(base);
  for (let i = 0; i < n; i++) { pos[i * 3] -= cx; pos[i * 3 + 2] -= cz; }

  return new Body(pos, new Float32Array(delta), new Uint16Array(bodyIdx), eyeIdx);
}

function makeSkinDetailTexture() {
  // tileable micro-noise used as a bump map for pores; keeps close-ups from looking like plastic
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 128 + (Math.random() - 0.5) * 70;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.filter = 'blur(0.6px)';
  ctx.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class Body {
  constructor(pos, delta, bodyIdx, eyeIdx) {
    this.base = pos;
    this.delta = delta;
    this.female = 0;
    this.group = new THREE.Group();

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(bodyIdx, 1));
    g.computeVertexNormals();
    const maleN = g.attributes.normal.array.slice();
    // female normals for correct shading while morphing
    const fpos = pos.map((v, i) => v + delta[i]);
    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    gf.setIndex(new THREE.BufferAttribute(bodyIdx, 1));
    gf.computeVertexNormals();
    const dN = gf.attributes.normal.array.map((v, i) => v - maleN[i]);
    g.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)];
    g.morphAttributes.normal = [new THREE.BufferAttribute(new Float32Array(dN), 3)];
    g.morphTargetsRelative = true;
    // rest-space copy for the garment mask
    g.setAttribute('rest', new THREE.BufferAttribute(new Float32Array(pos), 3));
    this.geometry = g;

    this.uniforms = {
      uFemale: { value: 0 },
      uGarment: { value: new THREE.Color('#121614') },
      uDetail: { value: makeSkinDetailTexture() },
    };
    this.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(SKIN_TONES[3].hex),
      roughness: 0.52,
      metalness: 0,
      sheen: 0.55,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color('#ff9f80'),
      clearcoat: 0.08,
      clearcoatRoughness: 0.55,
      specularIntensity: 0.55,
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 rest;\nvarying vec3 vRest;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = rest;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vRest;
          uniform float uFemale;
          uniform vec3 uGarment;
          uniform sampler2D uDetail;
          float garmentMask(vec3 p){
            float ax = abs(p.x);
            // boxer brief: waistband to mid thigh, slight rise at the back
            float top = 0.985 + 0.012*smoothstep(0.0,-0.08,p.z);
            float leg = 0.66 + 0.035*smoothstep(0.05,0.17,ax);
            float shorts = step(p.y, top) * step(leg, p.y) * step(ax, 0.215);
            // sports top for the female body (only visible as the morph comes in)
            // front cups full, back reduced to a slim band so shoulder blades and upper back stay bare
            float front = smoothstep(-0.035, 0.02, p.z);
            float lo = mix(1.248, 1.215, front);
            float hi = mix(1.288, 1.35, front);
            float bra = step(lo, p.y) * step(p.y, hi) * step(ax, 0.185);
            return max(shorts, bra * step(0.5, uFemale));
          }`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float gm = garmentMask(vRest);
          // skin micro-variation via triplanar sampling of noise
          vec3 tp = vRest * 9.0;
          float n1 = texture2D(uDetail, tp.xy).r * 0.5 + texture2D(uDetail, tp.zy).r * 0.5;
          diffuseColor.rgb *= mix(0.985 + (n1-0.5)*0.06, 1.0, gm);
          diffuseColor.rgb = mix(diffuseColor.rgb, uGarment, gm);`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.92, gm);`
        )
        .replace(
          '#include <lights_physical_fragment>',
          `#include <lights_physical_fragment>
          #ifdef USE_SHEEN
          material.sheenColor *= (1.0 - gm);
          #endif
          #ifdef USE_CLEARCOAT
          material.clearcoat *= (1.0 - gm);
          #endif`
        );
    };
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.castShadow = true;
    this.mesh.morphTargetInfluences = [0];
    this.group.add(this.mesh);

    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    eg.setIndex(new THREE.BufferAttribute(eyeIdx, 1));
    eg.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)];
    eg.morphTargetsRelative = true;
    eg.computeVertexNormals();
    this.eyes = new THREE.Mesh(
      eg,
      new THREE.MeshPhysicalMaterial({ color: '#16110e', roughness: 0.15, clearcoat: 1 })
    );
    this.eyes.morphTargetInfluences = [0];
    this.group.add(this.eyes);

    // baked geometry for raycasting + decals
    this.baked = new THREE.BufferGeometry();
    this.baked.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    this.baked.setIndex(new THREE.BufferAttribute(bodyIdx, 1));
    this.baked.computeVertexNormals();
    this.bakedMesh = new THREE.Mesh(this.baked, new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(this.bakedMesh);
    this.bake();
  }

  setFemale(v) {
    this.female = v;
    this.mesh.morphTargetInfluences[0] = v;
    this.eyes.morphTargetInfluences[0] = v;
    this.uniforms.uFemale.value = v;
  }

  bake() {
    const p = this.baked.attributes.position.array;
    const f = this.female;
    for (let i = 0; i < p.length; i++) p[i] = this.base[i] + this.delta[i] * f;
    this.baked.attributes.position.needsUpdate = true;
    this.baked.computeVertexNormals();
    this.baked.computeBoundingBox();
    this.baked.computeBoundingSphere();
  }

  setSkin(hex) {
    this.material.color.set(hex);
    // darker skin carries less visible red sheen
    const c = new THREE.Color(hex);
    const l = c.getHSL({}).l;
    this.material.sheenColor.set(l > 0.5 ? '#ff9f80' : '#c9704f');
    this.material.sheen = 0.35 + l * 0.35;
  }

  height() {
    return this.baked.boundingBox.max.y;
  }

  // position + normal at a surface point described by triangle + barycentrics
  surfacePoint(face, bary, outP = new THREE.Vector3(), outN = new THREE.Vector3()) {
    const idx = this.baked.index.array;
    const p = this.baked.attributes.position;
    const nrm = this.baked.attributes.normal;
    const a = idx[face * 3], b = idx[face * 3 + 1], c = idx[face * 3 + 2];
    const tmp = new THREE.Vector3();
    outP.set(0, 0, 0); outN.set(0, 0, 0);
    [[a, bary.x], [b, bary.y], [c, bary.z]].forEach(([i, w]) => {
      outP.addScaledVector(tmp.fromBufferAttribute(p, i), w);
      outN.addScaledVector(tmp.fromBufferAttribute(nrm, i), w);
    });
    outN.normalize();
    return { point: outP, normal: outN };
  }

  // nearest face to a point (used to turn zone landmarks into face anchors)
  nearestFace(point, facing) {
    const idx = this.baked.index.array;
    const p = this.baked.attributes.position;
    const nrm = this.baked.attributes.normal;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
    let best = -1, bd = Infinity;
    for (let f = 0; f < idx.length / 3; f++) {
      A.fromBufferAttribute(p, idx[f * 3]);
      B.fromBufferAttribute(p, idx[f * 3 + 1]);
      C.fromBufferAttribute(p, idx[f * 3 + 2]);
      A.add(B).add(C).multiplyScalar(1 / 3);
      const d = A.distanceToSquared(point);
      if (d < bd) {
        if (facing) {
          N.fromBufferAttribute(nrm, idx[f * 3]);
          if (N.dot(facing) < 0.35) continue;
        }
        bd = d; best = f;
      }
    }
    return best;
  }
}

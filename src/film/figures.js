// The two posed figures for the studio film (CC0 MakeHuman base, posed offline by
// tools/build_poses.py), dressed with a region shader keyed to rest-pose coordinates.
import * as THREE from 'three';

const GARMENTS = /* glsl */ `
  varying vec3 vRest;
  uniform vec3 uSkin, uTop, uBottom, uShoe, uGlove, uApron;
  uniform float uGloves, uLongSleeve, uApronOn;
  // returns colour + roughness (w) of whatever is worn at this rest-pose point
  vec4 wear(vec3 p, vec3 skin) {
    float ax = abs(p.x);
    float isHand = step(0.505, ax) * step(p.y, 1.03);
    float isForearm = step(0.36, ax) * (1.0 - isHand) * step(p.y, 1.2) * step(0.9, p.y);
    float isUpperArm = step(0.17, ax) * step(1.12, p.y) * step(p.y, 1.47) * (1.0 - step(0.36, ax) * step(p.y, 1.2));
    float isHeadNeck = step(1.455, p.y) * step(ax, 0.11);
    float isFeet = step(p.y, 0.085);
    float isLegs = step(p.y, 0.965) * (1.0 - isFeet) * step(ax, 0.3);
    vec4 c = vec4(skin, 0.5);
    // top: torso always, upper arm always (tee), forearm only with long sleeves
    float top = (1.0 - isHeadNeck) * step(0.94, p.y) * (1.0 - isHand);
    top *= mix(1.0 - isForearm, 1.0, uLongSleeve);
    // short sleeves stop above the elbow
    top *= mix(step(ax, 0.31 + 0.0 * p.y) + step(p.y, 1.12) * step(ax, 0.2), 1.0, uLongSleeve);
    top = clamp(top, 0.0, 1.0);
    c = mix(c, vec4(uTop, 0.88), top);
    c = mix(c, vec4(uBottom, 0.82), isLegs);
    c = mix(c, vec4(uShoe, 0.45), isFeet);
    // nitrile gloves run a little past the wrist
    float glove = uGloves * step(0.47, ax) * step(p.y, 1.075);
    c = mix(c, vec4(uGlove, 0.22), glove);
    // leather apron over the front of torso and thighs
    float apron = uApronOn * step(0.025, p.z) * step(ax, 0.17) * step(0.5, p.y) * step(p.y, 1.32);
    c = mix(c, vec4(uApron, 0.55), apron);
    return c;
  }
`;

export function figureMaterial(opts) {
  const u = {
    uSkin: { value: new THREE.Color(opts.skin) },
    uTop: { value: new THREE.Color(opts.top) },
    uBottom: { value: new THREE.Color(opts.bottom) },
    uShoe: { value: new THREE.Color(opts.shoe) },
    uGlove: { value: new THREE.Color(opts.glove || '#0b0b0c') },
    uApron: { value: new THREE.Color(opts.apron || '#5b3a22') },
    uGloves: { value: opts.gloves ? 1 : 0 },
    uLongSleeve: { value: opts.longSleeve ? 1 : 0 },
    uApronOn: { value: opts.apronOn ? 1 : 0 },
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.55, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ff9f80'),
    clearcoat: 0.0, clearcoatRoughness: 0.3,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 rest;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = rest;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GARMENTS)
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec4 worn = wear(vRest, uSkin);\ndiffuseColor.rgb = worn.rgb;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = worn.w;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= (worn.w > 0.6 || worn.w < 0.3) ? 0.05 : 1.0;\n#endif\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = worn.w < 0.3 ? 0.8 : 0.0;\n#endif');
  };
  m.userData.uniforms = u;
  return m;
}

export async function loadFigures() {
  const [meta, buf, bmeta, bbuf] = await Promise.all([
    fetch('/models/studio.json').then((r) => r.json()),
    fetch('/models/studio.bin').then((r) => r.arrayBuffer()),
    fetch('/models/body.json').then((r) => r.json()),
    fetch('/models/body.bin').then((r) => r.arrayBuffer()),
  ]);
  const n = meta.vertexCount;
  const base = new Float32Array(bbuf, 0, n * 3);
  const idx = new Uint16Array(bbuf, n * 24, bmeta.bodyIndexCount);
  const eyeIdx = new Uint16Array(bbuf.slice(n * 24 + bmeta.bodyIndexCount * 2, n * 24 + bmeta.bodyIndexCount * 2 + bmeta.eyeIndexCount * 2));
  // rest coordinates centred exactly like the configurator body (garment masks share them)
  let minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < idx.length; i++) { const x = base[idx[i] * 3]; if (x < minX) minX = x; if (x > maxX) maxX = x; }
  const cx = (minX + maxX) / 2;
  const rest = new Float32Array(base);
  for (let i = 0; i < n; i++) { rest[i * 3] -= cx; rest[i * 3 + 2] -= 0.02; }

  const make = (offset, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, offset, n * 3), 3));
    g.setAttribute('rest', new THREE.BufferAttribute(rest, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', g.attributes.position);
    eg.setIndex(new THREE.BufferAttribute(eyeIdx, 1));
    eg.computeVertexNormals();
    const eyes = new THREE.Mesh(eg, new THREE.MeshPhysicalMaterial({ color: '#120d0a', roughness: 0.1, clearcoat: 1 }));
    const grp = new THREE.Group();
    grp.add(mesh, eyes);
    return { group: grp, mesh, geometry: g };
  };

  const client = make(0, figureMaterial({ skin: '#b98258', top: '#d8d0bf', bottom: '#1f2838', shoe: '#e6e1d8' }));
  const artist = make(n * 12, figureMaterial({ skin: '#8a5636', top: '#111214', bottom: '#151618', shoe: '#0d0d0e', gloves: true, longSleeve: true, apronOn: true }));
  client.group.add(hair(meta.client, { color: '#1a1410', len: 0.6, bun: false }));
  artist.group.add(hair(meta.artist, { color: '#0f0b09', len: 0.75, bun: true }));
  return { meta, client, artist };
}

// a simple sculpted hair cap oriented by the posed head bone
function hair(frame, { color, len, bun }) {
  const g = new THREE.Group();
  const head = new THREE.Vector3(...frame.head), top = new THREE.Vector3(...frame.top);
  const up = top.clone().sub(head).normalize();
  const R = new THREE.Matrix4().set(
    frame.rot[0][0], frame.rot[0][1], frame.rot[0][2], 0,
    frame.rot[1][0], frame.rot[1][1], frame.rot[1][2], 0,
    frame.rot[2][0], frame.rot[2][1], frame.rot[2][2], 0,
    0, 0, 0, 1,
  );
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color('#5a4636'), sheenRoughness: 0.35 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI * len), mat);
  cap.scale.set(0.087, 0.09, 0.106);
  cap.rotation.x = -0.95;
  cap.position.set(0, -0.004, -0.012); // tilt the cap back so it covers the crown and the back of the head
  const holder = new THREE.Group();
  holder.add(cap);
  if (bun) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.042, 32, 24), mat);
    b.position.set(0, 0.03, -0.1);
    holder.add(b);
  }
  // head centre sits a little above the top-of-neck joint, and slightly forward
  const centre = head.clone().lerp(top, 0.62);
  holder.position.copy(centre);
  holder.quaternion.setFromRotationMatrix(R);
  holder.position.addScaledVector(up, 0.005);
  g.add(holder);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

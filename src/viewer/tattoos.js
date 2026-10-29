// Tattoo layers: each one is a decal projected onto the current (baked) body.
// Anchors are stored as triangle + barycentric coordinates so a tattoo stays on
// the same patch of skin when the body morphs between woman and man.
import * as THREE from 'three';

const PLANES = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
].map((p) => new THREE.Vector3(...p));

export const INKS = [
  { id: 'black', name: 'Black', hex: '#15110f' },
  { id: 'grey', name: 'Grey wash', hex: '#2a2a2c', wash: true },
  { id: 'sepia', name: 'Sepia', hex: '#43281a' },
  { id: 'sindoor', name: 'Red', hex: '#9c1f1a' },
  { id: 'indigo', name: 'Indigo', hex: '#1d2a52' },
  { id: 'white', name: 'White', hex: '#f4efe6' },
  { id: 'original', name: 'Original colours', hex: null },
];

// Build decal geometry with back-face rejection so a design never bleeds through
// to the other side of a limb or onto a neighbouring body part.
export function buildDecal(geometry, matrix, size) {
  const inv = matrix.clone().invert();
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const idx = geometry.index.array;
  const center = new THREE.Vector3().setFromMatrixPosition(matrix);
  const axisZ = new THREE.Vector3().setFromMatrixColumn(matrix, 2).normalize();
  const radius = Math.hypot(size.x, size.y, size.z) * 0.55;
  const r2 = radius * radius;
  const out = [], outN = [], outUV = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const fn = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const half = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

  for (let f = 0; f < idx.length; f += 3) {
    const ia = idx[f], ib = idx[f + 1], ic = idx[f + 2];
    a.fromBufferAttribute(pos, ia); b.fromBufferAttribute(pos, ib); c.fromBufferAttribute(pos, ic);
    if (a.distanceToSquared(center) > r2 && b.distanceToSquared(center) > r2 && c.distanceToSquared(center) > r2) continue;
    fn.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
    if (fn.dot(axisZ) < 0.12) continue;
    // polygon in projector space: [x,y,z,nx,ny,nz]
    let poly = [ia, ib, ic].map((i) => {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(inv);
      const n = new THREE.Vector3().fromBufferAttribute(nrm, i);
      return { p, n };
    });
    for (const pl of PLANES) {
      poly = clip(poly, pl, Math.abs(pl.x) * half.x + Math.abs(pl.y) * half.y + Math.abs(pl.z) * half.z);
      if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    for (let k = 1; k < poly.length - 1; k++) {
      for (const v of [poly[0], poly[k], poly[k + 1]]) {
        outUV.push(0.5 + v.p.x / size.x, 0.5 + v.p.y / size.y);
        const w = v.p.clone().applyMatrix4(matrix).addScaledVector(v.n, 0.0007);
        out.push(w.x, w.y, w.z);
        outN.push(v.n.x, v.n.y, v.n.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
  return g;
}

function clip(poly, plane, d) {
  const res = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const da = A.p.dot(plane) - d, db = B.p.dot(plane) - d;
    if (da <= 0) res.push(A);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      res.push({ p: A.p.clone().lerp(B.p, t), n: A.n.clone().lerp(B.n, t).normalize() });
    }
  }
  return res;
}

// Orientation that keeps the design's "up" aligned with the body's long axis.
export function projectorMatrix(point, normal, rotationDeg, upHint = new THREE.Vector3(0, 1, 0)) {
  const z = normal.clone().normalize();
  let up = upHint.clone();
  if (Math.abs(up.dot(z)) > 0.92) up = new THREE.Vector3(0, 0, -1).multiplyScalar(Math.sign(z.y) || 1);
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.multiply(new THREE.Matrix4().makeRotationZ(THREE.MathUtils.degToRad(-rotationDeg)));
  m.setPosition(point);
  return m;
}

let uid = 0;
export class Tattoo {
  constructor({ design, anchor, sizeCm = 10, rotation = 0, flip = false, ink = 'black', age = 0.3, opacity = 1, zone = null, upHint }) {
    this.id = ++uid;
    this.design = design; // { canvas, aspect, name, colour, source }
    this.anchor = anchor; // { face, bary: Vector3 }
    this.sizeCm = sizeCm;
    this.rotation = rotation;
    this.flip = flip;
    this.ink = ink;
    this.age = age;
    this.opacity = opacity;
    this.zone = zone;
    this.upHint = upHint || new THREE.Vector3(0, 1, 0);
    this.texture = new THREE.CanvasTexture(document.createElement('canvas'));
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.material = new THREE.MeshPhysicalMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      roughness: 0.5,
      sheen: 0.25,
      sheenColor: new THREE.Color('#ffb59a'),
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.renderOrder = 2;
    this.selected = false;
    this.refreshTexture();
  }

  dims() {
    const long = this.sizeCm / 100;
    const a = this.design.aspect; // width / height
    return a >= 1 ? { w: long, h: long / a } : { w: long * a, h: long };
  }

  // Ink rendering: tint, ageing blur, fresh-tattoo redness, grey wash dilution.
  refreshTexture() {
    const src = this.design.canvas;
    const W = 1024;
    const H = Math.round(W / this.design.aspect);
    const c = this.texture.image;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const inkDef = INKS.find((i) => i.id === this.ink) || INKS[0];
    const age = this.age; // 0 fresh, ~0.3 healed, 1 = ten years
    const blur = Math.max(0, (age - 0.3) * 4.5);
    const fade = 1 - Math.max(0, age - 0.3) * 0.32;

    g.save();
    if (this.flip) { g.translate(W, 0); g.scale(-1, 1); }
    // fresh: swollen, pink halo under the linework
    if (age < 0.3) {
      const red = (0.3 - age) / 0.3;
      g.filter = `blur(${10 * red + 4}px)`;
      g.globalAlpha = 0.35 * red;
      g.drawImage(tinted(src, '#c2463b'), 0, 0, W, H);
      g.filter = 'none';
    }
    g.globalAlpha = fade * (inkDef.wash ? 0.72 : 1) * this.opacity;
    g.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
    if (inkDef.hex && !(this.design.colour && this.ink === 'original')) {
      g.drawImage(tinted(src, age > 0.6 ? mix(inkDef.hex, '#1d3d43', (age - 0.6) * 0.5) : inkDef.hex), 0, 0, W, H);
    } else {
      g.drawImage(src, 0, 0, W, H);
    }
    g.restore();
    this.texture.needsUpdate = true;
  }

  rebuild(body) {
    const { point, normal } = body.surfacePoint(this.anchor.face, this.anchor.bary);
    this.point = point.clone();
    this.normal = normal.clone();
    const { w, h } = this.dims();
    const depth = Math.min(Math.max(w, h) * 0.6, 0.12);
    const m = projectorMatrix(point, normal, this.rotation, this.upHint);
    this.mesh.geometry.dispose();
    this.mesh.geometry = buildDecal(body.baked, m, new THREE.Vector3(w, h, depth));
  }
}

const tintCache = new WeakMap();
function tinted(src, hex) {
  let m = tintCache.get(src);
  if (!m) { m = new Map(); tintCache.set(src, m); }
  if (m.has(hex)) return m.get(hex);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = hex;
  g.fillRect(0, 0, c.width, c.height);
  m.set(hex, c);
  return c;
}

function mix(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t))).getHexString();
}

// Placement zones. Coordinates are on the male base body (metres, facing +z,
// the wearer's left is +x). `s` mirrors left/right. Each zone resolves to a
// triangle anchor once, so it follows the body when it morphs.
import * as THREE from 'three';

// difficulty: price/time multiplier reflecting stretch, bone, nerve density
export const ZONES = [
  // front torso
  { id: 'chest', name: 'Chest', area: 'Front', p: [0.085, 1.33, 0.12], d: [0, 0, 1], size: 10, sided: true, difficulty: 1.1 },
  { id: 'sternum', name: 'Sternum', area: 'Front', p: [0.003, 1.25, 0.1], d: [0, 0, 1], size: 14, difficulty: 1.35 },
  { id: 'collarbone', name: 'Collarbone', area: 'Front', p: [0.085, 1.435, 0.05], d: [0, 0.35, 1], size: 9, sided: true, difficulty: 1.25 },
  { id: 'stomach', name: 'Stomach', area: 'Front', p: [0.003, 1.08, 0.1], d: [0, 0, 1], size: 13, difficulty: 1.2 },
  { id: 'ribs', name: 'Ribs', area: 'Side', p: [0.13, 1.17, 0.0], d: [1, 0, -0.25], size: 13, sided: true, difficulty: 1.4, upright: true },
  { id: 'hip', name: 'Hip', area: 'Side', p: [0.16, 0.99, 0.0], d: [1, 0, 0.1], size: 10, sided: true, difficulty: 1.15 },
  // back
  { id: 'upper-back', name: 'Upper back', area: 'Back', p: [0.003, 1.36, -0.1], d: [0, 0, -1], size: 14, difficulty: 1.0 },
  { id: 'shoulder-blade', name: 'Shoulder blade', area: 'Back', p: [0.095, 1.33, -0.1], d: [0.1, 0, -1], size: 10, sided: true, difficulty: 1.05 },
  { id: 'spine', name: 'Spine', area: 'Back', p: [0.003, 1.22, -0.1], d: [0, 0, -1], size: 28, difficulty: 1.3, tall: true },
  { id: 'lower-back', name: 'Lower back', area: 'Back', p: [0.003, 1.02, -0.09], d: [0, 0, -1], size: 14, difficulty: 1.05 },
  { id: 'nape', name: 'Nape', area: 'Back', p: [0.003, 1.5, -0.045], d: [0, 0.15, -1], size: 5, difficulty: 1.2 },
  // neck & head
  { id: 'neck', name: 'Side of neck', area: 'Neck', p: [0.055, 1.52, 0.02], d: [1, 0.1, 0.1], size: 5, sided: true, difficulty: 1.3 },
  { id: 'behind-ear', name: 'Behind the ear', area: 'Neck', p: [0.07, 1.6, -0.02], d: [1, 0, -0.6], size: 3.5, sided: true, difficulty: 1.25 },
  // arms
  { id: 'shoulder', name: 'Shoulder', area: 'Arm', p: [0.235, 1.405, 0.0], d: [0.7, 0.7, 0], size: 9, sided: true, difficulty: 1.0, limb: [0.6, -0.8, 0.04] },
  { id: 'upper-arm', name: 'Upper arm', area: 'Arm', p: [0.31, 1.295, 0.0], d: [0.8, 0.6, 0], size: 11, sided: true, difficulty: 1.0, limb: [0.6, -0.8, 0.04] },
  { id: 'inner-bicep', name: 'Inner bicep', area: 'Arm', p: [0.305, 1.29, 0.03], d: [-0.2, -0.15, 1], size: 9, sided: true, difficulty: 1.2, limb: [0.6, -0.8, 0.04] },
  { id: 'forearm', name: 'Forearm', area: 'Arm', p: [0.47, 1.09, 0.13], d: [0.75, 0.62, -0.2], size: 12, sided: true, difficulty: 1.0, limb: [0.44, -0.53, 0.72] },
  { id: 'inner-forearm', name: 'Inner forearm', area: 'Arm', p: [0.465, 1.085, 0.14], d: [-0.55, -0.5, 0.2], size: 11, sided: true, difficulty: 1.1, limb: [0.44, -0.53, 0.72] },
  { id: 'wrist', name: 'Wrist', area: 'Arm', p: [0.51, 1.03, 0.205], d: [0.7, 0.7, -0.15], size: 4, sided: true, difficulty: 1.2, limb: [0.44, -0.53, 0.72] },
  { id: 'hand', name: 'Back of hand', area: 'Arm', p: [0.585, 0.969, 0.272], d: [1, 0.1, -0.1], size: 5, sided: true, difficulty: 1.35, limb: [0.05, -0.35, 0.94] },
  // legs
  { id: 'thigh', name: 'Thigh', area: 'Leg', p: [0.1, 0.6, 0.08], d: [0.15, 0, 1], size: 14, sided: true, difficulty: 1.0, limb: [0.06, -1, 0] },
  { id: 'outer-thigh', name: 'Outer thigh', area: 'Leg', p: [0.185, 0.62, 0.0], d: [1, 0, 0], size: 14, sided: true, difficulty: 0.95, limb: [0.06, -1, 0] },
  { id: 'shin', name: 'Shin', area: 'Leg', p: [0.15, 0.3, 0.02], d: [0, 0, 1], size: 12, sided: true, difficulty: 1.3, limb: [0.08, -1, 0] },
  { id: 'calf', name: 'Calf', area: 'Leg', p: [0.15, 0.34, -0.06], d: [0.2, 0, -1], size: 13, sided: true, difficulty: 1.0, limb: [0.08, -1, 0] },
  { id: 'ankle', name: 'Ankle', area: 'Leg', p: [0.205, 0.1, 0.0], d: [1, 0, 0], size: 4.5, sided: true, difficulty: 1.3, limb: [0.08, -1, 0] },
  { id: 'foot', name: 'Top of foot', area: 'Leg', p: [0.2, 0.045, 0.11], d: [0.1, 1, 0.45], size: 6, sided: true, difficulty: 1.35, limb: [0, 0.4, 1] },
];

export const AREAS = ['Front', 'Side', 'Back', 'Neck', 'Arm', 'Leg'];

export function resolveZones(body) {
  const ray = new THREE.Raycaster();
  const out = {};
  const mesh = body.bakedMesh;
  mesh.updateMatrixWorld();
  for (const z of ZONES) {
    for (const s of z.sided ? [1, -1] : [1]) {
      const p = new THREE.Vector3(z.p[0] * s, z.p[1], z.p[2]);
      const d = new THREE.Vector3(z.d[0] * s, z.d[1], z.d[2]).normalize();
      ray.set(p.clone().addScaledVector(d, 1.2), d.clone().negate());
      ray.far = 3;
      const hits = ray.intersectObject(mesh, false);
      // choose the hit closest to the landmark, not the first surface the ray meets
      let best = null, bd = Infinity;
      for (const h of hits) {
        const dist = h.point.distanceTo(p);
        if (h.face.normal.dot(d) > 0.1 && dist < bd) { bd = dist; best = h; }
      }
      if (!best) { console.warn('zone miss', z.id, s); continue; }
      const key = z.sided ? `${z.id}:${s > 0 ? 'L' : 'R'}` : z.id;
      const upHint = z.limb
        ? new THREE.Vector3(-z.limb[0] * s, -z.limb[1], -z.limb[2]).normalize()
        : new THREE.Vector3(0, 1, 0);
      out[key] = { zone: z, side: s, face: best.faceIndex, bary: baryOf(mesh.geometry, best.faceIndex, best.point), upHint };
    }
  }
  return out;
}

export function baryOf(geometry, face, point) {
  const idx = geometry.index.array;
  const pos = geometry.attributes.position;
  const a = new THREE.Vector3().fromBufferAttribute(pos, idx[face * 3]);
  const b = new THREE.Vector3().fromBufferAttribute(pos, idx[face * 3 + 1]);
  const c = new THREE.Vector3().fromBufferAttribute(pos, idx[face * 3 + 2]);
  const t = new THREE.Triangle(a, b, c);
  return t.getBarycoord(point, new THREE.Vector3());
}

// limb-aware "up" for free placement: on arms and legs designs follow the limb
export function upHintAt(point) {
  const ax = Math.abs(point.x);
  const s = Math.sign(point.x) || 1;
  if (ax > 0.42 && point.y > 0.85) return new THREE.Vector3(-0.44 * s, 0.53, -0.72).normalize(); // forearm/hand
  if (ax > 0.2 && point.y > 1.15) return new THREE.Vector3(-0.6 * s, 0.8, -0.04).normalize(); // upper arm
  if (point.y < 0.86 && ax > 0.02) return new THREE.Vector3(-0.07 * s, 1, 0).normalize(); // legs
  return new THREE.Vector3(0, 1, 0);
}

export function zoneForPoint(point, resolved, body) {
  let best = null, bd = Infinity;
  const tmp = new THREE.Vector3();
  for (const [key, r] of Object.entries(resolved)) {
    body.surfacePoint(r.face, r.bary, tmp);
    const d = tmp.distanceTo(point);
    if (d < bd) { bd = d; best = key; }
  }
  return bd < 0.18 ? best : null;
}

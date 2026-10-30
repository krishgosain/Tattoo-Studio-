// The studio set for the opening film, built procedurally so it weighs almost nothing:
// a rainy Bandra lane, the door, the room, and the station under the work lamp.
import * as THREE from 'three';
import { FLASH } from '../designs/flash.js';

const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ---------------------------------------------------------------- procedural textures
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

function concrete(base = [44, 42, 40], spread = 16) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = `rgb(${base})`;
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * spread;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // soft blotches and trowel marks
    for (let k = 0; k < 90; k++) {
      const x = rand() * w, y = rand() * h, r = 20 + rand() * 90;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const a = rand() * 0.07;
      grd.addColorStop(0, rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function windowsTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h);
    for (let y = 20; y < h - 20; y += 44) for (let x = 16; x < w - 20; x += 40) {
      const lit = rand() > 0.62;
      g.fillStyle = lit ? (rand() > 0.5 ? '#f5b765' : '#d9e1f0') : '#15171b';
      g.globalAlpha = lit ? 0.55 + rand() * 0.45 : 1;
      g.fillRect(x, y, 24, 30);
      g.globalAlpha = 1;
    }
  });
}

function neonTex() {
  return canvasTex(1024, 360, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '400 230px "Tiro Devanagari Hindi", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#c78bff';
    g.shadowBlur = 40;
    g.strokeStyle = '#f1dcff';
    g.lineWidth = 7;
    g.strokeText('स्याही', w / 2, h / 2 + 14);
    g.shadowBlur = 12;
    g.lineWidth = 3;
    g.strokeStyle = '#ffffff';
    g.strokeText('स्याही', w / 2, h / 2 + 14);
  }, { repeat: [1, 1] });
}

function plaqueTex() {
  return canvasTex(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#b38a52'); grd.addColorStop(0.5, '#e2c48f'); grd.addColorStop(1, '#9c7444');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b1d10';
    g.textAlign = 'center';
    g.font = 'italic 64px "Bodoni Moda Variable", serif';
    g.fillText('Siyahi', w / 2, 112);
    g.font = '500 24px "Hanken Grotesk", sans-serif';
    g.fillText('TATTOO ATELIER  ·  BY APPOINTMENT', w / 2, 172);
  });
}

async function flashPrint(design) {
  const svg = design.svg();
  const img = new Image();
  img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  await img.decode().catch(() => {});
  return canvasTex(400, 520, (g, w, h) => {
    g.fillStyle = '#efe8da'; g.fillRect(0, 0, w, h);
    const s = Math.min((w - 70) / img.width, (h - 120) / img.height);
    g.drawImage(img, (w - img.width * s) / 2, 40, img.width * s, img.height * s);
    g.fillStyle = '#2a2622';
    g.font = 'italic 26px "Bodoni Moda Variable", serif';
    g.textAlign = 'center';
    g.fillText(design.name, w / 2, h - 34);
  });
}

function mandalaTex() {
  // a giant line mandala for the back wall; its lines glow under the UV beat
  return canvasTex(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.translate(w / 2, h / 2);
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    const ring = (r) => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
    [60, 140, 150, 280, 300, 440, 470].forEach(ring);
    for (let i = 0; i < 12; i++) {
      g.save(); g.rotate((i * Math.PI) / 6);
      g.beginPath(); g.moveTo(0, -62); g.quadraticCurveTo(46, -100, 0, -138); g.quadraticCurveTo(-46, -100, 0, -62); g.stroke();
      g.restore();
    }
    for (let i = 0; i < 24; i++) {
      g.save(); g.rotate((i * Math.PI) / 12);
      g.beginPath(); g.moveTo(-34, -152); g.quadraticCurveTo(0, -330, 34, -152); g.stroke();
      g.beginPath(); g.moveTo(0, -170); g.lineTo(0, -270); g.stroke();
      g.restore();
    }
    for (let i = 0; i < 48; i++) {
      g.save(); g.rotate((i * Math.PI) / 24);
      g.beginPath(); g.moveTo(-28, -302); g.quadraticCurveTo(0, -420, 28, -302); g.stroke();
      g.beginPath(); g.arc(0, -455, 4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
  }, { srgb: true });
}

// ---------------------------------------------------------------- volumetric cones and dust
export function lightCone({ top = 0.08, bottom = 0.9, height = 2, color = '#ffd7a0', opacity = 0.16 }) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, 48, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uH: { value: height } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = -position.y; vec4 mv = modelViewMatrix * vec4(position,1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uH; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float fall = pow(1.0 - clamp(vY / uH, 0.0, 1.0), 1.6);
      float edge = pow(abs(dot(vN, vV)), 1.4);
      gl_FragColor = vec4(uColor * uOpacity * fall * edge, 1.0); }`,
  });
  return new THREE.Mesh(geo, mat);
}

export function dust(count, box, color = '#ffe6c4', size = 0.012) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    p[i * 3] = box.min.x + rand() * (box.max.x - box.min.x);
    p[i * 3 + 1] = box.min.y + rand() * (box.max.y - box.min.y);
    p[i * 3 + 2] = box.min.z + rand() * (box.max.z - box.min.z);
    s[i] = rand();
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uMin: { value: box.min }, uMax: { value: box.max }, uFall: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uSize; uniform vec3 uMin; uniform vec3 uMax; uniform float uFall; varying float vA;
      void main(){ vec3 p = position;
        float t = uTime * (0.04 + seed * 0.05);
        p.x += sin(t * 6.0 + seed * 40.0) * 0.06; p.z += cos(t * 5.0 + seed * 30.0) * 0.06;
        float span = uMax.y - uMin.y;
        p.y = uMin.y + mod(p.y - uMin.y - uTime * (0.02 + uFall * (6.0 + seed * 3.0)), span);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (300.0 / -mv.z) * (0.6 + seed);
        vA = 0.35 + 0.65 * fract(seed * 7.13);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFall; uniform float uAlpha; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5;
        float d = uFall > 0.5 ? smoothstep(0.5, 0.0, abs(c.x) * 6.0) * smoothstep(0.5, 0.1, abs(c.y)) : smoothstep(0.5, 0.0, length(c));
        gl_FragColor = vec4(uColor * d * vA * uAlpha, 1.0); }`,
  });
  return new THREE.Points(g, mat);
}

// ---------------------------------------------------------------- build
export async function buildSet(scene, meta) {
  const set = { uv: [], lights: {}, anim: [] };
  const spot = new THREE.Vector3(...meta.spot);
  const R = { x0: -3.2, x1: 3.6, z0: -3.6, z1: 9, h: 3.4 };

  // materials
  const wallTex = concrete([58, 54, 50], 18); wallTex.repeat.set(3, 1.5);
  const floorTex = concrete([34, 32, 30], 22); floorTex.repeat.set(4, 6);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#8d857c', map: wallTex, roughness: 0.92 });
  const floorMat = new THREE.MeshPhysicalMaterial({ color: '#77706a', map: floorTex, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#0e0e0f', roughness: 0.5, metalness: 0.4 });
  const leather = new THREE.MeshPhysicalMaterial({ color: '#111113', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#444') });
  const brass = new THREE.MeshStandardMaterial({ color: '#b48a4f', roughness: 0.28, metalness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: '#b9b6b0', roughness: 0.25, metalness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: '#5b3d26', roughness: 0.6 });

  // ---------------- room shell
  const room = new THREE.Group();
  scene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
  floor.receiveShadow = true;
  room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), new THREE.MeshStandardMaterial({ color: '#141312', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(floor.position.x, R.h, floor.position.z);
  room.add(ceil);
  const wall = (w, h, pos, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.copy(pos); m.rotation.y = ry; m.receiveShadow = true; room.add(m); return m;
  };
  wall(R.z1 - R.z0, R.h, new THREE.Vector3(R.x0, R.h / 2, (R.z0 + R.z1) / 2), Math.PI / 2);
  wall(R.z1 - R.z0, R.h, new THREE.Vector3(R.x1, R.h / 2, (R.z0 + R.z1) / 2), -Math.PI / 2);
  wall(R.x1 - R.x0, R.h, new THREE.Vector3((R.x0 + R.x1) / 2, R.h / 2, R.z0), 0);
  // front wall with a door opening (inside face)
  const doorW = 2.0, doorH = 2.7;
  const fw = new THREE.Shape();
  fw.moveTo(R.x0, 0); fw.lineTo(R.x1, 0); fw.lineTo(R.x1, R.h); fw.lineTo(R.x0, R.h); fw.lineTo(R.x0, 0);
  const hole = new THREE.Path();
  hole.moveTo(-doorW / 2, 0); hole.lineTo(-doorW / 2, doorH); hole.lineTo(doorW / 2, doorH); hole.lineTo(doorW / 2, 0); hole.lineTo(-doorW / 2, 0);
  fw.holes.push(hole);
  const frontGeo = new THREE.ExtrudeGeometry(fw, { depth: 0.3, bevelEnabled: false });
  const facadeTex = concrete([30, 30, 32], 14); facadeTex.repeat.set(0.5, 0.5);
  const facadeMat = new THREE.MeshStandardMaterial({ color: '#5a5856', map: facadeTex, roughness: 0.85 });
  const front = new THREE.Mesh(frontGeo, [facadeMat, wallMat]);
  front.position.z = R.z1;
  front.receiveShadow = true;
  room.add(front);

  // back wall mandala (UV reactive)
  const mTex = mandalaTex();
  const mandala = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: mTex, transparent: true, color: '#3a332c', depthWrite: false }));
  mandala.position.set(0.2, 1.75, R.z0 + 0.01);
  room.add(mandala);
  set.mandala = mandala;

  // framed flash prints with picture lights on the left wall
  const picks = ['luna', 'kamal', 'mor', 'sealink', 'titli', 'naag', 'gulab', 'lehar'];
  for (let i = 0; i < picks.length; i++) {
    const d = FLASH.find((x) => x.id === picks[i]);
    const tex = await flashPrint(d);
    const z = 7.4 - i * 1.25;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.68), blackMat);
    frame.position.set(R.x0 + 0.03, 1.62, z);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.78), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    art.rotation.y = Math.PI / 2;
    art.position.set(R.x0 + 0.06, 1.62, z);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.36), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd9a3', emissiveIntensity: 3 }));
    bar.position.set(R.x0 + 0.14, 2.1, z);
    const glow = lightCone({ top: 0.02, bottom: 0.4, height: 0.75, opacity: 0.12 });
    glow.position.set(R.x0 + 0.14, 2.09, z);
    glow.rotation.z = -0.35;
    glow.scale.set(1, 1, 0.8);
    room.add(frame, art, bar, glow);
  }
  // picture-light wash on that wall
  const wash = new THREE.PointLight('#ffcf94', 6, 7, 1.6);
  wash.position.set(R.x0 + 0.9, 2.2, 3.6);
  room.add(wash);

  // right wall: shelf with ink bottles, plants and a tall mirror
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 3.2), wood);
  shelf.position.set(R.x1 - 0.15, 1.35, 5.4);
  const shelf2 = shelf.clone(); shelf2.position.y = 1.85;
  room.add(shelf, shelf2);
  const inkCols = ['#111', '#7d1a16', '#16306b', '#1f5b3e', '#c69a2b', '#111', '#4b1d5c', '#111'];
  for (let i = 0; i < 26; i++) {
    const h = 0.11 + rand() * 0.06;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 16), new THREE.MeshPhysicalMaterial({ color: inkCols[i % inkCols.length], roughness: 0.1, clearcoat: 1 }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12), blackMat);
    const yb = i < 13 ? 1.37 : 1.87;
    const z = 4.0 + (i % 13) * 0.21 + rand() * 0.04;
    b.position.set(R.x1 - 0.13 + (rand() - 0.5) * 0.06, yb + h / 2, z);
    cap.position.set(b.position.x, yb + h + 0.015, z);
    room.add(b, cap);
  }
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 1, roughness: 0.05 }));
  mirror.rotation.y = -Math.PI / 2;
  mirror.position.set(R.x1 - 0.02, 1.25, 1.6);
  const mframe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 1.1), brass);
  mframe.position.set(R.x1 - 0.03, 1.25, 1.6);
  room.add(mframe, mirror);
  // plants
  const plant = (x, z, s = 1) => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.15 * s, 0.4 * s, 24), new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.8 }));
    pot.position.y = 0.2 * s;
    g.add(pot);
    const leaf = new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: 0.55, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.16 * s, 12, 0, Math.PI), leaf);
      l.scale.set(0.55, 1.4, 1);
      l.position.y = 0.42 * s + rand() * 0.6 * s;
      l.rotation.set(-0.6 - rand() * 0.6, rand() * Math.PI * 2, rand() * 0.5);
      l.translateY(0.15 * s);
      g.add(l);
    }
    g.position.set(x, 0, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    room.add(g);
    return g;
  };
  plant(R.x1 - 0.45, 7.9, 1.2); plant(R.x0 + 0.45, -2.6, 1.3); plant(2.6, -2.9, 1);

  // pendant lamps along the walk
  const pendants = [];
  for (const z of [7.0, 4.6, 2.2]) {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 6), blackMat);
    cord.position.y = 0.45;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.22, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#1b1a19', roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }));
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf8a', emissiveIntensity: 4 }));
    bulb.rotation.x = Math.PI / 2;
    bulb.position.y = -0.1;
    g.add(cord, shade, bulb);
    const cone = lightCone({ top: 0.19, bottom: 1.3, height: 2.3, opacity: 0.075 });
    cone.position.y = -0.11;
    g.add(cone);
    const L = new THREE.PointLight('#ffc98a', 4.5, 6, 1.5);
    L.position.y = -0.3;
    g.add(L);
    g.position.set(0.25, R.h - 0.9, z);
    room.add(g);
    pendants.push(L);
  }
  set.lights.pendants = pendants;

  // ---------------- the station
  const station = new THREE.Group();
  room.add(station);
  // client chair: leather seat, reclined back, chrome base
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.6), leather);
  seat.position.set(0, 0.41, -0.05);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.12), leather);
  back.position.set(0, 0.86, -0.42); back.rotation.x = -0.24;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), leather);
  head.position.set(0, 1.36, -0.54); head.rotation.x = -0.24;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 24), steel);
  col.position.set(0, 0.18, -0.05);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.03, 48), steel);
  foot.position.set(0, 0.015, -0.05);
  station.add(seat, back, head, col, foot);
  // arm rest under the client's left forearm
  const el = new THREE.Vector3(...meta.forearm.elbow), wr = new THREE.Vector3(...meta.forearm.wrist);
  const armMid = el.clone().lerp(wr, 0.5);
  const armLen = el.distanceTo(wr) + 0.16;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, armLen), leather);
  pad.position.set(armMid.x, meta.armUnder - 0.03, armMid.z);
  pad.rotation.y = Math.atan2(wr.x - el.x, wr.z - el.z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, meta.armUnder - 0.06, 16), steel);
  post.position.set(armMid.x, (meta.armUnder - 0.06) / 2, armMid.z);
  const pbase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 32), steel);
  pbase.position.set(armMid.x, 0.012, armMid.z);
  station.add(pad, post, pbase);
  // artist stool
  const sp = new THREE.Vector3(...meta.artistPos);
  const stoolTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.07, 40), leather);
  stoolTop.position.set(sp.x + 0.05, meta.artistSeat - 0.035, sp.z);
  const stoolPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, meta.artistSeat - 0.1, 16), steel);
  stoolPole.position.set(sp.x + 0.05, (meta.artistSeat - 0.1) / 2 + 0.03, sp.z);
  const stoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.025, 5), blackMat);
  stoolBase.position.set(sp.x + 0.05, 0.02, sp.z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 8, 40), steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(sp.x + 0.05, 0.3, sp.z);
  station.add(stoolTop, stoolPole, stoolBase, ring);
  // tray cart with ink caps, a power supply and paper towel
  const cart = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.36), steel);
  tray.position.y = 0.8;
  const cpost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 12), steel);
  cpost.position.y = 0.4;
  cart.add(tray, cpost);
  const capCols = ['#0a0a0a', '#0a0a0a', '#0a0a0a', '#1a1a1a', '#8b1c17', '#3a3a3a'];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.009, 0.014, 14), new THREE.MeshPhysicalMaterial({ color: capCols[i], roughness: 0.15, clearcoat: 1 }));
    c.position.set(-0.17 + (i % 3) * 0.035, 0.818, -0.1 + Math.floor(i / 3) * 0.035);
    cart.add(c);
  }
  const psu = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.1), blackMat);
  psu.position.set(0.12, 0.84, -0.06);
  const lcd = canvasTex(128, 64, (g) => { g.fillStyle = '#05140f'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#6dffcf'; g.font = '700 38px monospace'; g.fillText('8.4V', 10, 46); });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.035), new THREE.MeshBasicMaterial({ map: lcd }));
  screen.position.set(0.12, 0.85, -0.009);
  const towel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 24), new THREE.MeshStandardMaterial({ color: '#eae6de', roughness: 0.95 }));
  towel.rotation.z = Math.PI / 2;
  towel.position.set(0.05, 0.87, 0.1);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 20), new THREE.MeshPhysicalMaterial({ color: '#cfe8f2', roughness: 0.05, transmission: 0.6, thickness: 0.02, transparent: true, opacity: 0.85 }));
  bottle.position.set(-0.17, 0.89, 0.1);
  cart.add(psu, screen, towel, bottle);
  cart.position.set(sp.x + 0.25, 0, sp.z - 0.55);
  cart.rotation.y = -0.4;
  cart.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  station.add(cart);
  station.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // articulated work lamp: floor stand, arm, ring-light head over the spot
  const lampHead = spot.clone().add(new THREE.Vector3(0.12, 0.62, -0.18));
  const lampBase = new THREE.Vector3(sp.x + 0.35, 0, -0.75);
  const knee = new THREE.Vector3(lampBase.x, 1.55, lampBase.z + 0.05);
  const tube = (a, b, r = 0.012) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), blackMat);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true;
    return m;
  };
  const lampFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 32), blackMat);
  lampFoot.position.copy(lampBase).setY(0.015);
  room.add(lampFoot, tube(lampBase.clone().setY(0.03), knee), tube(knee, lampHead));
  const ringHead = new THREE.Group();
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 16, 48), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff6ea', emissiveIntensity: 2.2 }));
  const housing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 16, 48, Math.PI * 2), blackMat);
  housing.position.z = -0.012;
  ringHead.add(housing, ringL);
  ringHead.position.copy(lampHead);
  ringHead.lookAt(spot);
  room.add(ringHead);
  const key = new THREE.SpotLight('#fff3e2', 7, 4, 0.55, 0.6, 1.6);
  key.position.copy(lampHead);
  key.target.position.copy(spot);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.015;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 3;
  room.add(key, key.target);
  set.lights.key = key;
  const keyCone = lightCone({ top: 0.09, bottom: 0.75, height: 1.0, opacity: 0.09, color: '#fff2df' });
  keyCone.position.copy(lampHead);
  keyCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), spot.clone().sub(lampHead).normalize());
  room.add(keyCone);
  set.keyCone = keyCone;

  // ambient bounce
  const hemi = new THREE.HemisphereLight('#f6dcc0', '#141110', 0.35);
  scene.add(hemi);
  set.lights.hemi = hemi;
  const uvLight = new THREE.HemisphereLight('#7b4dff', '#140a2c', 0);
  scene.add(uvLight);
  set.lights.uv = uvLight;
  const backRim = new THREE.SpotLight('#8fb7ff', 10, 7, 0.7, 0.8, 1.5);
  backRim.position.set(-1.6, 2.9, -2.8);
  backRim.target.position.copy(spot);
  room.add(backRim, backRim.target);
  set.lights.rim = backRim;

  const dustP = dust(900, new THREE.Box3(new THREE.Vector3(-1.5, 0.2, -2), new THREE.Vector3(2.2, 3.2, 8)), '#ffe6c4', 0.01);
  room.add(dustP);
  set.anim.push((t) => { dustP.material.uniforms.uTime.value = t; });

  // ---------------- doors (hinged at the jambs, swing inward)
  const glass = new THREE.MeshPhysicalMaterial({ color: '#c9b79c', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, side: THREE.DoubleSide });
  const frosted = new THREE.MeshStandardMaterial({ color: '#f1e3cc', roughness: 1, transparent: true, opacity: 0.55, emissive: '#ffdcae', emissiveIntensity: 0.6 });
  const doors = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * doorW / 2, 0, R.z1 + 0.15);
    const leaf = new THREE.Group();
    const w = doorW / 2;
    const fr = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), blackMat); m.position.set(x, y, 0); leaf.add(m); };
    fr(0.05, doorH, -s * 0.025, doorH / 2); fr(0.05, doorH, -s * (w - 0.025), doorH / 2);
    fr(w, 0.05, -s * w / 2, doorH - 0.025); fr(w, 0.14, -s * w / 2, 0.07); fr(w, 0.03, -s * w / 2, 1.05);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, doorH - 0.24), glass);
    pane.position.set(-s * w / 2, doorH / 2 + 0.05, 0);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, 0.5), frosted);
    band.position.set(-s * w / 2, 1.35, 0.004);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.9, 16), brass);
    handle.position.set(-s * (w - 0.12), 1.15, 0.06);
    leaf.add(pane, band, handle);
    hinge.add(leaf);
    room.add(hinge);
    doors.push({ hinge, s });
  }
  set.doors = doors;
  // warm spill through the doorway
  const spill = new THREE.SpotLight('#ffcf94', 0, 9, 0.6, 0.9, 1.2);
  spill.position.set(0, 2.3, R.z1 - 0.6);
  spill.target.position.set(0, 0, R.z1 + 4);
  room.add(spill, spill.target);
  set.lights.spill = spill;

  // ---------------- exterior: a wet Bandra lane at night
  const street = new THREE.Group();
  scene.add(street);
  const wetTex = concrete([22, 22, 24], 10); wetTex.repeat.set(6, 4);
  const wet = new THREE.MeshPhysicalMaterial({ color: '#3d3f44', map: wetTex, roughness: 0.18, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.08 });
  const pavement = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.2), wet);
  pavement.rotation.x = -Math.PI / 2;
  pavement.position.set(0, 0.0, R.z1 + 2.4);
  pavement.receiveShadow = true;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wet);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.14, R.z1 + 9.5);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.15, 0.15), new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.7 }));
  kerb.position.set(0, -0.07, R.z1 + 4.5);
  street.add(pavement, road, kerb);
  // facade dressing: timber battens either side of the door, a canopy line, neighbours
  for (let i = 0; i < 14; i++) {
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 0.08), wood);
      b.position.set(s * (1.25 + i * 0.13), 1.6, R.z1 + 0.34);
      b.castShadow = true;
      street.add(b);
    }
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.9), blackMat);
  canopy.position.set(0, 3.0, R.z1 + 0.75);
  street.add(canopy);
  const canopyGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.03), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf94', emissiveIntensity: 3 }));
  canopyGlow.rotation.x = Math.PI / 2;
  canopyGlow.position.set(0, 2.955, R.z1 + 1.15);
  street.add(canopyGlow);
  const downl = new THREE.SpotLight('#ffcf94', 9, 5, 0.9, 0.8, 1.4);
  downl.position.set(0, 2.9, R.z1 + 0.9);
  downl.target.position.set(0, 0, R.z1 + 1.4);
  street.add(downl, downl.target);
  // neon sign above the canopy
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.63), new THREE.MeshBasicMaterial({ map: neonTex(), transparent: true, color: '#e6c9ff', toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  neon.position.set(0, 3.45, R.z1 + 0.36);
  street.add(neon);
  set.neon = neon;
  const neonL = new THREE.PointLight('#b57bff', 5, 5, 1.6);
  neonL.position.set(0, 3.4, R.z1 + 0.9);
  street.add(neonL);
  set.lights.neon = neonL;
  // its smeared reflection in the wet pavement
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshBasicMaterial({ map: neon.material.map, transparent: true, opacity: 0.22, color: '#c9a4ff', toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  refl.rotation.x = -Math.PI / 2;
  refl.position.set(0, 0.003, R.z1 + 1.9);
  street.add(refl);
  // brass plaque
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshStandardMaterial({ map: plaqueTex(), metalness: 0.8, roughness: 0.3 }));
  plaque.position.set(1.6, 1.55, R.z1 + 0.39);
  street.add(plaque);
  // neighbouring buildings
  const winTex = windowsTex();
  for (const [x, w, h] of [[-8.5, 7, 14], [8.6, 7, 11], [-5, 2, 18], [5.5, 3, 16]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), new THREE.MeshStandardMaterial({ color: '#232427', roughness: 0.9, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: 0.6 }));
    b.position.set(x, h / 2, R.z1 - 3 + (x > 0 ? 0.6 : 0));
    street.add(b);
  }
  // street lamp with a sodium glow
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 12), blackMat);
  pole.position.set(4.6, 3, R.z1 + 4.3);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), blackMat);
  arm.position.set(4.0, 5.95, R.z1 + 4.3);
  const sodium = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffa64a', emissiveIntensity: 6 }));
  sodium.position.set(3.4, 5.9, R.z1 + 4.3);
  street.add(pole, arm, sodium);
  const sodL = new THREE.SpotLight('#ff9a3c', 60, 14, 0.75, 0.6, 1.3);
  sodL.position.set(3.4, 5.8, R.z1 + 4.3);
  sodL.target.position.set(2.2, 0, R.z1 + 3.4);
  street.add(sodL, sodL.target);
  const sodCone = lightCone({ top: 0.2, bottom: 2.6, height: 5.8, opacity: 0.07, color: '#ffb56b' });
  sodCone.position.set(3.4, 5.86, R.z1 + 4.3);
  street.add(sodCone);
  const p1 = plant(-1.75, R.z1 + 0.85, 1.15); street.add(p1);
  const p2 = plant(1.85, R.z1 + 0.85, 0.95); street.add(p2);
  // monsoon rain
  const rain = dust(2600, new THREE.Box3(new THREE.Vector3(-7, 0, R.z1 + 0.6), new THREE.Vector3(7, 7, R.z1 + 13)), '#c8d4e6', 0.035);
  rain.material.uniforms.uFall.value = 1;
  rain.material.uniforms.uAlpha.value = 0.5;
  street.add(rain);
  set.rain = rain;
  set.anim.push((t) => { rain.material.uniforms.uTime.value = t; });
  set.street = street;
  set.room = room;
  set.R = R;
  return set;
}

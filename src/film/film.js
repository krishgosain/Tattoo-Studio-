// The opening film. One pinned section; scroll position drives everything:
// a rainy lane → the doors swing open → down the room → the artist → her hands →
// a lotus inked line by line → the lamp clicks off ("Forever.") → pull out to the headline.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadFigures } from './figures.js';
import { buildSet } from './set.js';
import { buildDecal, projectorMatrix, Tattoo, dynamicCanvases } from '../viewer/tattoos.js';
import { FLASH } from '../designs/flash.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const CHAPTERS = [
  { id: 'lane', name: 'The lane', at: 0 },
  { id: 'door', name: 'The door', at: 0.12 },
  { id: 'room', name: 'The room', at: 0.27 },
  { id: 'artist', name: 'The artist', at: 0.45 },
  { id: 'needle', name: 'The needle', at: 0.62 },
  { id: 'forever', name: 'Forever', at: 0.85 },
];
export const INK = [0.6, 0.85];

// ---------------------------------------------------------------- grain / vignette / aberration
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.95 }, uGrain: { value: 0.06 }, uCA: { value: 0.0015 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uCA, uFade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r = dot(c, c);
      vec2 off = c * uCA * (1.0 + r * 4.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= mix(1.0, smoothstep(0.85, 0.15, r * uVignette * 2.2), 0.85);
      col += (h(vUv * 1000.0) - 0.5) * uGrain;
      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ---------------------------------------------------------------- stroke drawing (shared idea with the designer)
class StrokeDrawing {
  constructor(svgText, longSide = 1100) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    const [, , vw, vh] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    Object.assign(this, { vw, vh, scale: longSide / Math.max(vw, vh) });
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(vw * this.scale);
    this.canvas.height = Math.round(vh * this.scale);
    this.ctx = this.canvas.getContext('2d');
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
    document.body.appendChild(host);
    const baseSW = +svg.querySelector('g')?.getAttribute('stroke-width') || 2;
    this.items = [];
    let total = 0;
    svg.querySelectorAll('path,circle,ellipse').forEach((el) => {
      const sw = +(el.getAttribute('stroke-width') || baseSW);
      const filled = el.getAttribute('fill') === '#000';
      let d = el.getAttribute('d');
      if (el.tagName !== 'path') {
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy');
        const rx = +(el.getAttribute('r') || el.getAttribute('rx')), ry = +(el.getAttribute('r') || el.getAttribute('ry'));
        d = `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      host.appendChild(p);
      const len = Math.max(1, p.getTotalLength());
      const cost = filled ? Math.min(len, 24) : len;
      this.items.push({ path2d: new Path2D(d), sw, filled, len, el: p, a: total, b: total + cost });
      total += cost;
    });
    this.items.forEach((it) => { it.a /= total; it.b /= total; });
    this.count = this.items.length;
    this.tip = { x: vw / 2, y: vh / 2, active: false, index: 0 };
  }
  draw(progress) {
    const g = this.ctx, s = this.scale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    Object.assign(g, { lineCap: 'round', lineJoin: 'round', strokeStyle: '#000', fillStyle: '#000' });
    this.tip.active = false;
    let done = 0;
    for (const it of this.items) {
      if (progress <= it.a) break;
      const f = clamp01((progress - it.a) / (it.b - it.a));
      if (it.filled) { g.globalAlpha = f; g.fill(it.path2d); g.globalAlpha = 1; }
      else { g.lineWidth = it.sw; g.setLineDash(f < 1 ? [it.len * f, it.len + 1] : []); g.stroke(it.path2d); g.setLineDash([]); }
      if (f < 1) { const pt = it.el.getPointAtLength(it.len * f); this.tip = { x: pt.x, y: pt.y, active: true, index: done + 1 }; }
      else done++;
    }
    this.done = done;
  }
}

function makePen() {
  const g = new THREE.Group();
  const matte = new THREE.MeshPhysicalMaterial({ color: '#141618', roughness: 0.38, metalness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 0.18, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c09356', roughness: 0.25, metalness: 1 });
  const prof = [[0, 0], [0.0006, 0], [0.0007, 0.003], [0.0032, 0.011], [0.0058, 0.016], [0.0062, 0.05], [0.0072, 0.052], [0.0074, 0.058], [0.0102, 0.062], [0.0108, 0.14], [0.0096, 0.146], [0, 0.148]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), matte));
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0032, 0.011, 32), steel);
  tip.position.y = 0.0055; g.add(tip);
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.0063, 0.0004, 8, 40), matte);
    r.rotation.x = Math.PI / 2; r.position.y = 0.02 + i * 0.0034; g.add(r);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0106, 0.0106, 0.003, 48), brass);
  band.position.y = 0.064; g.add(band);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.5, 10), matte);
  cable.position.y = 0.39; g.add(cable);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// camera keyframes: [p, position, target]
function keys(spot) {
  const S = (x, y, z) => spot.clone().add(new THREE.Vector3(x, y, z));
  return [
    [0.0, new THREE.Vector3(0.6, 1.5, 19.5), new THREE.Vector3(0, 2.2, 9)],
    [0.1, new THREE.Vector3(0.3, 1.55, 14.6), new THREE.Vector3(0, 1.8, 9)],
    [0.19, new THREE.Vector3(0.1, 1.6, 11.0), new THREE.Vector3(0, 1.45, 7)],
    [0.27, new THREE.Vector3(0.0, 1.62, 8.3), new THREE.Vector3(0.1, 1.35, 3)],
    [0.37, new THREE.Vector3(-0.7, 1.62, 5.3), new THREE.Vector3(0.3, 1.1, 0)],
    [0.47, new THREE.Vector3(1.7, 1.58, 2.7), new THREE.Vector3(0.45, 0.95, 0.05)],
    [0.55, new THREE.Vector3(1.55, 1.38, 1.05), S(0, 0.05, 0)],
    [0.62, S(-0.34, 0.42, 0.5), S(0, 0, 0)],
    [0.7, S(-0.24, 0.13, 0.06), S(0.02, 0, 0)],
    [0.8, S(-0.15, 0.085, 0.03), S(0.01, 0, 0)],
    [0.86, S(-0.12, 0.1, 0.02), S(0, 0, 0)],
    [0.92, S(-0.05, 0.3, 0.07), S(0, 0, 0)],
    [1.0, new THREE.Vector3(2.2, 2.2, 3.9), new THREE.Vector3(-0.75, 1.05, -0.2)],
  ];
}

export class Film {
  constructor(root, { onProgress } = {}) {
    this.root = root;
    this.canvas = root.querySelector('[data-film-canvas]');
    this.onProgress = onProgress || (() => {});
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.p = this.target = this.reduced ? 1 : 0;
    this.listeners = [];
  }

  on(fn) { this.listeners.push(fn); }

  async init() {
    const mobile = innerWidth < 760;
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07080a');
    scene.fog = new THREE.FogExp2('#0a0909', 0.045);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.12;
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 80);

    this.onProgress(0.15);
    const figs = await loadFigures();
    this.onProgress(0.45);
    const meta = figs.meta;
    scene.add(figs.client.group, figs.artist.group);
    this.figs = figs;
    this.set = await buildSet(scene, meta);
    this.onProgress(0.75);

    // the tattoo on the client's forearm
    const spot = new THREE.Vector3(...meta.spot);
    this.spot = spot;
    const cg = figs.client.geometry;
    // surface normal at the spot (nearest vertex normal on the client)
    const pos = cg.attributes.position, nrm = cg.attributes.normal;
    let best = 0, bd = Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const d = v.distanceToSquared(spot); if (d < bd) { bd = d; best = i; } }
    const normal = new THREE.Vector3().fromBufferAttribute(nrm, best).normalize();
    const el = new THREE.Vector3(...meta.forearm.elbow), wr = new THREE.Vector3(...meta.forearm.wrist);
    const up = el.clone().sub(wr).normalize(); // design "up" points to the elbow
    this.drawing = new StrokeDrawing(FLASH.find((d) => d.id === 'kamal').svg());
    dynamicCanvases.add(this.drawing.canvas);
    this.drawing.draw(0);
    const tattoo = new Tattoo({ design: { canvas: this.drawing.canvas, aspect: this.drawing.canvas.width / this.drawing.canvas.height, name: 'Kamal', colour: false }, anchor: null, sizeCm: 7.5, ink: 'black', age: 0.02 });
    const { w, h } = tattoo.dims();
    const m = projectorMatrix(spot, normal, 0, up);
    tattoo.matrix = m;
    tattoo.normal = normal;
    tattoo.mesh.geometry = buildDecal(cg, m, new THREE.Vector3(w, h, 0.05));
    tattoo.refreshTexture();
    scene.add(tattoo.mesh);
    this.tattoo = tattoo;

    // pen in the artist's right hand
    this.pen = makePen();
    this.pen.scale.setScalar(0.92);
    scene.add(this.pen);
    this.penAxis = new THREE.Vector3(...meta.penAxis).normalize();
    this.artistHome = figs.artist.group.position.clone();

    // post
    const composer = new EffectComposer(r);
    composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.55, 0.92);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FinishShader);
    composer.addPass(this.finish);
    this.composer = composer;

    // camera path
    const K = keys(spot);
    this.kp = K.map((k) => k[0]);
    this.posCurve = new THREE.CatmullRomCurve3(K.map((k) => k[1]), false, 'centripetal', 0.5);
    this.tgtCurve = new THREE.CatmullRomCurve3(K.map((k) => k[2]), false, 'centripetal', 0.5);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement);
    addEventListener('scroll', () => this.onScroll(), { passive: true });
    addEventListener('pointermove', (e) => { this.mx = (e.clientX / innerWidth - 0.5) * 2; this.my = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    this.mx = this.my = 0; this.smx = this.smy = 0;
    this.onScroll();
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '50px' }).observe(this.root);
    // compile everything up front so the first scroll doesn't hitch
    this.applyState(this.p, 0);
    r.compile(scene, this.camera);
    this.onProgress(1);
    this.clock = new THREE.Clock();
    const loop = () => { requestAnimationFrame(loop); if (this.visible) this.frame(this.clock.getDelta()); };
    loop();
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.bloom?.setSize(Math.round(w / 2), Math.round(h / 2));
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 58 : 42;
    this.camera.updateProjectionMatrix();
  }

  onScroll() {
    if (this.reduced) return;
    const r = this.root.getBoundingClientRect();
    const span = r.height - innerHeight * 2;
    this.target = clamp01(-r.top / Math.max(1, span));
  }

  // map scroll progress to position along the camera spline (keyframes are not evenly spaced)
  curveT(p) {
    const k = this.kp;
    let i = 0;
    while (i < k.length - 2 && p > k[i + 1]) i++;
    const local = clamp01((p - k[i]) / (k[i + 1] - k[i]));
    return (i + local) / (k.length - 1);
  }

  applyState(p, time) {
    const cam = this.camera;
    const t = this.curveT(p);
    const pos = this.posCurve.getPoint(t), tgt = this.tgtCurve.getPoint(t);
    // a breath of handheld drift and a little mouse parallax, both fading out for the macro
    const macro = smooth(0.58, 0.66, p) * (1 - smooth(0.9, 0.97, p));
    const drift = (1 - macro * 0.85) * 0.012;
    pos.x += Math.sin(time * 0.6) * drift + this.smx * 0.06 * (1 - macro);
    pos.y += Math.sin(time * 0.43 + 1) * drift - this.smy * 0.04 * (1 - macro);
    cam.position.copy(pos);
    cam.lookAt(tgt);
    // focal length tightens as we close in on the hands
    const baseFov = cam.aspect < 0.8 ? 58 : 42;
    cam.fov = baseFov - macro * 10;
    cam.updateProjectionMatrix();

    const S = this.set;
    // doors swing in
    const open = easeInOut(smooth(0.11, 0.24, p));
    S.doors.forEach(({ hinge, s }) => { hinge.rotation.y = s * open * 1.75; });
    S.lights.spill.intensity = 30 * open * (1 - smooth(0.3, 0.4, p));
    // rain thins once we're inside
    S.rain.material.uniforms.uAlpha.value = 0.5 * (1 - smooth(0.24, 0.3, p));

    // inking + healing
    const ink = easeInOut(clamp01((p - INK[0]) / (INK[1] - INK[0])));
    if (Math.abs(ink - (this.lastInk ?? -1)) > 0.001) { this.drawing.draw(ink); this.lastInk = ink; this.dirty = true; }
    const age = lerp(0.02, 0.34, smooth(0.86, 0.93, p));
    if (Math.abs(age - this.tattoo.age) > 0.004) { this.tattoo.age = age; this.dirty = true; }
    if (this.dirty) { this.tattoo.refreshTexture(); this.dirty = false; }

    // the pen follows the needle point; the artist leans with it so the pen never leaves her grip
    const tip = this.drawing.tip;
    const { w, h } = this.tattoo.dims();
    const inking = p > INK[0] && p < INK[1];
    const u = tip.active ? tip.x / this.drawing.vw : 0.5, v = tip.active ? 1 - tip.y / this.drawing.vh : 0.5;
    this.pu = lerp(this.pu ?? 0.5, inking ? u : 0.5, inking ? 0.5 : 0.05);
    this.pv = lerp(this.pv ?? 0.5, inking ? v : 0.5, inking ? 0.5 : 0.05);
    const onSkin = new THREE.Vector3((this.pu - 0.5) * w, (this.pv - 0.5) * h, 0).applyMatrix4(this.tattoo.matrix);
    const offset = onSkin.clone().sub(this.spot);
    const lift = smooth(INK[1] - 0.01, INK[1] + 0.04, p);
    const buzz = tip.active && inking ? Math.sin(time * 190) * 0.00016 : 0;
    const hover = (inking && tip.active ? 0.0003 : 0.004) + lift * 0.05;
    this.pen.position.copy(onSkin).addScaledVector(this.penAxis, hover + buzz).addScaledVector(this.tattoo.normal, 0.0006);
    this.pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.penAxis);
    this.figs.artist.group.position.copy(this.artistHome).add(offset).addScaledVector(this.penAxis, lift * 0.05);

    // light story: the work lamp clicks off at "Forever", room glows on
    const lampOff = smooth(0.87, 0.875, p) * (1 - smooth(0.97, 1, p) * 0.6);
    S.lights.key.intensity = 7 * (1 - lampOff * 0.85);
    S.keyCone.material.uniforms.uOpacity.value = 0.09 * (1 - lampOff);
    S.mandala.material.color.set('#3a332c').lerp(new THREE.Color('#9b7a55'), smooth(0.86, 0.95, p));
    this.bloom.strength = 0.4 + smooth(0.85, 0.95, p) * 0.2;
    this.finish.uniforms.uCA.value = 0.0012 + macro * 0.0018;
  }

  frame(dt) {
    dt = Math.min(dt, 0.05);
    const k = 1 - Math.pow(0.002, dt);
    this.p += (this.target - this.p) * k;
    if (Math.abs(this.target - this.p) < 0.00015) this.p = this.target;
    this.smx = lerp(this.smx, this.mx, 0.05);
    this.smy = lerp(this.smy, this.my, 0.05);
    const time = performance.now() / 1000;
    this.applyState(this.p, time);
    this.set.anim.forEach((fn) => fn(time));
    this.finish.uniforms.uTime.value = time % 10;
    this.composer.render();
    this.listeners.forEach((fn) => fn(this.p, this.drawing));
  }
}

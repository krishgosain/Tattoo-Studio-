// Scroll-driven opening film, rendered live in WebGL.
// Beat 1: title card. Beat 2: a tattoo pen inks a spider web on the forearm,
// stroke by stroke ("Quietly."). Beat 3: the pen lifts, the redness heals
// ("Forever."). Beat 4: the camera pulls back to the whole body and the hero
// copy lands; scrolling on brings the 3D designer up from below.
import * as THREE from 'three';
import { Stage } from '../viewer/stage.js';
import { loadBody } from '../viewer/body.js';
import { Tattoo, dynamicCanvases } from '../viewer/tattoos.js';
import { resolveZones } from '../viewer/zones.js';
import { FLASH } from '../designs/flash.js';
import { $, $$ } from './util.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// story timeline (fractions of the pinned scroll)
const T = { title: [0, 0.13], ink: [0.12, 0.5], heal: [0.5, 0.68], pull: [0.62, 0.95] };

// ---------------------------------------------------------------- stroke-by-stroke drawing
class StrokeDrawing {
  constructor(svgText, longSide = 1100) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    const [, , vw, vh] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    this.vw = vw; this.vh = vh;
    this.scale = longSide / Math.max(vw, vh);
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(vw * this.scale);
    this.canvas.height = Math.round(vh * this.scale);
    this.ctx = this.canvas.getContext('2d');
    // measuring needs live DOM nodes
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
    document.body.appendChild(host);
    this.host = host;
    const baseSW = +svg.querySelector('g')?.getAttribute('stroke-width') || 2;
    this.items = [];
    let total = 0;
    svg.querySelectorAll('path,circle,ellipse').forEach((el) => {
      const sw = +(el.getAttribute('stroke-width') || baseSW);
      const filled = el.getAttribute('fill') === '#000';
      let d, len;
      if (el.tagName === 'path') {
        d = el.getAttribute('d');
      } else {
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy');
        const rx = +(el.getAttribute('r') || el.getAttribute('rx')), ry = +(el.getAttribute('r') || el.getAttribute('ry'));
        d = `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      host.appendChild(p);
      len = Math.max(1, p.getTotalLength());
      // filled dots are quick taps of the needle
      const cost = filled ? Math.min(len, 30) : len;
      this.items.push({ d, path2d: new Path2D(d), sw, filled, len, el: p, a: total, b: total + cost });
      total += cost;
    });
    this.total = total;
    this.items.forEach((it) => { it.a /= total; it.b /= total; });
    this.tip = { x: vw / 2, y: vh / 2, active: false };
  }

  draw(progress) {
    const g = this.ctx;
    const s = this.scale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#000';
    g.fillStyle = '#000';
    this.tip.active = false;
    for (const it of this.items) {
      if (progress <= it.a) break;
      const f = clamp01((progress - it.a) / (it.b - it.a));
      if (it.filled) {
        g.globalAlpha = f;
        g.fill(it.path2d);
        g.globalAlpha = 1;
      } else {
        g.lineWidth = it.sw;
        g.setLineDash(f < 1 ? [it.len * f, it.len + 1] : []);
        g.stroke(it.path2d);
        g.setLineDash([]);
      }
      if (f < 1) {
        const pt = it.el.getPointAtLength(it.len * f);
        this.tip = { x: pt.x, y: pt.y, active: true };
      }
    }
    if (progress >= 1) this.tip.active = false;
  }
}

// ---------------------------------------------------------------- tattoo pen
function makePen() {
  const g = new THREE.Group();
  const matte = new THREE.MeshPhysicalMaterial({ color: '#16181a', roughness: 0.42, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#c9c3b8', roughness: 0.22, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b58a4c', roughness: 0.3, metalness: 1 });
  // built along +Y with the needle tip at the origin
  const profile = [
    [0.0, 0.0], [0.0006, 0.0], [0.0007, 0.003], [0.0032, 0.011], [0.0058, 0.016], [0.0062, 0.05],
    [0.0072, 0.052], [0.0074, 0.058], [0.0102, 0.062], [0.0108, 0.14], [0.0096, 0.146], [0.0, 0.148],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), matte);
  g.add(body);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0032, 0.011, 32), steel);
  tip.position.y = 0.0055;
  g.add(tip);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0063, 0.0004, 8, 40), matte);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02 + i * 0.0034;
    g.add(ring);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0106, 0.0106, 0.003, 48), brass);
  band.position.y = 0.064;
  g.add(band);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(0.85);
  return g;
}

export class Entrance {
  constructor(root) {
    this.root = root;
    this.sticky = $('[data-entrance-sticky]', root);
    this.canvas = $('[data-entrance-canvas]', root);
    this.segs = $$('[data-seg]', root).map((el) => {
      const [a, b] = el.dataset.seg.split(',').map(Number);
      return { el, a, b, final: el.hasAttribute('data-final') };
    });
    this.bar = $('[data-ent-bar]', root);
    this.cue = $('[data-ent-cue]', root);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.target = this.reduced ? 1 : 0;
    this.p = this.target;
  }

  async init() {
    if (this.reduced) this.root.classList.add('is-static');
    const st = new Stage(this.canvas);
    this.stage = st;
    st.controls.enabled = false;
    st.renderer.toneMappingExposure = 0.2;
    const body = await loadBody();
    this.body = body;
    body.setSkin('#c38a5e');
    st.scene.add(body.group);
    const zones = resolveZones(body);
    const z = zones['forearm:L'];

    this.drawing = new StrokeDrawing(FLASH.find((d) => d.id === 'web').svg());
    dynamicCanvases.add(this.drawing.canvas);
    this.drawing.draw(0);
    this.tattoo = new Tattoo({
      design: { canvas: this.drawing.canvas, aspect: this.drawing.canvas.width / this.drawing.canvas.height, name: 'Spider web', colour: false },
      anchor: { face: z.face, bary: z.bary }, sizeCm: 10, rotation: 0, ink: 'black', age: 0.02, upHint: z.upHint,
    });
    this.tattoo.rebuild(body);
    st.scene.add(this.tattoo.mesh);

    this.pen = makePen();
    st.scene.add(this.pen);
    this.ray = new THREE.Raycaster();

    const n = this.tattoo.normal.clone();
    this.center = this.tattoo.point.clone();
    this.azT = Math.atan2(n.x, n.z);
    this.elT = Math.asin(THREE.MathUtils.clamp(n.y, -1, 1));

    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    window.addEventListener('resize', () => this.onScroll());
    this.onScroll();
    new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(this.root);
    st.onFrame.push((dt) => this.frame(dt));
    this.lastDrawn = -1;
    this.root.classList.add('is-ready');
  }

  onScroll() {
    if (this.reduced) return;
    const r = this.root.getBoundingClientRect();
    // the last screen of the section is where the designer slides over the finished film
    const span = r.height - innerHeight * 2;
    this.target = clamp01(-r.top / Math.max(1, span));
  }

  frame(dt) {
    // inertia: the film glides to the scroll position instead of snapping
    const k = 1 - Math.pow(0.0015, dt);
    this.p += (this.target - this.p) * k;
    if (Math.abs(this.target - this.p) < 0.0002) this.p = this.target;
    const p = this.p;
    const st = this.stage;
    const time = performance.now() / 1000;

    // ink progress, healing
    const ink = easeInOut(clamp01((p - T.ink[0]) / (T.ink[1] - T.ink[0] - 0.04)));
    if (Math.abs(ink - this.lastDrawn) > 0.0015 || (ink === 1 && this.lastDrawn !== 1)) {
      this.drawing.draw(ink);
      this.lastDrawn = ink;
      this.dirtyTex = true;
    }
    const age = lerp(0.02, 0.32, smooth(T.heal[0], T.heal[1], p));
    if (Math.abs(age - this.tattoo.age) > 0.004) { this.tattoo.age = age; this.dirtyTex = true; }
    if (this.dirtyTex) { this.tattoo.refreshTexture(); this.dirtyTex = false; }

    // camera path: macro on the forearm → pulled back to the full figure
    const pull = easeInOut(smooth(T.pull[0], T.pull[1], p));
    const heal = smooth(T.heal[0], T.heal[1] + 0.05, p);
    const macroDist = lerp(0.3, 0.42, smooth(T.ink[0], T.heal[1], p)) + heal * 0.12;
    const fullTarget = new THREE.Vector3(0, 0.93, 0.02);
    const target = this.center.clone().lerp(fullTarget, pull);
    const dist = lerp(macroDist, innerWidth > 860 ? 3.9 : 7.2, pull);
    const az = lerp(this.azT - 0.32 + p * 0.5, 0.55, pull) + Math.sin(time * 0.25) * 0.01;
    const el = lerp(this.elT * 0.55 + 0.05, 0.04, pull);
    st.controls.target.copy(target);
    st.camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist).add(target);
    st.camera.lookAt(target);
    // on wide screens the figure sits right of the headline at the end
    const wide = innerWidth > 860;
    const w = st.canvas.clientWidth, h = st.canvas.clientHeight;
    const shift = wide ? -w * 0.2 * pull : 0;
    if (w && h) st.camera.setViewOffset(w, h, shift, wide ? 0 : h * 0.2 * pull, w, h);
    st.renderer.toneMappingExposure = lerp(0.15, 1.05, smooth(0.02, 0.14, p));

    // the pen follows the needle point, then lifts away
    const tip = this.drawing.tip;
    const lift = smooth(T.ink[1] - 0.04, T.heal[0] + 0.06, p);
    const appear = smooth(T.ink[0] - 0.04, T.ink[0] + 0.02, p);
    this.pen.visible = appear > 0.01 && lift < 0.999;
    if (this.pen.visible) {
      const t = this.tattoo;
      const { w: dw, h: dh } = t.dims();
      const u = tip.active ? tip.x / this.drawing.vw : this.penU ?? 0.5;
      const v = tip.active ? 1 - tip.y / this.drawing.vh : this.penV ?? 0.5;
      // smooth the pen between strokes so it travels instead of teleporting
      this.penU = this.penU == null ? u : lerp(this.penU, u, tip.active ? 0.55 : 0.1);
      this.penV = this.penV == null ? v : lerp(this.penV, v, tip.active ? 0.55 : 0.1);
      const local = new THREE.Vector3((this.penU - 0.5) * dw, (this.penV - 0.5) * dh, 0).applyMatrix4(t.matrix);
      const nrm = t.normal.clone();
      this.ray.set(local.clone().addScaledVector(nrm, 0.05), nrm.clone().negate());
      const hit = this.ray.intersectObject(this.body.bakedMesh, false)[0];
      const surf = hit ? hit.point : local;
      // hold the pen like an artist: tilted back toward the upper right of the frame, not at the lens
      const cam = st.camera;
      const camRight = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const axis = nrm.clone().multiplyScalar(0.45).addScaledVector(camRight, 0.62).addScaledVector(camUp, 0.55).normalize();
      const buzz = tip.active ? Math.sin(time * 190) * 0.00018 : 0;
      const hover = (tip.active ? 0.0004 : 0.004) + lift * 0.09 + (1 - appear) * 0.06;
      this.pen.position.copy(surf).addScaledVector(axis, hover + buzz);
      this.pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    }

    // overlays
    for (const s of this.segs) {
      const local = clamp01((p - s.a) / (s.b - s.a));
      const fadeIn = smooth(s.a, s.a + (s.b - s.a) * 0.25, p);
      const fadeOut = s.final ? 1 : 1 - smooth(s.b - (s.b - s.a) * 0.22, s.b, p);
      const o = fadeIn * fadeOut;
      s.el.style.opacity = o.toFixed(3);
      s.el.style.setProperty('--k', local.toFixed(3));
      s.el.style.visibility = o < 0.005 ? 'hidden' : 'visible';
    }
    if (this.bar) this.bar.style.transform = `scaleY(${p.toFixed(4)})`;
    if (this.cue) this.cue.style.opacity = (1 - smooth(0.0, 0.04, p)).toFixed(3);
    this.sticky.style.setProperty('--ent-final', smooth(0.74, 0.92, p).toFixed(3));
  }
}

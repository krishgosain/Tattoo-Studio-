// "On my photo": overlay the active design on a photo (or live camera) of the
// visitor's own skin, multiplied into the skin so it picks up real light and shadow.
import { $, toast } from './util.js';
import { INKS } from '../viewer/tattoos.js';

export class PhotoTryOn {
  constructor(root, getSource) {
    this.root = root;
    this.getSource = getSource; // () => { canvas, ink, sizeHint }
    this.canvas = $('[data-photo-canvas]', root);
    this.ctx = this.canvas.getContext('2d');
    this.video = $('[data-photo-video]', root);
    this.photo = null;
    this.pos = { x: 0.5, y: 0.5, w: 0.32, rot: 0 };
    this.curve = 0.25;
    this.pointers = new Map();
    this.bind();
    new ResizeObserver(() => this.draw()).observe(this.canvas.parentElement);
  }

  bind() {
    const r = this.root;
    $('[data-photo-input]', r).addEventListener('change', (e) => e.target.files[0] && this.loadFile(e.target.files[0]));
    $('[data-photo-change]', r).addEventListener('click', () => $('[data-photo-input]', r).click());
    $('[data-photo-camera]', r).addEventListener('click', () => this.startCamera());
    $('[data-photo-capture]', r).addEventListener('click', () => this.capture());
    $('[data-photo-save]', r).addEventListener('click', () => this.save());
    $('[data-photo-curve]', r).addEventListener('input', (e) => { this.curve = +e.target.value / 100; this.draw(); });
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.pinch = null; });
    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      const rect = c.getBoundingClientRect();
      if (this.pointers.size === 1) {
        this.pos.x += (e.clientX - prev.x) / rect.width;
        this.pos.y += (e.clientY - prev.y) / rect.height;
      } else if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p2 = [...this.pointers.values()];
        const d1 = Math.hypot(p2[0].x - p2[1].x, p2[0].y - p2[1].y);
        if (d0 > 0) this.pos.w = clamp(this.pos.w * (d1 / d0), 0.05, 1.2);
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.draw();
    });
    const up = (e) => this.pointers.delete(e.pointerId);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.pos.w = clamp(this.pos.w * (e.deltaY > 0 ? 0.94 : 1.06), 0.05, 1.2); this.draw(); }, { passive: false });
  }

  show(on) {
    this.visible = on;
    if (!on) this.stopCamera();
    this.draw();
  }

  async loadFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { this.photo = img; this.ready(); };
    img.onerror = () => toast('That photo could not be opened. Try a JPG or PNG.');
    img.src = url;
  }

  ready() {
    $('[data-photo-empty]', this.root).hidden = true;
    $('[data-photo-tools]', this.root).hidden = false;
    $('[data-photo-capture]', this.root).hidden = !this.stream;
    this.draw();
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.photo = null;
      this.ready();
      const loop = () => { if (!this.stream) return; this.draw(this.video); requestAnimationFrame(loop); };
      loop();
    } catch {
      toast('Camera is not available. Upload a photo instead.');
    }
  }

  capture() {
    if (!this.stream) return;
    const c = document.createElement('canvas');
    c.width = this.video.videoWidth; c.height = this.video.videoHeight;
    c.getContext('2d').drawImage(this.video, 0, 0);
    this.stopCamera();
    this.photo = c;
    this.ready();
  }

  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    $('[data-photo-capture]', this.root).hidden = true;
  }

  draw(live) {
    if (!this.visible) return;
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const src = live || this.photo;
    if (!src) return;
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    const s = Math.max(W / sw, H / sh);
    g.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
    this.drawTattoo(g, W, H);
  }

  drawTattoo(g, W, H) {
    const src = this.getSource();
    if (!src) return;
    const art = src.canvas;
    const w = this.pos.w * W;
    const h = w / (art.width / art.height);
    const cx = this.pos.x * W, cy = this.pos.y * H;
    const inkDef = INKS.find((i) => i.id === src.ink) || INKS[0];
    const white = inkDef.id === 'white';
    g.save();
    g.translate(cx, cy);
    g.rotate((src.rotation || 0) * Math.PI / 180);
    g.globalCompositeOperation = white ? 'source-over' : 'multiply';
    g.globalAlpha = white ? 0.75 : 0.92;
    // cylindrical warp: slice into strips and compress toward the edges
    const strips = 48;
    const theta = this.curve * 1.25;
    for (let i = 0; i < strips; i++) {
      const u0 = i / strips, u1 = (i + 1) / strips;
      const map = (u) => (theta > 0.01 ? Math.sin((u * 2 - 1) * theta) / Math.sin(theta) : u * 2 - 1);
      const x0 = map(u0) * w / 2, x1 = map(u1) * w / 2;
      const shade = theta > 0.01 ? 0.75 + 0.25 * Math.cos(((u0 + u1) - 1) * theta) : 1;
      g.globalAlpha = (white ? 0.75 : 0.92) * shade;
      g.drawImage(art, u0 * art.width, 0, (u1 - u0) * art.width + 0.5, art.height, x0, -h / 2, x1 - x0 + 0.6, h);
    }
    g.restore();
  }

  save() {
    if (!this.photo) return toast('Add a photo first');
    const a = document.createElement('a');
    a.href = this.canvas.toDataURL('image/jpeg', 0.92);
    a.download = `siyahi-on-skin-${Date.now()}.jpg`;
    a.click();
    toast('Image saved');
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

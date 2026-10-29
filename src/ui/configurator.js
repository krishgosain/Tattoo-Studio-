import * as THREE from 'three';
import { Stage } from '../viewer/stage.js';
import { loadBody, SKIN_TONES } from '../viewer/body.js';
import { Tattoo, INKS } from '../viewer/tattoos.js';
import { ZONES, AREAS, resolveZones, baryOf, upHintAt, zoneForPoint } from '../viewer/zones.js';
import { FLASH, rasterizeSvg, flashThumb } from '../designs/flash.js';
import { FONTS, renderLettering, ensureFonts, romanDate, PLACES, coords } from '../designs/lettering.js';
import { inkify, loadImage, inkCoverage } from '../designs/process.js';
import { PRICING } from '../config.js';
import { tween, $, $$, toast, encodeState, decodeState } from './util.js';

const STYLE_CHOICES = [
  ['fine-line', 'Fine-line'], ['minimal', 'Minimal'], ['dotwork', 'Dotwork'], ['blackwork', 'Blackwork'],
  ['micro-realism', 'Micro-realism'], ['ornamental', 'Ornamental'], ['traditional', 'Traditional'], ['watercolour', 'Watercolour'],
];
const IDEAS = [
  'A puppy reading the newspaper',
  'A cat asleep in an auto-rickshaw',
  'Monstera leaf with a single drop of rain',
  'Kite caught on a mango tree',
  'Two hands sharing one umbrella in the rain',
  'Koi fish circling a lotus',
];
const AGE_LABELS = [[0.12, 'Fresh, day one'], [0.22, 'One week'], [0.42, 'Healed'], [0.7, 'Five years'], [1.01, 'Ten years']];

export class Configurator {
  constructor(root) {
    this.root = root;
    this.state = {
      sex: 0, skin: 'honey', side: 'L', area: 'Arm', mode: '3d',
      size: 10, rotation: 0, flip: false, ink: 'black', age: 0.3,
      style: 'fine-line', font: 'pinyon',
    };
    this.tattoos = [];
    this.active = null;
    this.design = null; // currently chosen design
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }

  async init() {
    const r = this.root;
    this.canvas = $('[data-stage]', r);
    this.stage = new Stage(this.canvas);
    this.buildPanel();
    this.loaderText = $('[data-loader-text]', r);
    this.body = await loadBody();
    this.stage.scene.add(this.body.group);
    this.body.setSkin(SKIN_TONES.find((s) => s.id === this.state.skin).hex);
    this.zones = resolveZones(this.body);
    this.tattooGroup = new THREE.Group();
    this.stage.scene.add(this.tattooGroup);
    this.addReticle();
    this.bindStage();
    this.viewFull('front', 0.01);
    $('[data-loader]', r).classList.add('is-done');

    // pause rendering when the designer is off screen
    new IntersectionObserver(([e]) => { this.stage.visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(r);

    const restored = await this.restoreFromHash();
    if (!restored) await this.chooseFlash(FLASH.find((d) => d.id === 'orchid'), { place: false });
    this.ready = true;
    this.emit();
  }

  // ---------------------------------------------------------------- panel
  buildPanel() {
    const r = this.root;
    // design source tabs
    $$('[data-src]', r).forEach((b) => b.addEventListener('click', () => {
      $$('[data-src]', r).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      $$('[data-pane]', r).forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.src; });
      if (b.dataset.src === 'letter') { ensureFonts(); this.fontPreviewRefresh(); }
    }));

    // flash strip
    const strip = $('[data-flash-strip]', r);
    strip.innerHTML = FLASH.map((d) => `<button class="flash-tile" data-flash="${d.id}" aria-pressed="false" title="${d.name}"><img alt="${d.name}" src="${flashThumb(d)}" loading="lazy"></button>`).join('');
    strip.addEventListener('click', (e) => {
      const b = e.target.closest('[data-flash]');
      if (b) this.chooseFlash(FLASH.find((d) => d.id === b.dataset.flash));
    });

    // describe
    const styles = $('[data-styles]', r);
    styles.innerHTML = STYLE_CHOICES.map(([id, n]) => `<button class="chip" data-style="${id}" aria-pressed="${id === this.state.style}">${n}</button>`).join('');
    styles.addEventListener('click', (e) => {
      const b = e.target.closest('[data-style]'); if (!b) return;
      this.state.style = b.dataset.style;
      $$('[data-style]', styles).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    const ideas = $('[data-ideas]', r);
    ideas.innerHTML = '<span class="fine" style="margin:0">Try:</span>' + IDEAS.map((i) => `<button data-idea-pick>${i}</button>`).join('');
    ideas.addEventListener('click', (e) => {
      const b = e.target.closest('[data-idea-pick]'); if (!b) return;
      $('[data-idea]', r).value = b.textContent;
    });
    $('[data-generate]', r).addEventListener('click', () => this.generate());
    $('[data-idea]', r).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.generate(); } });
    $('[data-gen-results]', r).addEventListener('click', (e) => {
      const b = e.target.closest('[data-gen-i]'); if (!b) return;
      const d = this.generated[+b.dataset.genI];
      $$('[data-gen-i]', r).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.applyDesign(d);
    });

    // lettering
    const fonts = $('[data-fonts]', r);
    fonts.innerHTML = FONTS.map((f) => `<button class="font-btn" data-font="${f.id}" aria-pressed="${f.id === this.state.font}"><span class="s" style="font-family:'${f.family}';${f.italic ? 'font-style:italic' : ''}">${f.sample}</span><span class="n">${f.name}</span></button>`).join('');
    fonts.addEventListener('click', (e) => {
      const b = e.target.closest('[data-font]'); if (!b) return;
      this.state.font = b.dataset.font;
      $$('[data-font]', fonts).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.letter();
    });
    let lt;
    const letterSoon = () => { clearTimeout(lt); lt = setTimeout(() => this.letter(), 220); };
    ['[data-words]', '[data-arc]', '[data-spacing]', '[data-flourish]'].forEach((s) => $(s, r).addEventListener('input', letterSoon));
    $('[data-use-date]', r).addEventListener('click', () => {
      const v = $('[data-pdate]', r).value;
      if (!v) return toast('Pick a date first');
      $('[data-words]', r).value = romanDate(v);
      this.state.font = 'bodoni';
      $$('[data-font]', fonts).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.font === 'bodoni')));
      this.letter();
    });
    const places = $('[data-places]', r);
    places.innerHTML = PLACES.map((p, i) => `<button class="chip" data-place="${i}">${p.name}</button>`).join('');
    places.addEventListener('click', (e) => {
      const b = e.target.closest('[data-place]'); if (!b) return;
      const p = PLACES[+b.dataset.place];
      $('[data-words]', r).value = coords(p.lat, p.lon);
      this.state.font = 'typewriter';
      $$('[data-font]', fonts).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.font === 'typewriter')));
      this.letter();
    });

    // upload
    const drop = $('[data-drop]', r);
    const up = $('[data-upload]', r);
    up.addEventListener('change', () => up.files[0] && this.upload(up.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) this.upload(f); });
    $('[data-keep-colour]', r).addEventListener('change', () => this.lastUpload && this.upload(this.lastUpload));
    $('[data-threshold]', r).addEventListener('change', () => this.lastUpload && this.upload(this.lastUpload));

    // placement
    const areas = $('[data-areas]', r);
    areas.innerHTML = AREAS.map((a) => `<button data-area="${a}" aria-pressed="${a === this.state.area}">${a}</button>`).join('');
    areas.addEventListener('click', (e) => {
      const b = e.target.closest('[data-area]'); if (!b) return;
      this.state.area = b.dataset.area;
      $$('[data-area]', areas).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.renderZones();
    });
    this.renderZones();
    $('[data-zones]', r).addEventListener('click', (e) => {
      const b = e.target.closest('[data-zone]'); if (b) this.placeAtZone(b.dataset.zone);
    });
    $$('[data-side]', r).forEach((b) => b.addEventListener('click', () => {
      this.state.side = b.dataset.side;
      $$('[data-side]', r).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (this.active?.zone) {
        const [id] = this.active.zone.split(':');
        const z = ZONES.find((zz) => zz.id === id);
        if (z?.sided) this.placeAtZone(id);
      }
    }));

    // size / rotation / flip
    const size = $('[data-size]', r), rot = $('[data-rot]', r);
    size.addEventListener('input', () => { this.state.size = +size.value; this.updateActive({ sizeCm: +size.value }); this.syncOutputs(); });
    rot.addEventListener('input', () => { this.state.rotation = +rot.value; this.updateActive({ rotation: +rot.value }); this.syncOutputs(); });
    $('[data-flip]', r).addEventListener('change', (e) => { this.state.flip = e.target.checked; this.updateActive({ flip: e.target.checked }, true); });

    // skin
    const sw = $('[data-skins]', r);
    sw.innerHTML = SKIN_TONES.map((s) => `<button class="swatch" data-skin="${s.id}" style="background:${s.hex}" title="${s.name}" aria-label="${s.name} skin" aria-pressed="${s.id === this.state.skin}"></button>`).join('');
    sw.addEventListener('click', (e) => {
      const b = e.target.closest('[data-skin]'); if (!b) return;
      this.setSkin(b.dataset.skin);
    });

    // ink + age
    const inks = $('[data-inks]', r);
    inks.innerHTML = INKS.map((i) => `<button class="ink-btn" data-ink="${i.id}" aria-pressed="${i.id === this.state.ink}"><i style="background:${i.hex || 'conic-gradient(#b5372c,#d8a43c,#2f6d5b,#2e4d8f,#b5372c)'}"></i>${i.name}</button>`).join('');
    inks.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ink]'); if (!b) return;
      this.state.ink = b.dataset.ink;
      $$('[data-ink]', inks).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.updateActive({ ink: b.dataset.ink }, true);
    });
    const age = $('[data-age]', r);
    age.addEventListener('input', () => { this.state.age = +age.value / 100; this.updateActive({ age: this.state.age }, true); this.syncOutputs(); });

    // views
    $$('[data-view]', r).forEach((b) => b.addEventListener('click', () => this.viewFull(b.dataset.view)));
    $$('[data-sex]', r).forEach((b) => b.addEventListener('click', () => this.setSex(+b.dataset.sex)));
    $('[data-reset-view]', r).addEventListener('click', () => this.viewFull('front'));
    $('[data-snapshot]', r).addEventListener('click', () => this.download());
    $('[data-layers]', r).addEventListener('click', (e) => {
      const x = e.target.closest('[data-remove]');
      if (x) { this.removeTattoo(+x.dataset.remove); return; }
      const add = e.target.closest('[data-add-layer]');
      if (add) { this.addAnother(); return; }
      const l = e.target.closest('[data-layer]');
      if (l) this.select(this.tattoos.find((t) => t.id === +l.dataset.layer), true);
    });
    $('[data-layers]', r).addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const l = e.target.closest('[data-layer]');
      if (l && e.target === l) { e.preventDefault(); this.select(this.tattoos.find((t) => t.id === +l.dataset.layer), true); }
    });
    $$('input[type=range]', r).forEach(fillRange);
    this.syncOutputs();
  }

  renderZones() {
    const zs = ZONES.filter((z) => z.area === this.state.area);
    const cur = this.active?.zone?.split(':')[0];
    $('[data-zones]', this.root).innerHTML = zs.map((z) => `<button class="chip" data-zone="${z.id}" aria-pressed="${z.id === cur}">${z.name}</button>`).join('');
    $('[data-side-wrap]', this.root).hidden = !zs.some((z) => z.sided);
  }

  syncOutputs() {
    const r = this.root;
    $('[data-size-out]', r).textContent = this.active ? dimsLabel(this.active) : `${this.state.size} cm`;
    $('[data-rot-out]', r).textContent = `${this.state.rotation}°`;
    $('[data-age-out]', r).textContent = AGE_LABELS.find(([v]) => this.state.age < v)[1];
    $$('input[type=range]', r).forEach(fillRange);
  }

  setControlsFrom(t) {
    const r = this.root;
    Object.assign(this.state, { size: t.sizeCm, rotation: t.rotation, flip: t.flip, ink: t.ink, age: t.age });
    $('[data-size]', r).value = t.sizeCm;
    $('[data-rot]', r).value = t.rotation;
    $('[data-flip]', r).checked = t.flip;
    $('[data-age]', r).value = Math.round(t.age * 100);
    $$('[data-ink]', r).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ink === t.ink)));
    if (t.zone) {
      const [id, side] = t.zone.split(':');
      const z = ZONES.find((zz) => zz.id === id);
      if (z) {
        this.state.area = z.area;
        $$('[data-area]', r).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.area === z.area)));
        if (side) { this.state.side = side; $$('[data-side]', r).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.side === side))); }
      }
    }
    this.renderZones();
    this.syncOutputs();
  }

  // ---------------------------------------------------------------- designs
  async chooseFlash(d, opts) {
    $$('[data-flash]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.flash === d.id)));
    const { canvas, aspect } = await rasterizeSvg(d.svg(), 1400);
    $('[data-picked]', this.root).innerHTML = `<strong>${d.name}</strong>${d.note}`;
    await this.applyDesign({ kind: 'flash', id: d.id, name: d.name, style: 'fine-line', canvas, aspect, colour: false, thumb: flashThumb(d) }, opts);
  }

  async letter() {
    const r = this.root;
    const text = $('[data-words]', r).value.trim();
    if (!text) return;
    const params = { text, fontId: this.state.font, arc: +$('[data-arc]', r).value / 100, spacing: +$('[data-spacing]', r).value, flourish: $('[data-flourish]', r).checked };
    const { canvas, aspect } = await renderLettering(params);
    await this.applyDesign({ kind: 'text', params, name: `“${text.slice(0, 24)}”`, style: 'script', canvas, aspect, colour: false });
  }

  fontPreviewRefresh() {
    // repaint once webfonts arrive so samples render in their own face
    document.fonts?.ready.then(() => $$('.font-btn .s', this.root).forEach((s) => { s.style.opacity = 0.99; requestAnimationFrame(() => { s.style.opacity = 1; }); }));
  }

  async upload(file) {
    this.lastUpload = file;
    const r = this.root;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const keepColour = $('[data-keep-colour]', r).checked;
      const { canvas, aspect } = inkify(img, { keepColour, threshold: +$('[data-threshold]', r).value / 100 });
      await this.applyDesign({ kind: 'upload', name: file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Your drawing', style: keepColour ? 'colour' : 'fine-line', canvas, aspect, colour: keepColour });
      if (keepColour) this.setInk('original');
      toast('Lines lifted from your image');
    } catch (e) {
      toast('That image could not be read. Try a JPG or PNG.');
    } finally { URL.revokeObjectURL(url); }
  }

  async generate(prompt) {
    const r = this.root;
    const idea = (prompt || $('[data-idea]', r).value).trim();
    if (idea.length < 3) { $('[data-idea]', r).focus(); return toast('Describe the tattoo in a few words'); }
    const btn = $('[data-generate]', r);
    const status = $('[data-gen-status]', r), bar = $('[data-gen-bar]', r), text = $('[data-gen-text]', r);
    const styleName = STYLE_CHOICES.find(([id]) => id === this.state.style)[1].toLowerCase();
    $('.gen-error', r)?.remove();
    btn.disabled = true; status.hidden = false;
    const phases = [
      [0, `Sketching your ${styleName} design, about 20 seconds`],
      [0.35, 'Laying down the linework'],
      [0.65, 'Cleaning it into a stencil'],
      [0.88, 'Lifting it off the paper'],
    ];
    const t0 = performance.now();
    const timer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const p = 1 - Math.exp(-t / 9);
      bar.style.width = `${(p * 96).toFixed(1)}%`;
      text.textContent = phases.filter(([v]) => p >= v).pop()[1];
    }, 200);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: idea, style: this.state.style, seed: Math.floor(Math.random() * 1e9) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.image) throw new Error(j.error || 'The sketching service did not answer. Try again in a moment.');
      const img = await loadImage(j.image);
      const { canvas, aspect } = inkify(img, { keepColour: j.colour });
      const design = { kind: 'ai', prompt: idea, style: this.state.style, name: idea.length > 26 ? idea.slice(0, 24) + '…' : idea, canvas, aspect, colour: !!j.colour, thumb: canvas.toDataURL('image/png') };
      this.generated = this.generated || [];
      this.generated.unshift(design);
      this.generated = this.generated.slice(0, 6);
      $('[data-gen-results]', r).innerHTML = this.generated.map((d, i) => `<button class="flash-tile" data-gen-i="${i}" aria-pressed="${i === 0}" title="${escapeHtml(d.prompt)}"><img alt="${escapeHtml(d.prompt)}" src="${d.thumb}"></button>`).join('');
      bar.style.width = '100%';
      await this.applyDesign(design);
      if (j.colour) this.setInk('original');
      btn.textContent = 'Sketch another take';
    } catch (e) {
      const p = document.createElement('p');
      p.className = 'gen-error';
      p.textContent = e.message;
      status.after(p);
    } finally {
      clearInterval(timer);
      setTimeout(() => { status.hidden = true; bar.style.width = '0'; }, 400);
      btn.disabled = false;
    }
  }

  async applyDesign(design, { place = true } = {}) {
    design.coverage = inkCoverage(design.canvas);
    this.design = design;
    if (this.active) {
      this.active.design = design;
      this.active.refreshTexture();
      this.active.rebuild(this.body);
      this.renderLayers();
      this.emit();
    } else if (place) {
      this.placeAtZone(this.lastZone || 'forearm');
    }
  }

  setInk(id) {
    this.state.ink = id;
    $$('[data-ink]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ink === id)));
    this.updateActive({ ink: id }, true);
  }

  // ---------------------------------------------------------------- tattoos
  newTattoo(anchor, extra = {}) {
    const t = new Tattoo({
      design: this.design, anchor,
      sizeCm: this.state.size, rotation: this.state.rotation, flip: this.state.flip,
      ink: this.state.ink, age: this.state.age, ...extra,
    });
    this.tattoos.push(t);
    this.tattooGroup.add(t.mesh);
    t.rebuild(this.body);
    this.select(t);
    $('[data-hint]', this.root).classList.add('is-gone');
    return t;
  }

  select(t, fly = false) {
    this.active = t;
    if (t) this.setControlsFrom(t);
    this.renderLayers();
    if (fly && t) this.frameTattoo(t);
    this.emit();
  }

  removeTattoo(id) {
    const t = this.tattoos.find((x) => x.id === id);
    if (!t) return;
    this.tattooGroup.remove(t.mesh);
    t.mesh.geometry.dispose(); t.material.dispose(); t.texture.dispose();
    this.tattoos = this.tattoos.filter((x) => x !== t);
    this.select(this.tattoos[this.tattoos.length - 1] || null);
  }

  addAnother() {
    if (!this.design) return;
    const used = new Set(this.tattoos.map((t) => t.zone?.split(':')[0]));
    const next = ['forearm', 'upper-back', 'ribs', 'calf', 'collarbone', 'thigh', 'wrist', 'nape', 'chest', 'shoulder', 'ankle'].find((z) => !used.has(z)) || 'hip';
    this.active = null;
    this.placeAtZone(next);
  }

  updateActive(patch, retexture = false) {
    const t = this.active;
    if (!t) return;
    Object.assign(t, patch);
    if (retexture) t.refreshTexture();
    if ('sizeCm' in patch || 'rotation' in patch || 'flip' in patch) {
      cancelAnimationFrame(this._rb);
      this._rb = requestAnimationFrame(() => { t.rebuild(this.body); this.emit(); });
    } else {
      this.emit();
    }
  }

  placeAtZone(zoneId) {
    const z = ZONES.find((zz) => zz.id === zoneId);
    if (!z) return;
    const key = z.sided ? `${z.id}:${this.state.side}` : z.id;
    const res = this.zones[key];
    if (!res) return;
    this.lastZone = z.id;
    const anchor = { face: res.face, bary: res.bary.clone() };
    const size = z.size;
    const fit = this.design ? fitSize(size, this.design.aspect, z) : size;
    if (this.active) {
      Object.assign(this.active, { anchor, zone: key, upHint: res.upHint.clone(), sizeCm: fit });
      this.active.rebuild(this.body);
      this.setControlsFrom(this.active);
    } else {
      this.state.size = fit;
      this.newTattoo(anchor, { zone: key, upHint: res.upHint.clone(), sizeCm: fit });
    }
    if (z.area !== this.state.area) {
      this.state.area = z.area;
      $$('[data-area]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.area === z.area)));
    }
    this.renderZones();
    this.renderLayers();
    this.frameTattoo(this.active);
    this.emit();
  }

  frameTattoo(t) {
    const { w, h } = t.dims();
    const span = Math.max(w, h);
    const dist = THREE.MathUtils.clamp(span * 4.4 + 0.32, 0.55, 2.2);
    const n = t.normal;
    this.stage.flyTo({
      target: t.point,
      distance: dist,
      azimuth: Math.atan2(n.x, n.z),
      elevation: THREE.MathUtils.clamp(Math.asin(n.y) * 0.7 + 0.08, -0.35, 0.6),
      dur: 1.25,
    });
  }

  viewFull(which, dur = 1.1) {
    const az = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[which] ?? 0;
    $$('[data-view]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.view === which)));
    const h = this.body ? this.body.height() : 1.73;
    return this.stage.flyTo({ target: new THREE.Vector3(0, h * 0.52, 0), distance: 4.3 + (h - 1.6) * 1.2, azimuth: az, elevation: 0.03, dur });
  }

  setSkin(id) {
    this.state.skin = id;
    $$('[data-skin]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.skin === id)));
    this.body.setSkin(SKIN_TONES.find((s) => s.id === id).hex);
    // white ink reads best on deeper tones; nudge nothing, just let the preview show it
    this.emit();
  }

  async setSex(v) {
    if (this.morphing || v === this.state.sex) return;
    this.morphing = true;
    this.state.sex = v;
    $$('[data-sex]', this.root).forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.sex === v)));
    const from = this.body.female;
    this.tattooGroup.visible = false;
    await tween(900, (k) => this.body.setFemale(from + (v - from) * k));
    this.body.bake();
    this.tattoos.forEach((t) => t.rebuild(this.body));
    this.tattooGroup.visible = true;
    this.morphing = false;
    if (this.active) this.frameTattoo(this.active);
    else this.viewFull('front');
    this.emit();
  }

  // ---------------------------------------------------------------- stage interaction
  addReticle() {
    const g = new THREE.RingGeometry(0.009, 0.0115, 48);
    const m = new THREE.MeshBasicMaterial({ color: '#f3e7cf', transparent: true, opacity: 0.9, depthTest: false });
    this.reticle = new THREE.Mesh(g, m);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 16), m);
    this.reticle.add(dot);
    this.reticle.renderOrder = 10;
    this.reticle.visible = false;
    this.stage.scene.add(this.reticle);
  }

  bindStage() {
    const c = this.canvas;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = (e) => {
      const rect = c.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, this.stage.camera);
      return ray.intersectObject(this.body.bakedMesh, false)[0] || null;
    };
    const overTattoo = (h) => {
      if (!h) return null;
      // prefer the active one, then any other under the pointer
      const list = this.active ? [this.active, ...this.tattoos.filter((t) => t !== this.active)] : this.tattoos;
      return list.find((t) => {
        const { w, h: hh } = t.dims();
        return t.point && t.point.distanceTo(h.point) < Math.max(w, hh) * 0.45;
      }) || null;
    };
    let down = null, dragging = null, raf = 0;
    c.addEventListener('pointerdown', (e) => {
      if (this.morphing) return;
      const h = hit(e);
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      const t = overTattoo(h);
      if (t) {
        if (t !== this.active) this.select(t);
        dragging = t;
        this.stage.controls.enabled = false;
        c.setPointerCapture(e.pointerId);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const h = hit(e);
      if (dragging && h) {
        dragging.anchor = { face: h.faceIndex, bary: baryOf(this.body.baked, h.faceIndex, h.point) };
        dragging.upHint = upHintAt(h.point);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => dragging && dragging.rebuild(this.body));
        this.reticle.visible = false;
        return;
      }
      if (e.pointerType === 'mouse' && h && !down) {
        this.reticle.visible = true;
        this.reticle.position.copy(h.point).addScaledVector(h.face.normal, 0.002);
        this.reticle.lookAt(h.point.clone().add(h.face.normal));
        const s = this.stage.camera.position.distanceTo(h.point) * 0.6;
        this.reticle.scale.setScalar(Math.max(0.5, s));
        const t = overTattoo(h);
        c.classList.toggle('is-over-tattoo', !!t);
        c.classList.toggle('is-over-body', !t);
      } else if (!h) {
        this.reticle.visible = false;
        c.classList.remove('is-over-tattoo', 'is-over-body');
      }
    });
    const end = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 450;
      if (dragging) {
        const t = dragging;
        dragging = null;
        this.stage.controls.enabled = true;
        t.rebuild(this.body);
        t.zone = zoneForPoint(t.point, this.zones, this.body) || null;
        this.setControlsFrom(t);
        this.emit();
      } else if (moved < 6 && quick) {
        const h = hit(e);
        if (h) this.placeAtPoint(h);
      }
      down = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => { down = null; dragging = null; this.stage.controls.enabled = true; });
    c.addEventListener('pointerleave', () => { this.reticle.visible = false; });
  }

  placeAtPoint(h) {
    if (!this.design) return toast('Pick a design first');
    const anchor = { face: h.faceIndex, bary: baryOf(this.body.baked, h.faceIndex, h.point) };
    const upHint = upHintAt(h.point);
    const zone = zoneForPoint(h.point, this.zones, this.body);
    if (this.active) {
      Object.assign(this.active, { anchor, upHint, zone });
      this.active.rebuild(this.body);
      this.setControlsFrom(this.active);
    } else {
      this.newTattoo(anchor, { upHint, zone });
    }
    $('[data-hint]', this.root).classList.add('is-gone');
    this.renderLayers();
    this.emit();
  }

  renderLayers() {
    const el = $('[data-layers]', this.root);
    const items = this.tattoos.map((t, i) => {
      const thumb = t.design.thumb || t.design.canvas.toDataURL('image/png');
      t.design.thumb = thumb;
      return `<span class="layer" data-layer="${t.id}" aria-pressed="${t === this.active}" role="button" tabindex="0"><img alt="" src="${thumb}">${escapeHtml(t.design.name)}<button class="x" data-remove="${t.id}" aria-label="Remove tattoo ${i + 1}">✕</button></span>`;
    });
    if (this.tattoos.length && this.tattoos.length < 8) items.push('<button class="layer layer-add" data-add-layer>Add another tattoo</button>');
    el.innerHTML = items.join('');
  }

  // ---------------------------------------------------------------- outputs
  quote() {
    if (!this.tattoos.length) return null;
    let low = 0, high = 0, hours = 0;
    const lines = this.tattoos.map((t) => {
      const { w, h } = t.dims();
      const area = w * 100 * h * 100 * Math.min(1, 0.55 + (t.design.coverage || 0.1) * 2.2);
      const zid = t.zone?.split(':')[0];
      const diff = ZONES.find((z) => z.id === zid)?.difficulty || 1.1;
      const rate = PRICING.perCm2[t.design.colour ? 'colour' : t.design.style] || PRICING.perCm2['fine-line'];
      const detail = THREE.MathUtils.clamp(0.8 + (t.design.coverage || 0.1) * 2.8, 0.8, 1.9);
      const base = Math.max(PRICING.minimum, area * rate * diff * detail);
      const hrs = Math.max(0.75, 0.5 + (area / 45) * diff * detail * 0.6);
      low += Math.max(PRICING.minimum, base * 0.92); high += base * 1.15; hours += hrs;
      return { t, w, h, base };
    });
    const r500 = (v) => Math.round(v / 500) * 500;
    return { low: r500(low), high: r500(high), hours, lines };
  }

  download() {
    const url = this.stage.snapshot(2);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siyahi-preview-${Date.now()}.png`;
    a.click();
    toast('Preview saved');
  }

  shareState() {
    return {
      v: 1, sex: this.state.sex, skin: this.state.skin,
      t: this.tattoos.map((t) => ({
        d: t.design.kind === 'flash' ? { k: 'flash', id: t.design.id }
          : t.design.kind === 'text' ? { k: 'text', ...t.design.params }
          : t.design.kind === 'ai' ? { k: 'ai', p: t.design.prompt, st: t.design.style }
          : { k: 'upload' },
        f: t.anchor.face, b: t.anchor.bary.toArray().map((x) => +x.toFixed(4)),
        u: t.upHint.toArray().map((x) => +x.toFixed(3)),
        s: t.sizeCm, r: t.rotation, fl: t.flip ? 1 : 0, i: t.ink, a: +t.age.toFixed(2), z: t.zone,
      })),
    };
  }

  shareUrl() {
    return `${location.origin}${location.pathname}#d=${encodeState(this.shareState())}`;
  }

  async restoreFromHash() {
    const m = location.hash.match(/#d=([\w-]+)/);
    if (!m) return false;
    const s = decodeState(m[1]);
    if (!s?.t?.length) return false;
    try {
      if (s.skin) this.setSkin(s.skin);
      if (s.sex) await this.setSex(s.sex);
      let pendingAi = null;
      for (const it of s.t) {
        if (it.d.k === 'flash') {
          const d = FLASH.find((x) => x.id === it.d.id);
          if (!d) continue;
          const { canvas, aspect } = await rasterizeSvg(d.svg(), 1400);
          this.design = { kind: 'flash', id: d.id, name: d.name, style: 'fine-line', canvas, aspect, colour: false, thumb: flashThumb(d) };
        } else if (it.d.k === 'text') {
          const { canvas, aspect } = await renderLettering(it.d);
          this.design = { kind: 'text', params: it.d, name: `“${it.d.text.slice(0, 24)}”`, style: 'script', canvas, aspect, colour: false };
        } else {
          if (it.d.k === 'ai') pendingAi = it.d;
          continue;
        }
        this.design.coverage = inkCoverage(this.design.canvas);
        this.active = null;
        const t = this.newTattoo({ face: it.f, bary: new THREE.Vector3(...it.b) }, {
          sizeCm: it.s, rotation: it.r, flip: !!it.fl, ink: it.i, age: it.a, zone: it.z, upHint: new THREE.Vector3(...it.u),
        });
        t.refreshTexture();
      }
      if (pendingAi) {
        $('[data-src="describe"]', this.root).click();
        $('[data-idea]', this.root).value = pendingAi.p;
        toast('This link includes a sketched idea. Press “Sketch it” to draw it again.');
      }
      if (this.active) this.frameTattoo(this.active);
      return this.tattoos.length > 0;
    } catch (e) {
      console.warn('restore failed', e);
      return false;
    }
  }
}

function fitSize(size, aspect, z) {
  // tall zones (spine) take a tall design at full length; wide designs get a little less
  if (z.tall) return size;
  return aspect > 1.6 ? Math.min(size * 1.2, 30) : size;
}

export function dimsLabel(t) {
  const { w, h } = t.dims();
  return `${(w * 100).toFixed(1)} × ${(h * 100).toFixed(1)} cm`;
}

function fillRange(el) {
  const min = +el.min || 0, max = +el.max || 100;
  el.style.setProperty('--fill', `${((el.value - min) / (max - min)) * 100}%`);
}

export function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

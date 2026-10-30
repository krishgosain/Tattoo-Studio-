// Overlay choreography for the opening film: preloader, chapter rail, captions,
// HUD and the skip button. All timing is driven by the film's scroll progress.
import { $, $$ } from './util.js';
import { CHAPTERS, INK } from '../film/film.js';
import { scrollToEl, reduced } from './motion.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Preloader {
  constructor() {
    this.el = $('[data-preloader]');
    this.path = $('[data-pre-path]');
    this.count = $('[data-pre-count]');
    this.shown = 0;
    this.target = 0;
    this.t0 = performance.now();
    const tick = () => {
      if (this.done) return;
      this.shown += (this.target - this.shown) * 0.08;
      const v = Math.min(1, this.shown);
      this.path.style.strokeDashoffset = String(1 - v);
      this.count.textContent = String(Math.round(v * 100)).padStart(3, '0');
      requestAnimationFrame(tick);
    };
    tick();
  }
  progress(v) { this.target = Math.max(this.target, v); }
  async finish() {
    this.progress(1);
    // hold for at least 1.2 s so the line can finish drawing
    const wait = Math.max(0, 1200 - (performance.now() - this.t0));
    await new Promise((r) => setTimeout(r, wait + 450));
    this.done = true;
    this.count.textContent = '100';
    this.path.style.strokeDashoffset = '0';
    this.el.classList.add('is-out');
    document.documentElement.classList.remove('is-loading');
    document.documentElement.classList.add('is-loaded');
    await new Promise((r) => setTimeout(r, reduced ? 0 : 1400));
    this.el.remove();
  }
}

export class FilmUI {
  constructor(film) {
    this.film = film;
    this.root = $('[data-film]');
    this.caps = $$('[data-cap]', this.root).map((el) => {
      const [a, b] = el.dataset.cap.split(',').map(Number);
      return { el, a, b, final: el.hasAttribute('data-final'), on: false };
    });
    this.rail = $('[data-chapters]', this.root);
    this.rail.innerHTML = CHAPTERS.map((c, i) => `<li data-ch="${i}"><span class="ch-n">${String(i + 1).padStart(2, '0')}</span><span class="ch-name">${c.name}</span></li>`).join('');
    this.items = $$('[data-ch]', this.rail);
    this.bar = $('[data-film-bar]', this.root);
    this.hud = $('[data-hud-live]', this.root);
    this.hint = $('[data-scroll-hint]', this.root);
    this.nav = $('[data-nav]');
    $('[data-skip-film]', this.root).addEventListener('click', () => scrollToEl($('#try')));
    film.on((p, drawing) => this.update(p, drawing));
    this.lastHud = '';
  }

  update(p, drawing) {
    for (const c of this.caps) {
      const inside = p >= c.a && (c.final ? true : p < c.b);
      if (inside !== c.on) {
        c.on = inside;
        c.el.classList.toggle('is-on', inside);
      }
    }
    // chapter rail
    let ci = 0;
    CHAPTERS.forEach((c, i) => { if (p >= c.at) ci = i; });
    if (ci !== this.ci) {
      this.ci = ci;
      this.items.forEach((li, i) => { li.classList.toggle('is-active', i === ci); li.classList.toggle('is-past', i < ci); });
    }
    this.root.style.setProperty('--fp', p.toFixed(4));
    this.bar.style.transform = `scaleX(${p.toFixed(4)})`;
    this.hint.style.opacity = String(1 - clamp01(p / 0.03));
    this.root.classList.toggle('is-final', p > 0.93);
    // live HUD line: weather on the lane, needle telemetry while inking
    let hud;
    if (p < 0.24) hud = ['Light rain', '27 °C', '23:40'];
    else if (p < INK[0]) hud = ['Station one', 'Lamp 5600 K', 'Sterile field set'];
    else if (p < INK[1] + 0.01) {
      const done = drawing.done || 0;
      hud = ['3RL needle', '0.35 mm', '8.4 V', `Line ${String(Math.min(drawing.count, done + (drawing.tip.active ? 1 : 0))).padStart(2, '0')} of ${drawing.count}`];
    } else hud = ['Kamal', '7.5 cm', 'Inner forearm', 'Healed'];
    const key = hud.join('|');
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.hud.innerHTML = hud.map((h) => `<span>${h}</span>`).join('');
    }
  }
}

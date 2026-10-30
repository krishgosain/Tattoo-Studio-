// Site-wide motion system. Every effect degrades: no hover → no cursor/magnet,
// reduced motion → no smoothing, no splitting delays, no pinning.
import Lenis from 'lenis';
import { $, $$ } from './util.js';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export let lenis = null;
const ticks = new Set();
export const onTick = (fn) => { ticks.add(fn); return () => ticks.delete(fn); };

export function initSmoothScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
  }
  const raf = (t) => {
    lenis?.raf(t);
    ticks.forEach((fn) => fn(t));
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // in-page links glide
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });
}

export function scrollToEl(el, offset = 0) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

// ---------------------------------------------------------------- split text
export function splitText(root = document) {
  $$('[data-split]', root).forEach((el) => {
    if (el.dataset.splitDone) return;
    const text = el.textContent.trim();
    if (/[\u0900-\u0DFF]/.test(text)) { el.removeAttribute('data-split'); el.setAttribute('data-split-lines', ''); return; }
    el.setAttribute('aria-label', text);
    let i = 0;
    el.innerHTML = text.split(/(\s+)/).map((word) => {
      if (/^\s+$/.test(word)) return ' ';
      const chars = [...word].map((ch) => `<span class="ch" aria-hidden="true" style="--i:${i++}">${ch}</span>`).join('');
      return `<span class="word" aria-hidden="true">${chars}</span>`;
    }).join('');
    el.dataset.splitDone = '1';
  });
  $$('[data-split-lines]', root).forEach((el) => {
    if (el.dataset.splitDone) return;
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="wmask" aria-hidden="true"><span class="w" style="--i:${i}">${w}</span></span>`).join(' ');
    el.dataset.splitDone = '1';
  });
}

// ---------------------------------------------------------------- reveal on scroll
export function initReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  $$('[data-split], [data-split-lines], [data-reveal], [data-reveal-img]').forEach((el) => {
    if (el.closest('[data-film]')) return; // the film choreographs its own captions
    io.observe(el);
  });
}

// ---------------------------------------------------------------- cursor + magnet
export function initCursor() {
  if (!finePointer || reduced) return;
  const c = $('[data-cursor]');
  const label = $('[data-cursor-label]');
  if (!c) return;
  document.documentElement.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; c.classList.add('is-on'); }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
  onTick(() => {
    rx = lerp(rx, x, 0.18); ry = lerp(ry, y, 0.18);
    c.style.setProperty('--x', `${x}px`); c.style.setProperty('--y', `${y}px`);
    c.style.setProperty('--rx', `${rx}px`); c.style.setProperty('--ry', `${ry}px`);
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, [data-cursor], input, textarea, select, label, summary, canvas');
    c.classList.toggle('is-link', !!t && !t.matches('[data-cursor], canvas'));
    const tag = e.target.closest('[data-cursor]');
    c.classList.toggle('is-label', !!tag);
    label.textContent = tag ? tag.dataset.cursor : '';
    c.classList.toggle('is-canvas', !!e.target.closest('canvas'));
  });
}

export function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    let raf;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.transform = `translate(${dx * 0.28}px, ${dy * 0.35}px)`; });
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(0.34,1.56,0.64,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 600);
    });
  });
}

// ---------------------------------------------------------------- marquee that leans with scroll speed
export function initMarquee(words) {
  const track = $('[data-marquee-track]');
  if (!track) return;
  const sep = '<svg class="mq-sep" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 Q11.5 8.5 20 10 Q11.5 11.5 10 20 Q8.5 11.5 0 10 Q8.5 8.5 10 0Z"/></svg>';
  const row = words.map((w, i) => `<span class="mq-word${i % 2 ? ' is-outline' : ''}">${w}</span>${sep}`).join('');
  track.innerHTML = `<div class="mq-row">${row}</div><div class="mq-row">${row}</div>`;
  let x = 0, skew = 0;
  onTick(() => {
    const v = lenis ? lenis.velocity : 0;
    if (!reduced) x -= 0.6 + Math.min(Math.abs(v) * 0.5, 12);
    const w = track.firstElementChild.offsetWidth;
    if (w && -x > w) x += w;
    skew = lerp(skew, Math.max(-8, Math.min(8, v * 0.6)), 0.1);
    track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
  });
}

// ---------------------------------------------------------------- pinned horizontal gallery
export function initHScroll() {
  const sec = $('[data-hscroll]');
  if (!sec) return;
  const track = $('[data-hscroll-track] > *', sec);
  const bar = $('[data-hscroll-bar]', sec);
  const set = () => {
    if (innerWidth < 900 || reduced) { sec.style.height = ''; sec.classList.remove('is-pinned'); track.style.transform = ''; return; }
    sec.classList.add('is-pinned');
    const extra = Math.max(0, track.scrollWidth - innerWidth + 120);
    sec.style.height = `${innerHeight + extra}px`;
    sec.dataset.extra = extra;
  };
  set();
  addEventListener('resize', set);
  new ResizeObserver(set).observe(track);
  onTick(() => {
    if (!sec.classList.contains('is-pinned')) return;
    const r = sec.getBoundingClientRect();
    const extra = +sec.dataset.extra || 0;
    const p = clamp01(-r.top / Math.max(1, extra));
    track.style.transform = `translate3d(${-p * extra}px,0,0)`;
    if (bar) bar.style.transform = `scaleX(${p})`;
  });
}

// ---------------------------------------------------------------- artist preview that follows the cursor
export function initArtistFloat() {
  const float = $('[data-artist-float]');
  const img = $('[data-artist-float-img]');
  if (!float || !finePointer || reduced) return;
  let x = 0, y = 0, fx = 0, fy = 0, px = 0, on = false;
  $$('[data-artist-row]').forEach((row) => {
    row.addEventListener('pointerenter', () => { img.src = row.dataset.preview; on = true; float.classList.add('is-on'); });
    row.addEventListener('pointerleave', () => { on = false; float.classList.remove('is-on'); });
  });
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  onTick(() => {
    fx = lerp(fx, x, 0.1); fy = lerp(fy, y, 0.1);
    const vx = fx - px; px = fx;
    float.style.transform = `translate3d(${fx}px, ${fy}px, 0) translate(-50%, -50%) rotate(${Math.max(-12, Math.min(12, vx * 0.5))}deg) scale(${on ? 1 : 0.6})`;
  });
}

// ---------------------------------------------------------------- stacking cards: earlier cards sink as the next arrives
export function initStack() {
  const cards = $$('[data-stack-card]');
  if (!cards.length || reduced) return;
  onTick(() => {
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const r = next.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(next).top) || 0;
      const k = clamp01(1 - (r.top - top) / (innerHeight * 0.7));
      c.style.transform = `scale(${1 - k * 0.06})`;
      c.style.filter = `brightness(${1 - k * 0.45})`;
    });
  });
}

// ---------------------------------------------------------------- UV lens on flash pieces
export function initUVLens() {
  $$('[data-uv]').forEach((card) => {
    const lens = $('.uv', card);
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      lens.style.setProperty('--x', `${e.clientX - r.left}px`);
      lens.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });
}

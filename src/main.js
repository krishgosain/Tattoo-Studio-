import './fonts.js';
import { Configurator, dimsLabel, escapeHtml } from './ui/configurator.js';
import { PhotoTryOn } from './ui/tryon.js';
import { Film } from './film/film.js';
import { Preloader, FilmUI } from './ui/film-ui.js';
import { initSmoothScroll, splitText, initReveals, initCursor, initMagnetic, initMarquee, initHScroll, initArtistFloat, initStack, initUVLens, scrollToEl } from './ui/motion.js';
import { $, $$, toast, formatINR } from './ui/util.js';
import { STUDIO, PRICING, ARTISTS, PROCESS, AFTERCARE, MONSOON, FAQ } from './config.js';
import { FLASH, flashThumb } from './designs/flash.js';

// ---------------------------------------------------------------- static content
function renderContent() {
  // flash gallery: each piece also exists as a violet "UV" twin revealed by a lens under the cursor
  $('[data-flash-grid]').innerHTML = FLASH.map((d, i) => {
    const src = flashThumb(d);
    const uv = src.replace(/%23000/g, '%23c9a2ff');
    return `
    <article class="flash-card" data-reveal style="--d:${(i % 6) * 70}ms">
      <div class="art" data-uv data-cursor="UV">
        <img class="ink" src="${src}" alt="${d.name}: ${d.note}" loading="lazy">
        <div class="uv" aria-hidden="true"><img src="${uv}" alt="" loading="lazy"></div>
      </div>
      <div class="flash-meta">
        <span class="flash-n">${String(i + 1).padStart(2, '0')}</span>
        <h3>${d.name}</h3>
        <p>${d.note}</p>
      </div>
      <button class="btn btn-small btn-ghost" data-try-flash="${d.id}">Try it on</button>
    </article>`;
  }).join('');

  $('[data-process]').innerHTML = PROCESS.map((p, i) => `<li class="stack-card" data-stack-card style="--i:${i}"><span class="stack-n">${String(i + 1).padStart(2, '0')}</span><div><p class="time">${p.time}</p><h3>${p.title}</h3><p>${p.text}</p></div></li>`).join('');

  const marks = { meher: 'orchid', kabir: 'chakra', zoya: 'drishti' };
  $('[data-artists]').innerHTML = ARTISTS.map((a) => {
    const f = FLASH.find((x) => x.id === marks[a.id]);
    return `<li class="artist-row" data-artist-row data-preview="${flashThumb(f)}" data-reveal>
      <h3 class="artist-name">${a.name}</h3>
      <p class="artist-craft">${a.craft}</p>
      <p class="artist-bio">${a.bio}</p>
      <p class="artist-facts"><span>${a.years} years</span><span>${a.days}</span><span>@${a.handle}</span></p>
    </li>`;
  }).join('');
  $('[data-artist-select]').insertAdjacentHTML('beforeend', ARTISTS.map((a) => `<option value="${a.name}">${a.name}, ${a.craft.toLowerCase()}</option>`).join(''));

  const ex = (cm2, rate, diff = 1) => formatINR(Math.round(Math.max(PRICING.minimum, cm2 * rate * diff) / 500) * 500);
  $('[data-prices]').innerHTML = `
    <div class="price-cell"><span class="lbl">Minimum</span><span class="amt">${formatINR(PRICING.minimum)}</span><p>Any tattoo, including a single word or a tiny symbol.</p></div>
    <div class="price-cell"><span class="lbl">Fine-line, per cm²</span><span class="amt">${formatINR(PRICING.perCm2['fine-line'])}</span><p>Script from ${formatINR(PRICING.perCm2.script)}, dotwork ${formatINR(PRICING.perCm2.dotwork)}, colour ${formatINR(PRICING.perCm2.colour)}.</p></div>
    <div class="price-cell"><span class="lbl">Large work, per hour</span><span class="amt">${formatINR(PRICING.hourly)}</span><p>Back pieces and sleeves are billed by the session after the first.</p></div>
    <div class="price-cell"><span class="lbl">Deposit</span><span class="amt">${formatINR(PRICING.deposit)}</span><p>Holds your slot and comes off the final price.</p></div>
    <div class="price-examples">
      <div><strong>Name on the wrist, 5 × 2 cm</strong>${formatINR(PRICING.minimum)}, about 45 minutes</div>
      <div><strong>Botanical on the forearm, 12 × 6 cm</strong>around ${ex(72 * 0.7, PRICING.perCm2['fine-line'], 1.0 * 1.3)}, about 2 hours</div>
      <div><strong>Mandala on the upper back, 16 × 16 cm</strong>around ${ex(256 * 0.85, PRICING.perCm2.dotwork, 1.6)}, one long session</div>
    </div>`;

  $('[data-care]').innerHTML = AFTERCARE.map((c) => `<li><span class="when">${c.when}</span><p>${c.what}</p></li>`).join('');
  $('[data-monsoon]').innerHTML = MONSOON.map((m) => `<li>${m}</li>`).join('');
  $('[data-faq]').innerHTML = FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');

  $('[data-address]').innerHTML = STUDIO.address.join('<br>');
  $('[data-directions]').innerHTML = STUDIO.directions.map((d) => `<li>${d}</li>`).join('');
  $('[data-hours]').innerHTML = STUDIO.hours.map(([d, h]) => `<dt>${d}</dt><dd>${h}</dd>`).join('');
  $('[data-wa-link]').href = `https://wa.me/${STUDIO.whatsapp}?text=${encodeURIComponent('Hi Siyahi, I would like to book a consult.')}`;
  $('[data-maps-link]').href = `https://www.google.com/maps/search/?api=1&query=${STUDIO.geo.lat},${STUDIO.geo.lon}`;
  const { lat, lon } = STUDIO.geo;
  const map = $('[data-map]');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    map.innerHTML = `<iframe title="Map of the studio on Pali Hill, Bandra West" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.009}%2C${lat - 0.006}%2C${lon + 0.009}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lon}"></iframe>`;
  }, { rootMargin: '400px' });
  io.observe(map);
  $('[data-foot-line]').textContent = `${STUDIO.kind}, ${STUDIO.area}, ${STUDIO.city}. ${STUDIO.phoneDisplay}, ${STUDIO.email}, @${STUDIO.instagram}. ${STUDIO.meaning}`;
  $('[data-min-today]').min = new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- quote panel
function bindQuote(cfg) {
  const q = cfg.quote();
  const size = $('[data-q-size]'), time = $('[data-q-time]'), price = $('[data-q-price]'), note = $('[data-q-note]');
  if (!q) {
    size.textContent = time.textContent = price.textContent = '—';
    note.textContent = 'Place a design to see an estimate.';
    return;
  }
  size.textContent = q.lines.length > 1 ? `${q.lines.length} tattoos` : dimsLabel(q.lines[0].t);
  const h = q.hours;
  const half = Math.round(h * 2) / 2;
  time.textContent = h > 5.5 ? `${Math.ceil(h / 4.5)} sessions`
    : h < 0.9 ? 'Under an hour'
    : half === 1 ? 'About an hour'
    : `About ${Math.floor(half)}${half % 1 ? '½' : ''} hours`;
  price.textContent = q.low === q.high ? formatINR(q.low) : `${formatINR(q.low)} – ${formatINR(q.high).replace('₹', '')}`;
  note.textContent = `Includes placement and detail. Your artist confirms the final price; the ${formatINR(PRICING.deposit)} deposit comes off it.`;
}

// ---------------------------------------------------------------- booking
function bindBooking(cfg) {
  const dlg = $('[data-booking]');
  const form = $('[data-booking-form]');
  $$('[data-open-booking]').forEach((b) => b.addEventListener('click', () => {
    const prev = $('[data-book-preview]');
    if (cfg.ready && cfg.tattoos.length) {
      const img = cfg.stage.snapshot(1);
      const q = cfg.quote();
      const names = cfg.tattoos.map((t) => `${escapeHtml(t.design.name)} on the ${zoneName(t)}`).join(', ');
      prev.innerHTML = `<img src="${img}" alt="Your design on the 3D body"><div><strong>${names}</strong>${q.lines.length === 1 ? dimsLabel(q.lines[0].t) + '. ' : ''}Estimate ${formatINR(q.low)} to ${formatINR(q.high)}. A link to this exact design is included in your message.</div>`;
    } else {
      prev.innerHTML = '';
    }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }));
  form.addEventListener('submit', (e) => {
    const submitter = e.submitter;
    if (!submitter || submitter.value !== 'send') return;
    if (!form.reportValidity()) { e.preventDefault(); return; }
    const fd = new FormData(form);
    const lines = [
      `Hi Siyahi, I'd like to book a consult.`,
      `Name: ${fd.get('name')}`,
      `Phone: ${fd.get('phone')}`,
    ];
    if (fd.get('artist')) lines.push(`Artist: ${fd.get('artist')}`);
    if (fd.get('date')) lines.push(`Preferred date: ${new Date(fd.get('date')).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    if (cfg.tattoos.length) {
      const q = cfg.quote();
      cfg.tattoos.forEach((t, i) => {
        const what = t.design.kind === 'ai' ? `my idea "${t.design.prompt}" (${t.design.style})` : t.design.kind === 'upload' ? 'my own drawing (I will share it here)' : t.design.name;
        lines.push(`Tattoo ${i + 1}: ${what}, ${zoneName(t)}, ${dimsLabel(t)}, ${t.ink} ink`);
      });
      lines.push(`Site estimate: ${formatINR(q.low)} to ${formatINR(q.high)}`);
      lines.push(`My design: ${cfg.shareUrl()}`);
    }
    if (fd.get('notes')) lines.push(`Notes: ${fd.get('notes')}`);
    window.open(`https://wa.me/${STUDIO.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    toast('Opening WhatsApp with your request');
  });
}

function zoneName(t) {
  if (!t.zone) return 'body';
  const [id, side] = t.zone.split(':');
  const names = { chest: 'chest', sternum: 'sternum', collarbone: 'collarbone', stomach: 'stomach', ribs: 'ribs', hip: 'hip', 'upper-back': 'upper back', 'shoulder-blade': 'shoulder blade', spine: 'spine', 'lower-back': 'lower back', nape: 'nape', neck: 'side of the neck', 'behind-ear': 'spot behind the ear', shoulder: 'shoulder', 'upper-arm': 'upper arm', 'inner-bicep': 'inner bicep', forearm: 'forearm', 'inner-forearm': 'inner forearm', wrist: 'wrist', hand: 'back of the hand', thigh: 'thigh', 'outer-thigh': 'outer thigh', shin: 'shin', calf: 'calf', ankle: 'ankle', foot: 'top of the foot' };
  return `${side ? (side === 'L' ? 'left ' : 'right ') : ''}${names[id] || id}`;
}

// ---------------------------------------------------------------- boot
async function boot() {
  renderContent();
  splitText();
  initSmoothScroll();
  initReveals();
  initCursor();
  initMagnetic();
  initMarquee(['Fine-line', 'Script in seven alphabets', 'Dotwork', 'Ornamental', 'Micro-realism', 'Mehendi-inspired', 'Cover-ups', 'Single needle']);
  initHScroll();
  initArtistFloat();
  initStack();
  initUVLens();
  const nav = $('[data-nav]');
  const studioEl = $('#try');
  const onScroll = () => nav.classList.toggle('is-solid', studioEl.getBoundingClientRect().top < 90);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const studio = $('#try');
  const cfg = new Configurator(studio);
  window.__cfg = cfg; // handy for debugging in the console
  cfg.onChange(() => { bindQuote(cfg); tryon?.draw(); });
  bindBooking(cfg);

  const tryon = new PhotoTryOn(studio, () => {
    const t = cfg.active;
    if (t) return { canvas: t.texture.image, ink: t.ink, rotation: t.rotation };
    if (cfg.design) return { canvas: cfg.design.canvas, ink: 'black', rotation: 0 };
    return null;
  });

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const photo = b.dataset.mode === 'photo';
    $$('[data-mode]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('[data-stage-wrap]').hidden = photo;
    $('[data-photo]').hidden = !photo;
    tryon.show(photo);
    if (!photo) cfg.stage.resize();
  }));

  $('[data-share]').addEventListener('click', async () => {
    if (!cfg.tattoos.length) return toast('Place a design first');
    const url = cfg.shareUrl();
    try { await navigator.clipboard.writeText(url); toast('Link copied. Anyone with it sees this exact design.'); }
    catch { prompt('Copy this link', url); }
  });

  $('[data-flash-grid]').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-try-flash]');
    if (!b) return;
    scrollToEl(studio);
    $('[data-src="flash"]').click();
    await cfg.chooseFlash(FLASH.find((d) => d.id === b.dataset.tryFlash));
  });

  // the opening film: preloader tracks real loading, then splits open onto the lane
  const pre = new Preloader();
  const film = new Film($('[data-film]'), { onProgress: (v) => pre.progress(v * 0.9) });
  window.__film = film;
  try {
    await document.fonts.ready;
    await film.init();
    new FilmUI(film);
    $('[data-film]').classList.add('is-ready');
  } catch (e) {
    console.warn('film fell back to poster', e);
    $('[data-film]').classList.add('is-fallback');
  }
  await pre.finish();

  try {
    await cfg.init();
  } catch (e) {
    console.error(e);
    $('[data-loader-text]').textContent = 'The 3D preview needs WebGL. Try a recent version of Chrome, Safari or Firefox.';
  }
  window.ready = true;
}

boot();

// Script & lettering tattoos rendered from Google Fonts onto a transparent canvas.
export const FONTS = [
  { id: 'pinyon', name: 'Copperplate script', family: 'Pinyon Script', size: 170, sample: 'Amara' },
  { id: 'monsieur', name: 'Fine signature', family: 'Monsieur La Doulaise', size: 190, sample: 'Amara' },
  { id: 'bodoni', name: 'Hairline serif', family: 'Bodoni Moda Variable', size: 130, weight: 400, italic: true, sample: 'Amara' },
  { id: 'typewriter', name: 'Typewriter', family: 'Special Elite', size: 110, sample: 'amara' },
  { id: 'blackletter', name: 'Blackletter', family: 'UnifrakturMaguntia', size: 140, sample: 'Amara' },
  { id: 'kalam', name: 'Devanagari hand', family: 'Kalam', size: 140, weight: 400, sample: 'अमर' },
  { id: 'tiro', name: 'Devanagari serif', family: 'Tiro Devanagari Hindi', size: 140, sample: 'अमर' },
  { id: 'tamil', name: 'Tamil', family: 'Noto Serif Tamil', size: 120, weight: 400, sample: 'அமரா' },
];

let fontsLoading = null;
export function ensureFonts() {
  if (!fontsLoading) fontsLoading = import('../fonts-lettering.js');
  return fontsLoading;
}

export async function renderLettering({ text, fontId = 'pinyon', arc = 0, spacing = 0, flourish = false }) {
  await ensureFonts();
  const font = FONTS.find((x) => x.id === fontId) || FONTS[0];
  const css = `${font.italic ? 'italic ' : ''}${font.weight || 400} ${font.size}px "${font.family}"`;
  try { await document.fonts.load(css, text); } catch { /* fall back to whatever is available */ }
  const lines = (text || ' ').split('\n').slice(0, 3);
  const pad = font.size * 0.6;
  const m = document.createElement('canvas').getContext('2d');
  m.font = css;
  if ('letterSpacing' in m) m.letterSpacing = `${spacing}px`;
  const widths = lines.map((l) => m.measureText(l).width);
  const lineH = font.size * 1.25;
  const W = Math.ceil(Math.max(...widths) + pad * 2);
  const arcLift = arc ? Math.abs(arc) * W * 0.18 : 0;
  const H = Math.ceil(lineH * lines.length + pad * 2 + arcLift + (flourish ? font.size * 0.5 : 0));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.font = css;
  if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
  g.fillStyle = '#000';
  g.textBaseline = 'alphabetic';
  lines.forEach((line, li) => {
    const baseY = pad + lineH * (li + 0.8) + (arc > 0 ? arcLift : 0);
    if (!arc) {
      g.textAlign = 'center';
      g.fillText(line, W / 2, baseY);
      return;
    }
    // set each glyph along a circular arc
    const total = g.measureText(line).width;
    const R = (W * 0.9) / (Math.abs(arc) * 2.2);
    const cy = arc > 0 ? baseY + R : baseY - R;
    let x = -total / 2;
    g.textAlign = 'left';
    for (const ch of [...line]) {
      const w = g.measureText(ch).width + spacing;
      const ang = (x + w / 2) / R;
      g.save();
      if (arc > 0) {
        g.translate(W / 2 + Math.sin(ang) * R, cy - Math.cos(ang) * R);
        g.rotate(ang);
      } else {
        g.translate(W / 2 + Math.sin(ang) * R, cy + Math.cos(ang) * R);
        g.rotate(-ang);
      }
      g.fillText(ch, -w / 2 + spacing / 2, 0);
      g.restore();
      x += w;
    }
  });
  if (flourish) {
    const y = H - pad * 0.9;
    g.strokeStyle = '#000';
    g.lineWidth = Math.max(2, font.size * 0.025);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(W * 0.18, y);
    g.bezierCurveTo(W * 0.35, y - font.size * 0.25, W * 0.5, y + font.size * 0.2, W * 0.82, y - font.size * 0.08);
    g.stroke();
  }
  return trim(c, 24);
}

// crop to the inked bounding box with a little breathing room
export function trim(c, margin = 16) {
  const g = c.getContext('2d');
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) return { canvas: c, aspect: c.width / c.height };
  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin);
  x1 = Math.min(width, x1 + margin); y1 = Math.min(height, y1 + margin);
  const o = document.createElement('canvas');
  o.width = x1 - x0; o.height = y1 - y0;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return { canvas: o, aspect: o.width / o.height };
}

// --- personal text generators -------------------------------------------
export function toRoman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}
export function romanDate(iso, sep = ' · ') {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return [toRoman(d), toRoman(m), toRoman(y)].join(sep);
}
export const PLACES = [
  { name: 'Marine Drive', lat: 18.9432, lon: 72.8236 },
  { name: 'Bandstand, Bandra', lat: 19.0466, lon: 72.8197 },
  { name: 'Gateway of India', lat: 18.922, lon: 72.8347 },
  { name: 'Juhu Beach', lat: 19.0988, lon: 72.8267 },
  { name: 'Carter Road', lat: 19.0681, lon: 72.8216 },
];
export function coords(lat, lon) {
  const fmt = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  return `${fmt(lat, 'N', 'S')}  ${fmt(lon, 'E', 'W')}`;
}

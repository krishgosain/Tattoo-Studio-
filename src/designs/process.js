// Turn any picture (an upload, an AI sketch) into tattoo-ready ink:
// paper / background becomes transparent, linework becomes ink.
import { trim } from './lettering.js';

export async function loadImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Image could not be loaded')); img.src = src; });
  return img;
}

/**
 * @param {HTMLImageElement|HTMLCanvasElement} img
 * @param {{keepColour?:boolean, threshold?:number, softness?:number, maxSide?:number}} o
 */
export function inkify(img, o = {}) {
  const { keepColour = false, threshold = 0.82, softness = 0.22, maxSide = 1400 } = o;
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const s = Math.min(1, maxSide / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;

  // estimate the background from the border: light paper vs dark background
  let edge = 0, n = 0;
  const sample = (x, y) => { const i = (y * c.width + x) * 4; edge += (px[i] + px[i + 1] + px[i + 2]) / 765; n++; };
  for (let x = 0; x < c.width; x += 4) { sample(x, 0); sample(x, c.height - 1); }
  for (let y = 0; y < c.height; y += 4) { sample(0, y); sample(c.width - 1, y); }
  const bgLight = edge / n > 0.5;
  const alreadyTransparent = px[3] < 250 && px[px.length - 1] < 250;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gg = px[i + 1], b = px[i + 2], a = px[i + 3] / 255;
    let lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    if (!bgLight && !alreadyTransparent) lum = 1 - lum;
    // saturated colour counts as ink even if it is light
    const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
    const sat = max ? (max - min) / max : 0;
    let ink = alreadyTransparent ? a : clamp((threshold - lum) / softness + (keepColour ? sat * 0.9 : 0), 0, 1) * a;
    ink = Math.pow(ink, 0.85);
    if (keepColour) {
      px[i + 3] = ink * 255;
    } else {
      px[i] = px[i + 1] = px[i + 2] = 0;
      px[i + 3] = ink * 255;
    }
  }
  g.putImageData(d, 0, 0);
  return trim(c, 20);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// share of the design area that carries ink (drives time + price estimates)
export function inkCoverage(canvas) {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s; c.height = Math.max(1, Math.round(s * canvas.height / canvas.width));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 3; i < d.length; i += 4) sum += d[i] / 255;
  return sum / (c.width * c.height);
}

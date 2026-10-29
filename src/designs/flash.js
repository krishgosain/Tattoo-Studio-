// Studio flash: original fine-line designs drawn as SVG so they stay crisp at
// any size. Strokes are black on transparent; the ink renderer tints them.
const TAU = Math.PI * 2;
const f = (n) => +n.toFixed(2);
const pt = (cx, cy, r, a) => [f(cx + Math.cos(a) * r), f(cy + Math.sin(a) * r)];

function svg(w, h, body, sw = 2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g fill="none" stroke="#000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}
const dots = (list, r = 2.2) => list.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${rr || r}" fill="#000" stroke="none"/>`).join('');
function star4(x, y, r) {
  const k = r * 0.22;
  return `<path d="M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z" fill="#000" stroke="none"/>`;
}
// seeded random so procedural designs are stable
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const designs = [
  {
    id: 'luna', name: 'Luna', note: 'Crescent, scattered stars, a dotted orbit', style: 'Fine-line',
    svg() {
      let b = `<path d="M232 70 A130 130 0 1 0 232 330 A104 104 0 1 1 232 70Z" stroke-width="2.4"/>`;
      b += `<path d="M214 104 A98 98 0 0 0 214 296" stroke-width="1.2" opacity=".8"/>`;
      const d = [];
      for (let a = -1.25; a <= 1.25; a += 0.085) d.push([...pt(200, 200, 168, a), 1.6]);
      b += dots(d);
      b += star4(300, 120, 16) + star4(330, 210, 9) + star4(284, 272, 12) + star4(110, 70, 7);
      b += dots([[262, 160, 2.4], [318, 168, 1.8], [300, 316, 2], [350, 280, 1.6]]);
      return svg(400, 400, b);
    },
  },
  {
    id: 'web', name: 'Spider web', note: 'Nine spokes, sagging threads, one small resident', style: 'Fine-line',
    svg() {
      const cx = 200, cy = 190, n = 9, R = 175;
      const ang = [...Array(n)].map((_, i) => -Math.PI / 2 + (i * TAU) / n + (i % 2 ? 0.06 : -0.04));
      let b = '';
      ang.forEach((a) => { const [x, y] = pt(cx, cy, R, a); b += `<path d="M${cx} ${cy} L${x} ${y}"/>`; });
      for (let r = 26; r < R; r += 21 + r * 0.06) {
        let d = '';
        ang.forEach((a, i) => {
          const a2 = ang[(i + 1) % n];
          const [x1, y1] = pt(cx, cy, r, a), [x2, y2] = pt(cx, cy, r, a2);
          let mid = (a + a2) / 2; if (a2 < a) mid += Math.PI;
          const [qx, qy] = pt(cx, cy, r * 0.82, mid);
          d += `${i ? '' : `M${x1} ${y1}`} Q${qx} ${qy} ${x2} ${y2}`;
        });
        b += `<path d="${d}" stroke-width="1.5"/>`;
      }
      // hanging spider
      b += `<path d="M262 252 L262 330" stroke-width="1.2"/>`;
      b += `<ellipse cx="262" cy="340" rx="7" ry="9" fill="#000"/><circle cx="262" cy="328" r="4.5" fill="#000"/>`;
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const y = 333 + k * 4;
        b += `<path d="M${262 + s * 5} ${y} q${s * 9} ${-8 + k * 4} ${s * 15} ${k * 5 - 2}" stroke-width="1.4"/>`;
      }
      return svg(400, 380, b);
    },
  },
  {
    id: 'orchid', name: 'Orchid', note: 'A single stem, two buds, open bloom', style: 'Botanical',
    svg() {
      let b = '';
      b += `<path d="M206 590 C200 500 214 420 196 340 C186 296 194 250 222 214" stroke-width="2.2"/>`;
      b += `<path d="M222 214 C238 190 262 176 290 172" stroke-width="1.8"/>`;
      // buds
      b += `<path d="M290 172 c18 -6 30 4 26 18 c-4 12 -24 14 -30 2 c-3 -8 0 -16 4 -20Z"/>`;
      b += `<path d="M262 178 c4 -18 22 -26 34 -18" stroke-width="1.4"/>`;
      // bloom centred at 170,290
      const cx = 168, cy = 250;
      b += `<path d="M197 352 C190 320 176 300 ${cx + 4} ${cy + 64}" stroke-width="1.8"/>`;
      const petal = (a, len, wid) => {
        const [tx, ty] = pt(cx, cy, len, a);
        const [l1x, l1y] = pt(cx, cy, len * 0.55, a - wid);
        const [r1x, r1y] = pt(cx, cy, len * 0.55, a + wid);
        return `<path d="M${cx} ${cy} Q${l1x} ${l1y} ${tx} ${ty} Q${r1x} ${r1y} ${cx} ${cy}Z"/>`;
      };
      b += petal(-Math.PI / 2, 120, 0.42); // dorsal sepal
      b += petal(Math.PI * 0.2, 118, 0.36) + petal(Math.PI * 0.8, 118, 0.36); // lateral sepals
      b += petal(-0.18, 132, 0.6) + petal(Math.PI + 0.18, 132, 0.6); // petals
      // lip
      b += `<path d="M${cx - 22} ${cy + 6} C${cx - 40} ${cy + 46} ${cx - 10} ${cy + 76} ${cx} ${cy + 62} C${cx + 10} ${cy + 76} ${cx + 40} ${cy + 46} ${cx + 22} ${cy + 6}" stroke-width="2"/>`;
      b += `<path d="M${cx - 9} ${cy + 20} q9 14 18 0" stroke-width="1.3"/>`;
      // centre column + vein hints
      b += `<ellipse cx="${cx}" cy="${cy - 4}" rx="7" ry="11"/>`;
      for (const a of [-0.18, Math.PI + 0.18]) {
        const [x, y] = pt(cx, cy, 88, a);
        b += `<path d="M${cx} ${cy} Q${(cx + x) / 2} ${(cy + y) / 2 - 6} ${x} ${y}" stroke-width="1" opacity=".7"/>`;
      }
      b += dots([[cx - 8, cy + 34, 1.6], [cx + 6, cy + 40, 1.6], [cx - 2, cy + 46, 1.4]]);
      // leaves
      b += `<path d="M204 520 C150 500 120 470 108 430 C150 440 186 470 204 520Z" stroke-width="1.8"/><path d="M204 520 C170 488 140 462 112 434" stroke-width="1"/>`;
      b += `<path d="M207 560 C260 540 296 500 300 466 C262 478 222 512 207 560Z" stroke-width="1.8"/><path d="M207 560 C236 528 266 498 298 470" stroke-width="1"/>`;
      return svg(400, 600, b);
    },
  },
  {
    id: 'kamal', name: 'Kamal', note: 'Lotus on still water, with dotted halo', style: 'Fine-line',
    svg() {
      const cx = 200, base = 270;
      let b = '';
      const petal = (dx, h, w, tilt) => {
        const tx = cx + dx + tilt, ty = base - h;
        return `<path d="M${cx + dx * 0.25} ${base} C${cx + dx - w} ${base - h * 0.45} ${tx - w * 0.3} ${ty + h * 0.15} ${tx} ${ty} C${tx + w * 0.3} ${ty + h * 0.15} ${cx + dx + w} ${base - h * 0.45} ${cx + dx * 0.25} ${base}Z"/>`;
      };
      b += petal(-112, 66, 44, -46) + petal(112, 66, 44, 46);
      b += petal(-76, 116, 50, -26) + petal(76, 116, 50, 26);
      b += petal(-36, 152, 48, -8) + petal(36, 152, 48, 8);
      b += petal(0, 178, 50, 0);
      // centre vein
      b += `<path d="M${cx} ${base - 20} L${cx} ${base - 150}" stroke-width="1.1" opacity=".75"/>`;
      // base bowl + water
      b += `<path d="M86 ${base} Q200 ${base + 34} 314 ${base}" stroke-width="2"/>`;
      b += `<path d="M60 ${base + 34} H150 M176 ${base + 34} H340 M100 ${base + 52} H300 M150 ${base + 68} H250" stroke-width="1.4"/>`;
      const d = [];
      for (let a = Math.PI * 1.08; a <= Math.PI * 1.92; a += 0.07) d.push([...pt(cx, base - 30, 196, a), 1.7]);
      b += dots(d);
      b += star4(cx, 40, 9);
      return svg(400, 340, b);
    },
  },
  {
    id: 'chakra', name: 'Chakra', note: 'Dotwork mandala in eight-fold symmetry', style: 'Dotwork',
    svg() {
      const c = 200;
      let b = `<circle cx="${c}" cy="${c}" r="20"/><circle cx="${c}" cy="${c}" r="9" fill="#000"/>`;
      // inner 8 petals
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        const [tx, ty] = pt(c, c, 74, a), [l, lr] = [pt(c, c, 46, a - 0.36), pt(c, c, 46, a + 0.36)];
        b += `<path d="M${pt(c, c, 22, a - 0.3).join(' ')} Q${l.join(' ')} ${tx} ${ty} Q${lr.join(' ')} ${pt(c, c, 22, a + 0.3).join(' ')}"/>`;
        b += `<path d="M${pt(c, c, 30, a).join(' ')} L${pt(c, c, 58, a).join(' ')}" stroke-width="1"/>`;
      }
      b += `<circle cx="${c}" cy="${c}" r="86" stroke-width="1.4"/>`;
      const d = [];
      for (let i = 0; i < 64; i++) d.push([...pt(c, c, 96, (i * TAU) / 64), 1.9]);
      // 16 outer petals
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16;
        const [tx, ty] = pt(c, c, 150, a);
        b += `<path d="M${pt(c, c, 104, a - 0.17).join(' ')} Q${pt(c, c, 132, a - 0.2).join(' ')} ${tx} ${ty} Q${pt(c, c, 132, a + 0.2).join(' ')} ${pt(c, c, 104, a + 0.17).join(' ')}"/>`;
        // stippled shading inside each petal (density falls toward the tip)
        for (let k = 0; k < 7; k++) {
          const rr = 110 + k * 5.5;
          const spread = 0.1 * (1 - k / 8);
          for (let j = -1; j <= 1; j++) d.push([...pt(c, c, rr, a + j * spread * 0.8), 1.15 - k * 0.07]);
        }
        d.push([...pt(c, c, 160, a), 2.4]);
        d.push([...pt(c, c, 172, a + TAU / 32), 1.6]);
      }
      b += dots(d);
      b += `<circle cx="${c}" cy="${c}" r="182" stroke-width="1.2"/>`;
      for (let i = 0; i < 48; i++) {
        const a = (i * TAU) / 48;
        b += `<path d="M${pt(c, c, 182, a).join(' ')} L${pt(c, c, 192, a + TAU / 96).join(' ')} L${pt(c, c, 182, a + TAU / 48).join(' ')}" stroke-width="1.2"/>`;
      }
      return svg(400, 400, b);
    },
  },
  {
    id: 'mor', name: 'Mor pankh', note: 'Peacock feather — eye, barbs and drift', style: 'Fine-line',
    svg() {
      const r = rng(7);
      let b = `<path d="M206 590 C204 470 196 330 200 120" stroke-width="2.2"/>`;
      // eye
      b += `<path d="M200 70 C246 80 262 136 240 176 C224 204 176 204 160 176 C138 136 154 80 200 70Z" stroke-width="2"/>`;
      b += `<path d="M200 98 C228 106 236 140 224 160 C214 176 186 176 176 160 C164 140 172 106 200 98Z" stroke-width="1.6"/>`;
      b += `<path d="M200 118 C215 124 218 142 211 151 C205 160 195 160 189 151 C182 142 185 124 200 118Z" fill="#000"/>`;
      // barbs: fine strokes leaving the shaft, curving outward and up
      for (let y = 196; y < 560; y += 10) {
        const t = (y - 196) / 364;
        const len = 120 * (1 - t * 0.75) + r() * 10;
        const xs = 200 + (y - 120) * 0.008;
        for (const s of [-1, 1]) {
          const ex = xs + s * len * (0.85 + r() * 0.15);
          const ey = y - len * (0.5 - t * 0.2);
          b += `<path d="M${f(xs)} ${y} Q${f(xs + s * len * 0.4)} ${f(y - 6)} ${f(ex)} ${f(ey)}" stroke-width="${f(1.1 - t * 0.3)}"/>`;
        }
      }
      // barbs around the eye
      for (let a = -Math.PI * 1.1; a < Math.PI * 0.1; a += 0.09) {
        const [x1, y1] = pt(200, 136, 72, a), [x2, y2] = pt(200, 136, 118 + r() * 14, a + 0.08);
        b += `<path d="M${x1} ${y1} Q${pt(200, 136, 96, a - 0.02).join(' ')} ${x2} ${y2}" stroke-width="1"/>`;
      }
      return svg(400, 600, b);
    },
  },
  {
    id: 'sealink', name: 'Sea Link', note: 'Bandra–Worli at dusk, Arabian Sea below', style: 'Fine-line · Mumbai',
    svg() {
      let b = '';
      const deck = 250;
      b += `<path d="M10 ${deck} C140 ${deck - 6} 460 ${deck - 6} 590 ${deck}" stroke-width="2.4"/>`;
      b += `<path d="M10 ${deck + 8} C140 ${deck + 2} 460 ${deck + 2} 590 ${deck + 8}" stroke-width="1.3"/>`;
      // two inverted-Y pylons
      for (const x of [220, 400]) {
        b += `<path d="M${x - 16} ${deck + 6} L${x - 3} 70 L${x + 3} 70 L${x + 16} ${deck + 6}" stroke-width="2"/>`;
        b += `<path d="M${x - 9} 160 L${x + 9} 160 M${x - 6} 118 L${x + 6} 118" stroke-width="1.3"/>`;
        // cable fans
        for (let i = 1; i <= 9; i++) {
          const yTop = 80 + i * 7;
          b += `<path d="M${x} ${yTop} L${x - 20 - i * 15} ${deck - 4}" stroke-width=".9"/>`;
          b += `<path d="M${x} ${yTop} L${x + 20 + i * 15} ${deck - 4}" stroke-width=".9"/>`;
        }
      }
      // piers
      for (let x = 40; x < 590; x += 46) b += `<path d="M${x} ${deck + 8} L${x} ${deck + 34}" stroke-width="1.4"/>`;
      // water
      b += `<path d="M30 ${deck + 44} H240 M270 ${deck + 44} H560 M80 ${deck + 58} H330 M370 ${deck + 58} H520 M160 ${deck + 72} H440" stroke-width="1.2"/>`;
      // setting sun + birds
      b += `<circle cx="490" cy="150" r="34" stroke-width="1.6"/>`;
      for (let y = 170; y < 186; y += 5) b += `<path d="M${490 - Math.sqrt(34 * 34 - (y - 150) ** 2)} ${y} H${490 + Math.sqrt(34 * 34 - (y - 150) ** 2)}" stroke-width="1"/>`;
      for (const [x, y, s] of [[90, 90, 1], [120, 70, 0.8], [140, 102, 0.6]]) b += `<path d="M${x - 10 * s} ${y} q${5 * s} ${-6 * s} ${10 * s} 0 q${5 * s} ${-6 * s} ${10 * s} 0" stroke-width="1.3"/>`;
      return svg(600, 340, b);
    },
  },
  {
    id: 'cutting', name: 'Cutting chai', note: 'Half glass, full heart — steam that curls into one', style: 'Fine-line · Mumbai',
    svg() {
      let b = '';
      // glass: tapered tumbler with facets
      b += `<path d="M120 200 L280 200 L262 420 Q260 432 248 432 L152 432 Q140 432 138 420 Z" stroke-width="2.2"/>`;
      for (let i = 1; i < 8; i++) {
        const xt = 120 + i * 20, xb = 140 + i * 15;
        b += `<path d="M${xt} 206 L${xb} 426" stroke-width=".9" opacity=".75"/>`;
      }
      b += `<path d="M125 262 Q200 274 275 262" stroke-width="1.6"/>`;
      // chai level stippling
      const d = []; const r = rng(3);
      for (let i = 0; i < 150; i++) {
        const y = 268 + Math.pow(r(), 0.7) * 158; const t = (y - 200) / 232;
        const half = 80 - t * 18;
        d.push([200 + (r() * 2 - 1) * (half - 10), y, 0.8 + r() * 0.5]);
      }
      b += dots(d, 1.2);
      // steam forming a heart
      b += `<path d="M200 186 C176 160 214 140 192 112 C170 84 138 96 140 122 C142 150 182 166 200 190" stroke-width="1.6"/>`;
      b += `<path d="M200 190 C218 166 258 150 260 122 C262 96 230 84 208 112 C196 128 210 150 202 172" stroke-width="1.6"/>`;
      b += `<path d="M166 176 C152 160 170 150 160 136" stroke-width="1.1"/><path d="M236 176 C250 160 232 150 242 136" stroke-width="1.1"/>`;
      return svg(400, 460, b);
    },
  },
  {
    id: 'naag', name: 'Naag', note: 'Serpent in an S-curve, scale-hatched', style: 'Blackwork',
    svg() {
      const pts = [];
      for (let t = 0; t <= 1; t += 0.01) {
        const y = 560 - t * 470;
        const x = 200 + Math.sin(t * Math.PI * 2.4 + 0.4) * 92 * (0.5 + t * 0.5);
        pts.push([x, y, 6 + 18 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * (1 - t * 0.25)]);
      }
      const side = (s) => pts.map(([x, y, w], i) => {
        const [nx, ny] = pts[Math.min(i + 1, pts.length - 1)];
        const [px, py] = pts[Math.max(i - 1, 0)];
        let dx = nx - px, dy = ny - py; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        return [x - dy * w * s, y + dx * w * s];
      });
      const L = side(1), R = side(-1);
      let b = `<path d="M${L.map((p) => p.map(f).join(' ')).join(' L')}" stroke-width="2"/>`;
      b += `<path d="M${R.map((p) => p.map(f).join(' ')).join(' L')}" stroke-width="2"/>`;
      // ventral scales
      for (let i = 4; i < pts.length - 6; i += 2) {
        b += `<path d="M${L[i].map(f).join(' ')} Q${f(pts[i][0])} ${f(pts[i][1] + 4)} ${R[i].map(f).join(' ')}" stroke-width=".9"/>`;
      }
      // head
      const [hx, hy] = pts[pts.length - 1];
      b += `<path d="M${hx - 22} ${hy + 12} C${hx - 30} ${hy - 20} ${hx - 10} ${hy - 44} ${hx} ${hy - 46} C${hx + 10} ${hy - 44} ${hx + 30} ${hy - 20} ${hx + 22} ${hy + 12}" stroke-width="2.2"/>`;
      b += `<ellipse cx="${hx - 9}" cy="${hy - 22}" rx="3.2" ry="4.5" fill="#000"/><ellipse cx="${hx + 9}" cy="${hy - 22}" rx="3.2" ry="4.5" fill="#000"/>`;
      b += `<path d="M${hx} ${hy - 46} L${hx} ${hy - 66} M${hx} ${hy - 66} l-6 -8 M${hx} ${hy - 66} l6 -8" stroke="#000" stroke-width="1.4"/>`;
      b += `<path d="M${pts[0][0]} ${pts[0][1]} q-6 22 -20 30" stroke-width="1.8"/>`;
      return svg(400, 600, b);
    },
  },
  {
    id: 'dagger', name: 'Dagger', note: 'Fullered blade, wrapped grip', style: 'Traditional line',
    svg() {
      let b = '';
      b += `<path d="M200 560 L176 220 L224 220 Z" stroke-width="2.2"/>`;
      b += `<path d="M200 540 L200 228" stroke-width="1.2"/>`;
      b += `<path d="M146 220 Q200 196 254 220 Q200 232 146 220Z" stroke-width="2"/>`;
      b += `<circle cx="140" cy="220" r="8"/><circle cx="260" cy="220" r="8"/>`;
      b += `<path d="M186 214 L188 108 L212 108 L214 214" stroke-width="2"/>`;
      for (let y = 120; y < 210; y += 9) b += `<path d="M187 ${y} L213 ${y + 7}" stroke-width="1.2"/>`;
      b += `<path d="M180 108 Q200 96 220 108" stroke-width="1.8"/>`;
      b += `<circle cx="200" cy="80" r="18" stroke-width="2"/><circle cx="200" cy="80" r="6" fill="#000"/>`;
      b += dots([[200, 590, 2.4], [200, 606, 1.8], [200, 619, 1.4]]);
      return svg(400, 640, b);
    },
  },
  {
    id: 'titli', name: 'Titli', note: 'Butterfly with vein lines and wing dots', style: 'Fine-line',
    svg() {
      let b = '';
      const wing = (s) => {
        let w = `<path d="M200 190 C${200 + s * 40} 110 ${200 + s * 120} 50 ${200 + s * 170} 66 C${200 + s * 196} 76 ${200 + s * 180} 150 ${200 + s * 120} 190 C${200 + s * 90} 210 ${200 + s * 40} 206 200 196Z" stroke-width="2"/>`;
        w += `<path d="M200 204 C${200 + s * 60} 214 ${200 + s * 130} 230 ${200 + s * 136} 290 C${200 + s * 140} 330 ${200 + s * 90} 340 ${200 + s * 60} 316 C${200 + s * 30} 290 ${200 + s * 14} 250 200 212Z" stroke-width="2"/>`;
        for (const [x, y] of [[150, 72], [130, 120], [96, 160], [60, 186]]) w += `<path d="M${200 + s * 10} 192 Q${200 + s * (x * 0.4)} ${(192 + y) / 2 + 10} ${200 + s * x} ${y + 20}" stroke-width=".9"/>`;
        for (const [x, y] of [[120, 270], [90, 310], [50, 300]]) w += `<path d="M${200 + s * 8} 210 Q${200 + s * x * 0.4} ${(210 + y) / 2} ${200 + s * x} ${y}" stroke-width=".9"/>`;
        w += dots([[200 + s * 150, 96, 3.2], [200 + s * 128, 150, 2.4], [200 + s * 100, 290, 2.8]]);
        return w;
      };
      b += wing(1) + wing(-1);
      b += `<ellipse cx="200" cy="230" rx="7" ry="58" fill="#000" stroke="none"/><circle cx="200" cy="164" r="9" fill="#000" stroke="none"/>`;
      b += `<path d="M196 156 C186 120 170 100 156 92 M204 156 C214 120 230 100 244 92" stroke-width="1.4"/>`;
      b += dots([[156, 92, 3], [244, 92, 3]]);
      return svg(400, 360, b);
    },
  },
  {
    id: 'ambi', name: 'Ambi', note: 'Paisley in the mehendi tradition', style: 'Ornamental',
    svg() {
      let b = '';
      const outer = 'M200 560 C80 540 60 400 110 320 C160 240 250 240 280 170 C300 120 280 70 240 50 C320 60 360 160 340 260 C320 380 300 560 200 560Z';
      b += `<path d="${outer}" stroke-width="2.4"/>`;
      b += `<path d="M200 530 C108 512 96 404 134 336 C174 266 262 262 296 196 C312 160 310 120 292 96 C330 140 336 210 320 280 C302 380 280 528 200 530Z" stroke-width="1.4"/>`;
      // inner flower
      const c = [214, 410];
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        b += `<path d="M${pt(...c, 12, a - 0.4).join(' ')} Q${pt(...c, 46, a).join(' ')} ${pt(...c, 12, a + 0.4).join(' ')}" stroke-width="1.5"/>`;
      }
      b += `<circle cx="${c[0]}" cy="${c[1]}" r="9" fill="#000"/>`;
      b += `<circle cx="${c[0]}" cy="${c[1]}" r="62" stroke-width="1.1"/>`;
      const d = [];
      for (let i = 0; i < 36; i++) d.push([...pt(...c, 72, (i * TAU) / 36), 1.8]);
      // upper vine with leaves
      b += `<path d="M262 118 C250 160 214 196 176 214" stroke-width="1.4"/>`;
      for (const [x, y, a] of [[248, 156, -0.6], [222, 186, -0.3], [196, 206, 0.1]]) {
        b += `<path transform="rotate(${a * 57} ${x} ${y})" d="M${x} ${y} c-10 -14 -2 -26 10 -28 c4 12 2 22 -10 28Z" stroke-width="1.2"/>`;
      }
      b += dots(d);
      return svg(400, 600, b);
    },
  },
  {
    id: 'parvat', name: 'Parvat', note: 'Ridge line in a circle, sun on the rise', style: 'Minimal',
    svg() {
      let b = `<circle cx="200" cy="200" r="170" stroke-width="2.2"/>`;
      b += `<clipPath id="c"><circle cx="200" cy="200" r="169"/></clipPath><g clip-path="url(#c)">`;
      b += `<path d="M20 290 L110 170 L150 214 L220 112 L290 210 L320 180 L390 268" stroke-width="2"/>`;
      b += `<path d="M220 112 L206 150 L226 170 L214 200 M110 170 L104 196 L118 214" stroke-width="1.2"/>`;
      b += `<path d="M20 320 L130 250 L200 296 L280 240 L390 312" stroke-width="1.6"/>`;
      for (let x = 40; x < 370; x += 18) b += `<path d="M${x} 352 l6 -18 l6 18" stroke-width="1.2"/>`;
      b += `</g><circle cx="282" cy="118" r="22" stroke-width="1.6"/>`;
      for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; b += `<path d="M${pt(282, 118, 30, a).join(' ')} L${pt(282, 118, 38, a).join(' ')}" stroke-width="1.2"/>`; }
      return svg(400, 400, b);
    },
  },
  {
    id: 'lehar', name: 'Lehar', note: 'A wave folding over itself, monsoon-sized', style: 'Fine-line',
    svg() {
      let b = `<circle cx="200" cy="200" r="168" stroke-width="2"/>`;
      b += `<clipPath id="w"><circle cx="200" cy="200" r="167"/></clipPath><g clip-path="url(#w)">`;
      // main curl
      b += `<path d="M30 300 C80 290 120 220 160 170 C200 120 270 100 310 130 C340 152 330 196 300 200 C272 204 262 180 276 166 C286 156 300 162 298 174" stroke-width="2.4"/>`;
      for (let k = 1; k <= 5; k++) {
        b += `<path d="M${30 + k * 10} ${310 + k * 6} C${80 + k * 8} ${300 + k * 4} ${124 + k * 6} ${236 + k * 8} ${166 + k * 4} ${188 + k * 9} C${206 + k} ${140 + k * 9} ${266 - k * 4} ${124 + k * 9} ${296 - k * 6} ${146 + k * 6}" stroke-width="1.1"/>`;
      }
      // foam claws
      for (const [x, y] of [[300, 128], [318, 146], [326, 170], [286, 116]]) b += `<path d="M${x} ${y} q12 -8 10 -22 M${x} ${y} q16 0 22 -12" stroke-width="1.2"/>`;
      b += `<path d="M20 340 Q110 318 200 338 T380 334 M20 364 Q120 346 210 362 T380 360" stroke-width="1.4"/>`;
      b += `</g>`;
      b += dots([[90, 112, 2.2], [120, 84, 1.6], [70, 150, 1.4], [150, 70, 1.4]]);
      return svg(400, 400, b);
    },
  },
  {
    id: 'surya', name: 'Surya', note: 'Sun disc with straight and flame rays', style: 'Geometric',
    svg() {
      const c = 200;
      let b = `<circle cx="${c}" cy="${c}" r="70" stroke-width="2.2"/><circle cx="${c}" cy="${c}" r="58" stroke-width="1.1"/>`;
      const d = [];
      for (let r = 8; r < 52; r += 9) for (let i = 0; i < Math.round(r * 0.9); i++) d.push([...pt(c, c, r, (i * TAU) / Math.round(r * 0.9) + r), 1.2 + (52 - r) * 0.012]);
      b += dots(d);
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24;
        if (i % 2) {
          b += `<path d="M${pt(c, c, 80, a).join(' ')} L${pt(c, c, 150, a).join(' ')}" stroke-width="1.6"/>`;
        } else {
          const p1 = pt(c, c, 80, a - 0.06), p2 = pt(c, c, 80, a + 0.06), tip = pt(c, c, 178, a);
          const m1 = pt(c, c, 128, a - 0.1), m2 = pt(c, c, 128, a + 0.02);
          b += `<path d="M${p1.join(' ')} Q${m1.join(' ')} ${tip.join(' ')} Q${m2.join(' ')} ${p2.join(' ')}" stroke-width="1.6"/>`;
        }
      }
      b += `<circle cx="${c}" cy="${c}" r="190" stroke-width="1" stroke-dasharray="2 8"/>`;
      return svg(400, 400, b);
    },
  },
  {
    id: 'pulse', name: 'Pulse', note: 'Heartbeat that ends in a heart', style: 'Minimal',
    svg() {
      const b = `<path d="M10 150 H150 L170 110 L190 200 L214 40 L236 236 L256 130 L270 150 H330 C326 116 352 92 380 104 C404 114 404 146 388 166 L330 230 L272 166" stroke-width="2.4"/>`;
      return svg(420, 280, b);
    },
  },
  {
    id: 'drishti', name: 'Drishti', note: 'Open eye with rays — protection', style: 'Fine-line',
    svg() {
      let b = `<path d="M40 200 Q200 70 360 200 Q200 330 40 200Z" stroke-width="2.4"/>`;
      b += `<circle cx="200" cy="200" r="56" stroke-width="2"/><circle cx="200" cy="200" r="24" fill="#000"/><circle cx="212" cy="188" r="6" fill="#fff" stroke="none"/>`;
      for (let i = 0; i < 36; i++) { const a = (i * TAU) / 36; b += `<path d="M${pt(200, 200, 30, a).join(' ')} L${pt(200, 200, 52, a).join(' ')}" stroke-width=".8"/>`; }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, x = 70 + t * 260, y = 200 - Math.sin(t * Math.PI) * 100;
        b += `<path d="M${f(x)} ${f(y + 4)} L${f(x + (t - 0.5) * 30)} ${f(y - 22)}" stroke-width="1.6"/>`;
      }
      for (let i = 0; i < 15; i++) { const a = Math.PI + 0.12 + (i * (Math.PI - 0.24)) / 14; b += `<path d="M${pt(200, 230, 150, a).join(' ')} L${pt(200, 230, 190, a).join(' ')}" stroke-width="1" stroke-dasharray="${i % 2 ? '3 6' : '0'}"/>`; }
      return svg(400, 340, b);
    },
  },
  {
    id: 'udaan', name: 'Udaan', note: 'Paper plane and the loop it flew', style: 'Minimal',
    svg() {
      let b = `<path d="M300 60 L380 40 L330 120 L318 96 Z M318 96 L380 40 M300 60 L318 96" stroke-width="2.2"/>`;
      b += `<path d="M290 80 C220 120 120 70 90 130 C60 190 160 220 170 170 C176 140 120 140 100 200 C80 260 40 300 20 330" stroke-width="1.6" stroke-dasharray="6 9"/>`;
      return svg(400, 360, b);
    },
  },
  {
    id: 'gulab', name: 'Gulab', note: 'Rose head with two leaves', style: 'Fine-line',
    svg() {
      let b = '';
      const c = [200, 190];
      // spiral heart of the rose
      let d = '';
      for (let t = 0; t < 5.2 * Math.PI; t += 0.15) {
        const r = 4 + t * 3.1;
        const [x, y] = pt(c[0], c[1] - 4, r, t);
        d += (d ? ' L' : 'M') + `${x} ${y * 0.96}`;
      }
      b += `<path d="${d}" stroke-width="1.6"/>`;
      // outer petals
      const petals = [[-2.6, 78], [-1.6, 84], [-0.5, 80], [0.6, 86], [1.7, 82], [2.7, 88]];
      for (const [a, r] of petals) {
        const p1 = pt(...c, r * 0.6, a - 0.7), p2 = pt(...c, r * 0.6, a + 0.7), tip = pt(...c, r, a);
        b += `<path d="M${p1.join(' ')} C${pt(...c, r * 1.1, a - 0.5).join(' ')} ${pt(...c, r * 1.15, a + 0.1).join(' ')} ${tip.join(' ')} C${pt(...c, r * 1.05, a + 0.4).join(' ')} ${pt(...c, r * 0.95, a + 0.7).join(' ')} ${p2.join(' ')}" stroke-width="2"/>`;
        b += `<path d="M${pt(...c, r * 0.7, a - 0.2).join(' ')} Q${pt(...c, r * 0.86, a).join(' ')} ${pt(...c, r * 0.72, a + 0.25).join(' ')}" stroke-width="1"/>`;
      }
      b += `<path d="M200 278 C204 340 196 420 204 500" stroke-width="2"/>`;
      b += `<path d="M202 360 C160 350 130 320 126 296 C160 296 192 324 202 360Z M202 360 C170 334 150 316 128 298" stroke-width="1.6"/>`;
      b += `<path d="M203 420 C246 410 274 380 276 352 C242 356 212 386 203 420Z M203 420 C232 392 252 372 274 354" stroke-width="1.6"/>`;
      b += `<path d="M201 300 l-8 -6 M203 330 l9 -7 M203 460 l-9 -6" stroke-width="1.4"/>`;
      return svg(400, 520, b);
    },
  },
  {
    id: 'teer', name: 'Teer', note: 'Fletched arrow, straight and true', style: 'Minimal',
    svg() {
      let b = `<path d="M20 120 H560" stroke-width="2"/><path d="M560 120 L530 104 M560 120 L530 136 M530 104 L540 120 L530 136" stroke-width="2"/>`;
      for (let i = 0; i < 6; i++) {
        const x = 24 + i * 16;
        b += `<path d="M${x} 120 L${x + 30} 92 M${x} 120 L${x + 30} 148" stroke-width="1.5"/>`;
      }
      b += dots([[300, 120, 3], [320, 120, 2], [336, 120, 1.4]]);
      return svg(580, 240, b);
    },
  },
];

export const FLASH = designs;

export async function rasterizeSvg(svgText, longSide = 1200) {
  const m = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = +m[1], h = +m[2];
  const scale = longSide / Math.max(w, h);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  // white highlight dots must punch out of the ink, not become ink
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const lum = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
    if (lum > 200) d.data[i + 3] = 0;
    else { d.data[i] = d.data[i + 1] = d.data[i + 2] = 0; }
  }
  g.putImageData(d, 0, 0);
  return { canvas: c, aspect: c.width / c.height };
}

export function flashThumb(design) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(design.svg())}`;
}

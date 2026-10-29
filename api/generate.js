// POST /api/generate  { prompt, style, seed }
// Turns a visitor's idea ("puppy reading the newspaper") into stencil-ready line art.
// Provider order: Cloudflare Workers AI (free daily allowance) → Pollinations key → OpenAI →
// Vercel AI Gateway (zero-config on Vercel via OIDC) → public Pollinations.
export const config = { maxDuration: 60 };

const STYLES = {
  'fine-line': 'delicate single-needle fine-line tattoo illustration, thin even black lines, minimal detail, elegant negative space',
  blackwork: 'bold blackwork tattoo, confident outlines and solid black fills',
  dotwork: 'dotwork tattoo, stippled shading made only of dots, crisp outline',
  minimal: 'ultra-minimal tattoo, one continuous line drawing, very few strokes',
  traditional: 'American traditional tattoo flash, bold outlines, simple shading',
  'micro-realism': 'fine-line micro-realism tattoo, soft grey shading, precise detail',
  ornamental: 'ornamental tattoo inspired by Indian mehendi patterns, symmetrical filigree',
  watercolour: 'watercolour tattoo, soft colour washes with a fine black outline',
};

const hits = new Map(); // best-effort per-instance rate limit
const LIMIT = Number(process.env.GENERATE_LIMIT_PER_HOUR || 15);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const selftest = req.method === 'GET' && req.query?.selftest === '1';
  if (req.method === 'GET' && !selftest) {
    return res.status(200).json({ ok: true, providers: providers(req).map((p) => p.name) });
  }
  if (req.method !== 'POST' && !selftest) return res.status(405).json({ error: 'Use POST' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'anon';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (list.length >= LIMIT) {
    return res.status(429).json({ error: 'You have sketched a lot this hour. Try again in a little while, or send the idea to the studio with your booking.' });
  }
  list.push(now); hits.set(ip, list);

  const body = selftest ? { prompt: 'A puppy reading the newspaper', style: 'fine-line' }
    : typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const idea = String(body.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 280);
  if (idea.length < 3) return res.status(400).json({ error: 'Describe the tattoo in a few words.' });
  const style = STYLES[body.style] ? body.style : 'fine-line';
  const colour = style === 'watercolour';
  const seed = Number.isFinite(+body.seed) ? Math.abs(+body.seed) % 1e9 : Math.floor(Math.random() * 1e9);

  const prompt = [
    `Tattoo flash design of: ${idea}.`,
    STYLES[style] + '.',
    colour ? 'Soft watercolour pigment with black linework' : 'Pure black ink only',
    'on a plain flat white paper background. A single isolated design, centred, with generous empty margin around it.',
    'No skin, no body, no arm, no photo, no frame, no border, no text, no letters, no signature, no watermark. Clean, high-contrast, stencil-ready linework.',
  ].join(' ');

  const errors = [];
  for (const p of providers(req)) {
    try {
      const image = await p.run(prompt, seed);
      if (selftest) return res.status(200).json({ ok: true, provider: p.name, imageBytes: Math.round(image.length * 0.75), tried: errors });
      return res.status(200).json({ image, provider: p.name, seed, style, colour });
    } catch (e) {
      errors.push(`${p.name}: ${e.message}`);
    }
  }
  console.error('generate failed', errors);
  if (selftest) return res.status(503).json({ ok: false, tried: errors.map((e) => e.slice(0, 220)) });
  return res.status(503).json({
    error: 'The sketching service is not available right now. You can still pick from the flash collection, or send this idea with your booking and an artist will draw it.',
    detail: process.env.VERCEL_ENV === 'production' ? undefined : errors,
  });
}

function providers(req) {
  const out = [];
  if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) out.push({ name: 'cloudflare', run: (p, s) => cloudflare(p, s) });
  if (process.env.POLLINATIONS_KEY) out.push({ name: 'pollinations', run: (p, s) => pollinations(p, s, process.env.POLLINATIONS_KEY) });
  if (process.env.OPENAI_API_KEY) out.push({ name: 'openai', run: (p) => openai(p) });
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (gatewayKey && process.env.DISABLE_AI_GATEWAY !== '1') {
    out.push({ name: 'vercel-ai-gateway', run: (p, s) => gateway(gatewayKey, p, s) });
  }
  out.push({ name: 'pollinations-public', run: (p, s) => pollinationsPublic(p, s) });
  return out;
}

// Cloudflare Workers AI: FLUX.1 schnell, covered by the free daily allowance (no card needed)
async function cloudflare(prompt, seed) {
  const model = process.env.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6, seed }),
    signal: AbortSignal.timeout(55000),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  const img = j.result?.image;
  if (!img) throw new Error('empty response');
  return `data:image/jpeg;base64,${img}`;
}

async function gateway(key, prompt, seed) {
  const models = (process.env.IMAGE_MODEL || 'bfl/flux-2-pro,openai/gpt-image-1-mini,google/imagen-4.0-fast-generate-001').split(',');
  let last;
  for (const model of models) {
    const r = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model.trim(), prompt, n: 1, size: '1024x1024', response_format: 'b64_json', seed }),
      signal: AbortSignal.timeout(55000),
    });
    if (r.ok) {
      const j = await r.json();
      const d = j.data?.[0];
      if (d?.b64_json) return `data:image/png;base64,${d.b64_json}`;
      if (d?.url) return await toDataUrl(d.url);
      last = new Error('empty response');
    } else {
      last = new Error(`${model} ${r.status} ${(await r.text()).slice(0, 160)}`);
    }
  }
  throw last;
}

async function openai(prompt) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt, size: '1024x1024', quality: 'low', n: 1 }),
    signal: AbortSignal.timeout(55000),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return `data:image/png;base64,${j.data[0].b64_json}`;
}

async function pollinations(prompt, seed, key) {
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;
  return toDataUrl(url, { Authorization: `Bearer ${key}` });
}

async function pollinationsPublic(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;
  return toDataUrl(url);
}

async function toDataUrl(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(50000) });
  if (!r.ok) throw new Error(`${r.status}`);
  const type = r.headers.get('content-type') || 'image/png';
  if (!type.startsWith('image/')) throw new Error(`not an image (${type})`);
  const buf = Buffer.from(await r.arrayBuffer());
  return `data:${type};base64,${buf.toString('base64')}`;
}

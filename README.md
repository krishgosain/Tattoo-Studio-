# Siyahi — see it on skin before it's forever

A tattoo studio website whose centrepiece is a **3D try-on**: visitors describe any idea ("a puppy reading the newspaper"), pick from flash, write lettering or upload a drawing, then place it anywhere on a realistic 3D body, in their skin tone, at real size in centimetres.

Built for a fictional fine-line atelier on Pali Hill, Bandra West, Mumbai. Every studio detail lives in `src/config.js`.

## What it does

| Area | Detail |
| --- | --- |
| 3D body | MakeHuman / MPFB2 base mesh (CC0), compiled to a 480 KB binary with a man → woman morph. Skin shader with sheen, micro-detail and painted garments. |
| Projection | Custom decal projector with back-face rejection, so designs wrap a limb without bleeding to the other side. Tattoos are anchored by triangle + barycentric coordinates and stay put when the body morphs. |
| Placement | 26 zones (chest to top of foot, left/right aware) with camera fly-to, or tap anywhere, then drag the tattoo across the skin. Limb-aware orientation. |
| Designs | 20 original SVG flash pieces (incl. Sea Link, cutting chai, mor pankh, ambi), AI sketching from a text prompt in 8 styles, lettering in 8 faces incl. Devanagari and Tamil with arc and flourish, Roman-numeral dates, Mumbai coordinates, uploads with line lifting. |
| Ink | Black, grey wash, sepia, red, indigo, white, original colour. Ageing slider from fresh (swollen pink halo) through healed to ten years (spread, faded, blue-shifted). |
| Real-world | Size readout in cm, session time and a ₹ estimate from published rates × area × detail × placement difficulty. |
| Photo try-on | Upload a photo or use the camera, drag/pinch the design, curve it around a limb; ink is multiplied into the skin. Nothing leaves the device. |
| Sharing | Multi-tattoo layers, PNG export, a share link that rebuilds the exact design, and a WhatsApp booking message with the link included. |

## AI sketching (`/api/generate`)

Provider order, first one configured wins (each falls through to the next on error):

1. **Cloudflare Workers AI** (recommended, free daily allowance, no card): set `CF_ACCOUNT_ID` and `CF_API_TOKEN` (a token with *Workers AI* permission). Model `@cf/black-forest-labs/flux-1-schnell`, override with `CF_IMAGE_MODEL`.
2. `POLLINATIONS_KEY`: Pollinations Flux (free tier after sign-up at enter.pollinations.ai).
3. `OPENAI_API_KEY`: OpenAI Images (`gpt-image-1`, quality low).
4. **Vercel AI Gateway**: zero config on Vercel through the project's OIDC token (or `AI_GATEWAY_API_KEY`). Image models generally need purchased Gateway credits. Models: `IMAGE_MODEL` (comma-separated), default `bfl/flux-2-pro,openai/gpt-image-1-mini,google/imagen-4.0-fast-generate-001`.
5. The public Pollinations endpoint as a last resort.

Check which provider answers with `GET /api/generate?selftest=1` (runs one sketch, returns the provider and any errors, not the image).

`GENERATE_LIMIT_PER_HOUR` (default 15) caps requests per visitor IP. Set `DISABLE_AI_GATEWAY=1` to stop using gateway credits.

## Develop

```bash
npm install
npm run dev        # site on :5173 (the /api route runs on Vercel or `vercel dev`)
npm run build
```

Rebuild the body asset (needs the MPFB2 repo checked out):

```bash
python3 tools/build_body.py /path/to/mpfb2 public/models
```

## Credits

3D body: MakeHuman / MPFB2 base mesh and targets, CC0 1.0. Fonts: Bodoni Moda, Hanken Grotesk, Tiro Devanagari Hindi, Pinyon Script, Monsieur La Doulaise, Special Elite, UnifrakturMaguntia, Kalam, Noto Serif Tamil (SIL OFL), self-hosted via Fontsource.

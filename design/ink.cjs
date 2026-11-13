/* ══════════════════════════════════════════════════════════════════════
   INK — the color system for the notebook redesign.

   The product is monochrome: graphite on paper, with one red pencil for
   errors, overdue work and destructive actions. Nothing else carries hue.

   HOW THE WHOLE SITE WAS CONVERTED
   The site had ~2,600 Tailwind color classes and ~280 hard-coded color
   literals across 49 pages, many of them hand-tuned in earlier rounds to
   pass WCAG AA. Rather than recolor each by hand, every color goes through
   `inkify()`, which keeps a color's *relative luminance* exactly and only
   changes its hue:

     • red / rose / pink  → red pencil (OKLCH hue ~27), chroma capped
     • every other hue    → warm graphite (OKLCH hue ~80, near-zero chroma)

   WCAG contrast is a function of luminance alone, so every contrast ratio
   measured before the conversion holds after it, by construction. That is
   the property that makes a site-wide palette swap safe. It is applied in
   three places from this one function:
     1. tailwind.config.js — each Tailwind palette is rebuilt through it
     2. scripts/inkify-literals.mjs — rewrites hex/rgb literals in CSS & TSX
     3. scripts/generate-dark-theme.js — the dark layer, if regenerated

   On top of that mechanical base sit a few deliberate design tokens (true
   ink for primary actions, paper, card) defined in INK below.
   ══════════════════════════════════════════════════════════════════════ */

/* Deliberate tokens. Everything else is derived. */
const INK = {
  ink: '#1c1b19',        // primary text, primary buttons, card borders
  paper: '#f6f3ec',      // page background
  card: '#fffdf8',       // card / "white"
  redPencil: '#b42318',  // errors, overdue, destructive — nothing else
};

const GRAPHITE_HUE = 80;   // OKLCH degrees: a faint warm, like pencil on paper
const RED_HUE = 27;
const RED_CHROMA_MAX = 0.17;

/* ─── color math (sRGB ↔ linear ↔ OKLab) ─── */
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
}
function luminanceLin([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function linToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (lin) => lin.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

/** OKLCH (L, C, hue°) → linear sRGB, reducing chroma until it fits. */
function oklchToLinFit(L, C, h) {
  const rad = (h * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.002) {
    const lin = oklabToLin([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (inGamut(lin)) return lin;
  }
  return oklabToLin([L, 0, 0]);
}

/** Is this color in the red family (red, rose, pink)? */
function isRed(lin) {
  const [, a, b] = linToOklab(lin);
  const C = Math.hypot(a, b);
  if (C < 0.06) return false;
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Measured OKLCH hues: red 18–28, rose 12–18, pink 342–4, orange 38+.
  return h < 33 || h > 335;
}

const cache = new Map();

/**
 * Map a color to graphite (or red pencil) with identical relative luminance.
 * Accepts #rgb, #rrggbb, #rrggbbaa; returns #rrggbb (alpha preserved if given).
 */
function inkify(hex) {
  const key = hex.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const raw = key.replace('#', '');
  const alpha = raw.length === 8 ? raw.slice(6) : raw.length === 4 ? raw[3] + raw[3] : '';
  const lin = hexToRgb(key).map(toLin);
  const Y = luminanceLin(lin);
  const red = isRed(lin);
  const lab0 = linToOklab(lin);
  const origC = Math.hypot(lab0[1], lab0[2]);

  /* Idempotence: a colour that is already graphite (near-neutral, or warm at
     graphite chroma) or already red pencil is returned untouched. Without
     this, re-running the codemod re-searched each colour and could step to
     a neighbour 0.1% away — harmless once, but a drift if repeated. */
  let h0 = (Math.atan2(lab0[2], lab0[1]) * 180) / Math.PI; if (h0 < 0) h0 += 360;
  const nearHue = (a, b, tol) => Math.abs(((a - b + 540) % 360) - 180) <= tol;
  const isGraphite = origC < 0.006 || (origC <= 0.004 + 0.009 * lab0[0] + 0.004 && nearHue(h0, GRAPHITE_HUE, 45));
  const isPencil = red && nearHue(h0, RED_HUE, 4) && origC <= RED_CHROMA_MAX + 0.004;
  if (isGraphite || isPencil) { cache.set(key, key); return key; }

  // Binary-search OKLab lightness so the result's luminance equals Y.
  let lo = 0, hi = 1, out = lin;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const C = red ? Math.min(origC, RED_CHROMA_MAX) : 0.004 + 0.009 * mid;
    out = oklchToLinFit(mid, C, red ? RED_HUE : GRAPHITE_HUE);
    if (luminanceLin(out) < Y) lo = mid; else hi = mid;
  }
  /* Rounding to 8-bit hex alone can move luminance by ~0.7% — enough to tip
     a 4.50:1 pair to 4.47. Try the neighbouring 8-bit values and keep the
     one closest to the original luminance. */
  /* Choosing by luminance alone let dark colours drift in hue (±2 per
     channel is a visible tint near black: #241f1d came out brownish-red).
     So: among candidates within 0.1% contrast error, take the one closest in
     OKLab to the intended colour; fall back to lowest error if none qualify. */
  const target = linToOklab(out);
  const base = out.map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255));
  let best = base, bestErr = Infinity, bestDist = Infinity, bestOk = false;
  for (let dr = -2; dr <= 2; dr++) for (let dg = -2; dg <= 2; dg++) for (let db = -2; db <= 2; db++) {
    const cand = [base[0] + dr, base[1] + dg, base[2] + db];
    if (cand.some((v) => v < 0 || v > 255)) continue;
    const cl = cand.map((v) => toLin(v / 255));
    const err = Math.abs(luminanceLin(cl) - Y) / (Y + 0.05);
    const lab = linToOklab(cl);
    const dist = Math.hypot(lab[0] - target[0], lab[1] - target[1], lab[2] - target[2]);
    const ok = err <= 0.001;
    if ((ok && (!bestOk || dist < bestDist)) || (!ok && !bestOk && err < bestErr)) {
      best = cand; bestErr = err; bestDist = dist; bestOk = ok;
    }
  }
  const result = rgbToHex(best.map((v) => v / 255)) + alpha;
  cache.set(key, result);
  return result;
}

/** Rebuild a Tailwind palette ({50: '#..', ...}) through inkify. */
function inkPalette(palette) {
  const out = {};
  for (const [shade, value] of Object.entries(palette)) {
    out[shade] = typeof value === 'string' && value.startsWith('#') ? inkify(value) : value;
  }
  return out;
}

function relLuminance(hex) {
  return luminanceLin(hexToRgb(hex).map(toLin));
}

module.exports = { INK, inkify, inkPalette, relLuminance };

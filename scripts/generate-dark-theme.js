/*
 * generate-dark-theme.js
 * Scans pages/ and components/ for every Tailwind color utility in use and
 * generates styles/theme-dark.css — a complete, deterministic dark-mode
 * override layer. Re-run whenever new color utilities are introduced:
 *   node scripts/generate-dark-theme.js
 *
 * Design system (slightly blue-tinted neutral, solid surfaces):
 *   page #16171b · card #1e2025 · subtle #25272e · inset #2b2e36
 * Colored chips are hue-500 blended onto the card color (solid, no alpha),
 * colored text maps up to the hue's 200–400 range for contrast hierarchy.
 */
const fs = require('fs');
const path = require('path');
const tw = require('tailwindcss/colors');

/* ─── palette ─── */
const DARK = {
  page: '#16171b',
  card: '#1e2025',
  subtle: '#25272e',
  inset: '#2b2e36',
  inset2: '#343841',
  inset3: '#3e434e',
  borderFaint: '#262930',
  border: '#2f323a',
  border2: '#3a3e48',
  border3: '#454a56',
  // neutral text ramp — hierarchy preserved (higher number = brighter in dark)
  t300: '#707786', t400: '#8a90a0', t500: '#9aa1b0',
  t600: '#aab1bf', t700: '#c3c8d4', t800: '#d9dce4', t900: '#e8eaef',
};

const HUES = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function blend(fgHex, bgHex, alpha) {
  const f = hexToRgb(fgHex), b = hexToRgb(bgHex);
  return rgbToHex([0, 1, 2].map((i) => f[i] * alpha + b[i] * (1 - alpha)));
}
function hue(h, shade) { return (tw[h] && tw[h][shade]) || null; }

/* ─── collect used classes ─── */
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
})(path.join(__dirname, '..', 'pages'));
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
})(path.join(__dirname, '..', 'components'));

const RE = /(?:hover:|focus:)?(?:bg|text|border|divide|from|to|via|placeholder)-(?:white|black|slate|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d{1,3})?(?=[\s"'`}\]])/g;
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(RE)) used.add(m[0]);
}

/* ─── selector helpers ─── */
function esc(cls) { return cls.replace(/[:/.[\]]/g, (c) => '\\' + c); }
function selector(cls) {
  if (cls.startsWith('hover:')) return `html.dark .${esc(cls)}:hover`;
  if (cls.startsWith('focus:')) return `html.dark .${esc(cls)}:focus`;
  return `html.dark .${esc(cls)}`;
}

/* ─── mapping ─── */
function darkRuleFor(cls) {
  const bare = cls.replace(/^(hover:|focus:)/, '');
  const m = bare.match(/^(bg|text|border|divide|from|to|via|placeholder)-([a-z]+)(?:-(\d{2,3}))?(?:\/(\d{1,3}))?$/);
  if (!m) return null;
  const [, prop, color, shadeStr, alphaStr] = m;
  const shade = shadeStr ? parseInt(shadeStr, 10) : null;
  const hasAlpha = alphaStr != null;

  const setBg = (v) => `background-color: ${v} !important;`;
  const setText = (v) => `color: ${v} !important;`;
  const setBorder = (v) => `border-color: ${v} !important;`;
  const setDivide = (v) => `border-color: ${v} !important;`;
  const setFrom = (v) => `--tw-gradient-from: ${v} var(--tw-gradient-from-position) !important; --tw-gradient-to: ${blend(v, DARK.card, 0)}00 var(--tw-gradient-to-position) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;`;
  const setTo = (v) => `--tw-gradient-to: ${v} var(--tw-gradient-to-position) !important;`;

  /* white / black */
  if (color === 'white') {
    // Low-alpha white overlays (bg-white/10, /20…) are translucent highlights
    // on dark sections — they already work in dark mode. Only opaque-ish
    // whites are real "card" surfaces that must flip.
    if (hasAlpha && parseInt(alphaStr, 10) <= 30) return null;
    if (prop === 'bg') return setBg(DARK.card);            // covers bg-white and bg-white/NN
    if (prop === 'border') return setBorder(DARK.card);    // punch-out dots/rings
    if (prop === 'from') return setFrom(DARK.card);
    if (prop === 'to') return setTo(DARK.card);
    return null;                                            // text-white stays white
  }
  if (color === 'black') return null;                       // backdrops stay dark

  /* neutral: slate / gray share one ramp */
  if (color === 'slate' || color === 'gray') {
    if (prop === 'bg') {
      if (shade === 50) return setBg(DARK.subtle);
      if (shade === 100) return setBg(DARK.inset);
      if (shade === 200) return setBg(DARK.inset2);
      if (shade === 300) return setBg(DARK.inset3);
      if (shade >= 700) return setBg('#0f1013');            // dark panels get darker still
      return null;
    }
    if (prop === 'text' || prop === 'placeholder') {
      const map = { 300: DARK.t300, 400: DARK.t400, 500: DARK.t500, 600: DARK.t600, 700: DARK.t700, 800: DARK.t800, 900: DARK.t900 };
      if (shade != null && map[shade]) return prop === 'text' ? setText(map[shade]) : `color: ${DARK.t400} !important;`;
      if (shade === 200) return setText(DARK.t300);
      return null;
    }
    if (prop === 'border' || prop === 'divide') {
      const map = { 50: DARK.borderFaint, 100: DARK.border, 200: DARK.border2, 300: DARK.border3 };
      if (shade != null && map[shade]) return (prop === 'border' ? setBorder : setDivide)(map[shade]);
      return null;
    }
    if (prop === 'from' && shade === 50) return setFrom(DARK.subtle);
    if (prop === 'to' && shade === 50) return setTo(DARK.subtle);
    if (prop === 'from' && shade === 100) return setFrom(DARK.inset);
    if (prop === 'to' && shade === 100) return setTo(DARK.inset);
    return null;
  }

  /* colored hues */
  if (!HUES.includes(color)) return null;
  const h500 = hue(color, 500);
  if (!h500) return null;

  if (prop === 'bg') {
    if (shade === 50) return setBg(blend(h500, DARK.card, cls.startsWith('hover:') ? 0.18 : 0.14));
    if (shade === 100) return setBg(blend(h500, DARK.card, 0.22));
    if (shade === 200) return setBg(blend(h500, DARK.card, 0.3));
    return null;                                            // 400+ solid fills keep their color
  }
  if (prop === 'text') {
    if (shade == null) return null;
    if (shade >= 800) return setText(hue(color, 200));
    if (shade >= 600) return setText(hue(color, 300));
    if (shade >= 400) return setText(hue(color, 400));
    return null;                                            // 300-and-lighter already light
  }
  if (prop === 'border' || prop === 'divide') {
    if (shade === 100) return setBorder(blend(h500, DARK.card, 0.3));
    if (shade === 200) return setBorder(blend(h500, DARK.card, 0.38));
    if (shade === 300) return setBorder(blend(h500, DARK.card, 0.46));
    return null;
  }
  if (prop === 'from' && shade != null && shade <= 100) return setFrom(blend(h500, DARK.card, shade === 50 ? 0.14 : 0.22));
  if (prop === 'to' && shade != null && shade <= 100) return setTo(blend(h500, DARK.card, shade === 50 ? 0.14 : 0.22));
  return null;
}

/* ─── emit ─── */
const rules = [];
for (const cls of [...used].sort()) {
  const body = darkRuleFor(cls);
  if (body) rules.push(`${selector(cls)} { ${body} }`);
}

const header = `/* ═══════════════════════════════════════════════════════════════════
   THEME-DARK.CSS — GENERATED FILE, do not edit rules by hand.
   Regenerate with: node scripts/generate-dark-theme.js
   Complete dark-mode override layer for every color utility in use.
   Hand-tuned globals (inputs, scrollbars, shadows) live at the bottom.
   ═══════════════════════════════════════════════════════════════════ */
`;

const handTuned = `
/* ─── hand-tuned layer (kept stable across regenerations) ─── */

html.dark body { background-color: ${DARK.page}; color: ${DARK.t800}; }
html.dark { color-scheme: dark; }

/* custom theme colors */
html.dark .bg-surface { background-color: ${DARK.page} !important; }
html.dark .text-primary { color: ${DARK.t900} !important; }
html.dark .hover\\:text-primary:hover { color: ${DARK.t900} !important; }
html.dark .bg-accent\\/5 { background-color: #232438 !important; }
html.dark .bg-accent\\/10 { background-color: #282a44 !important; }
html.dark .bg-accent\\/20 { background-color: #303356 !important; }
html.dark .hover\\:bg-accent\\/20:hover { background-color: #34375e !important; }
html.dark .border-accent\\/10 { border-color: #34375e !important; }
html.dark .border-accent\\/20 { border-color: #3d4170 !important; }
html.dark a.text-accent, html.dark .text-accent { color: #a5acfa !important; }
html.dark .bg-indigo-50\\/50 { background-color: #23253a !important; }

/* inputs & selects */
html.dark select, html.dark input[type="text"], html.dark input[type="email"],
html.dark input[type="password"], html.dark input[type="number"], html.dark textarea,
html.dark input[type="date"], html.dark input[type="search"] {
  background-color: ${DARK.page} !important;
  border-color: ${DARK.border2} !important;
  color: ${DARK.t900} !important;
}
html.dark select option { background-color: ${DARK.card}; color: ${DARK.t900}; }
html.dark input::placeholder, html.dark textarea::placeholder { color: ${DARK.t400} !important; }

/* selection */
html.dark ::selection { background: rgba(129, 140, 248, 0.35); color: #eef0ff; }

/* shadows — depth reads as darkness in dark mode */
html.dark .shadow-sm, html.dark .shadow, html.dark .shadow-md,
html.dark .shadow-lg, html.dark .shadow-xl, html.dark .shadow-2xl {
  --tw-shadow-color: rgba(0, 0, 0, 0.55) !important;
  --tw-shadow: var(--tw-shadow-colored) !important;
}

/* scrollbar */
html.dark ::-webkit-scrollbar { width: 8px; height: 8px; }
html.dark ::-webkit-scrollbar-track { background: ${DARK.page}; }
html.dark ::-webkit-scrollbar-thumb { background: ${DARK.border3}; border-radius: 4px; }
html.dark ::-webkit-scrollbar-thumb:hover { background: #565c6a; }

/* glass & gradient text */
html.dark .glass-card { background-color: ${DARK.card} !important; backdrop-filter: none !important; border-color: ${DARK.border} !important; }
html.dark .gradient-text {
  background: linear-gradient(to right, #a5acfa, #c4b5fd, #ddd6fe) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

/* card hover ring */
html.dark .dash-card-hover:hover {
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(129, 140, 248, 0.22) !important;
}

/* keep dark navy hero/footer sections legible (they are dark in BOTH themes):
   inside them, muted slate text must stay LIGHT — the generated card-context
   overrides above would otherwise dim it below readable contrast. These
   descendant selectors out-rank the single-class rules. */
html.dark .bg-primary { background-color: #101422 !important; }
html.dark .bg-primary .text-slate-300, html.dark .bg-slate-900 .text-slate-300,
html.dark .bg-primary .text-slate-400, html.dark .bg-slate-900 .text-slate-400 {
  color: #a7aebe !important;
}
html.dark .bg-primary .text-slate-500, html.dark .bg-slate-900 .text-slate-500 {
  color: #969dae !important;
}
`;

const out = header + '\n' + rules.join('\n') + '\n' + handTuned;
fs.writeFileSync(path.join(__dirname, '..', 'styles', 'theme-dark.css'), out);
console.log(`theme-dark.css written: ${rules.length} generated rules from ${used.size} used utilities`);

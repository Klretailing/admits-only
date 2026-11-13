/* Rewrites hard-coded colour literals through design/ink.cjs `inkify`, which
   keeps each colour's luminance (and so every contrast ratio) while turning
   it into graphite or red pencil. Idempotent: inkified colours map to
   themselves, so it is safe to re-run after adding new code.

     node scripts/inkify-literals.mjs            # rewrite files
     node scripts/inkify-literals.mjs --check    # list what would change

   Handles #rgb/#rrggbb/#rrggbbaa, %23rrggbb inside data URIs, and
   rgb()/rgba() with numeric channels (comma or space syntax, alpha kept).
   A line containing `ink-keep` is left alone (for third-party brand marks). */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { inkify } = require('../design/ink.cjs');

const ROOTS = ['pages', 'components', 'lib', 'app', 'styles', 'hooks'];
const EXT = /\.(tsx?|css)$/;
const check = process.argv.includes('--check');

const expand = (h) => { const x = h.toLowerCase().slice(1); return '#' + (x.length <= 4 ? x.split('').map((c) => c + c).join('') : x); };
const toHex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

function convertLine(line) {
  if (line.includes('ink-keep')) return line;
  return line
    .replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g, (m) => {
      const out = inkify(m);
      // Leave a literal alone when it already maps to itself (#fff, #000,
      // anything inkified before) so re-runs are no-ops.
      return out.toLowerCase() === expand(m) ? m : out;
    })
    .replace(/%23([0-9a-fA-F]{6})(?![0-9a-fA-F])/g, (m, h) => '%23' + inkify('#' + h).slice(1))
    // Replace only the three channel numbers, keeping the original
    // separators byte for byte: inside a Tailwind arbitrary class such as
    // shadow-[0_0_6px_rgba(249,115,22,0.8)], an added space splits the class.
    .replace(/(rgba?\(\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})/g,
      (m, pre, r, s1, g, s2, b) => {
        const hex = inkify('#' + toHex2(+r) + toHex2(+g) + toHex2(+b));
        const [R, G, B] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        return `${pre}${R}${s1}${G}${s2}${B}`;
      });
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

let total = 0;
for (const file of ROOTS.flatMap((r) => walk(r, []))) {
  const src = fs.readFileSync(file, 'utf8');
  let changes = 0;
  const next = src.split('\n').map((l) => { const c = convertLine(l); if (c !== l) changes++; return c; }).join('\n');
  if (changes) {
    total += changes;
    console.log(`${String(changes).padStart(4)}  ${file}`);
    if (!check) fs.writeFileSync(file, next);
  }
}
console.log(`${check ? 'would change' : 'changed'} ${total} line(s)`);

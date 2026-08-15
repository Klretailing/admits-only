import { chromium } from './pwdrv/node_modules/playwright-core/index.mjs';

const PAGES = ['/dashboard','/dashboard/progress','/dashboard/essays','/dashboard/college-heatmap','/dashboard/profile','/dashboard/career-roadmap'];

const AUDIT = () => {
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number).concat(m[3]!==undefined?+m[3]:1) : null; };
  const lum = ([r,g,b]) => { const f=(v)=>{v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio = (a,b) => { const L1=lum(a),L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  // resolve effective background by walking up for non-transparent bg
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      // Gradients paint over background-color; take the gradient's darkest
      // stop as the effective backdrop (worst case for light text).
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none' && bi.includes('gradient')) {
        // Only near-opaque stops actually replace the backdrop; a 6%-alpha
        // tint just shades whatever is underneath, so ignore those and keep
        // walking up to the real surface.
        const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(c => c && c[3] > 0.85);
        if (stops.length) {
          let best = stops[0], bl = lum(stops[0]);
          for (const st of stops) { const l = lum(st); if (l > bl) { bl = l; best = st; } }
          return best;
        }
      }
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0.85) return c;
      n = n.parentElement;
    }
    const c = parse(getComputedStyle(document.body).backgroundColor);
    return c && c[3] > 0 ? c : [255,255,255,1];
  };
  const out = [];
  const seen = new Set();
  document.querySelectorAll('*').forEach(el => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const txt = Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
    if (!txt || txt.length < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') return;
    const fg = parse(cs.color); if (!fg || fg[3] < 0.5) return;
    const bg = bgOf(el);
    const r = ratio(fg, bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3.0 : 4.5;
    if (r < need) {
      const key = cs.color + '|' + size + '|' + el.className;
      if (seen.has(key)) return; seen.add(key);
      out.push({ txt: txt.slice(0,42), ratio: +r.toFixed(2), need, size, color: cs.color, cls: String(el.className).slice(0,60) });
    }
  });
  return out.sort((a,b)=>a.ratio-b.ratio);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]','demo.student@admitsonly.com');
await page.fill('input[type="password"]','Student@2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**',{timeout:30000});

for (const theme of ['light','dark']) {
  await page.evaluate((t)=>{ document.documentElement.classList.toggle('dark', t==='dark'); localStorage.setItem('admitsonly_theme',t); }, theme);
  console.log('\n########## ' + theme.toUpperCase() + ' ##########');
  for (const p of PAGES) {
    await page.goto('http://localhost:3000'+p, { waitUntil:'networkidle' });
    await page.evaluate((t)=>{ document.documentElement.classList.toggle('dark', t==='dark'); }, theme);
    await page.waitForTimeout(900);
    const fails = await page.evaluate(AUDIT);
    console.log(`\n--- ${p}: ${fails.length} fail(s)`);
    fails.slice(0,10).forEach(f=>console.log(`  ${f.ratio}/${f.need} "${f.txt}" ${f.size}px ${f.color} [${f.cls}]`));
  }
}
await browser.close();

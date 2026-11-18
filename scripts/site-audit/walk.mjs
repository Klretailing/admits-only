#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   SITE WALKER — an automated QA pass over the whole site.

   Signs in as each kind of user, discovers pages by following the links a
   real visitor would see, and opens every page four ways (desktop and
   phone, light and dark). On each it looks for the things that make a site
   feel broken or careless:

     errors     server errors, broken links, page crashes, console errors,
                failed API calls
     layout     sideways scrolling, elements spilling off-screen, text cut
                off, layout jumping after load
     content    "undefined", "NaN", "Invalid Date", "[object Object]" shown
                to the user
     access     controls with no name, unlabeled inputs, images without
                alt text, low-contrast text, tap targets under 24px on phones
     speed      pages slow to settle

   Usage
     npm run audit:site                      # against http://localhost:3000
     SITE_URL=http://localhost:3111 npm run audit:site
     npm run audit:site -- --roles=public,student --shots

   Options
     --roles=a,b      roles to walk (public,newStudent,student,educator,parent,admin)
     --shots          save a screenshot of every page/viewport/theme
     --max=N          pages per role (default 40)
     --out=DIR        report folder (default ./audit-report)

   The newStudent role signs up a fresh account to see the site the way a
   first-time user does. It only runs against localhost, never production.

   Read-only by design: it follows links and reads pages. It never clicks
   buttons or submits forms (apart from signing in), so it cannot change data.
   ────────────────────────────────────────────────────────────────────── */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of ['playwright', '@playwright/test', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try { return require(id); } catch { /* try next */ }
  }
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const { chromium } = loadPlaywright();

/* ─── config ─── */
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const BASE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const IS_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);
const OUT = path.resolve(args.out || 'audit-report');
const MAX_PAGES = Number(args.max || 40);
const SHOTS = !!args.shots;
const SLOW_MS = 4000;

// Demo accounts are created by lib/auth.ts. Override with AUDIT_<ROLE>_EMAIL / _PASSWORD.
const cred = (role, email, password) => ({
  email: process.env[`AUDIT_${role.toUpperCase()}_EMAIL`] || email,
  password: process.env[`AUDIT_${role.toUpperCase()}_PASSWORD`] || password,
});
const ROLES = {
  public:     { start: ['/', '/essay-checker', '/about', '/consulting', '/services', '/faq', '/contact', '/newsletter', '/auth/login', '/auth/register', '/auth/forgot-password', '/no-such-page'], scope: /^\/(?!dashboard|educator|parent|admin|api)/ },
  newStudent: { signup: true, start: ['/dashboard'], scope: /^\/dashboard/ },
  student:    { login: cred('student', 'demo.student@admitsonly.com', 'Student@2026'), start: ['/dashboard'], scope: /^\/dashboard/ },
  educator:   { login: cred('educator', 'demo.educator@admitsonly.com', 'Educator@2026'), start: ['/educator'], scope: /^\/educator/ },
  parent:     { login: cred('parent', 'parent@demo.admitsonly.com', 'Parent@2026'), start: ['/parent'], scope: /^\/parent/ },
  admin:      { login: cred('admin', process.env.AUDIT_ADMIN_EMAIL || '', process.env.AUDIT_ADMIN_PASSWORD || ''), start: ['/admin'], scope: /^\/admin/ },
};
const roleNames = String(args.roles || 'public,newStudent,student,educator,parent,admin').split(',');

const VARIANTS = [
  { name: 'desktop-light', viewport: { width: 1440, height: 900 }, dark: false, phone: false },
  { name: 'desktop-dark',  viewport: { width: 1440, height: 900 }, dark: true,  phone: false },
  { name: 'phone-light',   viewport: { width: 390,  height: 844 }, dark: false, phone: true },
  { name: 'phone-dark',    viewport: { width: 390,  height: 844 }, dark: true,  phone: true },
];

// Never follow these: they change state or leave the app.
const SKIP = /\/(api|auth\/(logout|signout))\b|sign-?out|logout|unsubscribe|\.(pdf|csv|zip|png|jpg)$/i;

/* ─── in-page checks (runs inside the browser) ─── */
function inspectPage({ phone }) {
  const issues = [];
  const add = (severity, kind, detail, el) => {
    let where = '';
    if (el) {
      const id = el.id ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      where = `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
    }
    issues.push({ severity, kind, detail: String(detail).slice(0, 160), where });
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const textOf = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

  // 1. Sideways scrolling and elements spilling past the right edge.
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) {
    add('high', 'layout:sideways-scroll', `page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && r.width <= vw * 1.5 && visible(el); })
      .filter((el) => !el.closest('[class*="overflow-x-auto"],[class*="overflow-auto"],[class*="overflow-x-scroll"]'));
    offenders.slice(0, 3).forEach((el) => add('high', 'layout:off-screen', `right edge at ${Math.round(el.getBoundingClientRect().right)}px`, el));
  }

  // 1b. Content cut off by a clipping container, with no page scroll to give
  //     it away. This is how the essay editor hid its own feedback panel
  //     off the right edge for months: the page itself never scrolled.
  {
    const clippedOff = [...document.querySelectorAll('body *')].filter((el) => {
      if (el.children.length > 0 || !(el.textContent || '').trim()) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.left >= vw || r.right <= vw + 1) return false;
      if (el.closest('[class*="overflow-x-auto"],[class*="overflow-auto"],[class*="overflow-x-scroll"],[class*="snap-x"],[aria-hidden="true"],.sr-only')) return false;
      const cs = getComputedStyle(el);
      // Slides in a carousel track sit off-screen by design.
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).transform !== 'none') return false;
      }
      return cs.position !== 'fixed' && visible(el);
    });
    clippedOff.slice(0, 3).forEach((el) => add('high', 'layout:cut-off-at-edge', `text runs past the right edge (${Math.round(el.getBoundingClientRect().right)}px of ${vw}px): "${textOf(el).slice(0, 50)}"`, el));
  }

  // 2. Broken values shown to the user.
  const bodyText = document.body.innerText;
  for (const bad of ['undefined', 'NaN', 'Invalid Date', '[object Object]', 'null%', 'Infinity']) {
    const re = new RegExp(`(^|[^A-Za-z])${bad.replace(/[[\]%]/g, '\\$&')}($|[^A-Za-z])`);
    if (re.test(bodyText)) {
      const el = [...document.querySelectorAll('body *')].find((n) => n.children.length === 0 && re.test(n.textContent || ''));
      add('high', 'content:broken-value', `"${bad}" visible: "${(el ? textOf(el) : '').slice(0, 80)}"`, el);
    }
  }

  // 3. Controls nobody can name (screen readers announce just "button").
  document.querySelectorAll('button, a[href], [role="button"]').forEach((el) => {
    if (!visible(el)) return;
    const name = el.getAttribute('aria-label') || el.getAttribute('title') || textOf(el)
      || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join('')
      || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
    if (!name || !name.trim()) add('medium', 'access:unnamed-control', 'button or link with no text or aria-label', el);
  });

  // 4. Inputs without a label.
  document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea').forEach((el) => {
    if (!visible(el)) return;
    const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')
      || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
    if (!labelled) add('low', 'access:unlabeled-input', `${el.tagName.toLowerCase()} placeholder="${el.getAttribute('placeholder') || ''}"`, el);
  });

  // 5. Images without alt text.
  document.querySelectorAll('img').forEach((el) => {
    if (visible(el) && !el.hasAttribute('alt')) add('low', 'access:img-no-alt', el.getAttribute('src') || '', el);
  });

  // 6. Tap targets under 24×24 on phones (WCAG 2.2 target size). Links inside
  //    running text are exempt, as the standard allows.
  if (phone) {
    let n = 0;
    document.querySelectorAll('button, a[href], input[type=checkbox], input[type=radio], select, [role="button"]').forEach((el) => {
      if (!visible(el) || n >= 6) return;
      const r = el.getBoundingClientRect();
      if (r.width >= 24 && r.height >= 24) return;
      const cs = getComputedStyle(el);
      if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN|TD|LABEL)$/.test(el.parentElement.tagName)) return;
      n++;
      add('low', 'access:small-tap-target', `${Math.round(r.width)}×${Math.round(r.height)}px "${textOf(el).slice(0, 30) || el.getAttribute('aria-label') || ''}"`, el);
    });
  }

  // 7. Text cut off mid-word with no ellipsis to show it was shortened.
  let clipped = 0;
  document.querySelectorAll('body *').forEach((el) => {
    if (clipped >= 5 || el.children.length > 0) return;
    const cs = getComputedStyle(el);
    const hides = cs.overflow === 'hidden' || cs.overflowX === 'hidden';
    if (!hides || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return;
    // Visually hidden on purpose (skip links, sr-only labels, Next's route announcer).
    if (el.closest('.sr-only, #__next-route-announcer__') || (parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1)) return;
    if (el.scrollWidth > el.clientWidth + 2 && textOf(el).length > 3 && visible(el)) {
      clipped++;
      add('medium', 'layout:text-cut-off', `"${textOf(el).slice(0, 60)}"`, el);
    }
  });

  // 8. Low-contrast text (WCAG AA: 4.5:1, or 3:1 for large text).
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number).concat(m[3] !== undefined ? +m[3] : 1) : null; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  const bgOf = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage.includes('gradient') || cs.backgroundImage.includes('url(')) return null; // can't judge
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0.85) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  };
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (own.length < 2 || !visible(el)) return;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); const bg = bgOf(el);
    if (!fg || fg[3] < 0.5 || !bg) return;
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    const r = ratio(fg, bg);
    const key = cs.color + cs.backgroundColor + size;
    if (r < need && !seen.has(key) && seen.size < 6) {
      seen.add(key);
      add('medium', 'access:low-contrast', `${r.toFixed(2)}:1 (needs ${need}) "${own.slice(0, 40)}"`, el);
    }
  });

  // 9. Duplicate ids break labels and in-page links.
  const ids = {};
  document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
  Object.entries(ids).filter(([, c]) => c > 1).slice(0, 3).forEach(([id, c]) => add('low', 'markup:duplicate-id', `id="${id}" used ${c} times`));

  // 10. Layout shift after load (CLS), measured by the observer installed at start.
  const cls = window.__auditCLS || 0;
  if (cls > 0.1) add('medium', 'layout:shift', `cumulative layout shift ${cls.toFixed(3)} (good is under 0.1)`);

  return issues;
}

/* ─── crawler ─── */
const report = { base: BASE, startedAt: new Date().toISOString(), pages: {}, issues: [] };
const log = (...a) => console.log(...a);

async function newContext(browser, variant) {
  const ctx = await browser.newContext({ viewport: variant.viewport, isMobile: variant.phone, hasTouch: variant.phone });
  await ctx.addInitScript((dark) => {
    try { localStorage.setItem('admitsonly_theme', dark ? 'dark' : 'light'); } catch {}
    window.__auditCLS = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__auditCLS += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }, variant.dark);
  return ctx;
}

async function signIn(ctx, roleName, role) {
  const page = await ctx.newPage();
  if (role.signup) {
    const email = `audit+${Date.now()}@example.com`;
    await page.goto(`${BASE}/auth/register`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"], input[name="name"]', 'Audit Student');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'AuditPass#2026');
    // A 16-year-old: walks the site with the under-18 protections on.
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 16);
    await page.fill('input[type="date"]', dob.toISOString().slice(0, 10));
    await page.click('button[type="submit"]');
  } else {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', role.login.email);
    await page.fill('input[type="password"]', role.login.password);
    await page.click('button[type="submit"]');
  }
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30000 });
  await page.close();
}

async function visit(ctx, url, variant, roleName) {
  const page = await ctx.newPage();
  const found = [];
  const push = (severity, kind, detail) => found.push({ severity, kind, detail: String(detail).slice(0, 200), where: '' });
  page.on('pageerror', (e) => push('critical', 'error:page-crash', e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|Download the React DevTools|net::ERR_ABORTED/.test(t)) return;
    // "Failed to load resource" says nothing about which one; name it.
    const src = m.location()?.url;
    if (src && src.endsWith('/no-such-page')) return; // the 404 we asked for
    push('high', 'error:console', src && /Failed to load resource/.test(t) ? `${t} (${src})` : t);
  });
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (u.origin === new URL(BASE).origin && r.status() >= 400 && !u.pathname.startsWith('/_next/webpack-hmr') && u.pathname !== '/no-such-page') {
      push(r.status() >= 500 ? 'critical' : 'high', 'error:request-failed', `${r.status()} ${r.request().method()} ${u.pathname}`);
    }
  });

  const t0 = Date.now();
  let status = 0;
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    status = res ? res.status() : 0;
  } catch (e) {
    push('high', 'speed:timeout', `did not settle within 45s (${e.message.split('\n')[0]})`);
  }
  const ms = Date.now() - t0;
  if (status >= 500) push('critical', 'error:server', `HTTP ${status}`);
  else if (status === 404 && !url.endsWith('/no-such-page')) push('critical', 'error:broken-link', 'HTTP 404');
  if (ms > SLOW_MS) push('medium', 'speed:slow', `${ms}ms to settle (budget ${SLOW_MS}ms)`);

  await page.waitForTimeout(600); // let fonts and late layout land before measuring
  const inPage = await page.evaluate(inspectPage, { phone: variant.phone }).catch((e) => [{ severity: 'high', kind: 'error:audit', detail: e.message, where: '' }]);

  let links = [];
  if (variant.name === 'desktop-light') {
    links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href'))).catch(() => []);
  }
  if (SHOTS) {
    const file = path.join(OUT, 'shots', roleName, `${new URL(url).pathname.replace(/\//g, '_') || '_'}__${variant.name}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  }
  await page.close();
  return { status, ms, issues: [...found, ...inPage], links };
}

async function walkRole(browser, roleName) {
  const role = ROLES[roleName];
  if (!role) { log(`  unknown role "${roleName}", skipping`); return; }
  if (role.login && !role.login.email) { log(`  ${roleName}: no credentials (set AUDIT_${roleName.toUpperCase()}_EMAIL/_PASSWORD), skipping`); return; }
  if (role.signup && !IS_LOCAL) { log(`  ${roleName}: signs up a new account, so it only runs against localhost; skipping`); return; }
  log(`\n▸ ${roleName}`);

  const contexts = [];
  for (const v of VARIANTS) {
    const ctx = await newContext(browser, v);
    if (role.login || role.signup) {
      if (role.signup && contexts.length) {
        // Reuse the first context's new account for the other three variants.
        await ctx.addCookies(await contexts[0].ctx.cookies());
      } else {
        await signIn(ctx, roleName, role);
      }
    }
    contexts.push({ v, ctx });
  }

  const queue = [...role.start];
  const seen = new Set(queue);
  while (queue.length && Object.keys(report.pages).filter((k) => k.startsWith(roleName + ' ')).length < MAX_PAGES) {
    const p = queue.shift();
    const results = await Promise.all(contexts.map(({ v, ctx }) => visit(ctx, BASE + p, v, roleName).then((r) => ({ v, r }))));
    const key = `${roleName} ${p}`;
    report.pages[key] = { status: results[0].r.status, ms: Math.max(...results.map((x) => x.r.ms)) };
    let count = 0;
    for (const { v, r } of results) {
      for (const i of r.issues) { report.issues.push({ role: roleName, page: p, variant: v.name, ...i }); count++; }
      for (const href of r.links) {
        if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/.test(href)) continue;
        let u; try { u = new URL(href, BASE + p); } catch { continue; }
        if (u.origin !== new URL(BASE).origin || SKIP.test(u.pathname)) continue;
        const next = u.pathname.replace(/\/$/, '') || '/';
        if (!role.scope.test(next)) continue;
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    log(`  ${String(results[0].r.status).padEnd(4)} ${p.padEnd(42)} ${String(report.pages[key].ms).padStart(5)}ms  ${count ? count + ' issue(s)' : 'ok'}`);
  }
  for (const { ctx } of contexts) await ctx.close();
}

/* ─── report ─── */
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
function writeReport() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  // Group identical problems so one bug on a shared component reads as one line.
  const groups = new Map();
  for (const i of report.issues) {
    const k = `${i.severity}|${i.kind}|${i.detail}|${i.where}`;
    const g = groups.get(k) || { ...i, places: new Set() };
    g.places.add(`${i.role} ${i.page} (${i.variant})`);
    groups.set(k, g);
  }
  const rows = [...groups.values()].sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.places.size - a.places.size);
  const bySev = rows.reduce((m, r) => ((m[r.severity] = (m[r.severity] || 0) + 1), m), {});
  const lines = [
    `# Site walk: ${BASE}`,
    '',
    `${Object.keys(report.pages).length} pages × ${VARIANTS.length} variants · ${rows.length} distinct problems ` +
      `(${['critical', 'high', 'medium', 'low'].map((s) => `${bySev[s] || 0} ${s}`).join(', ')})`,
    '',
  ];
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    const list = rows.filter((r) => r.severity === sev);
    if (!list.length) continue;
    lines.push(`## ${sev[0].toUpperCase() + sev.slice(1)}`, '');
    for (const r of list) {
      const places = [...r.places];
      lines.push(`- **${r.kind}** ${r.detail}${r.where ? ` \`${r.where}\`` : ''}`);
      lines.push(`  - ${places.slice(0, 4).join('; ')}${places.length > 4 ? `; +${places.length - 4} more` : ''}`);
    }
    lines.push('');
  }
  lines.push('## Pages', '', ...Object.entries(report.pages).map(([k, v]) => `- ${k}: HTTP ${v.status}, ${v.ms}ms`));
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
  log(`\nReport: ${path.join(OUT, 'report.md')}  (${rows.length} distinct problems)`);
}

/* ─── main ─── */
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  log(`Walking ${BASE}`);
  for (const r of roleNames) await walkRole(browser, r);
} finally {
  await browser.close();
  writeReport();
}

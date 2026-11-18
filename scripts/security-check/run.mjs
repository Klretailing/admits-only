#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   SECURITY CHECK: an automated test suite for the protections that matter
   most on a site used by teenagers. Run it before every release:

     npm run test:security                         # against http://localhost:3000
     SITE_URL=http://localhost:3111 npm run test:security -- --rounds=3

   Needs the server running and DATABASE_URL (or POSTGRES_PRISMA_URL) set,
   because some checks read the database directly (e.g. that no password is
   stored readable). It creates throwaway accounts (sec-test-…@example.com)
   and deletes them afterwards, so it refuses to run against production.

   What it checks
     headers     HTTPS-only (HSTS), content security policy, anti-framing,
                 no MIME sniffing, referrer policy, no-store on API data
     passwords   every stored password is a bcrypt hash with cost ≥ 12;
                 common passwords are refused
     age gate    date of birth required; under-13 refused with nothing
                 stored; parents/tutors must be adults; only month+year kept
     sign-in     repeated failures lock the account; the lock reports why
     teens       minor flag in the session; first name + last initial in
                 community channels; no emails sent to other students
     access      the authorization holes fixed in the November audit stay
                 fixed; the health check doesn't leak; DOB can't be rewritten
     payments    checkout endpoints require sign-in and validate input;
                 the PayPal secret never reaches the browser
     ai          Adam's instructions disclose it's an AI and carry the
                 teen-safety rules
   ────────────────────────────────────────────────────────────────────── */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require('pg');

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const BASE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ROUNDS = Math.max(1, Number(args.rounds || 1));
const DB_URL = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
const ROOT = process.env.REPO_ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) && !args['allow-remote']) {
  console.error(`Refusing to run against ${BASE}: this suite creates and deletes accounts. Use a local or staging server (--allow-remote to override).`);
  process.exit(2);
}
if (!DB_URL) { console.error('Set DATABASE_URL (or POSTGRES_PRISMA_URL) so database checks can run.'); process.exit(2); }

const db = new pg.Pool({ connectionString: DB_URL });
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

/* ─── tiny HTTP client with a cookie jar ─── */
class Client {
  constructor() { this.jar = new Map(); }
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar.set(kv.slice(0, i).trim(), kv.slice(i + 1)); }
    return set;
  }
  async req(method, p, body, { form = false, headers = {} } = {}) {
    const init = { method, redirect: 'manual', headers: { cookie: this.cookieHeader(), ...headers } };
    if (body !== undefined) {
      if (form) { init.body = new URLSearchParams(body).toString(); init.headers['content-type'] = 'application/x-www-form-urlencoded'; }
      else { init.body = JSON.stringify(body); init.headers['content-type'] = 'application/json'; }
    }
    const res = await fetch(BASE + p, init);
    const cookies = this.store(res);
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, headers: res.headers, json, text, cookies };
  }
  async signIn(email, password) {
    const csrf = (await this.req('GET', '/api/auth/csrf')).json?.csrfToken;
    const r = await this.req('POST', '/api/auth/callback/credentials', { csrfToken: csrf, email, password, json: 'true' }, { form: true });
    const url = r.json?.url || r.headers.get('location') || '';
    const error = new URL(url, BASE).searchParams.get('error');
    const session = (await this.req('GET', '/api/auth/session')).json;
    return { ok: !!session?.user, error, session, cookies: r.cookies };
  }
}

/* ─── test harness ─── */
const results = [];
async function check(group, name, fn) {
  try { await fn(); results.push({ group, name, ok: true }); }
  catch (e) { results.push({ group, name, ok: false, why: e.message }); }
}
function expect(cond, why) { if (!cond) throw new Error(why); }
const isoYearsAgo = (years, extraDays = 0) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - years); d.setUTCDate(d.getUTCDate() - extraDays); return d.toISOString().slice(0, 10); };
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const testEmail = () => `sec-test-${stamp()}@example.com`;
const GOOD_PW = 'Correct horse 2026';

async function signUp(c, { role = 'student', age = 16, dob, email = testEmail(), password = GOOD_PW, name = 'Taylor Test' } = {}) {
  const r = await c.req('POST', '/api/auth/register', { name, email, password, role, dateOfBirth: dob ?? isoYearsAgo(age, 3) });
  return { ...r, email, password, name };
}

async function round(n) {
  const created = [];

  /* headers */
  await check('headers', 'security headers on pages', async () => {
    const r = await new Client().req('GET', '/');
    const h = (k) => r.headers.get(k) || '';
    expect(/max-age=\d{7,}/.test(h('strict-transport-security')), 'HSTS missing or short');
    expect(/default-src 'self'/.test(h('content-security-policy')), 'CSP missing');
    expect(/frame-ancestors 'none'/.test(h('content-security-policy')), "CSP doesn't forbid framing");
    expect(/object-src 'none'/.test(h('content-security-policy')), 'CSP allows plugins');
    expect(h('x-frame-options') === 'DENY', 'X-Frame-Options not DENY');
    expect(h('x-content-type-options') === 'nosniff', 'nosniff missing');
    expect(/strict-origin/.test(h('referrer-policy')), 'Referrer-Policy missing');
    expect(!r.headers.get('x-powered-by'), 'X-Powered-By leaks the framework');
  });
  await check('headers', 'API responses are not cached', async () => {
    const r = await new Client().req('GET', '/api/health');
    expect(/no-store/.test(r.headers.get('cache-control') || ''), 'API Cache-Control is not no-store');
  });

  /* passwords */
  await check('passwords', 'every stored password is a bcrypt hash, cost ≥ 12', async () => {
    const rows = await q(`SELECT "email", "password" FROM "users"`);
    expect(rows.length > 0, 'no users to check');
    const bad = rows.filter((u) => { const m = /^\$2[aby]\$(\d\d)\$[./A-Za-z0-9]{53}$/.exec(u.password || ''); return !m || Number(m[1]) < 12; });
    expect(bad.length === 0, `${bad.length} password(s) not bcrypt cost ≥ 12: ${bad.slice(0, 3).map((u) => u.email).join(', ')}`);
  });
  await check('passwords', 'common passwords are refused at sign-up', async () => {
    const r = await signUp(new Client(), { password: 'password123' });
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });
  await check('passwords', 'password containing the email is refused', async () => {
    const email = testEmail();
    const r = await signUp(new Client(), { email, password: email.split('@')[0] + '!' });
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  /* age gate */
  await check('age gate', 'date of birth is required', async () => {
    const r = await new Client().req('POST', '/api/auth/register', { name: 'No Dob', email: testEmail(), password: GOOD_PW, role: 'student' });
    expect(r.status === 400 && r.json?.code === 'missing', `expected 400 missing, got ${r.status} ${r.json?.code}`);
  });
  await check('age gate', 'impossible and future dates are refused', async () => {
    const c = new Client();
    const a = await c.req('POST', '/api/auth/register', { name: 'Bad Dob', email: testEmail(), password: GOOD_PW, role: 'student', dateOfBirth: '2010-02-30' });
    const b = await c.req('POST', '/api/auth/register', { name: 'Bad Dob', email: testEmail(), password: GOOD_PW, role: 'student', dateOfBirth: `${new Date().getUTCFullYear() + 1}-01-01` });
    expect(a.status === 400 && b.status === 400, `expected 400/400, got ${a.status}/${b.status}`);
  });
  await check('age gate', 'under-13 student is refused and nothing is stored', async () => {
    const email = testEmail();
    const r = await signUp(new Client(), { email, age: 12 });
    expect(r.status === 403 && r.json?.code === 'under_13', `expected 403 under_13, got ${r.status} ${r.json?.code}`);
    expect((await q(`SELECT 1 FROM "users" WHERE "email" = $1`, [email])).length === 0, 'an account was created');
  });
  await check('age gate', 'day before 13th birthday is refused, 13th birthday is allowed', async () => {
    const d = new Date(); const y = d.getUTCFullYear() - 13; const mm = String(d.getUTCMonth() + 1).padStart(2, '0'); const dd = String(d.getUTCDate()).padStart(2, '0');
    const tomorrow = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate() + 1)).toISOString().slice(0, 10);
    const no = await signUp(new Client(), { dob: tomorrow });
    expect(no.status === 403, `turns 13 tomorrow: expected 403, got ${no.status}`);
    const yes = await signUp(new Client(), { dob: `${y}-${mm}-${dd}` });
    if (yes.status === 201) created.push(yes.email);
    expect(yes.status === 201, `13 today: expected 201, got ${yes.status} ${yes.json?.error || ''}`);
  });
  await check('age gate', 'parent and tutor accounts require 18+', async () => {
    const p = await signUp(new Client(), { role: 'parent', age: 17 });
    const t = await signUp(new Client(), { role: 'educator', age: 17 });
    expect(p.status === 403 && t.status === 403, `expected 403/403, got ${p.status}/${t.status}`);
  });
  await check('age gate', 'only birth month and year are stored', async () => {
    const r = await signUp(new Client(), { age: 15 });
    expect(r.status === 201, `sign-up failed: ${r.status} ${r.json?.error || ''}`);
    created.push(r.email);
    const rows = await q(`SELECT "birthMonth" FROM "users" WHERE "email" = $1`, [r.email.toLowerCase()]);
    expect(/^\d{4}-\d{2}$/.test(rows[0]?.birthMonth || ''), `stored value "${rows[0]?.birthMonth}" is not YYYY-MM`);
  });

  /* teen protections + sign-in */
  const teen = new Client(); const adult = new Client();
  const teenUp = await signUp(teen, { age: 15, name: 'Robin Teenager' }); created.push(teenUp.email);
  const adultUp = await signUp(adult, { age: 19, name: 'Casey Adult' }); created.push(adultUp.email);

  await check('teens', 'session marks under-18 students as minors, 18+ as not', async () => {
    const a = await teen.signIn(teenUp.email, teenUp.password);
    const b = await adult.signIn(adultUp.email, adultUp.password);
    expect(a.ok && b.ok, 'test accounts could not sign in');
    expect(a.session.user.minor === true, 'teen not marked minor');
    expect(b.session.user.minor === false, 'adult marked minor');
  });
  await check('teens', 'session cookie is HttpOnly and SameSite', async () => {
    const c = new Client(); const r = await c.signIn(adultUp.email, adultUp.password);
    const cookie = r.cookies.find((x) => /session-token=/.test(x)) || '';
    expect(/HttpOnly/i.test(cookie), 'session cookie readable by scripts');
    expect(/SameSite=(Lax|Strict)/i.test(cookie), 'session cookie has no SameSite');
  });
  await check('teens', 'community channels show first name + last initial to others', async () => {
    const msg = `security check ${stamp()}`;
    const post = await teen.req('POST', '/api/pods', { action: 'message', podId: 'community_college-essays', content: msg });
    expect(post.status === 200, `posting failed: ${post.status}`);
    const theirs = (await adult.req('GET', '/api/pods?action=messages&podId=community_college-essays')).json?.messages || [];
    const mine = (await teen.req('GET', '/api/pods?action=messages&podId=community_college-essays')).json?.messages || [];
    const seenByOther = theirs.find((m) => m.content === msg); const seenBySelf = mine.find((m) => m.content === msg);
    expect(seenByOther?.user?.name === 'Robin T.', `others saw "${seenByOther?.user?.name}"`);
    expect(seenBySelf?.user?.name === 'Robin Teenager', `author saw "${seenBySelf?.user?.name}"`);
    expect(!JSON.stringify(theirs).includes('@example.com'), 'an email address was sent to another student');
    await q(`DELETE FROM "pod_messages" WHERE "content" = $1`, [msg]);
  });
  await check('teens', 'date of birth cannot be rewritten by the user', async () => {
    const r = await teen.req('PUT', '/api/account/age', { dateOfBirth: isoYearsAgo(30) });
    expect(r.status === 409, `expected 409, got ${r.status}`);
  });

  await check('sign-in', 'repeated failures lock the account, then it reopens', async () => {
    const c = new Client(); const key = `login:${adultUp.email.toLowerCase()}`;
    for (let i = 0; i < 8; i++) await c.signIn(adultUp.email, 'wrong password ' + i);
    const locked = await new Client().signIn(adultUp.email, adultUp.password);
    expect(!locked.ok && locked.error === 'TooManyAttempts', `correct password after 8 failures: ok=${locked.ok} error=${locked.error}`);
    await q(`DELETE FROM "auth_throttle" WHERE "key" = $1`, [key]);
    const again = await new Client().signIn(adultUp.email, adultUp.password);
    expect(again.ok, 'could not sign in once the lock was cleared');
  });
  await check('sign-in', 'unknown email and wrong password get the same answer', async () => {
    const a = await new Client().signIn(`nobody-${stamp()}@example.com`, 'whatever pass 1');
    const b = await new Client().signIn(adultUp.email, 'whatever pass 1');
    expect(!a.ok && !b.ok && a.error === b.error, `responses differ: ${a.error} vs ${b.error}`);
    await q(`DELETE FROM "auth_throttle" WHERE "key" = $1`, [`login:${adultUp.email.toLowerCase()}`]);
  });

  /* access control regressions */
  await check('access', 'community channels cannot be deleted by leaving', async () => {
    const r = await adult.req('DELETE', '/api/pods', { podId: 'community_college-essays' });
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });
  await check('access', 'admin accounts cannot be self-registered', async () => {
    const r = await new Client().req('POST', '/api/auth/register', { name: 'X', email: testEmail(), password: GOOD_PW, role: 'admin', dateOfBirth: isoYearsAgo(30) });
    expect(r.status === 403, `expected 403, got ${r.status}`);
  });
  await check('access', "another user's motif board cannot be changed", async () => {
    const mine = await teen.req('POST', '/api/motifs', { title: 'Mine', bullets: ['a'] });
    const id = mine.json?.board?.id; expect(id, 'could not create a board');
    const hijack = await adult.req('POST', '/api/motifs', { id, title: 'Hijacked' });
    expect(hijack.status === 404, `expected 404, got ${hijack.status}`);
    await teen.req('DELETE', '/api/motifs', { id });
  });
  await check('access', 'pod documents need membership of their pod', async () => {
    const r = await adult.req('GET', '/api/pod-documents?documentId=does-not-exist');
    expect(r.status === 404 || r.status === 403, `expected 403/404, got ${r.status}`);
  });
  await check('access', 'signed-out requests are refused', async () => {
    const c = new Client();
    for (const p of ['/api/essays', '/api/profile', '/api/applications', '/api/account/age', '/api/student/sessions']) {
      const r = await c.req('GET', p);
      expect(r.status === 401, `${p} returned ${r.status} without sign-in`);
    }
  });
  await check('access', 'public health check reveals nothing but status', async () => {
    const r = await new Client().req('GET', '/api/health');
    expect(r.json && Object.keys(r.json).join(',') === 'status', `health exposed: ${Object.keys(r.json || {}).join(',')}`);
  });
  await check('access', 'cron jobs need authorization', async () => {
    const r = await new Client().req('GET', '/api/cron/emails');
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  /* payments */
  await check('payments', 'checkout endpoints require sign-in', async () => {
    const c = new Client();
    const a = await c.req('POST', '/api/paypal/create-order', { tier: 'all' });
    const b = await c.req('POST', '/api/paypal/capture-order', { orderID: 'X' });
    expect(a.status === 401 && b.status === 401, `expected 401/401, got ${a.status}/${b.status}`);
  });
  await check('payments', 'capture never succeeds without a real PayPal order', async () => {
    const r = await adult.req('POST', '/api/paypal/capture-order', { orderID: 'FAKE-ORDER-123' });
    expect(r.status !== 200 && !r.json?.ok, `fake order returned ${r.status} ok=${r.json?.ok}`);
    const bad = await adult.req('POST', '/api/paypal/capture-order', {});
    expect(bad.status === 400 || bad.status === 503, `missing orderID returned ${bad.status}`);
  });
  await check('payments', 'the PayPal secret never reaches the browser', async () => {
    const r = await adult.req('GET', '/api/paypal/config');
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    expect(!/secret/i.test(Object.keys(r.json || {}).join(',')), 'config has a secret-like field');
    if (secret) expect(!r.text.includes(secret), 'PayPal secret present in response');
  });
  await check('payments', 'prices come from the server, not the request', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'pages/api/paypal/create-order.ts'), 'utf8');
    expect(/createOrder\(tier\.priceUsd/.test(src), 'order amount is not taken from the server-side tier');
    expect(!/req\.body\.(amount|price)/.test(src), 'create-order reads an amount from the request');
    const cap = fs.readFileSync(path.join(ROOT, 'pages/api/paypal/capture-order.ts'), 'utf8');
    expect(/status === 'COMPLETED'/.test(cap), "capture doesn't verify the payment completed");
  });

  /* ai */
  await check('ai', "Adam's instructions disclose it's an AI and carry teen-safety rules", async () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/adamKnowledge.ts'), 'utf8');
    expect(/an AI college admissions guide/.test(src), 'no AI disclosure');
    expect(/988/.test(src) && /age-appropriate/.test(src), 'teen-safety rules missing');
    expect(!/personally guided hundreds/.test(src), 'persona still claims human experience');
  });

  /* cleanup */
  if (created.length) {
    await q(`DELETE FROM "users" WHERE "email" = ANY($1::text[])`, [created.map((e) => e.toLowerCase())]);
  }
  await q(`DELETE FROM "users" WHERE "email" LIKE 'sec-test-%@example.com'`);
  await q(`DELETE FROM "auth_throttle" WHERE "key" LIKE 'login:sec-test-%' OR "key" LIKE 'login:nobody-%'`).catch(() => {});
  return n;
}

/* ─── run ─── */
let failedRounds = 0;
for (let n = 1; n <= ROUNDS; n++) {
  results.length = 0;
  const t0 = Date.now();
  await round(n);
  // The suite's own sign-in failures count toward the per-address limit;
  // clear them so repeated rounds test the same conditions.
  await q(`DELETE FROM "auth_throttle" WHERE "key" LIKE 'ip:%'`).catch(() => {});
  const failed = results.filter((r) => !r.ok);
  if (failed.length) failedRounds++;
  console.log(`\nRound ${n}/${ROUNDS}: ${results.length - failed.length}/${results.length} passed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  let group = '';
  for (const r of results) {
    if (r.group !== group) { group = r.group; console.log(`  ${group}`); }
    console.log(`    ${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `\n        → ${r.why}`}`);
  }
}
await db.end();
console.log(`\n${failedRounds === 0 ? 'All rounds passed.' : `${failedRounds} round(s) had failures.`}`);
process.exit(failedRounds === 0 ? 0 : 1);

#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   PayPal SANDBOX pre-flight test — no dependencies, standalone.

   Exercises the EXACT same PayPal Orders v2 calls the app uses (see
   lib/paypal.ts), so a green run here means your credentials + connectivity
   are wired correctly before you test the in-app buy flow.

   Setup:
     1. Create a Sandbox REST app at https://developer.paypal.com/dashboard/applications/sandbox
     2. Put the credentials in a `.env.local` at the repo root (this script
        auto-loads it) OR export them in your shell:
           PAYPAL_CLIENT_ID=...        (Sandbox client id)
           PAYPAL_CLIENT_SECRET=...    (Sandbox secret)
           PAYPAL_ENV=sandbox

   Usage:
     node scripts/paypal-sandbox-test.mjs            # token check + create a $19 order, print approval URL
     node scripts/paypal-sandbox-test.mjs token      # just verify credentials return an access token
     node scripts/paypal-sandbox-test.mjs capture <ORDER_ID>   # capture an order you already APPROVED in the browser

   Full flow: run (create) -> open the approval URL -> log in with a Sandbox
   BUYER account -> approve -> copy the ORDER_ID -> run `capture <ORDER_ID>`.
   A COMPLETED capture is exactly what the app's /api/paypal/capture-order
   verifies before granting access.
   ────────────────────────────────────────────────────────────────────── */

import fs from 'fs';
import path from 'path';

// ---- tiny .env.local loader (no dotenv dependency) ----
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
} catch { /* ignore */ }

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
const BASE = ENV === 'live' || ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const PRICE = process.env.PAYPAL_TEST_PRICE || '19.00'; // keep in sync with ESSAY_ACCESS_PRODUCT.priceUsd

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' };
const ok = (s) => console.log(`${c.g}✓${c.x} ${s}`);
const bad = (s) => console.log(`${c.r}✗${c.x} ${s}`);
const info = (s) => console.log(`${c.d}${s}${c.x}`);

function requireCreds() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    bad('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set.');
    info('Add them to .env.local (repo root) or export them, then re-run.');
    process.exit(1);
  }
  console.log(`Environment: ${c.y}${ENV}${c.x}  (${BASE})`);
}

async function getToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`token ${res.status}: ${text}`);
  return JSON.parse(text).access_token;
}

async function createOrder(token) {
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: PRICE },
        description: 'AdmitsOnly Essay Library — Full Access (sandbox test)',
      }],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`create ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function captureOrder(token, orderId) {
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`capture ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  requireCreds();

  const token = await getToken();
  ok('Got an access token — credentials and connectivity are good.');

  if (cmd === 'token') return;

  if (cmd === 'capture') {
    if (!arg) { bad('Usage: node scripts/paypal-sandbox-test.mjs capture <ORDER_ID>'); process.exit(1); }
    const cap = await captureOrder(token, arg);
    const orderStatus = cap.status;
    const capStatus = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    const capId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    console.log(`Order status:   ${orderStatus}`);
    console.log(`Capture status: ${capStatus}  (capture id ${capId || 'n/a'})`);
    if (orderStatus === 'COMPLETED' && capStatus === 'COMPLETED') {
      ok('COMPLETED — this is exactly what the app verifies before granting access.');
    } else {
      bad('Not COMPLETED — the app would return 402 and grant NOTHING. Approve the order in the browser first.');
    }
    return;
  }

  // default: create an order and print the approval URL
  const order = await createOrder(token);
  ok(`Created order ${order.id}  (status ${order.status}, $${PRICE})`);
  const approve = (order.links || []).find((l) => l.rel === 'approve' || l.rel === 'payer-action');
  console.log('\nNext steps:');
  console.log(`  1. Open this approval URL and log in with a SANDBOX BUYER account:`);
  console.log(`     ${c.y}${approve ? approve.href : '(no approval link returned)'}${c.x}`);
  console.log(`     (Create sandbox buyer accounts at https://developer.paypal.com/dashboard/accounts)`);
  console.log(`  2. After approving, capture it:`);
  console.log(`     ${c.d}node scripts/paypal-sandbox-test.mjs capture ${order.id}${c.x}`);
  console.log('\nOr just run the app with these same sandbox creds and buy through the Essay Samples paywall.');
}

main().catch((e) => { bad(String(e.message || e)); process.exit(1); });

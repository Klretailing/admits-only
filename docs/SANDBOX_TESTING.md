# Testing the Essay Samples paywall in PayPal Sandbox

The paywall is built and enforced server-side; it just needs your PayPal
credentials to take money. Test the whole flow in **Sandbox** first, then flip
one env var to go live. Nothing charges a real card in sandbox.

## 1. Create Sandbox credentials

1. Go to <https://developer.paypal.com/dashboard/applications/sandbox> and
   create (or open) a **Sandbox REST API app**.
2. Copy its **Client ID** and **Secret**.
3. Create a **Sandbox personal (buyer) account** at
   <https://developer.paypal.com/dashboard/accounts> if you don't have one —
   you'll log in as this fake buyer to approve the test purchase. Its balance /
   test card is pre-funded by PayPal.

## 2. Point the app at Sandbox

Add to `.env.local` at the repo root (git-ignored — see `.env.example`):

```
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=<your sandbox client id>
PAYPAL_CLIENT_SECRET=<your sandbox secret>
```

## 3. Pre-flight: verify credentials + connectivity (no browser needed)

```
node scripts/paypal-sandbox-test.mjs
```

- ✓ "Got an access token" → your credentials and network path to PayPal work.
- It then creates a real sandbox order and prints an **approval URL**.
- Open that URL, log in with your **sandbox buyer** account, approve, then:

```
node scripts/paypal-sandbox-test.mjs capture <ORDER_ID>
```

A **COMPLETED** capture is exactly what `/api/paypal/capture-order` verifies
before granting access. If it isn't COMPLETED, the app grants nothing (402).

## 4. End-to-end in the app

1. Run the app with the sandbox env set (`npm run dev` / your normal start).
2. Sign in, open **Essay Samples**. Each school's first essay is free; the rest
   show a **Premium / lock** badge.
3. Open a locked essay → you should see **~25% of the text** then the paywall +
   the gold **PayPal** button. (Confirm in the browser Network tab that the
   `?id=` response contains only the preview — the full text must not be there.)
4. Click PayPal → log in as the **sandbox buyer** → approve.
5. On success the essay **unlocks immediately** (no reload), a green "Full
   access" pill appears, and a **Download** button gives you the `.md` file.
6. Reload the page — access persists (entitlement saved in `essay_purchases`).

## 5. Verify the security boundaries (worth doing once)

- **Locked essay, not logged in / not paid:** `GET /api/sample-essays?id=<premium id>`
  returns `locked:true` and only the preview text.
- **Download without access:** `GET /api/sample-essays/download?id=<premium id>`
  returns **403** (no file body).
- **Double-capture is safe:** capturing the same order id twice grants only one
  entitlement (idempotent `ON CONFLICT` on the PayPal order id).

## 6. Go live

Once sandbox passes end-to-end:

1. Create a **Live** REST app in the PayPal dashboard, get live Client ID/Secret.
2. Set `PAYPAL_ENV=live` and the live `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.
3. Do one small real purchase to confirm, then you're live.

## Tuning

- **Price / product:** `ESSAY_ACCESS_PRODUCT.priceUsd` in `lib/paypal.ts`.
- **How many free essays per school:** `FREE_PER_SCHOOL` in `lib/essayAccess.ts`.
- **Preview size:** `PREVIEW_FRACTION` in `lib/essayAccess.ts` (default 0.25).
- **Per-school pricing instead of all-access:** the `essay_purchases.scope`
  column already supports a school slug — a small follow-up, not a rewrite.

## Not yet added (optional hardening)

A PayPal **webhook** listener. The capture flow grants access reliably at
purchase time, so it isn't required — but a webhook is the safety net for the
rare case where the browser closes between PayPal approving and the server
capturing. Ask and it can be added.

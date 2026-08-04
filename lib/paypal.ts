/* ──────────────────────────────────────────────────────────────────────
   PAYPAL — server-side Orders v2 REST client (no SDK dependency)

   This module is the ONLY place that talks to PayPal. It holds the app's
   client secret and an OAuth access token — neither ever leaves the server.
   Payments MUST be verified here (via captureOrder) before any entitlement
   is granted; the client is never trusted.

   Env:
     PAYPAL_CLIENT_ID      — OAuth client id (also the PUBLIC id the browser
                             uses to load the PayPal JS SDK; safe to expose).
     PAYPAL_CLIENT_SECRET  — OAuth client secret (NEVER expose / log).
     PAYPAL_ENV            — 'sandbox' (default) or 'live'/'production'.
   ────────────────────────────────────────────────────────────────────── */

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();

export function paypalEnv(): 'sandbox' | 'live' {
  return ENV === 'live' || ENV === 'production' ? 'live' : 'sandbox';
}

function baseUrl(): string {
  return paypalEnv() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/** True only when both the client id and secret are configured. */
export function isPaypalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** The PUBLIC client id (safe to hand to the browser). Empty when unset. */
export function paypalClientId(): string {
  return CLIENT_ID;
}

/**
 * Admin health check: verify the configured credentials can obtain an access
 * token from PayPal — without creating an order or charging anything.
 * Returns a discriminated result the admin UI can render in plain language.
 */
export async function checkPaypalConnection(): Promise<{ ok: boolean; status?: number; message?: string }> {
  if (!isPaypalConfigured()) return { ok: false, message: 'not_configured' };
  try {
    await getAccessToken();
    return { ok: true };
  } catch (e: any) {
    const msg = e?.message || String(e);
    const m = msg.match(/\((\d{3})\)/);
    return { ok: false, status: m ? Number(m[1]) : undefined, message: msg };
  }
}

/**
 * Single all-access product. Kept as a small config object so pricing/name
 * are easy to change in one place.
 */
export const ESSAY_ACCESS_PRODUCT = {
  scope: 'all',
  priceUsd: 19.0,
  name: 'AdmitsOnly Essay Library — Full Access',
  description: 'Unlock every premium essay and downloads.',
} as const;

/* ─── Access-token cache (module-scoped; refreshed on expiry) ─── */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Reuse a still-valid token (60s safety margin against clock skew / latency).
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const resp = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await resp.text();
  if (!resp.ok) {
    // Never surface the secret; PayPal's error body does not echo it back.
    throw new Error(`PayPal auth failed (${resp.status}): ${text}`);
  }

  const data = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    // expires_in is seconds from now.
    expiresAt: Date.now() + (data.expires_in || 0) * 1000,
  };
  return cachedToken.value;
}

async function paypalFetch(path: string, init: RequestInit): Promise<any> {
  const token = await getAccessToken();
  const resp = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`PayPal ${path} failed (${resp.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

export interface PaypalOrder {
  id: string;
  status: string;
}

/**
 * Create a CAPTURE-intent order for the given USD amount.
 * Returns { id, status } — the order is NOT yet paid.
 */
export async function createOrder(amountUsd: number): Promise<PaypalOrder> {
  const data = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amountUsd.toFixed(2),
          },
          description: ESSAY_ACCESS_PRODUCT.description,
        },
      ],
    }),
  });
  return { id: data.id, status: data.status };
}

/**
 * Capture a previously-created order. Returns the parsed PayPal response,
 * which contains the top-level `status` and `purchase_units[].payments.
 * captures[]` with each capture's own status/amount. Callers MUST verify
 * status === 'COMPLETED' before granting anything.
 */
export async function captureOrder(orderId: string): Promise<any> {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

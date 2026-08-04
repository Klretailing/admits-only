import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { isPaypalConfigured, captureOrder, getEssayTier, tierByAmount } from '../../../lib/paypal';

/*
 * Capture PayPal order — POST  [SECURITY-CRITICAL]
 * ────────────────────────────────────────────────
 * Auth: any logged-in user.
 * Body: { orderID: string }
 *
 * This is where money is verified. The entitlement in `essay_purchases` is
 * created ONLY when PayPal confirms the capture COMPLETED, and it is keyed
 * idempotently on the PayPal order id (UNIQUE index) so a double-submit or a
 * re-capture of the same order can never grant a second entitlement.
 *
 * Response:
 *   200 { ok: true, scope: 'all' }                — captured + entitlement granted
 *   400 { ok: false, error: 'orderID required' }
 *   401 { error: 'Unauthorized' }
 *   402 { ok: false, error: 'Payment not completed' }  — capture NOT completed
 *   503 { configured: false, error }              — PayPal not set up
 *   502 { ok: false, error: 'capture_failed' }    — PayPal/API error
 */

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id as string;

  if (!isPaypalConfigured()) {
    return res.status(503).json({ configured: false, error: 'PayPal is not configured yet.' });
  }

  const orderID = req.body && req.body.orderID;
  if (!orderID || typeof orderID !== 'string') {
    return res.status(400).json({ ok: false, error: 'orderID required' });
  }

  // ─── Verify payment with PayPal (server-side; client is never trusted) ───
  let capture: any;
  try {
    capture = await captureOrder(orderID);
  } catch (e) {
    console.error('PayPal capture-order error:', (e as Error).message);
    return res.status(502).json({ ok: false, error: 'capture_failed' });
  }

  // The order-level status AND the individual capture status must both be
  // COMPLETED. Anything else (PENDING, DECLINED, ...) grants nothing.
  const pu = capture?.purchase_units?.[0];
  const capObj = pu?.payments?.captures?.[0];
  const orderCompleted = capture?.status === 'COMPLETED';
  const paymentCompleted = capObj?.status === 'COMPLETED';

  if (!orderCompleted || !paymentCompleted) {
    return res.status(402).json({ ok: false, error: 'Payment not completed' });
  }

  // ─── Determine the tier from the ACTUAL captured order (never the client) ───
  // Prefer the custom_id we stamped at create time; then require the amount
  // PayPal actually captured to match that tier's price. Fall back to matching
  // purely by captured amount. If neither resolves, grant nothing.
  const paidValue = Number(capObj?.amount?.value);
  const customId = capObj?.custom_id || pu?.custom_id;
  let tier = getEssayTier(customId);
  if (!tier || !(Math.abs(paidValue - tier.priceUsd) < 0.001)) {
    tier = tierByAmount(paidValue);
  }
  if (!tier) {
    console.error('PayPal capture: unrecognized amount/tier', { paidValue, customId });
    return res.status(402).json({ ok: false, error: 'Payment amount not recognized' });
  }

  // ─── Grant the entitlement, idempotently keyed on the PayPal order id ───
  try {
    await ensureSchema();
    const id = genId('ep');
    const amountCents = Math.round(paidValue * 100);
    await prisma.$executeRaw`
      INSERT INTO "essay_purchases"
        ("id", "userId", "scope", "status", "provider", "providerOrderId", "amountCents", "currency")
      VALUES
        (${id}, ${userId}, ${tier.scope}, 'active', 'paypal', ${orderID}, ${amountCents}, 'USD')
      ON CONFLICT ("providerOrderId") DO NOTHING
    `;
  } catch (e) {
    // Payment succeeded but recording failed — surface an error so the client
    // can retry the capture (the ON CONFLICT above makes retries safe).
    console.error('PayPal entitlement grant error:', (e as Error).message);
    return res.status(502).json({ ok: false, error: 'capture_failed' });
  }

  return res.status(200).json({ ok: true, scope: tier.scope, tier: tier.id });
}

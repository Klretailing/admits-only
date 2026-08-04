import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { isPaypalConfigured, createOrder, getEssayTier } from '../../../lib/paypal';

/*
 * Create PayPal order — POST
 * ──────────────────────────
 * Auth: any logged-in user.
 * Body: { tier?: 'uc' | 'all' }  (defaults to 'all'; legacy scope:'all' accepted)
 * Amount + description are set server-side from the tier — never trusted from
 * the client. The tier id rides in custom_id so capture can verify it.
 *
 * Response:
 *   200 { id: string }                                  — PayPal order id
 *   400 { error: 'Unsupported scope' }
 *   401 { error: 'Unauthorized' }
 *   503 { configured: false, error }                    — PayPal not set up
 *   502 { error: 'create_failed' }                      — PayPal/API error
 *
 * Nothing is recorded here — an order is not paid until it is captured.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  if (!isPaypalConfigured()) {
    return res.status(503).json({ configured: false, error: 'PayPal is not configured yet.' });
  }

  // Accept the tier id ('uc' | 'all'); default to full access. (Legacy callers
  // may still send scope:'all'.)
  const tierId = (req.body && (req.body.tier || (req.body.scope === 'all' ? 'all' : req.body.scope))) || 'all';
  const tier = getEssayTier(tierId);
  if (!tier) {
    return res.status(400).json({ error: 'Unknown tier' });
  }

  try {
    const order = await createOrder(tier.priceUsd, { customId: tier.id, description: tier.description });
    return res.status(200).json({ id: order.id });
  } catch (e) {
    console.error('PayPal create-order error:', (e as Error).message);
    return res.status(502).json({ error: 'create_failed' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import {
  isPaypalConfigured,
  paypalClientId,
  paypalEnv,
  ESSAY_ACCESS_PRODUCT,
} from '../../../lib/paypal';

/*
 * PayPal client config — GET
 * ──────────────────────────
 * Auth: any logged-in user.
 * Returns everything the browser needs to render the checkout UI (and to load
 * the PayPal JS SDK with the PUBLIC client id). The client SECRET is NEVER
 * returned. When PayPal is not configured, `configured` is false and
 * `clientId` is null, but price/productName are still populated so the UI can
 * show a "checkout coming soon" state.
 *
 * Response:
 *   {
 *     configured: boolean,
 *     clientId: string | null,      // PUBLIC PayPal client id, or null
 *     env: 'sandbox' | 'live',
 *     price: number,                // e.g. 19
 *     currency: 'USD',
 *     productName: string
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  const configured = isPaypalConfigured();

  return res.status(200).json({
    configured,
    clientId: configured ? paypalClientId() : null,
    env: paypalEnv(),
    price: ESSAY_ACCESS_PRODUCT.priceUsd,
    currency: 'USD',
    productName: ESSAY_ACCESS_PRODUCT.name,
  });
}

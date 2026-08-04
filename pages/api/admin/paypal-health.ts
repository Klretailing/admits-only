import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { isPaypalConfigured, paypalEnv, checkPaypalConnection } from '../../../lib/paypal';

/* ──────────────────────────────────────────────────────────────────────
   PAYPAL HEALTH CHECK (admin-only)

   Verifies the live/sandbox credentials can authenticate with PayPal —
   no order is created and nothing is charged. Lets the owner confirm the
   payment setup without making a real purchase.
   ────────────────────────────────────────────────────────────────────── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const env = paypalEnv();

  if (!isPaypalConfigured()) {
    return res.json({
      status: 'no_keys',
      title: 'No PayPal keys found',
      detail:
        'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set in this environment. Add them in Vercel → Settings → Environment Variables (plus PAYPAL_ENV = live), then redeploy.',
      env,
    });
  }

  const result = await checkPaypalConnection();

  if (result.ok) {
    if (env !== 'live') {
      return res.json({
        status: 'sandbox',
        title: 'Connected — but in TEST mode',
        detail:
          'Your keys work, but PAYPAL_ENV is not set to "live", so no real money will move. Set PAYPAL_ENV = live in Vercel and redeploy to accept real payments.',
        env,
      });
    }
    return res.json({
      status: 'connected',
      title: 'PayPal is connected (live)',
      detail: 'Your live credentials work — the site can accept real payments. You’re good to go.',
      env,
    });
  }

  if (result.status === 401 || result.status === 400) {
    return res.json({
      status: 'invalid',
      title: 'PayPal rejected the keys',
      detail:
        'The Client ID / Secret were not accepted. Most common cause: they’re Sandbox keys, not Live — or one was pasted with a typo. Re-copy the LIVE credentials from developer.paypal.com, update them in Vercel, and redeploy.',
      env,
    });
  }

  return res.json({
    status: 'error',
    title: 'Could not reach PayPal',
    detail: 'An unexpected error occurred contacting PayPal. Wait a moment and test again.',
    env,
  });
}

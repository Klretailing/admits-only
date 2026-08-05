import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { ESSAY_TIERS } from '../../../lib/paypal';

/* Admin read of the LIVE essay-access pricing (source of truth: lib/paypal). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const tiers = [ESSAY_TIERS.uc, ESSAY_TIERS.all].map((t) => ({
    id: t.id,
    name: t.name,
    scope: t.scope,
    price: t.priceUsd,
    anchor: t.anchorUsd,
    includes: t.includes,
  }));
  return res.json({ tiers });
}

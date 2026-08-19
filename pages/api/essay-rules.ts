import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { getActiveRules } from '../../lib/essayLearning';

/* Serves the learned rules an admin has PROMOTED, for the essay editor to
   fold into its live coaching. Candidates are deliberately not served — a
   rule reaches a student only after a human has approved it. */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  const rules = await getActiveRules();
  // Small, identical for every student, and changes rarely.
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.json({ rules });
}

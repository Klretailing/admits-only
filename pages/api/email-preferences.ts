import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { getPrefs, setPrefs, ensureEmailSchema } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id as string;
  await ensureEmailSchema();

  if (req.method === 'GET') {
    return res.json({ prefs: await getPrefs(userId) });
  }
  if (req.method === 'PUT') {
    const { essayFeedback, deadlineReminders, weeklyDigest } = req.body || {};
    const patch: Record<string, boolean> = {};
    if (typeof essayFeedback === 'boolean') patch.essayFeedback = essayFeedback;
    if (typeof deadlineReminders === 'boolean') patch.deadlineReminders = deadlineReminders;
    if (typeof weeklyDigest === 'boolean') patch.weeklyDigest = weeklyDigest;
    await setPrefs(userId, patch as any);
    return res.json({ ok: true, prefs: await getPrefs(userId) });
  }
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}

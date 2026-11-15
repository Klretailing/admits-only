import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

/* Change the signed-in user's password. Requires the current password, so a
   session left open on a shared computer cannot be used to take the account. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Please sign in again.' });

  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Enter your current password and a new one.' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });

  const minLength = user.role === 'admin' ? 12 : 8;
  if (newPassword.length < minLength) {
    return res.status(400).json({ error: `Use at least ${minLength} characters.` });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'Choose a password different from your current one.' });
  }
  if (!(await compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Your current password is not right.' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { password: await hash(newPassword, 12) } });
  return res.json({ ok: true });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const [totalUsers, totalStudents, totalParents, totalEssays, unreadContacts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.user.count({ where: { role: 'parent' } }),
    prisma.essay.count(),
    prisma.contactSubmission.count({ where: { read: false } }),
  ]);

  return res.json({
    totalUsers,
    totalStudents,
    totalParents,
    totalEssays,
    unreadContacts,
  });
}

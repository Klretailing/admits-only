import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await ensureSchema();

  if (req.method === 'GET') {
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ submissions });
  }

  if (req.method === 'PATCH') {
    const { id, read } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const updated = await prisma.contactSubmission.update({
      where: { id },
      data: { read: !!read },
    });
    return res.json({ submission: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

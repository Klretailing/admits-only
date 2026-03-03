import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSchema();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { method } = req;

  /* ─── GET: List user's motif boards ─── */
  if (method === 'GET') {
    const boards = await (prisma as any).motifBoard.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, bullets: true, analysis: true, createdAt: true, updatedAt: true },
    });
    return res.json({ boards });
  }

  /* ─── POST: Create or update a motif board ─── */
  if (method === 'POST') {
    const { id, title, bullets, analysis } = req.body;

    // Update existing
    if (id) {
      const board = await (prisma as any).motifBoard.update({
        where: { id },
        data: {
          title: title || undefined,
          bullets: bullets || undefined,
          analysis: analysis || undefined,
        },
      });
      return res.json({ board });
    }

    // Create new
    const board = await (prisma as any).motifBoard.create({
      data: {
        userId: user.id,
        title: title || 'Untitled Board',
        bullets: bullets || [],
        analysis: analysis || {},
      },
    });
    return res.json({ board });
  }

  /* ─── DELETE: Remove a motif board ─── */
  if (method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Board ID is required' });

    await (prisma as any).motifBoard.deleteMany({
      where: { id, userId: user.id },
    });
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}

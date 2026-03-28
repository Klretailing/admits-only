import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();

  if (req.method === 'GET') {
    const { id } = req.query;

    // Single document request
    if (id && typeof id === 'string') {
      const doc = await prisma.essayDocument.findFirst({
        where: { id, published: true },
        select: {
          id: true,
          title: true,
          collegeName: true,
          prompt: true,
          content: true,
          fileData: true,
          fileType: true,
          studentGpa: true,
          studentSat: true,
          studentState: true,
          studentECs: true,
          studentAwards: true,
          isFree: true,
          priceInCents: true,
          createdAt: true,
        },
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      // For now all are free; later check payment status
      return res.json({ document: doc });
    }

    // List all published documents (metadata only, no full content)
    const docs = await prisma.essayDocument.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        collegeName: true,
        prompt: true,
        fileType: true,
        studentGpa: true,
        studentSat: true,
        studentState: true,
        studentECs: true,
        studentAwards: true,
        isFree: true,
        priceInCents: true,
        createdAt: true,
      },
    });
    return res.json({ documents: docs });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

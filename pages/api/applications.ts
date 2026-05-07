import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = (session.user as any).id;
  await ensureSchema();

  if (req.method === 'GET') {
    const row: Array<{ data: any }> = await prisma.$queryRaw`
      SELECT "data" FROM "saved_applications" WHERE "userId" = ${userId}
    `;
    return res.json({ applications: row[0]?.data || [] });
  }

  if (req.method === 'PUT') {
    const { applications } = req.body;
    if (!Array.isArray(applications)) {
      return res.status(400).json({ error: 'applications must be an array' });
    }

    const id = `sa_${userId}`;
    await prisma.$executeRaw`
      INSERT INTO "saved_applications" ("id", "userId", "data", "updatedAt")
      VALUES (${id}, ${userId}, ${JSON.stringify(applications)}::jsonb, NOW())
      ON CONFLICT ("userId")
      DO UPDATE SET "data" = ${JSON.stringify(applications)}::jsonb, "updatedAt" = NOW()
    `;

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

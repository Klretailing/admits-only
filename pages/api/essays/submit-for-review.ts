import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;
  const userRole = (session.user as any).role;

  // Only students can submit essays for review
  if (userRole === 'educator') {
    return res.status(403).json({ error: 'Only students can submit essays for review' });
  }

  // POST — submit an essay for tutor review
  if (req.method === 'POST') {
    try {
      const { essayId, note } = req.body;
      if (!essayId || typeof essayId !== 'string') {
        return res.status(400).json({ error: 'essayId is required' });
      }

      // Verify the essay belongs to this student
      const essayRows: any[] = await prisma.$queryRaw`
        SELECT "id", "userId", "title" FROM "essays" WHERE "id" = ${essayId}
      `;
      if (essayRows.length === 0) {
        return res.status(404).json({ error: 'Essay not found' });
      }
      if (essayRows[0].userId !== userId) {
        return res.status(403).json({ error: 'You can only submit your own essays for review' });
      }

      // Check if there's already a pending or in_review review for this essay
      const existingReviews: any[] = await prisma.$queryRaw`
        SELECT "id", "status" FROM "essay_reviews"
        WHERE "essayId" = ${essayId} AND "status" IN ('pending', 'in_review')
      `;
      if (existingReviews.length > 0) {
        return res.status(409).json({ error: 'This essay already has a pending or in-progress review' });
      }

      const reviewId = 'er_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const studentNote = (note && typeof note === 'string') ? note.trim() : '';

      await prisma.$executeRaw`
        INSERT INTO "essay_reviews" ("id", "essayId", "studentId", "status", "studentNote", "submittedAt")
        VALUES (${reviewId}, ${essayId}, ${userId}, 'pending', ${studentNote}, CURRENT_TIMESTAMP)
      `;

      // Return the created review
      const created: any[] = await prisma.$queryRaw`
        SELECT * FROM "essay_reviews" WHERE "id" = ${reviewId}
      `;

      return res.status(201).json({ review: created[0] });
    } catch (e) {
      console.error('Submit for review error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to submit essay for review' });
    }
  }

  // GET — return all reviews for the current student's essays
  if (req.method === 'GET') {
    try {
      const reviews: any[] = await prisma.$queryRaw`
        SELECT er.*, e."title" as "essayTitle"
        FROM "essay_reviews" er
        JOIN "essays" e ON e."id" = er."essayId"
        WHERE er."studentId" = ${userId}
        ORDER BY er."submittedAt" DESC
      `;

      return res.json({ reviews });
    } catch (e) {
      console.error('Fetch student reviews error:', (e as Error).message);
      return res.json({ reviews: [] });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

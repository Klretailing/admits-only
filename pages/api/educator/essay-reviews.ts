import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { applyTutorLabel } from '../../../lib/essayLearning';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureSchema();
  const tutorId = (session.user as any).id as string;

  // GET — fetch all reviews from connected students + reviews claimed by this tutor
  if (req.method === 'GET') {
    try {
      // Get student IDs connected to this tutor
      const connections: any[] = await prisma.$queryRaw`
        SELECT "studentId" FROM "account_connections"
        WHERE "connectedUserId" = ${tutorId} AND "role" = 'tutor'
      `;
      const connectedStudentIds = connections.map(c => c.studentId);

      let reviews: any[] = [];

      if (connectedStudentIds.length > 0) {
        // Fetch pending reviews from connected students + any reviews already assigned to this tutor
        reviews = await prisma.$queryRaw`
          SELECT
            er."id", er."essayId", er."studentId", er."tutorId",
            er."status", er."priority", er."studentNote", er."tutorFeedback",
            er."annotations", er."scores",
            er."submittedAt", er."reviewedAt", er."createdAt", er."updatedAt",
            e."title" as "essayTitle", e."prompt" as "essayPrompt",
            e."content" as "essayContent",
            e."aiScore", e."vocabScore", e."grammarScore",
            e."originalityScore", e."overallScore",
            u."name" as "studentName"
          FROM "essay_reviews" er
          JOIN "essays" e ON e."id" = er."essayId"
          JOIN "users" u ON u."id" = er."studentId"
          WHERE (
            er."studentId" = ANY(${connectedStudentIds})
            OR er."tutorId" = ${tutorId}
          )
          ORDER BY
            CASE er."status"
              WHEN 'pending' THEN 0
              WHEN 'in_review' THEN 1
              WHEN 'returned' THEN 2
              WHEN 'completed' THEN 3
              ELSE 4
            END ASC,
            er."submittedAt" ASC
        `;
      } else {
        // No connected students — only fetch reviews already assigned to this tutor
        reviews = await prisma.$queryRaw`
          SELECT
            er."id", er."essayId", er."studentId", er."tutorId",
            er."status", er."priority", er."studentNote", er."tutorFeedback",
            er."annotations", er."scores",
            er."submittedAt", er."reviewedAt", er."createdAt", er."updatedAt",
            e."title" as "essayTitle", e."prompt" as "essayPrompt",
            e."content" as "essayContent",
            e."aiScore", e."vocabScore", e."grammarScore",
            e."originalityScore", e."overallScore",
            u."name" as "studentName"
          FROM "essay_reviews" er
          JOIN "essays" e ON e."id" = er."essayId"
          JOIN "users" u ON u."id" = er."studentId"
          WHERE er."tutorId" = ${tutorId}
          ORDER BY
            CASE er."status"
              WHEN 'pending' THEN 0
              WHEN 'in_review' THEN 1
              WHEN 'returned' THEN 2
              WHEN 'completed' THEN 3
              ELSE 4
            END ASC,
            er."submittedAt" ASC
        `;
      }

      return res.json({ reviews });
    } catch (e) {
      console.error('Fetch essay reviews error:', (e as Error).message);
      return res.json({ reviews: [] });
    }
  }

  // PUT — claim, save draft, complete, or return a review
  if (req.method === 'PUT') {
    try {
      const { reviewId, action, tutorFeedback, annotations, scores } = req.body;

      if (!reviewId || typeof reviewId !== 'string') {
        return res.status(400).json({ error: 'reviewId is required' });
      }
      if (!action || !['claim', 'save', 'complete', 'return'].includes(action)) {
        return res.status(400).json({ error: 'action must be one of: claim, save, complete, return' });
      }

      // Fetch the review
      const reviewRows: any[] = await prisma.$queryRaw`
        SELECT * FROM "essay_reviews" WHERE "id" = ${reviewId}
      `;
      if (reviewRows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }
      const review = reviewRows[0];

      if (action === 'claim') {
        // Can only claim unclaimed (pending) reviews
        if (review.status !== 'pending') {
          return res.status(409).json({ error: 'This review has already been claimed' });
        }
        await prisma.$executeRaw`
          UPDATE "essay_reviews"
          SET "tutorId" = ${tutorId}, "status" = 'in_review', "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${reviewId}
        `;
      } else if (action === 'save') {
        // Save draft — only the assigned tutor can save
        if (review.tutorId !== tutorId) {
          return res.status(403).json({ error: 'Only the assigned tutor can update this review' });
        }
        const feedbackStr = (tutorFeedback != null && typeof tutorFeedback === 'string') ? tutorFeedback : review.tutorFeedback;
        const annotationsJson = annotations != null ? JSON.stringify(annotations) : JSON.stringify(review.annotations);
        const scoresJson = scores != null ? JSON.stringify(scores) : JSON.stringify(review.scores);

        await prisma.$executeRaw`
          UPDATE "essay_reviews"
          SET "tutorFeedback" = ${feedbackStr},
              "annotations" = ${annotationsJson}::jsonb,
              "scores" = ${scoresJson}::jsonb,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${reviewId}
        `;
      } else if (action === 'complete') {
        // Complete review — only the assigned tutor can complete
        if (review.tutorId !== tutorId) {
          return res.status(403).json({ error: 'Only the assigned tutor can complete this review' });
        }
        const feedbackStr = (tutorFeedback != null && typeof tutorFeedback === 'string') ? tutorFeedback : review.tutorFeedback;
        const annotationsJson = annotations != null ? JSON.stringify(annotations) : JSON.stringify(review.annotations);
        const scoresJson = scores != null ? JSON.stringify(scores) : JSON.stringify(review.scores);

        await prisma.$executeRaw`
          UPDATE "essay_reviews"
          SET "status" = 'completed',
              "tutorFeedback" = ${feedbackStr},
              "annotations" = ${annotationsJson}::jsonb,
              "scores" = ${scoresJson}::jsonb,
              "reviewedAt" = CURRENT_TIMESTAMP,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${reviewId}
        `;

        // A completed tutor review is the learning loop's only source of
        // ground truth — the engine never labels its own output. Fire-and-
        // forget so labelling can't fail a tutor's submission.
        try {
          const parsedScores = typeof scoresJson === 'string' ? JSON.parse(scoresJson) : scoresJson;
          void applyTutorLabel(review.essayId, parsedScores || {});
        } catch { /* best-effort */ }
      } else if (action === 'return') {
        // Return for revision — only the assigned tutor can return
        if (review.tutorId !== tutorId) {
          return res.status(403).json({ error: 'Only the assigned tutor can return this review' });
        }
        const feedbackStr = (tutorFeedback != null && typeof tutorFeedback === 'string') ? tutorFeedback : review.tutorFeedback;

        await prisma.$executeRaw`
          UPDATE "essay_reviews"
          SET "status" = 'returned',
              "tutorFeedback" = ${feedbackStr},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${reviewId}
        `;
      }

      // Return the updated review
      const updated: any[] = await prisma.$queryRaw`
        SELECT * FROM "essay_reviews" WHERE "id" = ${reviewId}
      `;

      return res.json({ review: updated[0] });
    } catch (e) {
      console.error('Update essay review error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to update review' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

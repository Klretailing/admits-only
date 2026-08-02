import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tutorId = (session.user as any).id;
  await ensureSchema();

  try {
    // Find all students connected to this tutor
    const connections: any[] = await prisma.$queryRaw`
      SELECT ac."studentId", u."name" AS "studentName", u."email" AS "studentEmail",
             ac."createdAt" AS "connectedAt"
      FROM "account_connections" ac
      JOIN "users" u ON u."id" = ac."studentId"
      WHERE ac."connectedUserId" = ${tutorId} AND ac."role" = 'tutor'
    `;

    if (connections.length === 0) {
      return res.json({ students: [] });
    }

    const requestedStudentId = req.query.studentId as string | undefined;

    // If a specific student is requested, verify they are connected to this tutor
    if (requestedStudentId) {
      const isConnected = connections.some(c => c.studentId === requestedStudentId);
      if (!isConnected) {
        return res.status(403).json({ error: 'Student is not connected to your account' });
      }

      const student = await getDetailedStudentProgress(requestedStudentId, connections);
      return res.json({ students: [student] });
    }

    // Return summary data for all connected students
    const students = await Promise.all(
      connections.map(conn => getSummaryStudentProgress(conn))
    );

    return res.json({ students });
  } catch (e) {
    console.error('Student progress error:', (e as Error).message);
    return res.status(500).json({ error: 'Failed to fetch student progress' });
  }
}

/** Summary view: profile stats, essay counts by status, application count, pending reviews */
async function getSummaryStudentProgress(conn: any) {
  const studentId = conn.studentId;

  // Run all queries in parallel
  const [profile, essayCounts, applicationData, pendingReviewCount] = await Promise.all([
    getStudentProfile(studentId),
    getEssayStatusCounts(studentId),
    getApplicationData(studentId),
    getPendingReviewCount(studentId),
  ]);

  return {
    id: studentId,
    name: conn.studentName || 'Student',
    email: conn.studentEmail,
    connectedAt: conn.connectedAt,
    profile,
    essayCounts,
    applicationCount: applicationData.length,
    pendingReviews: pendingReviewCount,
  };
}

/** Detailed view: includes full essay list with titles/scores and application list */
async function getDetailedStudentProgress(studentId: string, connections: any[]) {
  const conn = connections.find(c => c.studentId === studentId);

  const [profile, essayCounts, essays, applicationData, pendingReviewCount] = await Promise.all([
    getStudentProfile(studentId),
    getEssayStatusCounts(studentId),
    getEssayList(studentId),
    getApplicationData(studentId),
    getPendingReviewCount(studentId),
  ]);

  return {
    id: studentId,
    name: conn?.studentName || 'Student',
    email: conn?.studentEmail,
    connectedAt: conn?.connectedAt,
    profile,
    essayCounts,
    essays,
    applications: applicationData,
    pendingReviews: pendingReviewCount,
  };
}

async function getStudentProfile(studentId: string) {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "gpa", "gpaScale", "satMath", "satRW", "holisticScore", "percentile"
      FROM "student_profiles"
      WHERE "userId" = ${studentId}
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function getEssayStatusCounts(studentId: string) {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "status", COUNT(*)::int AS "count"
      FROM "essays"
      WHERE "userId" = ${studentId}
      GROUP BY "status"
    `;
    const counts: Record<string, number> = { draft: 0, inReview: 0, complete: 0, total: 0 };
    for (const row of rows) {
      const status = (row.status || '').toLowerCase();
      if (status === 'draft') counts.draft += row.count;
      else if (status === 'in review' || status === 'in_review' || status === 'inreview') counts.inReview += row.count;
      else if (status === 'complete' || status === 'completed' || status === 'final') counts.complete += row.count;
      else counts.draft += row.count; // default bucket for unknown statuses
      counts.total += row.count;
    }
    return counts;
  } catch {
    return { draft: 0, inReview: 0, complete: 0, total: 0 };
  }
}

async function getEssayList(studentId: string) {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "id", "title", "status", "overallScore", "updatedAt"
      FROM "essays"
      WHERE "userId" = ${studentId}
      ORDER BY "updatedAt" DESC
    `;
    return rows.map(e => ({
      id: e.id,
      title: e.title,
      status: e.status,
      overallScore: e.overallScore,
      updatedAt: e.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function getApplicationData(studentId: string): Promise<any[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "data" FROM "saved_applications" WHERE "userId" = ${studentId}
    `;
    if (rows.length === 0) return [];

    let data = rows[0].data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getPendingReviewCount(studentId: string): Promise<number> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM "essay_reviews"
      WHERE "studentId" = ${studentId} AND "status" = 'pending'
    `;
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

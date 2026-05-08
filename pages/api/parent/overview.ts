import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  await ensureSchema();

  try {
    // Find connected student(s)
    const connections: any[] = await prisma.$queryRaw`
      SELECT ac.*, u."name" as "studentName", u."email" as "studentEmail"
      FROM "account_connections" ac
      JOIN "users" u ON u."id" = ac."studentId"
      WHERE ac."connectedUserId" = ${userId}
    `;

    if (connections.length === 0) {
      return res.json({ connected: false, students: [] });
    }

    const students: any[] = [];
    for (const conn of connections) {
      const studentId = conn.studentId;

      // Get student's applications
      let applications: any[] = [];
      try {
        const appRows: any[] = await prisma.$queryRaw`
          SELECT "data" FROM "saved_applications" WHERE "userId" = ${studentId}
        `;
        applications = appRows[0]?.data || [];
        if (typeof applications === 'string') {
          try { applications = JSON.parse(applications); } catch { applications = []; }
        }
      } catch {}

      // Get student profile
      let profile: any = null;
      try {
        const profileRows: any[] = await prisma.$queryRaw`
          SELECT * FROM "student_profiles" WHERE "userId" = ${studentId}
        `;
        profile = profileRows[0] || null;
      } catch {}

      // Get essay count and statuses (NOT content - privacy)
      let essayRows: any[] = [];
      try {
        essayRows = await prisma.$queryRaw`
          SELECT "id", "title", "status", "overallScore", "updatedAt" FROM "essays" WHERE "userId" = ${studentId} ORDER BY "updatedAt" DESC
        `;
      } catch {}

      students.push({
        id: studentId,
        name: conn.studentName || 'Student',
        email: conn.studentEmail,
        role: conn.role,
        connectionId: conn.id,
        connectedAt: conn.createdAt,
        applications,
        profile: profile ? {
          gpa: profile.gpa,
          satMath: profile.satMath,
          satRW: profile.satRW,
          holisticScore: profile.holisticScore,
        } : null,
        essays: conn.role === 'tutor' ? essayRows : essayRows.map((e: any) => ({ id: e.id, title: e.title, status: e.status, overallScore: e.overallScore })),
      });
    }

    return res.json({ connected: true, students });
  } catch (e) {
    console.error('Parent overview error:', (e as Error).message);
    return res.json({ connected: false, students: [] });
  }
}

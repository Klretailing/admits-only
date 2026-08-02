import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma, ensureSchema } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const educatorId = (session.user as any).id as string;
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'Student id is required' });

  await ensureSchema();

  // Fetch the CRM roster row + invite columns (which live outside the Prisma model)
  let student: any;
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "id", "educatorId", "studentName", "studentEmail", "tags", "notes",
             "status", "startDate", "inviteStatus", "inviteToken", "linkedUserId"
      FROM "educator_students"
      WHERE "id" = ${id}
    `;
    student = rows[0];
  } catch (e) {
    console.error('Fetch student row error:', (e as Error).message);
    return res.status(500).json({ error: 'Failed to load student' });
  }

  // 404 if not found or not owned by this educator
  if (!student || student.educatorId !== educatorId) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const linkedUserId: string | null = student.linkedUserId || null;
  const linked = !!linkedUserId;

  const parseJson = (v: any, fallback: any) => {
    if (v == null) return fallback;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return fallback; }
    }
    return v;
  };

  const payload: any = {
    student: {
      id: student.id,
      name: student.studentName,
      email: student.studentEmail || '',
      tags: parseJson(student.tags, []),
      notes: parseJson(student.notes, []),
      status: student.status || 'active',
      inviteStatus: student.inviteStatus || 'none',
      linkedUserId,
      startDate: student.startDate,
    },
    linked,
    profile: null,
    essays: [],
    applications: [],
    reviews: [],
    bookings: [],
  };

  // Always available: bookings for this roster student
  payload.bookings = await getBookings(id);

  // Rich live data only when linked to a real platform account
  if (linked) {
    const [profile, essays, applications, reviews] = await Promise.all([
      getProfile(linkedUserId!),
      getEssays(linkedUserId!),
      getApplications(linkedUserId!),
      getReviews(linkedUserId!),
    ]);
    payload.profile = profile;
    payload.essays = essays;
    payload.applications = applications;
    payload.reviews = reviews;
  }

  return res.json(payload);

  async function getBookings(rosterId: string) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "id", "title", "date", "duration", "status", "meetingLink",
               "platform", "amount", "paid"
        FROM "bookings"
        WHERE "studentId" = ${rosterId}
        ORDER BY "date" DESC
      `;
      return rows.map(b => ({
        id: b.id,
        title: b.title,
        date: b.date,
        duration: b.duration,
        status: b.status,
        meetingLink: b.meetingLink || '',
        platform: b.platform,
        amount: b.amount,
        paid: !!b.paid,
      }));
    } catch {
      return [];
    }
  }

  async function getProfile(uid: string) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "gpa", "gpaScale", "gpaWeighted", "satMath", "satRW", "actScore",
               "holisticScore", "percentile"
        FROM "student_profiles"
        WHERE "userId" = ${uid}
      `;
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  async function getEssays(uid: string) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "id", "title", "prompt", "content", "status", "overallScore", "updatedAt"
        FROM "essays"
        WHERE "userId" = ${uid}
        ORDER BY "updatedAt" DESC
      `;
      return rows.map(e => ({
        id: e.id,
        title: e.title,
        prompt: e.prompt || '',
        status: e.status,
        overallScore: e.overallScore,
        wordCount: e.content ? String(e.content).trim().split(/\s+/).filter(Boolean).length : 0,
        updatedAt: e.updatedAt,
      }));
    } catch {
      return [];
    }
  }

  async function getApplications(uid: string) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "data" FROM "saved_applications" WHERE "userId" = ${uid}
      `;
      if (rows.length === 0) return [];
      const data = parseJson(rows[0].data, []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function getReviews(uid: string) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT er."id", er."essayId", er."status", er."scores",
               er."submittedAt", er."reviewedAt",
               e."title" AS "essayTitle"
        FROM "essay_reviews" er
        JOIN "essays" e ON e."id" = er."essayId"
        WHERE er."studentId" = ${uid}
        ORDER BY er."submittedAt" DESC
      `;
      return rows.map(r => {
        const scores = parseJson(r.scores, null);
        let overallScoreFromTutor: number | null = null;
        if (scores && typeof scores === 'object') {
          const v = scores.overall ?? scores.overallScore ?? null;
          if (typeof v === 'number') overallScoreFromTutor = v;
        }
        return {
          id: r.id,
          essayId: r.essayId,
          essayTitle: r.essayTitle,
          status: r.status,
          submittedAt: r.submittedAt,
          reviewedAt: r.reviewedAt,
          overallScoreFromTutor,
        };
      });
    } catch {
      return [];
    }
  }
}

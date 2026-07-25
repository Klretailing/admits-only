import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

// ─── Action queue shapes ───
interface AwaitingReview {
  reviewId: string;
  studentId: string;
  studentName: string;
  essayTitle: string;
  submittedAt: string | null;
}
interface UpcomingDeadline {
  studentId: string;
  studentName: string;
  school: string;
  type: string;
  deadline: string;
  daysLeft: number;
}
interface AtRiskStudent {
  studentId: string;
  studentName: string;
  reason: string;
}
interface TodaySession {
  id: string;
  title: string;
  date: string;
  studentName: string;
  meetingLink: string;
  platform: string;
  duration: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Students connected to this tutor via account_connections (role='tutor'). */
async function getConnectedStudents(tutorId: string): Promise<{ studentId: string; studentName: string }[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT ac."studentId", u."name" AS "studentName"
      FROM "account_connections" ac
      JOIN "users" u ON u."id" = ac."studentId"
      WHERE ac."connectedUserId" = ${tutorId} AND ac."role" = 'tutor'
    `;
    return rows.map(r => ({ studentId: r.studentId, studentName: r.studentName || 'Student' }));
  } catch (e) {
    console.error('overview getConnectedStudents error:', (e as Error).message);
    return [];
  }
}

/** Pending essay_reviews for connected students, newest first, capped. */
async function getEssaysAwaitingReview(studentIds: string[]): Promise<AwaitingReview[]> {
  if (studentIds.length === 0) return [];
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT er."id" AS "reviewId", er."studentId", er."submittedAt",
             e."title" AS "essayTitle", u."name" AS "studentName"
      FROM "essay_reviews" er
      JOIN "essays" e ON e."id" = er."essayId"
      JOIN "users" u ON u."id" = er."studentId"
      WHERE er."studentId" = ANY(${studentIds}) AND er."status" = 'pending'
      ORDER BY er."submittedAt" DESC NULLS LAST
      LIMIT 5
    `;
    return rows.map(r => ({
      reviewId: r.reviewId,
      studentId: r.studentId,
      studentName: r.studentName || 'Student',
      essayTitle: r.essayTitle || 'Untitled essay',
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
    }));
  } catch (e) {
    console.error('overview getEssaysAwaitingReview error:', (e as Error).message);
    return [];
  }
}

/** Application deadlines within the next ~21 days, parsed from saved_applications jsonb. */
async function getUpcomingDeadlines(
  students: { studentId: string; studentName: string }[],
  now: Date,
): Promise<UpcomingDeadline[]> {
  if (students.length === 0) return [];
  try {
    const windowMs = 21 * DAY_MS;
    const results: UpcomingDeadline[] = [];

    await Promise.all(
      students.map(async (s) => {
        try {
          const rows: any[] = await prisma.$queryRaw`
            SELECT "data" FROM "saved_applications" WHERE "userId" = ${s.studentId}
          `;
          if (rows.length === 0) return;
          let data = rows[0].data;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch { return; }
          }
          if (!Array.isArray(data)) return;

          for (const app of data) {
            if (!app || !app.deadline) continue;
            const deadline = new Date(app.deadline);
            if (isNaN(deadline.getTime())) continue;
            const diff = deadline.getTime() - now.getTime();
            if (diff <= 0 || diff > windowMs) continue;
            results.push({
              studentId: s.studentId,
              studentName: s.studentName,
              school: app.name || app.school || 'School',
              type: app.type || 'Application',
              deadline: deadline.toISOString(),
              daysLeft: Math.ceil(diff / DAY_MS),
            });
          }
        } catch {
          // per-student failure is non-fatal
        }
      }),
    );

    results.sort((a, b) => a.daysLeft - b.daysLeft);
    return results.slice(0, 8);
  } catch (e) {
    console.error('overview getUpcomingDeadlines error:', (e as Error).message);
    return [];
  }
}

/** Connected students with no recent essay activity (>14 days stale, or 0 essays). */
async function getAtRiskStudents(
  students: { studentId: string; studentName: string }[],
  now: Date,
): Promise<AtRiskStudent[]> {
  if (students.length === 0) return [];
  try {
    const staleMs = 14 * DAY_MS;
    const results: AtRiskStudent[] = [];

    await Promise.all(
      students.map(async (s) => {
        try {
          const rows: any[] = await prisma.$queryRaw`
            SELECT MAX("updatedAt") AS "lastActivity", COUNT(*)::int AS "count"
            FROM "essays"
            WHERE "userId" = ${s.studentId}
          `;
          const count = rows[0]?.count ?? 0;
          if (count === 0) {
            results.push({ studentId: s.studentId, studentName: s.studentName, reason: 'No essays started yet' });
            return;
          }
          const last = rows[0]?.lastActivity ? new Date(rows[0].lastActivity) : null;
          if (last && now.getTime() - last.getTime() > staleMs) {
            const days = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
            results.push({ studentId: s.studentId, studentName: s.studentName, reason: `No essay activity in ${days} days` });
          }
        } catch {
          // per-student failure is non-fatal
        }
      }),
    );

    return results.slice(0, 5);
  } catch (e) {
    console.error('overview getAtRiskStudents error:', (e as Error).message);
    return [];
  }
}

/** Bookings scheduled for today. */
async function getTodaySessions(tutorId: string, startOfDay: Date, endOfDay: Date): Promise<TodaySession[]> {
  try {
    const rows = await prisma.booking.findMany({
      where: { educatorId: tutorId, date: { gte: startOfDay, lt: endOfDay }, status: 'scheduled' },
      include: { student: { select: { studentName: true } } },
      orderBy: { date: 'asc' },
    });
    return rows.map(b => ({
      id: b.id,
      title: b.title,
      date: b.date.toISOString(),
      studentName: b.student?.studentName || 'Unknown',
      meetingLink: b.meetingLink,
      platform: b.platform,
      duration: b.duration,
    }));
  } catch (e) {
    console.error('overview getTodaySessions error:', (e as Error).message);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  const role = (session?.user as any)?.role;
  // Educators see their own data; admins may preview the portal (they have no
  // connected students, so the queries simply return zeros).
  if (!session?.user || (role !== 'educator' && role !== 'admin')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

  // Empty action queue default so a full failure never breaks the page.
  const emptyActionQueue = {
    essaysAwaitingReview: { count: 0, items: [] as AwaitingReview[] },
    upcomingDeadlines: { count: 0, items: [] as UpcomingDeadline[] },
    atRiskStudents: { count: 0, items: [] as AtRiskStudent[] },
    todaySessions: { count: 0, items: [] as TodaySession[] },
  };

  try {
    await ensureSchema();

    const connectedStudents = await getConnectedStudents(userId);
    const connectedStudentIds = connectedStudents.map(s => s.studentId);

    const [
      totalStudents,
      activeStudents,
      allBookings,
      todayBookings,
      recentBookings,
      awaitingReview,
      upcomingDeadlines,
      atRiskStudents,
      todaySessions,
    ] = await Promise.all([
      prisma.educatorStudent.count({ where: { educatorId: userId } }),
      prisma.educatorStudent.count({ where: { educatorId: userId, status: 'active' } }),
      prisma.booking.findMany({ where: { educatorId: userId }, select: { amount: true, paid: true, status: true, date: true } }),
      prisma.booking.count({ where: { educatorId: userId, date: { gte: startOfDay, lt: endOfDay }, status: 'scheduled' } }),
      prisma.booking.findMany({
        where: { educatorId: userId, date: { gte: now }, status: 'scheduled' },
        include: { student: { select: { studentName: true } } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      getEssaysAwaitingReview(connectedStudentIds),
      getUpcomingDeadlines(connectedStudents, now),
      getAtRiskStudents(connectedStudents, now),
      getTodaySessions(userId, startOfDay, endOfDay),
    ]);

    const totalRevenue = allBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.amount, 0);
    const monthRevenue = allBookings.filter(b => b.status === 'completed' && new Date(b.date) >= startOfMonth).reduce((sum, b) => sum + b.amount, 0);

    return res.json({
      totalStudents,
      activeStudents,
      totalBookings: allBookings.length,
      upcomingToday: todayBookings,
      monthRevenue,
      totalRevenue,
      recentBookings: recentBookings.map(b => ({
        id: b.id,
        title: b.title,
        date: b.date.toISOString(),
        status: b.status,
        studentName: b.student?.studentName || 'Unknown',
        platform: b.platform,
        meetingLink: b.meetingLink,
        duration: b.duration,
      })),
      actionQueue: {
        essaysAwaitingReview: { count: awaitingReview.length, items: awaitingReview },
        upcomingDeadlines: { count: upcomingDeadlines.length, items: upcomingDeadlines },
        atRiskStudents: { count: atRiskStudents.length, items: atRiskStudents },
        todaySessions: { count: todaySessions.length, items: todaySessions },
      },
    });
  } catch (e) {
    console.error('Educator overview error:', (e as Error).message);
    return res.json({
      totalStudents: 0,
      activeStudents: 0,
      totalBookings: 0,
      upcomingToday: 0,
      monthRevenue: 0,
      totalRevenue: 0,
      recentBookings: [],
      actionQueue: emptyActionQueue,
    });
  }
}

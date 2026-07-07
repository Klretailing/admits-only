import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

const DAY_MS = 86400000;

function daysBetween(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / DAY_MS);
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Compute a per-student "This Week" digest from real application + essay data.
// Every sub-computation is defensive: on any failure it returns an empty value
// so the endpoint never 500s.
function buildDigest(applications: any[], essays: any[], now: Date) {
  const apps = Array.isArray(applications) ? applications : [];
  const es = Array.isArray(essays) ? essays : [];

  // --- recentActivity: milestones newest first, cap ~6 ---
  let recentActivity: Array<{ type: string; label: string; date: string | null }> = [];
  try {
    const items: Array<{ type: string; label: string; date: string | null; sort: number }> = [];
    for (const e of es) {
      const status = String(e?.status || '').toLowerCase();
      const updated = parseDate(e?.updatedAt);
      const title = e?.title || 'an essay';
      const recentlyTouched = updated ? daysBetween(now, updated) <= 10 && daysBetween(now, updated) >= 0 : false;
      if (status === 'complete' || status === 'final') {
        items.push({ type: 'essay_complete', label: `Finished essay: ${title}`, date: updated ? updated.toISOString() : null, sort: updated ? updated.getTime() : 0 });
      } else if (recentlyTouched) {
        items.push({ type: 'essay_progress', label: `Worked on essay: ${title}`, date: updated ? updated.toISOString() : null, sort: updated ? updated.getTime() : 0 });
      }
    }
    for (const a of apps) {
      const status = String(a?.status || '').toLowerCase();
      const name = a?.name || 'a school';
      if (status === 'accepted') {
        items.push({ type: 'app_accepted', label: `Accepted to ${name}`, date: null, sort: now.getTime() + 2 });
      } else if (status === 'submitted') {
        items.push({ type: 'app_submitted', label: `Submitted application to ${name}`, date: null, sort: now.getTime() + 1 });
      }
    }
    items.sort((x, y) => y.sort - x.sort);
    recentActivity = items.slice(0, 6).map(({ type, label, date }) => ({ type, label, date }));
  } catch { recentActivity = []; }

  // --- upcomingDeadlines: within ~30 days, ascending ---
  let upcomingDeadlines: Array<{ school: string; type: string; deadline: string; daysLeft: number }> = [];
  try {
    const list: Array<{ school: string; type: string; deadline: string; daysLeft: number }> = [];
    for (const a of apps) {
      const d = parseDate(a?.deadline);
      if (!d) continue;
      const status = String(a?.status || '').toLowerCase();
      // Skip apps already resolved.
      if (['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(status)) continue;
      const daysLeft = daysBetween(d, now);
      if (daysLeft >= 0 && daysLeft <= 30) {
        list.push({ school: a?.name || 'School', type: a?.type || '', deadline: a?.deadline, daysLeft });
      }
    }
    list.sort((x, y) => x.daysLeft - y.daysLeft);
    upcomingDeadlines = list;
  } catch { upcomingDeadlines = []; }

  // --- parentActionNeeded: parent-owned financial/admin steps, cap ~4 ---
  let parentActionNeeded: Array<{ label: string; reason: string; urgency: string }> = [];
  try {
    if (apps.length > 0) {
      const items: Array<{ label: string; reason: string; urgency: string }> = [];
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const anyAccepted = apps.some((a) => String(a?.status || '').toLowerCase() === 'accepted');
      const soonest = upcomingDeadlines[0];

      // FAFSA: opens Oct 1, priority deadlines through winter.
      // Treat as high urgency during Oct-Feb window.
      const fafsaSeason = month >= 9 || month <= 1;
      items.push({
        label: 'Complete the FAFSA',
        reason: fafsaSeason
          ? 'Federal aid opened Oct 1 — file early, funds are first-come.'
          : 'Required for federal financial aid across every school.',
        urgency: fafsaSeason ? 'high' : 'normal',
      });

      // CSS Profile — needed by many private schools, often due with the app.
      items.push({
        label: 'Submit the CSS Profile',
        reason: soonest
          ? `Many private schools require it — ${soonest.school}'s deadline is in ${soonest.daysLeft} day${soonest.daysLeft === 1 ? '' : 's'}.`
          : 'Required by many private colleges for institutional aid.',
        urgency: soonest && soonest.daysLeft <= 7 ? 'high' : soonest && soonest.daysLeft <= 14 ? 'medium' : 'normal',
      });

      // Enrollment deposit — only relevant once accepted.
      if (anyAccepted) {
        items.push({
          label: 'Pay the enrollment deposit',
          reason: 'An acceptance is in — deposits secure the spot and have hard deadlines (often May 1).',
          urgency: 'high',
        });
      }

      // Fee waivers — worth flagging before deadlines pile up.
      items.push({
        label: 'Check application fee waiver eligibility',
        reason: 'Fee waivers can cut application costs — confirm eligibility before deadlines.',
        urgency: 'normal',
      });

      parentActionNeeded = items.slice(0, 4);
    }
  } catch { parentActionNeeded = []; }

  // --- onTrack: summary numbers ---
  let onTrack = { schoolsTotal: 0, submitted: 0, accepted: 0, essaysInProgress: 0, essaysComplete: 0, tasksDone: 0, tasksTotal: 0 };
  try {
    let submitted = 0, accepted = 0, tasksDone = 0, tasksTotal = 0;
    for (const a of apps) {
      const status = String(a?.status || '').toLowerCase();
      if (['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(status)) submitted++;
      if (status === 'accepted') accepted++;
      const tasks = Array.isArray(a?.tasks) ? a.tasks : [];
      tasksTotal += tasks.length;
      for (const t of tasks) { if (t?.done) tasksDone++; }
    }
    let essaysComplete = 0, essaysInProgress = 0;
    for (const e of es) {
      const status = String(e?.status || '').toLowerCase();
      if (status === 'complete' || status === 'final') essaysComplete++;
      else if (status === 'draft' || status === 'in review' || status === 'in_progress') essaysInProgress++;
    }
    onTrack = { schoolsTotal: apps.length, submitted, accepted, essaysInProgress, essaysComplete, tasksDone, tasksTotal };
  } catch { /* keep default */ }

  return { recentActivity, upcomingDeadlines, parentActionNeeded, onTrack };
}

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
          gpaWeighted: (profile as any).gpaWeighted,
          satMath: profile.satMath,
          satRW: profile.satRW,
          actScore: (profile as any).actScore,
          holisticScore: profile.holisticScore,
        } : null,
        // Parents get essay metadata (incl. updatedAt) but never content.
        essays: conn.role === 'tutor' ? essayRows : essayRows.map((e: any) => ({ id: e.id, title: e.title, status: e.status, overallScore: e.overallScore, updatedAt: e.updatedAt })),
        digest: (() => {
          try { return buildDigest(applications, essayRows, new Date()); }
          catch { return { recentActivity: [], upcomingDeadlines: [], parentActionNeeded: [], onTrack: { schoolsTotal: 0, submitted: 0, accepted: 0, essaysInProgress: 0, essaysComplete: 0, tasksDone: 0, tasksTotal: 0 } }; }
        })(),
      });
    }

    return res.json({ connected: true, students });
  } catch (e) {
    console.error('Parent overview error:', (e as Error).message);
    return res.json({ connected: false, students: [] });
  }
}

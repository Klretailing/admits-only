import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, ensureSchema } from '../../../lib/db';
import { ensureEmailSchema, sendDeadlineEmail, sendWeeklyDigestEmail, sendIdleNudgeEmail, escapeHtml, type SendResult } from '../../../lib/email';

/* ──────────────────────────────────────────────────────────────────────
   SCHEDULED EMAIL JOB   (Vercel cron → GET /api/cron/emails)

   ?job=daily      deadlines, then idle check-ins (the scheduled daily run)
   ?job=deadlines  deadline reminders only
   ?job=idle       unfinished-task check-ins only
   ?job=digest     weekly catch-up

   Safe to run more than once: every send claims a dedupe key first, so a
   retried or double-scheduled run produces "duplicate", not a second email.

   Demo and internal @admitsonly.com accounts are skipped. Their mailboxes
   mostly do not exist, and bouncing mail at a fresh sending domain is a fast
   way to wreck deliverability for the students who do matter.
   ────────────────────────────────────────────────────────────────────── */

interface Task { id: string; label: string; done: boolean }
interface App { id?: string; name?: string; deadline?: string; status?: string; tasks?: Task[] }

const CLOSED = new Set(['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred']);
/* Reminder milestones, furthest first. A school is bucketed into the smallest
   milestone it still fits under, rather than matched exactly.

   Exact matching was wrong twice over. First, anchoring the deadline at
   23:59:59 and dividing by whole days made a date three days out compute as
   four, so nothing ever matched. Second, even corrected, `days === 3` means a
   single missed cron run (a deploy, an outage) silently skips that milestone
   forever. Bucketing plus the dedupe key gives exactly one email per school
   per milestone, and a late run still catches the student at the next one. */
const REMIND_AT_DAYS = [7, 3, 1];

/** Whole calendar days from today to the deadline date. Both sides are
    normalised to midnight UTC so the answer does not drift with the clock. */
function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(deadline);
  if (!m) return null;
  const due = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / 86400000);
}

/** The milestone a school belongs to, or null if it is not due soon. */
function milestoneFor(days: number): number | null {
  if (days < 0) return null;                    // past due: a late nudge is just guilt
  for (const mark of [...REMIND_AT_DAYS].sort((a, b) => a - b)) {
    if (days <= mark) return mark;
  }
  return null;
}

/* ─── idle check-ins ───
   A student who has gone quiet with work still open gets a gentle note at
   5 days away and again at 14. After 30 days we stop: someone gone a month
   has made a decision, and a third email reads as nagging rather than help.

   The dedupe key includes the date they were last active, so each quiet
   stretch is its own: come back, go quiet again, and the 5-day note can
   fire once more. Within one stretch, each milestone fires at most once. */
const IDLE_MILESTONES = [5, 14];
const IDLE_GIVE_UP_DAYS = 30;

function idleMilestone(days: number): number | null {
  if (days > IDLE_GIVE_UP_DAYS) return null;
  let hit: number | null = null;
  for (const m of IDLE_MILESTONES) if (days >= m) hit = m;
  return hit;
}

/** Last sign of life. lastLoginAt alone would understate activity: sessions
    last 30 days, so an active student may not log in for weeks. Any tracked
    event counts; account creation is the floor for someone who never came back. */
async function lastActiveMap(): Promise<Map<string, Date>> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT u."id",
           GREATEST(u."createdAt", COALESCE(u."lastLoginAt", u."createdAt"),
                    COALESCE(MAX(ae."createdAt"), u."createdAt")) AS "lastActive"
      FROM "users" u
      LEFT JOIN "analytics_events" ae ON ae."userId" = u."id"
     WHERE u."role" = 'student'
     GROUP BY u."id"`;
  return new Map(rows.map(r => [r.id, new Date(r.lastActive)]));
}

async function emailedRecently(userId: string, hours: number): Promise<boolean> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT 1 FROM "email_log"
     WHERE "userId" = ${userId} AND "sentAt" > NOW() - (${hours} * INTERVAL '1 hour') LIMIT 1`;
  return rows.length > 0;
}

function isoWeekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function realStudents(): Promise<{ id: string; name: string | null; email: string }[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT "id", "name", "email" FROM "users"
     WHERE "role" = 'student' AND "email" NOT ILIKE '%admitsonly.com'`;
  return rows;
}

async function appsFor(userId: string): Promise<App[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT "data" FROM "saved_applications" WHERE "userId" = ${userId}`;
  const d = rows[0]?.data;
  const parsed = typeof d === 'string' ? JSON.parse(d) : d;
  return Array.isArray(parsed) ? parsed : [];
}

function tally(results: SendResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of results) out[r] = (out[r] || 0) + 1;
  return out;
}

async function runDeadlines(students: { id: string; name: string | null; email: string }[], results: SendResult[]) {
  for (const s of students) {
    const apps = await appsFor(s.id);
    const due = apps
      .filter(a => a.name && a.deadline && !(a.status && CLOSED.has(a.status)))
      .map(a => {
        const days = daysUntil(a.deadline) ?? 9999;
        return {
          name: a.name as string,
          days,
          milestone: milestoneFor(days),
          remaining: (a.tasks || []).filter(t => !t.done).length,
        };
      })
      .filter(x => x.milestone !== null)
      .sort((x, y) => x.days - y.days);

    if (due.length === 0) continue;
    // Keyed by milestone, not by exact days, so one school produces at
    // most one email per milestone no matter which day the job runs.
    const dedupeKey = due.map(x => `${x.name}@${x.milestone}`).join('|').slice(0, 180);
    results.push(await sendDeadlineEmail({
      userId: s.id, to: s.email, name: s.name, schools: due, dedupeKey,
    }));
  }
}

async function runIdle(students: { id: string; name: string | null; email: string }[], results: SendResult[]) {
  const lastActive = await lastActiveMap();
  const now = Date.now();

  for (const s of students) {
    const last = lastActive.get(s.id);
    if (!last) continue;
    const idleDays = Math.floor((now - last.getTime()) / 86400000);
    const milestone = idleMilestone(idleDays);
    if (milestone === null) continue;

    const apps = (await appsFor(s.id)).filter(a => a.name && !(a.status && CLOSED.has(a.status)));
    const withOpen = apps
      .map(a => ({ app: a, open: (a.tasks || []).filter(t => !t.done) }))
      .filter(x => x.open.length > 0);
    const openTasks = withOpen.reduce((n, x) => n + x.open.length, 0);
    // The whole point is "you have unfinished tasks". No tasks, no email.
    if (openTasks === 0) continue;

    // One email a day, total. If a deadline reminder or digest already went
    // out recently, that one carries the message; this one waits.
    if (await emailedRecently(s.id, 48)) { results.push('duplicate'); continue; }

    // Suggest the next task for the school due soonest; undated schools last.
    withOpen.sort((x, y) => (daysUntil(x.app.deadline) ?? 9999) - (daysUntil(y.app.deadline) ?? 9999));
    const first = withOpen[0];
    const lastDay = last.toISOString().slice(0, 10);

    results.push(await sendIdleNudgeEmail({
      userId: s.id, to: s.email, name: s.name,
      openTasks, schools: withOpen.length,
      next: { task: first.open[0].label, school: first.app.name as string },
      dedupeKey: `${lastDay}@${milestone}`,
    }));
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel cron sends this header; a manual call needs the secret.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  const isVercelCron = req.headers['x-vercel-cron'] != null;
  if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureSchema();
  await ensureEmailSchema();

  const job = String(req.query.job || 'deadlines');
  const results: SendResult[] = [];

  try {
    const students = await realStudents();

    if (job === 'deadlines' || job === 'daily') {
      await runDeadlines(students, results);
    }
    if (job === 'idle' || job === 'daily') {
      await runIdle(students, results);
    }
    if (job === 'deadlines' || job === 'idle' || job === 'daily') {
      return res.json({ ok: true, job, students: students.length, results: tally(results) });
    }

    if (job === 'digest') {
      const weekKey = isoWeekKey();
      const since = new Date(Date.now() - 7 * 864e5);

      for (const s of students) {
        // Runs 30 minutes after the daily job. If that job already mailed
        // this student today, the digest waits for next week.
        if (await emailedRecently(s.id, 20)) { results.push('duplicate'); continue; }
        const items: string[] = [];

        // Essay feedback returned this week
        const reviews: any[] = await prisma.$queryRaw`
          SELECT e."title" FROM "essay_reviews" r
            JOIN "essays" e ON e."id" = r."essayId"
           WHERE r."studentId" = ${s.id} AND r."status" = 'completed' AND r."reviewedAt" >= ${since}`;
        for (const r of reviews) {
          items.push(`Your tutor returned notes on <strong>${escapeHtml(r.title)}</strong>`);
        }

        // Deadlines inside the next fortnight
        const apps = await appsFor(s.id);
        const soon = apps
          .filter(a => a.name && a.deadline && !(a.status && CLOSED.has(a.status)))
          .map(a => ({ name: a.name as string, days: daysUntil(a.deadline) ?? 9999 }))
          .filter(x => x.days >= 0 && x.days <= 14)
          .sort((x, y) => x.days - y.days);
        if (soon.length) {
          const n = soon[0];
          items.push(`<strong>${escapeHtml(n.name)}</strong> is due in ${n.days} day${n.days === 1 ? '' : 's'}${soon.length > 1 ? `, plus ${soon.length - 1} more coming up` : ''}`);
        }

        // New activity in the community channels
        const posts: any[] = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS n FROM "pod_messages" m
            JOIN "study_pods" p ON p."id" = m."podId"
           WHERE p."kind" = 'community' AND m."hidden" = false
             AND m."createdAt" >= ${since} AND m."userId" <> ${s.id}`;
        const n = Number(posts[0]?.n || 0);
        if (n > 0) items.push(`${n} new post${n === 1 ? '' : 's'} in the community channels`);

        // Rule 2 lives in sendWeeklyDigestEmail: an empty list is never sent.
        results.push(await sendWeeklyDigestEmail({
          userId: s.id, to: s.email, name: s.name, items, weekKey,
        }));
      }
      return res.json({ ok: true, job, students: students.length, results: tally(results) });
    }

    return res.status(400).json({ error: `Unknown job "${job}"` });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message, partial: tally(results) });
  }
}

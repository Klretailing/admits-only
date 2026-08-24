import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

/* ──────────────────────────────────────────────────────────────────────
   ADMIN — AUDIENCE & USAGE INSIGHTS (aggregate, privacy-safe)

   Everything here is a COUNT / distinct-count over behavioral events and
   role buckets. No individual rows, no message/essay content, no PII is
   returned — only "how many / when / what kind of device / which feature".

   DEMO / INTERNAL EXCLUSION
   Every seeded demo, beta, and test account uses an "@admitsonly.com" email
   (real customers sign up with their own providers). To keep the owner's
   view of real traction honest, all activity metrics below exclude:
     • events tied to a demo/internal userId, and
     • whole sessions that were ever driven by a demo/internal user.
   Anonymous (logged-out) real visitors are still counted.
   ────────────────────────────────────────────────────────────────────── */

const n = (v: any) => Number(v || 0);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Emails that mark a seeded/demo/internal account.
const DEMO_EMAIL = Prisma.sql`email ILIKE '%admitsonly.com'`;
// A signed-in event that is NOT a demo account (userId must be non-null).
const NOT_DEMO_USER = Prisma.sql`"userId" NOT IN (SELECT id FROM "users" WHERE ${DEMO_EMAIL})`;
// A session never touched by a demo account (keeps anonymous real sessions).
const NOT_DEMO_SESSION = Prisma.sql`"sessionId" NOT IN (
  SELECT DISTINCT ae2."sessionId" FROM "analytics_events" ae2
  WHERE ae2."userId" IN (SELECT id FROM "users" WHERE ${DEMO_EMAIL}) AND ae2."sessionId" IS NOT NULL
)`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const now = Date.now();
  const day = new Date(now - 1 * 864e5);
  const week = new Date(now - 7 * 864e5);
  const month = new Date(now - 30 * 864e5);

  const q = async <T = any>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  // ── Active signed-in users (distinct userId), demo excluded ──
  const activeUsers = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${day})::int   AS dau,
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${week})::int  AS wau,
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${month})::int AS mau
      FROM "analytics_events" WHERE "userId" IS NOT NULL AND ${NOT_DEMO_USER}
    `;
    return { dau: n(rows[0]?.dau), wau: n(rows[0]?.wau), mau: n(rows[0]?.mau) };
  }, { dau: 0, wau: 0, mau: 0 });

  // ── Active sessions (covers logged-out too), demo sessions excluded ──
  const activeSessions = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${day})::int   AS today,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${week})::int  AS week,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${month})::int AS month
      FROM "analytics_events" WHERE ${NOT_DEMO_SESSION}
    `;
    return { today: n(rows[0]?.today), week: n(rows[0]?.week), month: n(rows[0]?.month) };
  }, { today: 0, week: 0, month: 0 });

  // ── Daily activity time series (last 30 days), demo excluded ──
  const daily = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT DATE("createdAt") AS d,
        COUNT(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL AND ${NOT_DEMO_USER})::int AS users,
        COUNT(DISTINCT "sessionId") FILTER (WHERE ${NOT_DEMO_SESSION})::int AS sessions,
        COUNT(*) FILTER (WHERE "type" = 'pageview' AND ${NOT_DEMO_SESSION})::int AS pageviews
      FROM "analytics_events"
      WHERE "createdAt" >= ${month}
      GROUP BY 1 ORDER BY 1
    `;
    const map = new Map(rows.map(r => [ymd(new Date(r.d)), r]));
    // Fill a continuous 30-day axis (oldest → newest) so gaps read as zero.
    return Array.from({ length: 30 }, (_, i) => {
      const dt = new Date(now - (29 - i) * 864e5);
      const key = ymd(dt);
      const r = map.get(key);
      return { date: key, users: n(r?.users), sessions: n(r?.sessions), pageviews: n(r?.pageviews) };
    });
  }, Array.from({ length: 30 }, (_, i) => ({ date: ymd(new Date(now - (29 - i) * 864e5)), users: 0, sessions: 0, pageviews: 0 })));

  // ── Returning users: signed-in users active on ≥ 2 distinct days (30d) ──
  const returning = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      WITH per_user AS (
        SELECT "userId", COUNT(DISTINCT DATE("createdAt")) AS days
        FROM "analytics_events"
        WHERE "userId" IS NOT NULL AND "createdAt" >= ${month} AND ${NOT_DEMO_USER}
        GROUP BY "userId"
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE days >= 2)::int AS returning
      FROM per_user
    `;
    const total = n(rows[0]?.total), ret = n(rows[0]?.returning);
    return { total, returning: ret, rate: total ? Math.round((ret / total) * 100) : 0 };
  }, { total: 0, returning: 0, rate: 0 });

  // ── When: activity by hour-of-day (UTC) and day-of-week, last 30d ──
  const byHour = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS h, COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'pageview' AND "createdAt" >= ${month} AND ${NOT_DEMO_SESSION}
      GROUP BY 1
    `;
    const map = new Map(rows.map(r => [n(r.h), n(r.c)]));
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) || 0 }));
  }, Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));

  const byWeekday = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT EXTRACT(DOW FROM "createdAt")::int AS d, COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'pageview' AND "createdAt" >= ${month} AND ${NOT_DEMO_SESSION}
      GROUP BY 1
    `;
    const map = new Map(rows.map(r => [n(r.d), n(r.c)]));
    return Array.from({ length: 7 }, (_, d) => ({ dow: d, count: map.get(d) || 0 }));
  }, Array.from({ length: 7 }, (_, d) => ({ dow: d, count: 0 })));

  // ── Audience composition: role mix (real users only) ──
  const roleMix = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COALESCE("role", 'unknown') AS role, COUNT(*)::int AS c
      FROM "users" WHERE NOT (${DEMO_EMAIL}) GROUP BY 1 ORDER BY c DESC
    `;
    return rows.map(r => ({ role: r.role, count: n(r.c) }));
  }, []);

  // ── Device split (distinct sessions, 30d), demo excluded ──
  const deviceMix = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT (("deviceInfo"->>'isMobile')::boolean) AS mobile, COUNT(DISTINCT "sessionId")::int AS c
      FROM "analytics_events"
      WHERE "createdAt" >= ${month} AND "deviceInfo" IS NOT NULL AND ${NOT_DEMO_SESSION}
      GROUP BY 1
    `;
    let mobile = 0, desktop = 0;
    for (const r of rows) { if (r.mobile) mobile = n(r.c); else desktop = n(r.c); }
    return { mobile, desktop };
  }, { mobile: 0, desktop: 0 });

  // ── Top features used (30d), demo excluded ──
  const topFeatures = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT meta->>'featureId' AS feature, COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'feature' AND "createdAt" >= ${month} AND meta->>'featureId' IS NOT NULL AND ${NOT_DEMO_SESSION}
      GROUP BY 1 ORDER BY c DESC LIMIT 6
    `;
    return rows.map(r => ({ feature: r.feature, count: n(r.c) }));
  }, []);

  // ── Top pages (30d), demo excluded ──
  const topPages = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "path", COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'pageview' AND "createdAt" >= ${month} AND ${NOT_DEMO_SESSION}
      GROUP BY 1 ORDER BY c DESC LIMIT 6
    `;
    return rows.map(r => ({ path: r.path, views: n(r.c) }));
  }, []);

  // ── New signups (real users only) ──
  const signups = await q(async () => {
    const [w, m] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: week }, NOT: { email: { endsWith: 'admitsonly.com' } } } }),
      prisma.user.count({ where: { createdAt: { gte: month }, NOT: { email: { endsWith: 'admitsonly.com' } } } }),
    ]);
    return { last7: w, last30: m };
  }, { last7: 0, last30: 0 });

  /* ─── Cohort retention ───
     The metric that actually answers "is this sticky". DAU and a blended
     "returning rate" both flatter a product with steady signups: new users
     keep the numbers up while earlier ones quietly leave. Splitting by signup
     week shows whether anyone stays.

     Read it as: of the students who joined in week X, what share came back in
     week X+1, X+2, and so on. A curve that flattens means a real habit formed
     somewhere; a curve to zero means it has not — regardless of DAU. */
  const cohorts = await q(async () => {
    const sizes: any[] = await prisma.$queryRaw`
      SELECT DATE_TRUNC('week', "createdAt") AS week, COUNT(*)::int AS n
        FROM "users"
       WHERE NOT (${DEMO_EMAIL}) AND "createdAt" >= NOW() - INTERVAL '12 weeks'
       GROUP BY 1 ORDER BY 1`;
    if (sizes.length === 0) return { weeks: [], maxOffset: 0 };

    /* The week offset is measured from each student's OWN signup moment, not
       from the calendar week boundary. Truncating both sides pushed a student
       who joined on a Thursday and returned eight days later into "+2",
       leaving the week-1 figure reading 0% while the table plainly showed
       people coming back. Rolling weeks make "+1" mean what a reader assumes:
       returned 7-13 days after joining. */
    const rows: any[] = await prisma.$queryRaw`
      WITH c AS (
        SELECT id, "createdAt" AS joined_at, DATE_TRUNC('week', "createdAt") AS cohort_week
          FROM "users"
         WHERE NOT (${DEMO_EMAIL}) AND "createdAt" >= NOW() - INTERVAL '12 weeks'
      )
      SELECT c.cohort_week AS week,
             FLOOR(EXTRACT(EPOCH FROM (e."createdAt" - c.joined_at)) / 604800)::int AS offset,
             COUNT(DISTINCT c.id)::int AS users
        FROM c
        JOIN "analytics_events" e ON e."userId" = c.id
       WHERE e."createdAt" >= c.joined_at
       GROUP BY 1, 2 ORDER BY 1, 2`;

    const byWeek = new Map<string, { size: number; cells: Record<number, number> }>();
    for (const r of sizes) {
      byWeek.set(new Date(r.week).toISOString().slice(0, 10), { size: n(r.n), cells: {} });
    }
    let maxOffset = 0;
    for (const r of rows) {
      const key = new Date(r.week).toISOString().slice(0, 10);
      const off = n(r.offset);
      if (off < 0) continue;
      const entry = byWeek.get(key);
      if (!entry) continue;
      entry.cells[off] = n(r.users);
      if (off > maxOffset) maxOffset = off;
    }
    return {
      weeks: Array.from(byWeek.entries()).map(([week, v]) => ({ week, size: v.size, cells: v.cells })),
      maxOffset: Math.min(maxOffset, 8),
    };
  }, { weeks: [], maxOffset: 0 });

  // Derived highlights
  const peakHour = byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0]);
  const peakDay = byWeekday.reduce((a, b) => (b.count > a.count ? b : a), byWeekday[0]);
  const totalEvents = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c FROM "analytics_events" WHERE "createdAt" >= ${month} AND ${NOT_DEMO_SESSION}
    `;
    return n(rows[0]?.c);
  }, 0);

  return res.json({
    activeUsers,
    activeSessions,
    daily,
    returning,
    byHour,
    byWeekday,
    peakHour: peakHour?.count ? peakHour.hour : null,
    peakDay: peakDay?.count ? peakDay.dow : null,
    roleMix,
    deviceMix,
    topFeatures,
    topPages,
    signups,
    cohorts,
    totalEvents,
    excludesDemo: true,
  });
}

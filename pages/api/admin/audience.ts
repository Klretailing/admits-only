import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

/* ──────────────────────────────────────────────────────────────────────
   ADMIN — AUDIENCE & USAGE INSIGHTS (aggregate, privacy-safe)

   Everything here is a COUNT / distinct-count over behavioral events and
   role buckets. No individual rows, no message/essay content, no PII is
   returned — only "how many / when / what kind of device / which feature".
   ────────────────────────────────────────────────────────────────────── */

const n = (v: any) => Number(v || 0);

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

  // ── Active signed-in users (distinct userId) ──
  const activeUsers = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${day})::int   AS dau,
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${week})::int  AS wau,
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= ${month})::int AS mau
      FROM "analytics_events" WHERE "userId" IS NOT NULL
    `;
    return { dau: n(rows[0]?.dau), wau: n(rows[0]?.wau), mau: n(rows[0]?.mau) };
  }, { dau: 0, wau: 0, mau: 0 });

  // ── Active sessions (covers logged-out too) ──
  const activeSessions = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${day})::int   AS today,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${week})::int  AS week,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= ${month})::int AS month
      FROM "analytics_events"
    `;
    return { today: n(rows[0]?.today), week: n(rows[0]?.week), month: n(rows[0]?.month) };
  }, { today: 0, week: 0, month: 0 });

  // ── Returning users: signed-in users active on ≥ 2 distinct days (30d) ──
  const returning = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      WITH per_user AS (
        SELECT "userId", COUNT(DISTINCT DATE("createdAt")) AS days
        FROM "analytics_events"
        WHERE "userId" IS NOT NULL AND "createdAt" >= ${month}
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
      WHERE "type" = 'pageview' AND "createdAt" >= ${month}
      GROUP BY 1
    `;
    const map = new Map(rows.map(r => [n(r.h), n(r.c)]));
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) || 0 }));
  }, Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));

  const byWeekday = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT EXTRACT(DOW FROM "createdAt")::int AS d, COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'pageview' AND "createdAt" >= ${month}
      GROUP BY 1
    `;
    const map = new Map(rows.map(r => [n(r.d), n(r.c)]));
    return Array.from({ length: 7 }, (_, d) => ({ dow: d, count: map.get(d) || 0 }));
  }, Array.from({ length: 7 }, (_, d) => ({ dow: d, count: 0 })));

  // ── Audience composition: role mix (from users) ──
  const roleMix = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COALESCE("role", 'unknown') AS role, COUNT(*)::int AS c FROM "users" GROUP BY 1 ORDER BY c DESC
    `;
    return rows.map(r => ({ role: r.role, count: n(r.c) }));
  }, []);

  // ── Device split (distinct sessions, 30d) ──
  const deviceMix = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT (("deviceInfo"->>'isMobile')::boolean) AS mobile, COUNT(DISTINCT "sessionId")::int AS c
      FROM "analytics_events"
      WHERE "createdAt" >= ${month} AND "deviceInfo" IS NOT NULL
      GROUP BY 1
    `;
    let mobile = 0, desktop = 0;
    for (const r of rows) { if (r.mobile) mobile = n(r.c); else desktop = n(r.c); }
    return { mobile, desktop };
  }, { mobile: 0, desktop: 0 });

  // ── Top features used (30d) ──
  const topFeatures = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT meta->>'featureId' AS feature, COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'feature' AND "createdAt" >= ${month} AND meta->>'featureId' IS NOT NULL
      GROUP BY 1 ORDER BY c DESC LIMIT 6
    `;
    return rows.map(r => ({ feature: r.feature, count: n(r.c) }));
  }, []);

  // ── Top pages (30d) ──
  const topPages = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "path", COUNT(*)::int AS c
      FROM "analytics_events"
      WHERE "type" = 'pageview' AND "createdAt" >= ${month}
      GROUP BY 1 ORDER BY c DESC LIMIT 6
    `;
    return rows.map(r => ({ path: r.path, views: n(r.c) }));
  }, []);

  // ── New signups ──
  const signups = await q(async () => {
    const [w, m] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { createdAt: { gte: month } } }),
    ]);
    return { last7: w, last30: m };
  }, { last7: 0, last30: 0 });

  // Derived highlights
  const peakHour = byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0]);
  const peakDay = byWeekday.reduce((a, b) => (b.count > a.count ? b : a), byWeekday[0]);
  const totalEvents = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS c FROM "analytics_events" WHERE "createdAt" >= ${month}`;
    return n(rows[0]?.c);
  }, 0);

  return res.json({
    activeUsers,
    activeSessions,
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
    totalEvents,
  });
}

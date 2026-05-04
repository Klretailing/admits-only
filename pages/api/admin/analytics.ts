import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const daysParam = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - daysParam);

  const [
    totalEvents,
    totalSessions,
    totalPageviews,
    totalClicks,
    totalFeatureEvents,
    totalNavEvents,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'session', createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'pageview', createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'click', createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'feature', createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'nav', createdAt: { gte: since } } }),
  ]);

  // Unique sessions and users
  const uniqueSessionsRaw: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "sessionId")::bigint as count FROM "analytics_events"
    WHERE "createdAt" >= ${since} AND "sessionId" IS NOT NULL
  `;
  const uniqueSessions = Number(uniqueSessionsRaw[0]?.count || 0);

  const uniqueUsersRaw: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "userId")::bigint as count FROM "analytics_events"
    WHERE "createdAt" >= ${since} AND "userId" IS NOT NULL
  `;
  const uniqueUsers = Number(uniqueUsersRaw[0]?.count || 0);

  // Daily visits over period
  const dailyVisitsRaw: Array<{ day: string; sessions: bigint; pageviews: bigint }> = await prisma.$queryRaw`
    SELECT
      TO_CHAR("createdAt", 'YYYY-MM-DD') as day,
      COUNT(DISTINCT "sessionId")::bigint as sessions,
      COUNT(*)::bigint as pageviews
    FROM "analytics_events"
    WHERE "type" = 'pageview' AND "createdAt" >= ${since}
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
    ORDER BY day ASC
  `;
  const dailyVisits = dailyVisitsRaw.map(r => ({
    day: r.day,
    sessions: Number(r.sessions),
    pageviews: Number(r.pageviews),
  }));

  // Top pages
  const topPagesRaw: Array<{ path: string; views: bigint }> = await prisma.$queryRaw`
    SELECT "path", COUNT(*)::bigint as views
    FROM "analytics_events"
    WHERE "type" = 'pageview' AND "createdAt" >= ${since}
    GROUP BY "path"
    ORDER BY views DESC
    LIMIT 15
  `;
  const topPages = topPagesRaw.map(r => ({ path: r.path, views: Number(r.views) }));

  // Feature usage breakdown
  const featureUsageRaw: Array<{ feature: string; action: string; count: bigint }> = await prisma.$queryRaw`
    SELECT
      meta->>'featureId' as feature,
      meta->>'action' as action,
      COUNT(*)::bigint as count
    FROM "analytics_events"
    WHERE "type" = 'feature' AND "createdAt" >= ${since} AND meta->>'featureId' IS NOT NULL
    GROUP BY meta->>'featureId', meta->>'action'
    ORDER BY count DESC
    LIMIT 30
  `;
  const featureUsage = featureUsageRaw.map(r => ({
    feature: r.feature,
    action: r.action,
    count: Number(r.count),
  }));

  // Nav engagement by source
  const navSourcesRaw: Array<{ source: string; count: bigint }> = await prisma.$queryRaw`
    SELECT meta->>'source' as source, COUNT(*)::bigint as count
    FROM "analytics_events"
    WHERE "type" = 'nav' AND "createdAt" >= ${since} AND meta->>'source' IS NOT NULL
    GROUP BY meta->>'source'
    ORDER BY count DESC
  `;
  const navSources = navSourcesRaw.map(r => ({ source: r.source, count: Number(r.count) }));

  // Nav target pages
  const navTargetsRaw: Array<{ target: string; count: bigint }> = await prisma.$queryRaw`
    SELECT meta->>'targetPath' as target, COUNT(*)::bigint as count
    FROM "analytics_events"
    WHERE "type" = 'nav' AND "createdAt" >= ${since} AND meta->>'targetPath' IS NOT NULL
    GROUP BY meta->>'targetPath'
    ORDER BY count DESC
    LIMIT 15
  `;
  const navTargets = navTargetsRaw.map(r => ({ target: r.target, count: Number(r.count) }));

  // Session duration stats (from session events)
  const durationStatsRaw: Array<{ avg_dur: number; max_dur: number; median_dur: number }> = await prisma.$queryRaw`
    SELECT
      ROUND(AVG((meta->>'durationSeconds')::numeric))::int as avg_dur,
      MAX((meta->>'durationSeconds')::int) as max_dur,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (meta->>'durationSeconds')::int)::int as median_dur
    FROM "analytics_events"
    WHERE "type" = 'session' AND "createdAt" >= ${since} AND meta->>'durationSeconds' IS NOT NULL
  `;
  const durationStats = {
    avg: Number(durationStatsRaw[0]?.avg_dur || 0),
    max: Number(durationStatsRaw[0]?.max_dur || 0),
    median: Number(durationStatsRaw[0]?.median_dur || 0),
  };

  // Session depth stats (pages per session, clicks per session)
  const depthStatsRaw: Array<{ avg_pv: number; avg_clicks: number; avg_features: number }> = await prisma.$queryRaw`
    SELECT
      ROUND(AVG((meta->>'pageviewCount')::numeric), 1) as avg_pv,
      ROUND(AVG((meta->>'clickCount')::numeric), 1) as avg_clicks,
      ROUND(AVG((meta->>'featureUseCount')::numeric), 1) as avg_features
    FROM "analytics_events"
    WHERE "type" = 'session' AND "createdAt" >= ${since} AND meta->>'pageviewCount' IS NOT NULL
  `;
  const depthStats = {
    avgPageviews: Number(depthStatsRaw[0]?.avg_pv || 0),
    avgClicks: Number(depthStatsRaw[0]?.avg_clicks || 0),
    avgFeatures: Number(depthStatsRaw[0]?.avg_features || 0),
  };

  // Scroll depth averages by page
  const scrollDepthRaw: Array<{ path: string; avg_depth: number; count: bigint }> = await prisma.$queryRaw`
    SELECT "path", ROUND(AVG((meta->>'maxDepthPercent')::numeric))::int as avg_depth, COUNT(*)::bigint as count
    FROM "analytics_events"
    WHERE "type" = 'scroll' AND "createdAt" >= ${since} AND meta->>'maxDepthPercent' IS NOT NULL
    GROUP BY "path"
    ORDER BY count DESC
    LIMIT 15
  `;
  const scrollDepth = scrollDepthRaw.map(r => ({
    path: r.path,
    avgDepth: Number(r.avg_depth),
    count: Number(r.count),
  }));

  // Device breakdown
  const deviceBreakdownRaw: Array<{ is_mobile: boolean; count: bigint }> = await prisma.$queryRaw`
    SELECT (("deviceInfo"->>'isMobile')::boolean) as is_mobile, COUNT(DISTINCT "sessionId")::bigint as count
    FROM "analytics_events"
    WHERE "deviceInfo" IS NOT NULL AND "createdAt" >= ${since} AND "sessionId" IS NOT NULL
    GROUP BY ("deviceInfo"->>'isMobile')::boolean
  `;
  const deviceBreakdown = {
    mobile: Number(deviceBreakdownRaw.find(r => r.is_mobile)?.count || 0),
    desktop: Number(deviceBreakdownRaw.find(r => !r.is_mobile)?.count || 0),
  };

  // Top active users
  const topUsersRaw: Array<{ userId: string; sessions: bigint; pageviews: bigint; features: bigint }> = await prisma.$queryRaw`
    SELECT
      "userId",
      COUNT(DISTINCT "sessionId")::bigint as sessions,
      COUNT(*) FILTER (WHERE "type" = 'pageview')::bigint as pageviews,
      COUNT(*) FILTER (WHERE "type" = 'feature')::bigint as features
    FROM "analytics_events"
    WHERE "createdAt" >= ${since} AND "userId" IS NOT NULL
    GROUP BY "userId"
    ORDER BY sessions DESC
    LIMIT 20
  `;

  const userIds = topUsersRaw.map(r => r.userId);
  let userMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    for (const u of users) {
      userMap[u.id] = { name: u.name || 'Unknown', email: u.email || '' };
    }
  }

  const topUsers = topUsersRaw.map(r => ({
    userId: r.userId,
    name: userMap[r.userId]?.name || 'Unknown',
    email: userMap[r.userId]?.email || '',
    sessions: Number(r.sessions),
    pageviews: Number(r.pageviews),
    features: Number(r.features),
  }));

  // Hourly activity heatmap (hour of day vs day of week)
  const hourlyRaw: Array<{ dow: number; hour: number; count: bigint }> = await prisma.$queryRaw`
    SELECT
      EXTRACT(DOW FROM "timestamp")::int as dow,
      EXTRACT(HOUR FROM "timestamp")::int as hour,
      COUNT(*)::bigint as count
    FROM "analytics_events"
    WHERE "type" = 'pageview' AND "createdAt" >= ${since}
    GROUP BY EXTRACT(DOW FROM "timestamp"), EXTRACT(HOUR FROM "timestamp")
  `;
  const hourlyActivity = hourlyRaw.map(r => ({
    dow: Number(r.dow),
    hour: Number(r.hour),
    count: Number(r.count),
  }));

  return res.json({
    period: { days: daysParam, since: since.toISOString() },
    overview: {
      totalEvents,
      totalSessions,
      uniqueSessions,
      uniqueUsers,
      totalPageviews,
      totalClicks,
      totalFeatureEvents,
      totalNavEvents,
    },
    dailyVisits,
    topPages,
    featureUsage,
    navSources,
    navTargets,
    durationStats,
    depthStats,
    scrollDepth,
    deviceBreakdown,
    topUsers,
    hourlyActivity,
  });
}

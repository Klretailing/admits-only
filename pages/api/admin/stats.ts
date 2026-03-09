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

  // ─── Core counts ───
  const [totalUsers, totalStudents, totalParents, totalEssays, unreadContacts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.user.count({ where: { role: 'parent' } }),
    prisma.essay.count(),
    prisma.contactSubmission.count({ where: { read: false } }),
  ]);

  // ─── Plan distribution (real) ───
  const [foundationUsers, scholarshipUsers, stemUsers, freeTierUsers] = await Promise.all([
    prisma.user.count({ where: { plan: 'foundations' } }),
    prisma.user.count({ where: { plan: 'scholarship' } }),
    prisma.user.count({ where: { plan: 'stem' } }),
    prisma.user.count({ where: { plan: null, role: 'student' } }),
  ]);

  const planPrices: Record<string, number> = { foundations: 299, scholarship: 499, stem: 449 };
  const mrr = (foundationUsers * planPrices.foundations) +
              (scholarshipUsers * planPrices.scholarship) +
              (stemUsers * planPrices.stem);
  const totalPaidUsers = foundationUsers + scholarshipUsers + stemUsers;
  const avgRevenuePerUser = totalPaidUsers > 0 ? Math.round(mrr / totalPaidUsers) : 0;

  // ─── Essay stats ───
  const [draftEssays, inReviewEssays, completeEssays] = await Promise.all([
    prisma.essay.count({ where: { status: 'Draft' } }),
    prisma.essay.count({ where: { status: 'In Review' } }),
    prisma.essay.count({ where: { status: 'Complete' } }),
  ]);

  // ─── Pod activity ───
  const [totalPods, totalPodMessages, totalPodMembers] = await Promise.all([
    prisma.studyPod.count(),
    prisma.podMessage.count(),
    prisma.podMember.count(),
  ]);

  // ─── Motif boards ───
  const totalMotifBoards = await prisma.motifBoard.count();

  // ─── User growth by month (last 12 months) ───
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const userGrowthRaw: Array<{ month: string; count: bigint }> = await prisma.$queryRaw`
    SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
    FROM "users"
    WHERE "createdAt" >= ${twelveMonthsAgo}
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
    ORDER BY month ASC
  `;

  const userGrowth = userGrowthRaw.map(r => ({
    month: r.month,
    count: Number(r.count),
  }));

  // ─── Essay growth by month ───
  const essayGrowthRaw: Array<{ month: string; count: bigint }> = await prisma.$queryRaw`
    SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
    FROM "essays"
    WHERE "createdAt" >= ${twelveMonthsAgo}
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
    ORDER BY month ASC
  `;

  const essayGrowth = essayGrowthRaw.map(r => ({
    month: r.month,
    count: Number(r.count),
  }));

  // ─── Recent signups (last 10) ───
  const recentSignups = await prisma.user.findMany({
    where: { role: 'student' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true, email: true, plan: true, createdAt: true },
  });

  // ─── Engagement metrics ───
  const essaysPerUser = totalStudents > 0 ? (totalEssays / totalStudents).toFixed(1) : '0';
  const podsPerUser = totalStudents > 0 ? (totalPodMembers / totalStudents).toFixed(1) : '0';
  const messagesPerPod = totalPods > 0 ? Math.round(totalPodMessages / totalPods) : 0;

  // ─── Users with profiles filled ───
  const profilesFilled = await prisma.studentProfile.count({
    where: { gpa: { not: null } },
  });
  const profileCompletionRate = totalStudents > 0
    ? Math.round((profilesFilled / totalStudents) * 100)
    : 0;

  return res.json({
    // Legacy fields (admin dashboard still uses these)
    totalUsers,
    totalStudents,
    totalParents,
    totalEssays,
    unreadContacts,

    // Revenue & plans
    revenue: {
      mrr,
      arr: mrr * 12,
      avgRevenuePerUser,
      totalPaidUsers,
      plans: {
        foundations: { subscribers: foundationUsers, revenue: foundationUsers * planPrices.foundations },
        scholarship: { subscribers: scholarshipUsers, revenue: scholarshipUsers * planPrices.scholarship },
        stem: { subscribers: stemUsers, revenue: stemUsers * planPrices.stem },
      },
      freeTierUsers,
    },

    // Essays
    essays: {
      total: totalEssays,
      draft: draftEssays,
      inReview: inReviewEssays,
      complete: completeEssays,
    },

    // Pods
    pods: {
      total: totalPods,
      totalMessages: totalPodMessages,
      totalMembers: totalPodMembers,
      messagesPerPod,
    },

    // Motifs
    motifBoards: totalMotifBoards,

    // Growth
    userGrowth,
    essayGrowth,

    // Engagement
    engagement: {
      essaysPerUser,
      podsPerUser,
      profileCompletionRate,
    },

    // Recent signups
    recentSignups,
  });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();

  const userId = (session.user as any).id as string;

  const [profile, essays] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),
    prisma.essay.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const totalSAT = profile ? ((profile.satMath || 0) + (profile.satRW || 0)) : 0;
  const essayCount = essays.length;
  const essaysInReview = essays.filter(e => e.status === 'In Review').length;
  const essaysComplete = essays.filter(e => e.status === 'Complete').length;

  return res.json({
    profile,
    stats: {
      satScore: totalSAT > 0 ? totalSAT.toString() : '—',
      essayCount: essayCount.toString(),
      essayStatus: essaysInReview > 0 ? `${essaysInReview} in review` : essaysComplete > 0 ? `${essaysComplete} complete` : 'none yet',
      holisticScore: profile?.holisticScore?.toString() || '—',
      percentile: profile?.percentile?.toString() || '—',
      gpa: profile?.gpa?.toFixed(2) || '—',
    },
  });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';
import { computeHolisticScore } from '../../lib/scoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  if (req.method === 'GET') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    return res.json({ profile });
  }

  if (req.method === 'PUT') {
    const { gpa, gpaScale, gpaWeighted, satMath, satRW, actScore, extracurriculars } = req.body;

    const scores = computeHolisticScore({
      gpa: gpa ?? '0',
      gpaScale: gpaScale || '4.0',
      gpaWeighted: gpaWeighted ?? null,
      satMath: satMath ?? '0',
      satRW: satRW ?? '0',
      actScore: actScore ?? null,
      extracurriculars: extracurriculars || [],
    });

    const data = {
      gpa: gpa != null ? parseFloat(gpa) : null,
      gpaScale: gpaScale || '4.0',
      gpaWeighted: gpaWeighted != null && gpaWeighted !== '' ? parseFloat(gpaWeighted) : null,
      satMath: satMath != null ? parseInt(satMath) : null,
      satRW: satRW != null ? parseInt(satRW) : null,
      actScore: actScore != null && actScore !== '' ? parseInt(actScore) : null,
      extracurriculars: extracurriculars || [],
      holisticScore: scores.holistic,
      percentile: scores.percentile,
      gpaScore: scores.gpaScore,
      satScore: scores.satScore,
      ecScore: scores.ecScore,
    };

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return res.json({ profile });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

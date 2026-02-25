import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

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
    const { gpa, gpaScale, satMath, satRW, extracurriculars, holisticScore, percentile, gpaScore, satScore, ecScore } = req.body;

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: {
        gpa: gpa != null ? parseFloat(gpa) : null,
        gpaScale: gpaScale || '4.0',
        satMath: satMath != null ? parseInt(satMath) : null,
        satRW: satRW != null ? parseInt(satRW) : null,
        extracurriculars: extracurriculars || [],
        holisticScore: holisticScore != null ? parseInt(holisticScore) : null,
        percentile: percentile != null ? parseInt(percentile) : null,
        gpaScore: gpaScore != null ? parseInt(gpaScore) : null,
        satScore: satScore != null ? parseInt(satScore) : null,
        ecScore: ecScore != null ? parseInt(ecScore) : null,
      },
      create: {
        userId,
        gpa: gpa != null ? parseFloat(gpa) : null,
        gpaScale: gpaScale || '4.0',
        satMath: satMath != null ? parseInt(satMath) : null,
        satRW: satRW != null ? parseInt(satRW) : null,
        extracurriculars: extracurriculars || [],
        holisticScore: holisticScore != null ? parseInt(holisticScore) : null,
        percentile: percentile != null ? parseInt(percentile) : null,
        gpaScore: gpaScore != null ? parseInt(gpaScore) : null,
        satScore: satScore != null ? parseInt(satScore) : null,
        ecScore: ecScore != null ? parseInt(ecScore) : null,
      },
    });

    return res.json({ profile });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

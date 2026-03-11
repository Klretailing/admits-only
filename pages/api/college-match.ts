import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';
import { getCollegeMatches, getAllStrengths, getAllStates, type MatchFilters } from '../../lib/collegeMatch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  // Fetch student profile
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!profile || (!profile.gpa && !profile.satMath)) {
    return res.json({
      matches: [],
      needsProfile: true,
      strengths: getAllStrengths(),
      states: getAllStates(),
    });
  }

  const gpa = profile.gpa ?? 0;
  const totalSAT = (profile.satMath ?? 0) + (profile.satRW ?? 0);

  // Normalize GPA to 4.0 scale if on 5.0
  const normalizedGPA = profile.gpaScale === '5.0' ? (gpa / 5) * 4 : gpa;

  // Parse filters from query string
  const filters: MatchFilters = {};
  if (req.query.tier && typeof req.query.tier === 'string') {
    filters.tier = req.query.tier as MatchFilters['tier'];
  }
  if (req.query.type && typeof req.query.type === 'string') {
    filters.type = req.query.type as MatchFilters['type'];
  }
  if (req.query.size && typeof req.query.size === 'string') {
    filters.size = req.query.size as MatchFilters['size'];
  }
  if (req.query.strength && typeof req.query.strength === 'string') {
    filters.strength = req.query.strength;
  }
  if (req.query.state && typeof req.query.state === 'string') {
    filters.state = req.query.state;
  }

  const matches = getCollegeMatches({ gpa: normalizedGPA, totalSAT }, filters);

  return res.json({
    matches,
    needsProfile: false,
    studentStats: { gpa: normalizedGPA, totalSAT },
    strengths: getAllStrengths(),
    states: getAllStates(),
  });
}

/* ──────────────────────── HOLISTIC SCORING ENGINE ──────────────────────── */
// Shared scoring logic used by both the profile API (authoritative) and the
// client-side profile page (instant preview).

export interface Extracurricular {
  id: string;
  name: string;
  role: string;
  description: string;
  years: number;
  hoursPerWeek: number;
  category: string;
}

export interface ProfileInput {
  gpa: string | number;
  gpaScale: '4.0' | '5.0';
  satMath: string | number;
  satRW: string | number;
  extracurriculars: Extracurricular[];
}

export interface ScoringResult {
  holistic: number;
  percentile: number;
  gpaScore: number;
  satScore: number;
  ecScore: number;
  ecFeedback: string;
  totalSAT: number;
  normalizedGpa: number;
}

const CATEGORY_MAP: Record<string, string> = {
  'Athletics': 'Sport',
  'Arts & Music': 'Recreational Programs',
  'STEM / Research': 'Research',
  'Community Service': 'Volunteering',
  'Leadership / Government': 'Clubs',
  'Clubs & Organizations': 'Clubs',
  'Work / Internship': 'Internship',
  'Other': 'Clubs',
};

export function normalizeBucket(category: string): string {
  return CATEGORY_MAP[category] || category;
}

export const comparativeData = [
  { gpa: 3.2, sat: 1050, score: 42 }, { gpa: 3.4, sat: 1100, score: 48 },
  { gpa: 3.0, sat: 1020, score: 38 }, { gpa: 3.6, sat: 1200, score: 58 },
  { gpa: 3.5, sat: 1150, score: 52 }, { gpa: 3.8, sat: 1280, score: 65 },
  { gpa: 3.7, sat: 1250, score: 62 }, { gpa: 3.9, sat: 1350, score: 72 },
  { gpa: 4.0, sat: 1400, score: 78 }, { gpa: 3.3, sat: 1080, score: 45 },
  { gpa: 3.1, sat: 1060, score: 40 }, { gpa: 4.0, sat: 1520, score: 92 },
  { gpa: 3.9, sat: 1480, score: 88 }, { gpa: 3.8, sat: 1450, score: 85 },
  { gpa: 3.7, sat: 1380, score: 76 }, { gpa: 4.0, sat: 1560, score: 95 },
  { gpa: 3.6, sat: 1320, score: 70 }, { gpa: 3.5, sat: 1280, score: 64 },
  { gpa: 3.4, sat: 1220, score: 56 }, { gpa: 3.3, sat: 1180, score: 50 },
  { gpa: 3.2, sat: 1120, score: 46 }, { gpa: 4.0, sat: 1490, score: 90 },
  { gpa: 3.9, sat: 1420, score: 82 }, { gpa: 3.8, sat: 1380, score: 75 },
  { gpa: 3.6, sat: 1300, score: 68 }, { gpa: 3.5, sat: 1240, score: 60 },
  { gpa: 3.7, sat: 1340, score: 72 }, { gpa: 4.0, sat: 1540, score: 94 },
  { gpa: 3.8, sat: 1400, score: 80 }, { gpa: 3.4, sat: 1160, score: 54 },
];

export function evaluateExtracurriculars(ecs: Extracurricular[]): { score: number; feedback: string } {
  if (ecs.length === 0) return { score: 0, feedback: 'Add your extracurriculars to receive an assessment.' };

  let score = 0;
  const factors: string[] = [];

  const leadershipKeywords = ['president', 'founder', 'captain', 'leader', 'chair', 'director', 'head', 'editor', 'chief'];
  const leadershipCount = ecs.filter((ec) =>
    leadershipKeywords.some((k) => ec.role.toLowerCase().includes(k) || ec.name.toLowerCase().includes(k))
  ).length;
  score += Math.min(leadershipCount * 8, 24);
  if (leadershipCount >= 2) factors.push('Strong leadership presence');
  else if (leadershipCount === 0) factors.push('Consider pursuing leadership roles');

  const categories = new Set(ecs.map((ec) => normalizeBucket(ec.category)));
  score += Math.min(categories.size * 5, 20);
  if (categories.size >= 3) factors.push('Well-rounded across categories');

  const avgYears = ecs.reduce((sum, ec) => sum + ec.years, 0) / ecs.length;
  const avgHours = ecs.reduce((sum, ec) => sum + ec.hoursPerWeek, 0) / ecs.length;
  score += Math.min(avgYears * 4, 16);
  score += Math.min(avgHours * 1.5, 15);
  if (avgYears >= 3) factors.push('Deep commitment shown');
  if (avgHours >= 8) factors.push('Significant time investment');

  const impactKeywords = ['community', 'national', 'state', 'award', 'published', 'research', 'raised', 'organized', 'created', 'launched', 'served', 'mentored'];
  const impactCount = ecs.filter((ec) =>
    impactKeywords.some((k) => ec.description.toLowerCase().includes(k))
  ).length;
  score += Math.min(impactCount * 5, 25);
  if (impactCount >= 2) factors.push('Demonstrated measurable impact');

  score = Math.min(Math.round(score), 100);
  const feedback = factors.length > 0 ? factors.join(' | ') : 'Keep building your profile with meaningful activities.';
  return { score, feedback };
}

export function computeHolisticScore(profile: ProfileInput): ScoringResult {
  const gpa = typeof profile.gpa === 'string' ? parseFloat(profile.gpa) || 0 : profile.gpa || 0;
  const normalizedGpa = profile.gpaScale === '5.0' ? (gpa / 5) * 4 : gpa;
  const satMath = typeof profile.satMath === 'string' ? parseInt(profile.satMath) || 0 : profile.satMath || 0;
  const satRW = typeof profile.satRW === 'string' ? parseInt(profile.satRW) || 0 : profile.satRW || 0;
  const totalSAT = satMath + satRW;

  const gpaScore = Math.min((normalizedGpa / 4.0) * 100, 100);
  const satScore = Math.min(((totalSAT - 400) / 1200) * 100, 100);
  const ecEval = evaluateExtracurriculars(profile.extracurriculars);
  const holistic = Math.round(gpaScore * 0.35 + satScore * 0.30 + ecEval.score * 0.35);
  const betterThan = comparativeData.filter((d) => holistic > d.score).length;
  const percentile = Math.round((betterThan / comparativeData.length) * 100);

  return {
    holistic,
    percentile,
    gpaScore: Math.round(gpaScore),
    satScore: Math.round(satScore),
    ecScore: ecEval.score,
    ecFeedback: ecEval.feedback,
    totalSAT,
    normalizedGpa,
  };
}

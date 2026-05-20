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
  gpaWeighted?: string | number | null;
  satMath: string | number;
  satRW: string | number;
  actScore?: string | number | null;
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
  actEquivalent: number;
  rigorBonus: number;
  bestTestScore: number;
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

// ACT-to-SAT concordance table (College Board 2018 concordance)
const ACT_TO_SAT: [number, number][] = [
  [36, 1590], [35, 1540], [34, 1500], [33, 1460], [32, 1430],
  [31, 1400], [30, 1370], [29, 1340], [28, 1310], [27, 1280],
  [26, 1240], [25, 1210], [24, 1180], [23, 1140], [22, 1110],
  [21, 1080], [20, 1040], [19, 1010], [18, 970], [17, 930],
  [16, 890], [15, 850], [14, 810], [13, 760], [12, 710],
  [11, 670],
];

export function actToSat(act: number): number {
  if (act >= 36) return 1590;
  if (act <= 11) return 670;
  const entry = ACT_TO_SAT.find(([a]) => a === Math.round(act));
  if (entry) return entry[1];
  const higher = ACT_TO_SAT.find(([a]) => a <= act);
  const lower = ACT_TO_SAT.find(([a]) => a >= act);
  if (higher && lower && higher !== lower) {
    const ratio = (act - lower[0]) / (higher[0] - lower[0]);
    return Math.round(lower[1] + ratio * (higher[1] - lower[1]));
  }
  return Math.round(act * 40 + 150);
}

export function satToAct(sat: number): number {
  if (sat >= 1590) return 36;
  if (sat <= 670) return 11;
  for (let i = 0; i < ACT_TO_SAT.length - 1; i++) {
    const [actHigh, satHigh] = ACT_TO_SAT[i];
    const [actLow, satLow] = ACT_TO_SAT[i + 1];
    if (sat >= satLow && sat <= satHigh) {
      const ratio = (sat - satLow) / (satHigh - satLow);
      return Math.round((actLow + ratio * (actHigh - actLow)) * 10) / 10;
    }
  }
  return Math.round((sat - 150) / 40);
}

export const comparativeData = [
  // Building tier
  { gpa: 2.6, sat: 870, score: 18 }, { gpa: 2.8, sat: 920, score: 24 },
  { gpa: 2.7, sat: 890, score: 20 }, { gpa: 2.9, sat: 960, score: 28 },
  { gpa: 3.0, sat: 950, score: 30 }, { gpa: 2.8, sat: 980, score: 26 },
  { gpa: 3.0, sat: 1020, score: 38 }, { gpa: 3.1, sat: 1060, score: 40 },
  { gpa: 2.9, sat: 1040, score: 34 }, { gpa: 3.2, sat: 1000, score: 36 },
  { gpa: 2.7, sat: 940, score: 22 }, { gpa: 3.1, sat: 980, score: 32 },
  // Developing tier
  { gpa: 3.2, sat: 1050, score: 42 }, { gpa: 3.4, sat: 1100, score: 48 },
  { gpa: 3.3, sat: 1080, score: 45 }, { gpa: 3.5, sat: 1150, score: 52 },
  { gpa: 3.4, sat: 1120, score: 47 }, { gpa: 3.3, sat: 1180, score: 50 },
  { gpa: 3.6, sat: 1200, score: 58 }, { gpa: 3.5, sat: 1130, score: 53 },
  { gpa: 3.4, sat: 1160, score: 54 }, { gpa: 3.2, sat: 1120, score: 46 },
  { gpa: 3.3, sat: 1140, score: 49 }, { gpa: 3.5, sat: 1190, score: 55 },
  { gpa: 3.6, sat: 1170, score: 56 }, { gpa: 3.4, sat: 1220, score: 56 },
  // Competitive tier
  { gpa: 3.6, sat: 1280, score: 65 }, { gpa: 3.7, sat: 1250, score: 62 },
  { gpa: 3.8, sat: 1280, score: 65 }, { gpa: 3.9, sat: 1350, score: 72 },
  { gpa: 4.0, sat: 1400, score: 78 }, { gpa: 3.7, sat: 1380, score: 76 },
  { gpa: 3.6, sat: 1320, score: 70 }, { gpa: 3.5, sat: 1280, score: 64 },
  { gpa: 3.6, sat: 1300, score: 68 }, { gpa: 3.5, sat: 1240, score: 60 },
  { gpa: 3.7, sat: 1340, score: 72 }, { gpa: 3.8, sat: 1380, score: 75 },
  { gpa: 3.8, sat: 1400, score: 80 }, { gpa: 3.9, sat: 1420, score: 82 },
  // Elite tier
  { gpa: 3.8, sat: 1450, score: 85 }, { gpa: 3.9, sat: 1480, score: 88 },
  { gpa: 4.0, sat: 1490, score: 90 }, { gpa: 4.0, sat: 1520, score: 92 },
  { gpa: 4.0, sat: 1540, score: 94 }, { gpa: 4.0, sat: 1560, score: 95 },
  { gpa: 3.9, sat: 1500, score: 89 }, { gpa: 3.8, sat: 1470, score: 86 },
  { gpa: 4.0, sat: 1440, score: 84 }, { gpa: 3.9, sat: 1460, score: 87 },
  { gpa: 3.7, sat: 1420, score: 79 }, { gpa: 4.0, sat: 1580, score: 97 },
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

  const actRaw = profile.actScore != null ? (typeof profile.actScore === 'string' ? parseInt(profile.actScore) || 0 : profile.actScore) : 0;
  const actSatEquivalent = actRaw > 0 ? actToSat(actRaw) : 0;
  const bestTestSAT = Math.max(totalSAT, actSatEquivalent);

  // Course rigor bonus: weighted GPA > unweighted suggests AP/honors coursework
  const gpaW = profile.gpaWeighted != null ? (typeof profile.gpaWeighted === 'string' ? parseFloat(profile.gpaWeighted) || 0 : profile.gpaWeighted) : 0;
  const rigorBonus = (gpaW > 0 && normalizedGpa > 0 && gpaW > normalizedGpa) ? Math.min((gpaW - normalizedGpa) * 8, 5) : 0;

  const gpaScore = Math.min((normalizedGpa / 4.0) * 100, 100);
  const testScore = bestTestSAT > 0 ? Math.min(((bestTestSAT - 400) / 1200) * 100, 100) : 0;
  const ecEval = evaluateExtracurriculars(profile.extracurriculars);

  const holistic = Math.min(Math.round(gpaScore * 0.33 + testScore * 0.28 + ecEval.score * 0.34 + rigorBonus), 100);
  const betterThan = comparativeData.filter((d) => holistic > d.score).length;
  const percentile = Math.round((betterThan / comparativeData.length) * 100);

  return {
    holistic,
    percentile,
    gpaScore: Math.round(gpaScore),
    satScore: Math.round(testScore),
    ecScore: ecEval.score,
    ecFeedback: ecEval.feedback,
    totalSAT,
    normalizedGpa,
    actEquivalent: actRaw > 0 ? actRaw : (totalSAT > 0 ? Math.round(satToAct(totalSAT)) : 0),
    rigorBonus: Math.round(rigorBonus * 10) / 10,
    bestTestScore: bestTestSAT,
  };
}

/* ──────────────────────── COLLEGE MATCH ENGINE ──────────────────────── */
// Classifies colleges as Reach / Match / Safety based on a student's
// GPA and SAT scores, then ranks them by fit.

import { colleges, type College, type MatchTier } from './colleges';

export interface StudentStats {
  gpa: number;       // on 4.0 scale
  totalSAT: number;  // combined SAT (400-1600)
}

export interface CollegeMatch {
  college: College;
  tier: MatchTier;
  gpaFit: number;   // -1 to 1 (positive = student above avg)
  satFit: number;    // -1 to 1
  overallFit: number; // 0-100 composite score
}

/**
 * Classify a single college for a student.
 */
function classifyCollege(student: StudentStats, college: College): CollegeMatch {
  // GPA comparison: how student's GPA compares to school's average
  const gpaDiff = student.gpa - college.avgGPA;
  const gpaFit = Math.max(-1, Math.min(1, gpaDiff / 0.4)); // ±0.4 GPA = full range

  // SAT comparison: where student falls relative to 25th-75th range
  const [sat25, sat75] = college.satRange;
  const satMid = (sat25 + sat75) / 2;
  const satSpread = (sat75 - sat25) / 2;
  const satDiff = student.totalSAT - satMid;
  const satFit = Math.max(-1, Math.min(1, satDiff / Math.max(satSpread, 40)));

  // Weighted composite: SAT slightly more predictive than GPA for classification
  const composite = gpaFit * 0.4 + satFit * 0.6;

  // Tier classification with acceptance rate modifier
  // Ultra-selective schools (<10%) get a penalty making them harder to "match"
  const selectivityPenalty = college.acceptanceRate < 10 ? -0.2 :
                             college.acceptanceRate < 20 ? -0.1 : 0;
  const adjustedComposite = composite + selectivityPenalty;

  let tier: MatchTier;
  if (adjustedComposite >= 0.25) {
    tier = 'safety';
  } else if (adjustedComposite >= -0.25) {
    tier = 'match';
  } else {
    tier = 'reach';
  }

  // Overall fit score (0-100): how well the student fits this school
  const overallFit = Math.round(Math.max(0, Math.min(100,
    50 + composite * 40 + (100 - college.acceptanceRate) * 0.1
  )));

  return { college, tier, gpaFit, satFit, overallFit };
}

export interface MatchFilters {
  tier?: MatchTier;
  type?: 'Private' | 'Public';
  size?: 'Small' | 'Medium' | 'Large';
  strength?: string;
  state?: string;
}

/**
 * Get all college matches for a student, optionally filtered.
 */
export function getCollegeMatches(
  student: StudentStats,
  filters?: MatchFilters
): CollegeMatch[] {
  let matches = colleges.map(c => classifyCollege(student, c));

  if (filters?.tier) {
    matches = matches.filter(m => m.tier === filters.tier);
  }
  if (filters?.type) {
    matches = matches.filter(m => m.college.type === filters.type);
  }
  if (filters?.size) {
    matches = matches.filter(m => m.college.size === filters.size);
  }
  if (filters?.strength) {
    const s = filters.strength.toLowerCase();
    matches = matches.filter(m =>
      m.college.strengths.some(str => str.toLowerCase().includes(s))
    );
  }
  if (filters?.state) {
    matches = matches.filter(m => m.college.state === filters.state);
  }

  // Sort: match first, then reach, then safety; within tier sort by overallFit
  const tierOrder: Record<MatchTier, number> = { match: 0, reach: 1, safety: 2 };
  matches.sort((a, b) => {
    if (a.tier !== b.tier) return tierOrder[a.tier] - tierOrder[b.tier];
    return b.overallFit - a.overallFit;
  });

  return matches;
}

/**
 * Get unique strengths from all colleges for filter dropdown.
 */
export function getAllStrengths(): string[] {
  const set = new Set<string>();
  colleges.forEach(c => c.strengths.forEach(s => set.add(s)));
  return Array.from(set).sort();
}

/**
 * Get unique states from all colleges for filter dropdown.
 */
export function getAllStates(): string[] {
  const set = new Set<string>();
  colleges.forEach(c => set.add(c.state));
  return Array.from(set).sort();
}

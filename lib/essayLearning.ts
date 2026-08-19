import { createHmac } from 'crypto';
import { prisma } from './db';
import { extractFeatures, derivePatterns, FEATURE_KEYS, FEATURE_LABELS, PATTERN_LABELS, type EssayFeatures } from './essayFeatures';

/* ══════════════════════════════════════════════════════════════════════
   ESSAY LEARNING LOOP

   How it works
   ────────────
   1. CAPTURE   Every essay save extracts a numeric feature vector and a set
                of structural pattern markers. The essay text is never
                copied — see lib/essayFeatures.ts.
   2. LABEL     An observation only becomes ground truth when a human tutor
                completes a review with scores. Engine scores are NEVER used
                as labels: grading our own homework would just amplify the
                engine's existing bias with each cycle.
   3. DERIVE    Compare the strong and weak cohorts. Patterns concentrated in
                weak essays become candidate cautions; patterns concentrated
                in strong essays become candidate styles.
   4. PROMOTE   Candidates do nothing until an admin promotes them. This is
                the safety valve — see GUARDRAILS below.

   GUARDRAILS
   ──────────
   A naive "learn from users" loop drifts: early labels from a handful of
   tutors become rules, those rules shape what students write, and the next
   cohort confirms them. Four things prevent that here:

     • Minimum cohort size before any candidate is emitted at all.
     • Effect-size thresholds (Cohen's d / lift), not bare frequency — a
       pattern must actually separate the cohorts, not merely be common.
     • Human promotion. Nothing reaches a student automatically.
     • Bounded influence. A learned rule can add a suggestion; it can never
       rewrite the base scoring engine.
   ══════════════════════════════════════════════════════════════════════ */

/** Minimum labeled essays per cohort before any candidate rule is emitted. */
export const MIN_COHORT = 20;
/** Minimum times a pattern must appear in a cohort to be considered. */
export const MIN_PATTERN_OBS = 8;
/** Weak/strong prevalence ratio at which a pattern becomes a caution candidate. */
export const CAUTION_LIFT = 1.6;
/** Strong/weak prevalence ratio at which a pattern becomes a style candidate. */
export const STYLE_LIFT = 1.6;
/** |Cohen's d| at which a numeric feature is considered discriminating. */
export const MIN_EFFECT = 0.5;

export type Label = 'strong' | 'weak' | 'mixed' | 'unlabeled';

/* ─── privacy: a one-way reference ───
   We need to update an observation when a student revises, without storing a
   link back to them. An HMAC of the essay id gives a stable key that cannot
   be reversed or joined against the essays table without the server secret. */
function essayRef(essayId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
  return createHmac('sha256', secret).update(`essay:${essayId}`).digest('hex').slice(0, 32);
}

export async function ensureLearningSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "essay_observations" (
      "id" TEXT PRIMARY KEY,
      "essayRef" TEXT UNIQUE NOT NULL,
      "features" JSONB NOT NULL,
      "patterns" TEXT[] NOT NULL DEFAULT '{}',
      "label" TEXT NOT NULL DEFAULT 'unlabeled',
      "labelSource" TEXT,
      "labelScore" DOUBLE PRECISION,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "essay_obs_label_idx" ON "essay_observations" ("label")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "essay_rules" (
      "id" TEXT PRIMARY KEY,
      "kind" TEXT NOT NULL,
      "targetType" TEXT NOT NULL,
      "target" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'candidate',
      "message" TEXT NOT NULL DEFAULT '',
      "stats" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "essay_rules_target_idx" ON "essay_rules" ("kind", "targetType", "target")`);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · CAPTURE
   ══════════════════════════════════════════════════════════════════════ */

/** Record (or refresh) the derived signals for one essay. Never throws — the
    learning loop must never be able to break a student's save. */
export async function recordObservation(essayId: string, content: string, prompt?: string): Promise<void> {
  try {
    const features = extractFeatures(content, prompt);
    if (!features) return;                       // too short to measure
    const patterns = derivePatterns(features, content);
    const ref = essayRef(essayId);

    await ensureLearningSchema();
    await prisma.$executeRaw`
      INSERT INTO "essay_observations" ("id", "essayRef", "features", "patterns", "updatedAt")
      VALUES (${`obs_${ref}`}, ${ref}, ${JSON.stringify(features)}::jsonb, ${patterns}, CURRENT_TIMESTAMP)
      ON CONFLICT ("essayRef") DO UPDATE
        SET "features" = EXCLUDED."features",
            "patterns" = EXCLUDED."patterns",
            "updatedAt" = CURRENT_TIMESTAMP
    `;
  } catch {
    /* observation is best-effort by design */
  }
}

/* ══════════════════════════════════════════════════════════════════════
   2 · LABEL  (human ground truth only)
   ══════════════════════════════════════════════════════════════════════ */

/** Map a tutor's 1-10 dimension scores onto a cohort label. */
export function labelFromTutorScores(scores: Record<string, unknown>): { label: Label; mean: number } | null {
  const vals = Object.values(scores || {})
    .map(v => (typeof v === 'number' ? v : Number(v)))
    .filter(v => Number.isFinite(v) && v > 0 && v <= 10);
  if (vals.length < 3) return null;             // not enough of the rubric filled in
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const label: Label = mean >= 8 ? 'strong' : mean <= 5 ? 'weak' : 'mixed';
  return { label, mean: Math.round(mean * 100) / 100 };
}

/** Attach a human label to an essay's observation. Called when a tutor
    completes a review. Best-effort; never breaks the review flow. */
export async function applyTutorLabel(essayId: string, scores: Record<string, unknown>): Promise<void> {
  try {
    const res = labelFromTutorScores(scores);
    if (!res) return;
    await ensureLearningSchema();
    await prisma.$executeRaw`
      UPDATE "essay_observations"
         SET "label" = ${res.label}, "labelSource" = 'tutor_review',
             "labelScore" = ${res.mean}, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "essayRef" = ${essayRef(essayId)}
    `;
  } catch {
    /* best-effort */
  }
}

/* ══════════════════════════════════════════════════════════════════════
   3 · DERIVE
   ══════════════════════════════════════════════════════════════════════ */

export interface PatternCandidate {
  kind: 'caution' | 'style';
  targetType: 'pattern';
  target: string;
  label: string;
  weakRate: number;
  strongRate: number;
  lift: number;
  nWeak: number;
  nStrong: number;
  message: string;
}

export interface FeatureCandidate {
  targetType: 'feature';
  target: string;
  label: string;
  strongMean: number;
  weakMean: number;
  effect: number;               // Cohen's d, strong vs weak
  direction: 'higher-in-strong' | 'higher-in-weak';
}

export interface Corpus {
  total: number;
  strong: number;
  weak: number;
  mixed: number;
  unlabeled: number;
  ready: boolean;               // enough labeled data to derive anything
  shortfall: number;            // how many more labeled essays are needed
}

interface ObsRow { features: EssayFeatures; patterns: string[]; label: Label }

async function loadObservations(): Promise<ObsRow[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT "features", "patterns", "label" FROM "essay_observations"
  `;
  return rows.map(r => ({
    features: (typeof r.features === 'string' ? JSON.parse(r.features) : r.features) as EssayFeatures,
    patterns: Array.isArray(r.patterns) ? r.patterns : [],
    label: (r.label || 'unlabeled') as Label,
  }));
}

export async function getCorpus(): Promise<Corpus> {
  await ensureLearningSchema();
  const obs = await loadObservations();
  const strong = obs.filter(o => o.label === 'strong').length;
  const weak = obs.filter(o => o.label === 'weak').length;
  const mixed = obs.filter(o => o.label === 'mixed').length;
  return {
    total: obs.length,
    strong, weak, mixed,
    unlabeled: obs.filter(o => o.label === 'unlabeled').length,
    ready: strong >= MIN_COHORT && weak >= MIN_COHORT,
    shortfall: Math.max(0, MIN_COHORT - strong) + Math.max(0, MIN_COHORT - weak),
  };
}

/** Compare the cohorts and propose rules. Returns empty lists — not garbage —
    until both cohorts clear MIN_COHORT. */
export async function deriveCandidates(): Promise<{
  corpus: Corpus;
  patterns: PatternCandidate[];
  features: FeatureCandidate[];
}> {
  await ensureLearningSchema();
  const obs = await loadObservations();
  const strong = obs.filter(o => o.label === 'strong');
  const weak = obs.filter(o => o.label === 'weak');

  const corpus: Corpus = {
    total: obs.length,
    strong: strong.length,
    weak: weak.length,
    mixed: obs.filter(o => o.label === 'mixed').length,
    unlabeled: obs.filter(o => o.label === 'unlabeled').length,
    ready: strong.length >= MIN_COHORT && weak.length >= MIN_COHORT,
    shortfall: Math.max(0, MIN_COHORT - strong.length) + Math.max(0, MIN_COHORT - weak.length),
  };
  if (!corpus.ready) return { corpus, patterns: [], features: [] };

  /* ─ patterns: prevalence lift between cohorts ─ */
  const allPatterns = new Set<string>();
  for (const o of obs) o.patterns.forEach(p => allPatterns.add(p));

  const patterns: PatternCandidate[] = [];
  for (const p of allPatterns) {
    const nWeak = weak.filter(o => o.patterns.includes(p)).length;
    const nStrong = strong.filter(o => o.patterns.includes(p)).length;
    const weakRate = nWeak / weak.length;
    const strongRate = nStrong / strong.length;

    // Caution: over-represented among tutor-rated-weak essays.
    if (nWeak >= MIN_PATTERN_OBS && weakRate > 0 && strongRate >= 0) {
      const lift = strongRate > 0 ? weakRate / strongRate : Infinity;
      if (lift >= CAUTION_LIFT) {
        patterns.push({
          kind: 'caution', targetType: 'pattern', target: p,
          label: PATTERN_LABELS[p] || p,
          weakRate: round(weakRate), strongRate: round(strongRate),
          lift: Number.isFinite(lift) ? round(lift) : 99,
          nWeak, nStrong,
          message: cautionMessage(p, weakRate),
        });
        continue;
      }
    }
    // Style: over-represented among tutor-rated-strong essays.
    if (nStrong >= MIN_PATTERN_OBS) {
      const lift = weakRate > 0 ? strongRate / weakRate : Infinity;
      if (lift >= STYLE_LIFT) {
        patterns.push({
          kind: 'style', targetType: 'pattern', target: p,
          label: PATTERN_LABELS[p] || p,
          weakRate: round(weakRate), strongRate: round(strongRate),
          lift: Number.isFinite(lift) ? round(lift) : 99,
          nWeak, nStrong,
          message: styleMessage(p, strongRate),
        });
      }
    }
  }
  patterns.sort((a, b) => b.lift - a.lift);

  /* ─ numeric features: Cohen's d ─ */
  const features: FeatureCandidate[] = [];
  for (const key of FEATURE_KEYS) {
    const sv = strong.map(o => num(o.features?.[key])).filter(Number.isFinite) as number[];
    const wv = weak.map(o => num(o.features?.[key])).filter(Number.isFinite) as number[];
    if (sv.length < MIN_COHORT || wv.length < MIN_COHORT) continue;

    const ms = avg(sv), mw = avg(wv);
    const vs = variance(sv, ms), vw = variance(wv, mw);
    const pooled = Math.sqrt(((sv.length - 1) * vs + (wv.length - 1) * vw) / Math.max(sv.length + wv.length - 2, 1));
    if (pooled === 0) continue;
    const d = (ms - mw) / pooled;
    if (Math.abs(d) < MIN_EFFECT) continue;

    features.push({
      targetType: 'feature', target: String(key),
      label: FEATURE_LABELS[String(key)] || String(key),
      strongMean: round(ms), weakMean: round(mw), effect: round(d),
      direction: d > 0 ? 'higher-in-strong' : 'higher-in-weak',
    });
  }
  features.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

  return { corpus, patterns, features };
}

function num(v: unknown): number { return typeof v === 'number' ? v : NaN; }
function avg(a: number[]): number { return a.reduce((x, y) => x + y, 0) / a.length; }
function variance(a: number[], m: number): number { return a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length; }
function round(n: number): number { return Math.round(n * 1000) / 1000; }

/* ─── message templates ───
   Written as coaching, not as statistics. The admin can edit before promoting. */

function cautionMessage(pattern: string, weakRate: number): string {
  const pct = Math.round(weakRate * 100);
  const M: Record<string, string> = {
    'open:chronological': 'Reviewed essays that open at the start of the timeline tend to score lower. Try opening inside your most charged moment and filling in the backstory afterward.',
    'rhythm:monotone': 'Your sentences are running at a similar length. Reviewed essays that vary deliberately — a long line to build, a short one to land — read with more momentum.',
    'rhythm:no-short': 'There is no short sentence here to land a point. One three-to-five word line after a long one creates emphasis.',
    'struct:single-block': 'This is one undivided block. Breaking it into scenes gives the reader somewhere to breathe.',
    'narr:list-like': 'The beats are linked by addition rather than consequence. Recast some "and then" joins as "but…" or "so…" so each moment forces the next.',
    'narr:no-reflection': 'This recounts what happened without turning inward. Reviewed essays that score well almost always show what the writer made of it.',
    'narr:no-scene': 'This stays abstract. Anchoring it in one concrete moment — a place, a time, something said — gives the ideas somewhere to stand.',
    'narr:i-heavy': 'Most sentences open with "I", which flattens the rhythm. Vary a few openings.',
    'tone:overstated': 'Intensifiers and absolutes are doing a lot of work here. Reviewed essays read as more credible when a concrete detail carries the weight instead.',
    'tone:unresolved-negative': 'This carries real weight but does not yet turn. Reviewed essays about hardship score higher when the ending shows who the writer became.',
    'read:dense': 'The vocabulary load is high. Clarity reads as more confident than sophistication.',
    'hyg:cliche-heavy': 'Several stock phrases appear here. Admissions readers see them constantly; a specific detail always beats a familiar one.',
    'hyg:passive-heavy': 'Passive constructions hide who acted. Putting yourself in the driver\'s seat reads as more direct.',
    'hyg:filler-heavy': 'Filler words are diluting the sentences. Cutting them and naming the exact thing sharpens the prose.',
    'craft:tell-dominant': 'This tells more than it shows. Reviewed essays score better when the reader is allowed to draw the conclusion.',
    'fit:off-prompt': 'There is little overlap with the prompt. Make sure the essay is answering the question being asked.',
  };
  return M[pattern] || `This pattern appears in ${pct}% of essays tutors rated weak. Worth a second look.`;
}

function styleMessage(pattern: string, strongRate: number): string {
  const pct = Math.round(strongRate * 100);
  const M: Record<string, string> = {
    'struct:bookend': 'Your ending calls back to your opening image — a bookend. It is one of the most satisfying moves in narrative writing, and it shows up often in essays tutors rate highly.',
    'open:in-medias-res': 'You open inside a moment rather than at the start of the timeline. That is the hook strong essays tend to use.',
    'open:dialogue': 'Opening on dialogue drops the reader straight into a scene — a move that reads well when the line is genuinely yours.',
    'rhythm:varied': 'Your sentence lengths rise and fall deliberately. That pacing is a hallmark of the essays tutors rate highest.',
    'narr:causal': 'Your beats drive each other rather than merely following each other. That is what makes a narrative pull.',
    'narr:has-imagery': 'You reach for a concrete image to carry an abstract feeling — a move strong essays share.',
    'craft:show-dominant': 'You show more than you tell, letting the reader arrive at the meaning themselves.',
    'tone:measured': 'Your register stays measured and credible, which reviewers consistently reward.',
    'read:plain': 'Your prose is plain and clear. Clarity reads as confidence.',
  };
  return M[pattern] || `This pattern appears in ${pct}% of essays tutors rated strong.`;
}

/* ══════════════════════════════════════════════════════════════════════
   4 · PROMOTE / SERVE
   ══════════════════════════════════════════════════════════════════════ */

export interface ActiveRule {
  id: string;
  kind: 'caution' | 'style';
  target: string;
  message: string;
}

/** Rules an admin has promoted. This is the only thing students ever see. */
export async function getActiveRules(): Promise<ActiveRule[]> {
  try {
    await ensureLearningSchema();
    const rows: any[] = await prisma.$queryRaw`
      SELECT "id", "kind", "target", "message" FROM "essay_rules"
       WHERE "status" = 'active' AND "targetType" = 'pattern'
    `;
    return rows.map(r => ({ id: r.id, kind: r.kind, target: r.target, message: r.message }));
  } catch {
    return [];
  }
}

export async function upsertCandidates(
  patterns: PatternCandidate[],
): Promise<number> {
  await ensureLearningSchema();
  let n = 0;
  for (const c of patterns) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "essay_rules" ("id", "kind", "targetType", "target", "status", "message", "stats", "updatedAt")
        VALUES (${`rule_${c.kind}_${c.target}`.replace(/[^a-z0-9_]/gi, '_')}, ${c.kind}, 'pattern', ${c.target},
                'candidate', ${c.message},
                ${JSON.stringify({ lift: c.lift, weakRate: c.weakRate, strongRate: c.strongRate, nWeak: c.nWeak, nStrong: c.nStrong })}::jsonb,
                CURRENT_TIMESTAMP)
        ON CONFLICT ("kind", "targetType", "target") DO UPDATE
          SET "stats" = EXCLUDED."stats", "updatedAt" = CURRENT_TIMESTAMP
      `;
      n++;
    } catch { /* skip */ }
  }
  return n;
}

export async function setRuleStatus(id: string, status: 'active' | 'rejected' | 'candidate', message?: string): Promise<void> {
  await ensureLearningSchema();
  if (message != null) {
    await prisma.$executeRaw`
      UPDATE "essay_rules" SET "status" = ${status}, "message" = ${message}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
  } else {
    await prisma.$executeRaw`
      UPDATE "essay_rules" SET "status" = ${status}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
  }
}

export async function listRules(): Promise<any[]> {
  await ensureLearningSchema();
  const rows: any[] = await prisma.$queryRaw`
    SELECT "id", "kind", "target", "status", "message", "stats", "updatedAt"
      FROM "essay_rules" ORDER BY "status" ASC, "updatedAt" DESC`;
  return rows.map(r => ({
    ...r,
    stats: typeof r.stats === 'string' ? JSON.parse(r.stats) : r.stats,
    label: PATTERN_LABELS[r.target] || r.target,
  }));
}

import { prisma, ensureSchema } from './db';

/* ──────────────────────────────────────────────────────────────────────
   ESSAY SAMPLES — ENTITLEMENTS & PAYWALL POLICY (single source of truth)

   Every server endpoint that could leak paid content — the single-essay
   reader, the download endpoint — MUST gate on hasEssayAccess() here.
   Never enforce the paywall in the client; the client only renders what
   the server chooses to send.
   ────────────────────────────────────────────────────────────────────── */

/** Free essays per school bucket; the rest of that bucket is premium (locked). */
export const FREE_PER_SCHOOL = 1;

/**
 * Per-school overrides of the free quota. UC is the flagship free-value
 * bucket — free users get 3 UC Personal Insight samples (across different
 * PIQ prompts, see the selection logic in the sample-essays API) instead of
 * the default 1, so the free tier demonstrates real breadth.
 */
export const FREE_PER_SCHOOL_OVERRIDE: Record<string, number> = {
  'university-of-california': 3,
};

/** Number of free samples for a given school bucket. */
export function freeQuotaFor(schoolSlug: string): number {
  return FREE_PER_SCHOOL_OVERRIDE[schoolSlug] ?? FREE_PER_SCHOOL;
}

export interface ClassifiableEssay {
  id: string;
  schoolSlug: string;
  promptLabel?: string;
  prompt?: string;
}

/**
 * Single source of truth for which essays are premium (locked) vs free.
 * Within each school bucket, the free quota (freeQuotaFor) is spent on the
 * FIRST essay of each DISTINCT prompt — so free users get variety (e.g. three
 * different UC PIQs) rather than repeats of one prompt. Every other essay in
 * the bucket is premium. Both the index route and the download route MUST use
 * this so their access decisions can never drift apart.
 *
 * Returns a Map of essay id → isPremium.
 */
export function buildPremiumMap(essays: ClassifiableEssay[]): Map<string, boolean> {
  const state = new Map<string, { freed: number; prompts: Set<string> }>();
  const m = new Map<string, boolean>();
  for (const e of essays) {
    const quota = freeQuotaFor(e.schoolSlug);
    let st = state.get(e.schoolSlug);
    if (!st) { st = { freed: 0, prompts: new Set<string>() }; state.set(e.schoolSlug, st); }
    const key = (e.promptLabel || e.prompt || e.id)
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
    const isFree = st.freed < quota && !st.prompts.has(key);
    if (isFree) { st.freed++; st.prompts.add(key); }
    m.set(e.id, !isFree); // premium = not free
  }
  return m;
}

/** Fraction of a locked essay shown as a teaser before the paywall. */
export const PREVIEW_FRACTION = 0.25;

export interface Entitlements {
  all: boolean;        // all-access pass
  schools: string[];   // per-school unlocks (schoolSlug list)
}

/** Active entitlements for a user. Defensive — never throws. */
export async function getEntitlements(userId: string | null | undefined): Promise<Entitlements> {
  if (!userId) return { all: false, schools: [] };
  try {
    await ensureSchema();
    const rows: any[] = await prisma.$queryRaw`
      SELECT "scope" FROM "essay_purchases" WHERE "userId" = ${userId} AND "status" = 'active'
    `;
    let all = false;
    const schools: string[] = [];
    for (const r of rows) {
      if (r.scope === 'all') all = true;
      else if (r.scope) schools.push(r.scope);
    }
    return { all, schools };
  } catch {
    return { all: false, schools: [] };
  }
}

/** Does this user have access to a given school's premium essays? */
export async function hasEssayAccess(userId: string | null | undefined, schoolSlug?: string): Promise<boolean> {
  const e = await getEntitlements(userId);
  if (e.all) return true;
  if (schoolSlug && e.schools.includes(schoolSlug)) return true;
  return false;
}

/**
 * Truncate an essay to its first ~PREVIEW_FRACTION of characters, cut on a
 * paragraph boundary so the teaser ends cleanly. Returns the preview text.
 */
export function previewOf(essay: string, fraction = PREVIEW_FRACTION): string {
  const text = (essay || '').trim();
  if (!text) return '';
  const target = Math.max(120, Math.floor(text.length * fraction));

  // Accumulate whole paragraphs while we stay at or under the target.
  const paras = text.split(/\n\s*\n/);
  let out = '';
  for (const p of paras) {
    if (!out) {
      out = p; // always take the first paragraph, then cap below if it overshoots
    } else if (out.length + 2 + p.length <= target) {
      out = out + '\n\n' + p;
    } else {
      break;
    }
    if (out.length >= target) break;
  }

  // Hard cap: a single oversized (first) paragraph — or one with no blank-line
  // breaks at all — must still be truncated to the target, on a word boundary.
  // Without this, a single-paragraph essay would leak its full text.
  if (out.length > target) {
    let cut = out.slice(0, target);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 80) cut = cut.slice(0, lastSpace);
    out = cut.trimEnd() + '…';
  }
  return out;
}

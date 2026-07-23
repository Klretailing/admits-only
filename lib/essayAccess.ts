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

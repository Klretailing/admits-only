import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import sampleData from '../../data/sampleEssays.json';
import {
  FREE_PER_SCHOOL,
  PREVIEW_FRACTION,
  hasEssayAccess,
  getEntitlements,
  previewOf,
} from '../../lib/essayAccess';

/* ──────────────────────────────────────────────────────────────────────
   SAMPLE ESSAYS API  (server-side paywall)
   Serves the curated, anonymized library of admissions essays.

   Access model:
   - Within each school bucket the FIRST FREE_PER_SCHOOL essays (by their
     existing order) are FREE; every later essay is PREMIUM. This premium
     flag is deterministic and precomputed ONCE at module load.
   - PREMIUM essays are LOCKED for a user who lacks access to that school.
     A locked essay's full text is NEVER placed in any response — the index
     ships only a short preview, and the single-essay route serves only a
     ~PREVIEW_FRACTION teaser via previewOf() until the user is entitled.

   Performance model:
   - Full essay text is imported at build time (server bundle only — NEVER
     shipped in the client page bundle). The premium flags + per-school
     buckets are precomputed ONCE at module load. Only the per-user `locked`
     and `access` bits are computed per request (one small entitlements query).

   Because responses now vary by user, they are NOT CDN-cacheable:
   Cache-Control is `private, no-store`.
   ────────────────────────────────────────────────────────────────────── */

interface SampleEssay {
  id: string;
  school: string;
  schoolSlug: string;
  essayType: string;
  promptLabel: string;
  prompt: string;
  wordCount: number;
  essay: string;
}

interface EssayMeta {
  id: string;
  school: string;
  schoolSlug: string;
  essayType: string;
  promptLabel: string;
  prompt: string;
  wordCount: number;
  preview: string;
  premium: boolean;
  locked?: boolean;
}

interface SchoolBucket {
  school: string;
  schoolSlug: string;
  count: number;
  essays: EssayMeta[];
}

function preview(text: string, n = 180): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + '…' : clean;
}

function wordCountOf(text: string): number {
  const t = (text || '').trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/* ─── Precompute once at module load (data + premium flags are static) ─── */
const ESSAYS: SampleEssay[] = ((sampleData as { essays?: SampleEssay[] }).essays) || [];

const BY_ID: Map<string, SampleEssay> = (() => {
  const m = new Map<string, SampleEssay>();
  for (const e of ESSAYS) m.set(e.id, e);
  return m;
})();

/** Deterministic premium classification per essay id (stable across requests). */
const PREMIUM_BY_ID: Map<string, boolean> = (() => {
  const seen = new Map<string, number>(); // schoolSlug -> count so far
  const m = new Map<string, boolean>();
  for (const e of ESSAYS) {
    const n = seen.get(e.schoolSlug) || 0;
    m.set(e.id, n >= FREE_PER_SCHOOL);
    seen.set(e.schoolSlug, n + 1);
  }
  return m;
})();

/** Precomputed buckets with static fields only (no per-user `locked`). */
const STATIC_INDEX: { buckets: SchoolBucket[]; total: number } = (() => {
  const bucketMap = new Map<string, SchoolBucket>();
  for (const e of ESSAYS) {
    let bucket = bucketMap.get(e.schoolSlug);
    if (!bucket) {
      bucket = { school: e.school, schoolSlug: e.schoolSlug, count: 0, essays: [] };
      bucketMap.set(e.schoolSlug, bucket);
    }
    bucket.count++;
    bucket.essays.push({
      id: e.id,
      school: e.school,
      schoolSlug: e.schoolSlug,
      essayType: e.essayType,
      promptLabel: e.promptLabel,
      prompt: e.prompt,
      wordCount: e.wordCount,
      preview: preview(e.essay),
      premium: PREMIUM_BY_ID.get(e.id) || false,
    });
  }
  const buckets = Array.from(bucketMap.values()).sort(
    (a, b) => b.count - a.count || a.school.localeCompare(b.school),
  );
  return { buckets, total: ESSAYS.length };
})();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Per-user response — must never be cached by a CDN or the browser.
  res.setHeader('Cache-Control', 'private, no-store');

  // Identify the user (may be unauthenticated — treat as no access).
  const session = await getServerSession(req, res, authOptions);
  const userId: string | null = (session?.user as any)?.id ?? null;

  const { id } = req.query;

  /* ─── Single essay (full text) on demand — the enforcement point ─── */
  if (id && typeof id === 'string') {
    const found = BY_ID.get(id);
    if (!found) return res.status(404).json({ error: 'Essay not found' });

    const premium = PREMIUM_BY_ID.get(found.id) || false;

    // Free essay → full text, as always.
    if (!premium) {
      return res.status(200).json({ essay: found, locked: false });
    }

    // Premium → gate on the user's entitlement for this school.
    const access = await hasEssayAccess(userId, found.schoolSlug);
    if (access) {
      return res.status(200).json({ essay: found, locked: false, unlocked: true });
    }

    // Locked: return ONLY a preview. The withheld remainder is never built
    // into the payload — `essay` is replaced by the truncated teaser.
    const previewText = previewOf(found.essay, PREVIEW_FRACTION);
    const { essay: _full, ...meta } = found;
    return res.status(200).json({
      essay: { ...meta, essay: previewText },
      locked: true,
      previewFraction: PREVIEW_FRACTION,
      fullWordCount: wordCountOf(found.essay),
    });
  }

  /* ─── Index: static buckets + per-user `locked` flags + `access` ─── */
  const entitlements = await getEntitlements(userId);
  const buckets: SchoolBucket[] = STATIC_INDEX.buckets.map((b) => {
    const unlockedSchool = entitlements.all || entitlements.schools.includes(b.schoolSlug);
    return {
      ...b,
      essays: b.essays.map((e) => ({
        ...e,
        locked: e.premium && !unlockedSchool,
      })),
    };
  });

  return res.status(200).json({
    buckets,
    total: STATIC_INDEX.total,
    access: { all: entitlements.all, schools: entitlements.schools },
  });
}

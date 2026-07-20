import type { NextApiRequest, NextApiResponse } from 'next';
import sampleData from '../../data/sampleEssays.json';

/* ──────────────────────────────────────────────────────────────────────
   SAMPLE ESSAYS API
   Serves the curated, anonymized library of admissions essays.

   Performance model:
   - The full essay text is imported at build time (server bundle only — it is
     NEVER shipped in the client page bundle) and the per-school INDEX is
     precomputed ONCE at module load, so requests do no per-call work.
   - GET (no id)  → lightweight index: metadata + short preview per essay,
                    grouped into per-school buckets. Small payload.
   - GET ?id=xxx  → the full text of a single essay (O(1) map lookup), fetched
                    on demand when a reader opens it.
   View-only: there is no download endpoint. Responses are CDN-cacheable since
   the data is static.
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

/* ─── Precompute once at module load (data is static) ─── */
const ESSAYS: SampleEssay[] = ((sampleData as { essays?: SampleEssay[] }).essays) || [];

const BY_ID: Map<string, SampleEssay> = (() => {
  const m = new Map<string, SampleEssay>();
  for (const e of ESSAYS) m.set(e.id, e);
  return m;
})();

const INDEX: { buckets: SchoolBucket[]; total: number } = (() => {
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
    });
  }
  const buckets = Array.from(bucketMap.values()).sort(
    (a, b) => b.count - a.count || a.school.localeCompare(b.school),
  );
  return { buckets, total: ESSAYS.length };
})();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Static content → let the CDN/browser cache it.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  const { id } = req.query;

  // Single essay (full text) on demand
  if (id && typeof id === 'string') {
    const found = BY_ID.get(id);
    if (!found) return res.status(404).json({ error: 'Essay not found' });
    return res.status(200).json({ essay: found });
  }

  // Index (precomputed)
  return res.status(200).json(INDEX);
}

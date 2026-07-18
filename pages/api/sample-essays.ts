import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/* ──────────────────────────────────────────────────────────────────────
   SAMPLE ESSAYS API
   Serves the curated, anonymized library of successful admissions essays.

   Performance model: the full essay text lives ONLY server-side in
   data/sampleEssays.json and is never shipped in the client bundle.
   - GET (no id)  → lightweight index: metadata + short preview per essay,
                    grouped into per-school buckets. Small payload.
   - GET ?id=xxx  → the full text of a single essay, fetched on demand when
                    a reader opens it.
   View-only: there is no download endpoint.
   ────────────────────────────────────────────────────────────────────── */

interface SampleEssay {
  id: string;
  school: string;        // school the essay was written for (or "Common Application" / "University of California")
  schoolSlug: string;
  essayType: string;     // "Personal Statement" | "UC Personal Insight" | "Supplemental Essay" | ...
  promptLabel: string;   // short human label
  prompt: string;        // full prompt text
  wordCount: number;
  essay: string;         // full anonymized text (server-only)
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

let cache: { essays: SampleEssay[] } | null = null;

function load(): SampleEssay[] {
  if (cache) return cache.essays;
  try {
    const file = path.join(process.cwd(), 'data', 'sampleEssays.json');
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const essays: SampleEssay[] = Array.isArray(parsed?.essays) ? parsed.essays : [];
    cache = { essays };
    return essays;
  } catch {
    return [];
  }
}

function preview(text: string, n = 180): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + '…' : clean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const essays = load();
  const { id } = req.query;

  // Single essay (full text) on demand
  if (id && typeof id === 'string') {
    const found = essays.find((e) => e.id === id);
    if (!found) return res.status(404).json({ error: 'Essay not found' });
    return res.status(200).json({ essay: found });
  }

  // Index: group into per-school buckets, metadata + preview only
  const bucketMap = new Map<string, SchoolBucket>();
  for (const e of essays) {
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

  return res.status(200).json({ buckets, total: essays.length });
}

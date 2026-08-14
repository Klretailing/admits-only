import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import sampleData from '../../../data/sampleEssays.json';
import { buildPremiumMap, hasEssayAccess } from '../../../lib/essayAccess';

/* ──────────────────────────────────────────────────────────────────────
   SAMPLE ESSAYS — DOWNLOAD ENDPOINT  (access-gated)
   GET ?id=xxx  → the full essay as a downloadable markdown file.

   Auth is required. Free essays download for any logged-in user; premium
   essays require a real entitlement (hasEssayAccess). Without access a
   premium essay's text is NEVER emitted — the request 403s before any body
   is built. This mirrors the paywall in pages/api/sample-essays.ts.
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

const ESSAYS: SampleEssay[] = ((sampleData as { essays?: SampleEssay[] }).essays) || [];

const BY_ID: Map<string, SampleEssay> = (() => {
  const m = new Map<string, SampleEssay>();
  for (const e of ESSAYS) m.set(e.id, e);
  return m;
})();

/** Deterministic premium classification per essay id (shared source of truth,
    identical to the index route so access decisions can never drift). */
const PREMIUM_BY_ID: Map<string, boolean> = buildPremiumMap(ESSAYS);

function safeName(...parts: string[]): string {
  const raw = parts.filter(Boolean).join('-');
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
  return cleaned || 'essay';
}

function buildMarkdown(e: SampleEssay): string {
  const promptBlock = (e.prompt || '')
    .trim()
    .split(/\n/)
    .map((line) => `> ${line}`)
    .join('\n');
  const lines = [
    `# ${e.school} — ${e.essayType}`,
    '',
    e.promptLabel ? `**${e.promptLabel}**` : '',
    '',
    promptBlock,
    '',
    '---',
    '',
    (e.essay || '').trim(),
    '',
    '---',
    '',
    '_Anonymized sample from AdmitsOnly — for personal reference._',
    '',
  ];
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Never cache a gated download.
  res.setHeader('Cache-Control', 'private, no-store');

  const session = await getServerSession(req, res, authOptions);
  const userId: string | null = (session?.user as any)?.id ?? null;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' });
  }

  const found = BY_ID.get(id);
  if (!found) return res.status(404).json({ error: 'Essay not found' });

  const premium = PREMIUM_BY_ID.get(found.id) || false;
  if (premium) {
    const access = await hasEssayAccess(userId, found.schoolSlug);
    if (!access) return res.status(403).json({ error: 'Purchase required' });
  }

  const filename = safeName(found.schoolSlug, found.essayType, found.id) + '.md';
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(buildMarkdown(found));
}

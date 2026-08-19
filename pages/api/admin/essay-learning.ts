import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import {
  deriveCandidates, upsertCandidates, listRules, setRuleStatus, getCorpus,
  MIN_COHORT, MIN_PATTERN_OBS, CAUTION_LIFT, MIN_EFFECT,
} from '../../../lib/essayLearning';

/* ──────────────────────────────────────────────────────────────────────
   ADMIN — ESSAY LEARNING LOOP

   GET   → corpus stats, derived candidates, and the current rule set
   POST  → { action: 'derive' }                    recompute candidates
           { action: 'promote' | 'reject', id, message? }
   ────────────────────────────────────────────────────────────────────── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    if (req.method === 'GET') {
      const [{ corpus, patterns, features }, rules] = await Promise.all([
        deriveCandidates(),
        listRules(),
      ]);
      return res.json({
        corpus, patterns, features, rules,
        thresholds: {
          minCohort: MIN_COHORT,
          minPatternObs: MIN_PATTERN_OBS,
          cautionLift: CAUTION_LIFT,
          minEffect: MIN_EFFECT,
        },
      });
    }

    if (req.method === 'POST') {
      const { action, id, message } = req.body || {};

      if (action === 'derive') {
        const { corpus, patterns } = await deriveCandidates();
        if (!corpus.ready) {
          return res.status(200).json({
            ok: false, corpus,
            error: `Not enough labelled essays yet — need ${MIN_COHORT} tutor-reviewed strong and ${MIN_COHORT} weak.`,
          });
        }
        const saved = await upsertCandidates(patterns);
        return res.json({ ok: true, corpus, saved });
      }

      if (action === 'promote' || action === 'reject') {
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id is required' });
        await setRuleStatus(id, action === 'promote' ? 'active' : 'rejected',
          typeof message === 'string' && message.trim() ? message.trim() : undefined);
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message, corpus: await getCorpus().catch(() => null) });
  }
}

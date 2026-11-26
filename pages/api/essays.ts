import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';
import { recordObservation } from '../../lib/essayLearning';
import { scoreEssay, type EssayScores } from '../../lib/essayScore';

/* ──── API HANDLER ────
   Scoring lives in lib/essayScore.ts. Five scores are stored on the essay
   (so parent, tutor and admin views can list them); the rest of what the
   engine returns (answers-the-prompt, reflection, the essay type and limit,
   the prompt checklist) is computed on every read and save, so it always
   reflects the current engine. */

type Stored = Pick<EssayScores, 'aiScore' | 'vocabScore' | 'grammarScore' | 'originalityScore' | 'overallScore'>;
function split(s: EssayScores): { stored: Stored; extra: { promptScore: number | null; insightScore: number | null; scoreDetail: EssayScores['detail'] } } {
  const { aiScore, vocabScore, grammarScore, originalityScore, overallScore, promptScore, insightScore, detail } = s;
  return { stored: { aiScore, vocabScore, grammarScore, originalityScore, overallScore }, extra: { promptScore, insightScore, scoreDetail: detail } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  if (req.method === 'GET') {
    const essays = await prisma.essay.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    // Rescore with the current engine. Where the stored numbers are out of
    // date, refresh them in the background (raw SQL, so "last edited" stays
    // as it was) so the parent and tutor views catch up too.
    const stale: { id: string; s: Stored }[] = [];
    const out = essays.map((e) => {
      const { stored, extra } = split(scoreEssay(e.content || '', e.prompt || ''));
      if ((Object.keys(stored) as (keyof Stored)[]).some((k) => (e as any)[k] !== stored[k])) stale.push({ id: e.id, s: stored });
      return { ...e, ...stored, ...extra };
    });
    if (stale.length) {
      void Promise.all(stale.map(({ id, s }) => prisma.$executeRaw`
        UPDATE "essays" SET "aiScore" = ${s.aiScore}, "vocabScore" = ${s.vocabScore}, "grammarScore" = ${s.grammarScore},
          "originalityScore" = ${s.originalityScore}, "overallScore" = ${s.overallScore}
        WHERE "id" = ${id}`)).catch(() => {});
    }
    return res.json({ essays: out });
  }

  if (req.method === 'POST') {
    const { title } = req.body || {};
    // Non-string fields used to reach .trim() and crash with a 500.
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Only the five stored scores go to the database; the rest is returned.
    const { stored: scores, extra } = split(scoreEssay(content || '', prompt || ''));

    const essay = await prisma.essay.create({
      data: {
        userId,
        title: title.trim(),
        prompt: (prompt || '').trim(),
        content: (content || '').trim(),
        status: content && content.trim().length > 50 ? 'Draft' : 'Not Started',
        ...scores,
      },
    });

    // Also capture on create — an essay imported or pasted in at creation
    // time would otherwise go unmeasured until its first edit.
    void recordObservation(essay.id, (content || '').trim(), (prompt || '').trim());

    return res.status(201).json({ essay: { ...essay, ...extra } });
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body || {};
    const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v));
    const title = str(req.body?.title), prompt = str(req.body?.prompt), content = str(req.body?.content);
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Essay ID is required' });

    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    const essayPrompt = prompt != null ? prompt.trim() : (existing.prompt || '');
    const essayContent = content != null ? content.trim() : (existing.content || '');
    const { stored: scores, extra } = split(scoreEssay(essayContent, essayPrompt));

    const essay = await prisma.essay.update({
      where: { id },
      data: {
        ...(title != null ? { title: title.trim() } : {}),
        ...(prompt != null ? { prompt: prompt.trim() } : {}),
        ...(content != null ? { content: content.trim() } : {}),
        ...(status != null ? { status } : {}),
        ...scores,
      },
    });

    // Feed the learning loop with derived signals only (no text is stored).
    // Fire-and-forget: this must never slow down or break a student's save.
    void recordObservation(essay.id, essayContent, essayPrompt);

    return res.json({ essay: { ...essay, ...extra } });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Essay ID is required' });

    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    await prisma.essay.delete({ where: { id } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

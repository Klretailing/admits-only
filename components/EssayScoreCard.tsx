/* ──────────────────────────────────────────────────────────────────────
   How the draft reads: one headline number, what the prompt asks for,
   then the parts.

   Every score is judged against this essay's type and word limit (see
   lib/essayPrompt.ts and lib/essayScore.ts): a 350-word UC answer is
   measured against strong 350-word answers, not against 650-word
   personal statements. Every bar reads the same way: higher is better.
   ────────────────────────────────────────────────────────────────────── */

import type { ScoreDetail } from '../lib/essayScore';

interface Scores {
  aiScore: number | null;        // stored inverted: lower = more like the student
  vocabScore: number | null;
  grammarScore: number | null;
  originalityScore: number | null;
  overallScore: number | null;
  promptScore?: number | null;
  insightScore?: number | null;
  scoreDetail?: ScoreDetail | null;
}

/* Bands on the calibrated scale: the typical essay by an admitted student
   scores about 85, and nine in ten score 68 or more. */
function overallBand(v: number): string {
  if (v >= 80) return 'Strong';
  if (v >= 70) return 'Solid';
  if (v >= 55) return 'Getting there';
  return 'Early draft';
}
const partBand = (v: number) => (v >= 75 ? 'Strong' : v >= 55 ? 'Getting there' : 'Needs work');

function verdict(overall: number): string {
  if (overall >= 80) return 'This reads like the essays admitted students submit.';
  if (overall >= 70) return 'A solid draft. The open items below will lift it.';
  if (overall >= 55) return 'The bones are here. Start with what the prompt is asking for.';
  return 'An early draft. Start with the first open item below.';
}

const LENGTH_INK: Record<string, string> = {
  over: 'text-red-700',
  very_short: 'text-amber-800',
  short: 'text-slate-700',
  good: 'text-slate-600',
  unknown: 'text-slate-600',
};

export default function EssayScoreCard({ scores, wordCount }: { scores: Scores; wordCount: number }) {
  const d = scores.scoreDetail || null;
  const overall = scores.overallScore;
  const parts = [
    { label: 'Answers the prompt', value: scores.promptScore ?? null, hint: 'Covers each thing the question asks, early and directly', show: scores.promptScore != null },
    { label: 'Reflection', value: scores.insightScore ?? null, hint: 'What it shows about you, in your own terms, not a stock lesson', show: scores.insightScore != null },
    { label: 'Storytelling', value: scores.originalityScore, hint: d && !d.storyApplies ? 'Not scored for answers this short' : 'A real moment, shown, with a clear before and after', show: true },
    { label: 'Sounds like you', value: scores.aiScore == null ? null : 100 - scores.aiScore, hint: 'Personal and specific, not generic or formulaic', show: true },
    { label: 'Word choice', value: scores.vocabScore, hint: 'Names, numbers and details; few filler words', show: true },
    { label: 'Structure and flow', value: scores.grammarScore, hint: 'Clean sentences that lead from the moment to its meaning', show: true },
  ].filter((p) => p.show);
  const open = (d?.asks || []).filter((a) => !a.met);

  return (
    <section className="bg-white rounded-2xl border p-4" aria-label="How this draft reads">
      <h3 className="text-base font-bold text-primary">How this draft reads</h3>
      {d && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">{d.kindLabel}</span>
          {' · '}
          {d.limit ? `${d.wordCount} of ${d.limit} words` : `${d.wordCount} words`}
        </p>
      )}
      {overall == null ? (
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          {wordCount < 25
            ? `Scores appear once the draft passes 25 words (${wordCount} so far).`
            : 'Scoring your draft… scores refresh a moment after you stop typing.'}
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-4xl font-bold font-display text-primary tabular-nums leading-none">{overall}</p>
            <p className="pb-0.5 text-sm text-slate-600">out of 100 · {overallBand(overall)}</p>
          </div>
          <p className="mt-2 text-sm text-slate-700 leading-snug">{verdict(overall)}</p>
          {d?.length && <p className={`mt-1.5 text-xs leading-snug ${LENGTH_INK[d.length.status] || 'text-slate-600'}`}>{d.length.note}</p>}

          {d && d.asks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-primary">What the prompt asks for</h4>
              <ul className="mt-1.5 space-y-1.5">
                {d.asks.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm leading-snug">
                    <span aria-hidden className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[10px] font-bold ${a.met ? 'bg-ink text-white border-ink' : 'border-slate-400 text-transparent'}`}>✓</span>
                    <span>
                      <span className={a.met ? 'text-slate-700' : 'font-semibold text-primary'}>{a.label}</span>
                      <span className="sr-only">{a.met ? ': covered' : ': not yet'}</span>
                      {!a.met && <span className="block text-xs text-slate-600">{a.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {open.length === 0 && <p className="mt-1.5 text-xs text-slate-600">Every part of the question is covered.</p>}
            </div>
          )}

          <dl className="mt-4 space-y-3">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-sm font-semibold text-primary">{p.label}</dt>
                  <dd className="text-sm text-slate-700">
                    {p.value == null ? '—' : <><span className="font-bold text-primary tabular-nums">{p.value}</span> · {partBand(p.value)}</>}
                  </dd>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${p.value ?? 0}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-snug">{p.hint}</p>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-600 leading-snug">
            Judged against this essay&apos;s type and word limit, and calibrated on 292 essays by admitted students. Scores
            update a moment after you stop typing.
          </p>
        </>
      )}
    </section>
  );
}

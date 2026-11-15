/* ──────────────────────────────────────────────────────────────────────
   How the draft reads overall: one headline number, then four parts.

   Replaces the old "Live Scores" block, which listed five scores in 9–11px
   type with A–D grades, used jargon ("Admissions Impact", "AOs"), and mixed
   directions: "Voice & Authenticity" was the one score where lower was
   better, so a strong essay showed "88%" with a D. Every bar here reads the
   same way: higher is better.
   ────────────────────────────────────────────────────────────────────── */

interface Scores {
  aiScore: number | null;        // stored inverted: lower = more like the student
  vocabScore: number | null;
  grammarScore: number | null;
  originalityScore: number | null;
  overallScore: number | null;
}

const band = (v: number) => (v >= 70 ? 'Strong' : v >= 45 ? 'Getting there' : 'Needs work');

function verdict(overall: number): string {
  if (overall >= 80) return 'This reads like a strong, finished draft.';
  if (overall >= 65) return 'A solid draft. The suggestions below will lift it.';
  if (overall >= 45) return 'The bones are here. Work through the suggestions below.';
  return 'An early draft. Start with the first suggestion below.';
}

export default function EssayScoreCard({ scores, wordCount }: { scores: Scores; wordCount: number }) {
  const parts = [
    { label: 'Sounds like you', value: scores.aiScore == null ? null : 100 - scores.aiScore, hint: 'Personal and specific, not generic or formulaic' },
    { label: 'Word choice', value: scores.vocabScore, hint: 'Concrete details, few filler words like "very" or "things"' },
    { label: 'Structure', value: scores.grammarScore, hint: 'Clean sentences that stay on topic' },
    { label: 'Storytelling', value: scores.originalityScore, hint: 'Real moments shown, not only described' },
  ];
  const overall = scores.overallScore;

  return (
    <section className="bg-white rounded-2xl border p-4" aria-label="How this draft reads">
      <h3 className="text-base font-bold text-primary">How this draft reads</h3>
      {overall == null ? (
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          {wordCount < 50
            ? `Scores appear once the draft passes 50 words (${wordCount} so far).`
            : 'Scoring your draft… scores refresh a moment after you stop typing.'}
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-4xl font-bold font-display text-primary tabular-nums leading-none">{overall}</p>
            <p className="pb-0.5 text-sm text-slate-600">out of 100 · {band(overall)}</p>
          </div>
          <p className="mt-2 text-sm text-slate-700 leading-snug">{verdict(overall)}</p>
          <dl className="mt-4 space-y-3">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-sm font-semibold text-primary">{p.label}</dt>
                  <dd className="text-sm text-slate-700">
                    {p.value == null ? '—' : <><span className="font-bold text-primary tabular-nums">{p.value}</span> · {band(p.value)}</>}
                  </dd>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${p.value ?? 0}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-snug">{p.hint}</p>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-600">Scores update a moment after you stop typing.</p>
        </>
      )}
    </section>
  );
}

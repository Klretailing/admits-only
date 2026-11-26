/* ──────────────────────────────────────────────────────────────────────
   How the draft reads: one headline number, what the prompt asks for,
   then the parts.

   Every score is judged against this essay's type and word limit (see
   lib/essayPrompt.ts and lib/essayScore.ts): a 350-word UC answer is
   measured against strong 350-word answers, not against 650-word
   personal statements. Every bar reads the same way: higher is better.
   ────────────────────────────────────────────────────────────────────── */

import type { ScoreDetail } from '../lib/essayScore';
import InfoTip from './InfoTip';

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

/* Colour carries the band, like a teacher's pens (styles/notebook.css):
   green for what's working, amber for what to work on. Red is kept for real
   problems, such as going over the word limit. */
const overallInk = (v: number) => (v >= 70 ? 'text-green-pencil' : 'text-amber-pencil');
const partTone = (v: number) => (v >= 75 ? { text: 'text-green-pencil', bar: 'bg-green-pencil' } : { text: 'text-amber-pencil', bar: 'bg-amber-pencil' });

function verdict(overall: number): string {
  if (overall >= 80) return 'This reads like the essays admitted students submit.';
  if (overall >= 70) return 'A solid draft. The open items below will lift it.';
  if (overall >= 55) return 'The bones are here. Start with what the prompt is asking for.';
  return 'An early draft. Start with the first open item below.';
}

const LENGTH_INK: Record<string, string> = {
  over: 'text-red-pencil font-semibold',
  very_short: 'text-amber-pencil',
  short: 'text-amber-pencil',
  good: 'text-green-pencil',
  unknown: 'text-slate-600',
};

export default function EssayScoreCard({ scores, wordCount }: { scores: Scores; wordCount: number }) {
  const d = scores.scoreDetail || null;
  const overall = scores.overallScore;
  // What each measure means lives behind its "i" button; only state the
  // student needs right now (like "not scored for answers this short")
  // stays on screen.
  const parts = [
    { label: 'Answers the prompt', value: scores.promptScore ?? null, show: scores.promptScore != null, note: '',
      info: 'Checks each thing the question asks for (the list above) and how early you get to it. Readers, UC readers especially, want a direct answer before anything else. Covering the open items raises it.' },
    { label: 'Reflection', value: scores.insightScore ?? null, show: scores.insightScore != null, note: '',
      info: 'How much the essay shows what you think, value or realized, in your own words, and whether that comes after the moment that earned it. Stock lessons like "this taught me the importance of hard work" don\'t count, because any applicant could write them.' },
    { label: 'Storytelling', value: scores.originalityScore, show: true, note: d && !d.storyApplies ? 'Not scored for answers this short.' : '',
      info: 'Whether there\'s a real moment a reader can see: names, numbers, actions, dialogue, and a clear before and after. Expectations scale with length: a 350-word answer needs one compact moment, while a 650-word personal statement can carry a full story. Answers under about 120 words aren\'t scored on it.' },
    { label: 'Sounds like you', value: scores.aiScore == null ? null : 100 - scores.aiScore, show: true, note: '',
      info: 'Whether it reads like a person rather than a template: personal detail, natural rhythm, and few stock or AI-sounding phrases ("delve", "tapestry", "I have always been passionate about").' },
    { label: 'Word choice', value: scores.vocabScore, show: true, note: '',
      info: 'How concrete the language is: names, numbers, places and quotes for every 100 words, few filler words like "very", "things" or "amazing", and plain words over thesaurus words.' },
    { label: 'Structure and flow', value: scores.grammarScore, show: true, note: '',
      info: 'Clean sentences with few grammar slips, in an order that moves from what happened to what it means. It also looks at the opening (a scene beats "Ever since I was young") and the ending.' },
  ].filter((p) => p.show);
  const open = (d?.asks || []).filter((a) => !a.met);

  return (
    <section className="bg-white rounded-2xl border p-4" aria-label="How this draft reads">
      <div className="flex items-center gap-1">
        <h3 className="text-base font-bold text-primary">How this draft reads</h3>
        <InfoTip label="How scoring works">
          <p>Every score is judged against this essay&apos;s type and word limit, so a 350-word UC answer is compared with strong 350-word answers, not 650-word personal statements.</p>
          <p>The scale is calibrated on 292 essays by admitted students; the typical one scores about 85. 80 and up is Strong, 70 to 79 Solid, 55 to 69 Getting there.</p>
          <p>Scores update a moment after you stop typing. They&apos;re guidance, not a prediction of admission.</p>
        </InfoTip>
      </div>
      {d && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold text-blue-pencil">{d.kindLabel}</span>
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
            <p className="pb-0.5 text-sm text-slate-600">out of 100 · <span className={`font-semibold ${overallInk(overall)}`}>{overallBand(overall)}</span></p>
          </div>
          <p className="mt-2 text-sm text-slate-700 leading-snug">{verdict(overall)}</p>
          {d?.length && <p className={`mt-1.5 text-xs leading-snug ${LENGTH_INK[d.length.status] || 'text-slate-600'}`}>{d.length.note}</p>}

          {d && d.asks.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1">
                <h4 className="text-sm font-semibold text-primary">What the prompt asks for</h4>
                <InfoTip label="What the prompt asks for">
                  <p>Each line is something the question asks you to do. A check means the draft covers it. For open items, the note underneath says what to add.</p>
                </InfoTip>
              </div>
              <ul className="mt-1.5 space-y-1.5">
                {d.asks.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm leading-snug">
                    <span aria-hidden className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold ${a.met ? 'bg-green-pencil border-green-pencil text-paper' : 'border-amber-pencil text-transparent'}`}>✓</span>
                    <span>
                      <span className={a.met ? 'text-slate-700' : 'font-semibold text-amber-pencil'}>{a.label}</span>
                      <span className="sr-only">{a.met ? ': covered' : ': not yet'}</span>
                      {!a.met && <span className="block text-xs text-slate-600">{a.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {open.length === 0 && <p className="mt-1.5 text-xs font-semibold text-green-pencil">Every part of the question is covered.</p>}
            </div>
          )}

          <dl className="mt-4 space-y-2.5">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between gap-2">
                  <dt className="min-w-0 text-sm font-semibold text-primary">{p.label.split(' ').slice(0, -1).join(' ')} {/* the last word and the "i" wrap together */}<span className="whitespace-nowrap">{p.label.split(' ').slice(-1)[0]}<InfoTip className="ml-0.5 -my-1" label={p.label}><p>{p.info}</p></InfoTip></span></dt>
                  <dd className="shrink-0 whitespace-nowrap text-sm text-slate-700">
                    {p.value == null ? '—' : <><span className="font-bold text-primary tabular-nums">{p.value}</span> · <span className={partTone(p.value).text}>{partBand(p.value)}</span></>}
                  </dd>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                  <div className={`h-full rounded-full transition-[width] duration-700 ${p.value == null ? 'bg-ink' : partTone(p.value).bar}`} style={{ width: `${p.value ?? 0}%` }} />
                </div>
                {p.note && <p className="mt-1 text-xs text-slate-600 leading-snug">{p.note}</p>}
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

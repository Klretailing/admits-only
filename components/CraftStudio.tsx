import { useState } from 'react';
import type { CraftReport, CraftSuggestion } from '../lib/essayCraft';
import { craftCategoryLabel } from '../lib/essayCraft';

/* ──────────────────────────────────────────────────────────────────────
   Writing feedback: what to work on, in the order a student should use it.

   Students told us the old panel was hard to read and hard to start with:
   8–11px type, a grid of four dials before any advice, and every
   suggestion collapsed to a one-line title. Now:

     1. Start here  — the few changes most worth making, opened up, with
                      the student's own sentence and a before/after.
     2. Also worth a look — the rest, one tap away.
     3. What's working — so feedback isn't only a list of faults.
     4. Words to look at — plainer swaps for words a reader may trip on.
     5. The numbers — the craft dials, folded away for those who want them.

   Body text is 14px and nothing is smaller than 12px.
   ────────────────────────────────────────────────────────────────────── */

const TOP_N = 3;

const STATUS_WORD: Record<string, string> = { good: 'Strong', warn: 'Could be stronger', bad: 'Needs work' };

function Suggestion({ s, defaultOpen }: { s: CraftSuggestion; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="rounded-xl border-[1.5px] border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-slate-500">
            {craftCategoryLabel(s.category)}
            {s.learned && <span title="Learned from essays our tutors reviewed"> · from tutor-reviewed essays</span>}
          </span>
          <span className="block mt-0.5 text-[15px] font-semibold text-primary leading-snug">{s.title}</span>
        </span>
        <svg className={`w-4 h-4 mt-1 text-slate-500 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          <p className="text-sm text-slate-700 leading-relaxed">{s.detail}</p>
          {s.excerpt && (
            <blockquote className="student-page text-sm text-slate-700 border-l-[3px] border-slate-300 pl-3 leading-relaxed">
              &ldquo;{s.excerpt}&rdquo;
            </blockquote>
          )}
          {s.example && (
            <div className="rounded-lg bg-paper border border-slate-200 p-3 space-y-2 text-sm leading-relaxed">
              <p><span className="block text-xs font-semibold text-slate-500">Instead of</span><span className="text-slate-600">{s.example.before}</span></p>
              <p><span className="block text-xs font-semibold text-slate-500">Try</span><span className="text-primary font-medium">{s.example.after}</span></p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function CraftStudio({ report }: { report: CraftReport }) {
  const [showMore, setShowMore] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  if (!report.ready) {
    const pct = Math.min(100, Math.round((report.wordCount / 40) * 100));
    return (
      <section className="bg-white rounded-2xl border p-4">
        <h3 className="text-base font-bold text-primary">Writing feedback</h3>
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          Write about 40 words and your feedback appears here: the few changes most worth making, with an example of each.
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={report.wordCount} aria-valuemin={0} aria-valuemax={40} aria-label="Words written toward feedback">
          <div className="h-full bg-ink rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-600">{report.wordCount} of 40 words</p>
      </section>
    );
  }

  const fixes = report.suggestions
    .filter((s) => s.severity !== 'praise')
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'caution' ? -1 : 1));
  const praise = report.suggestions.filter((s) => s.severity === 'praise');
  const top = fixes.slice(0, TOP_N);
  const rest = fixes.slice(TOP_N);
  const flags = report.vocab?.ready ? report.vocab.flags : [];

  return (
    <section className="bg-white rounded-2xl border p-4 space-y-5" aria-label="Writing feedback">
      {/* 1. Start here */}
      <div>
        <h3 className="text-base font-bold text-primary">{top.length ? 'Start here' : 'Writing feedback'}</h3>
        {top.length ? (
          <>
            <p className="mt-0.5 text-sm text-slate-600">The {top.length === 1 ? 'change' : `${top.length} changes`} most worth making in this draft.</p>
            <ol className="mt-3 space-y-2">
              {top.map((s, i) => <Suggestion key={s.id} s={s} defaultOpen={i === 0} />)}
            </ol>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-700 leading-relaxed">
            Nothing stands out to fix. The rhythm, tone and clarity all read well; now it&apos;s worth a second pair of human eyes.
          </p>
        )}
        {rest.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="text-sm font-semibold underline underline-offset-4 decoration-[1.5px]">
              {showMore ? 'Show fewer' : `Also worth a look (${rest.length})`}
            </button>
            {showMore && (
              <ul className="mt-2 space-y-2">
                {rest.map((s) => <Suggestion key={s.id} s={s} defaultOpen={false} />)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 2. What's working */}
      {praise.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-primary">What&apos;s working</h4>
          <ul className="mt-1.5 space-y-1.5">
            {praise.map((s) => (
              <li key={s.id} className="flex gap-2 text-sm text-slate-700 leading-snug">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                <span><span className="font-semibold text-primary">{s.title}.</span> {s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Words to look at. Every word here comes from a curated list,
            never "absent from our dictionary", so a student is only shown
            a word somebody meant to flag. */}
      {flags.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-primary">Words to look at <span className="font-normal text-slate-600">({flags.length})</span></h4>
          <p className="mt-0.5 text-sm text-slate-600 leading-snug">A busy reader may slow down on these. Keep one only if it&apos;s the most exact word you have.</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <li key={f.word} className="inline-flex items-baseline whitespace-nowrap rounded-lg border-[1.5px] border-slate-200 bg-white px-2 py-1 text-sm">
                <span className="text-slate-700">{f.word}</span>
                {f.simpler && (
                  <>
                    <span className="mx-1.5 text-slate-400" aria-hidden>→</span>
                    <span className="sr-only">plainer: </span>
                    <span className="font-semibold text-primary">{f.simpler}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. The numbers, for those who want them */}
      <div className="pt-1 border-t border-dashed border-slate-200">
        <button type="button" onClick={() => setShowNumbers((v) => !v)} aria-expanded={showNumbers} className="mt-2 text-sm font-semibold underline underline-offset-4 decoration-[1.5px]">
          {showNumbers ? 'Hide the craft scores' : 'See the craft scores'}
        </button>
        {showNumbers && (
          <dl className="mt-3 space-y-3">
            {report.metrics.map((m) => (
              <div key={m.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-sm font-semibold text-primary">{m.label}</dt>
                  <dd className="text-sm text-slate-700"><span className="font-bold text-primary tabular-nums">{m.value}</span> · {STATUS_WORD[m.status]}</dd>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full bg-ink" style={{ width: `${m.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-snug">{m.hint}</p>
              </div>
            ))}
            {report.readingGrade > 0 && (
              <p className="text-xs text-slate-600">Reads at about a grade {Math.round(report.readingGrade)} level.</p>
            )}
          </dl>
        )}
      </div>

      <p className="text-xs text-slate-600">This is guidance, not a grade. A tutor&apos;s read is the best second opinion.</p>
    </section>
  );
}

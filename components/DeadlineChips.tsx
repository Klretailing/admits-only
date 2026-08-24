import { orderedRounds, verifyUrl, type Deadlines } from '../lib/deadlines';

/* ══════════════════════════════════════════════════════════════════════
   APPLICATION DEADLINES — shared display

   Two densities so every surface shows the same rounds the same way:
     compact  a wrapping row of chips, for list rows and search results
     full     labelled rows with the binding warning, for modals and panels

   LAYOUT CONTRACT (the whole reason this is one component):
     • the root is `min-w-0` — without it a flex child defaults to
       min-width:auto and pushes its card wider than the viewport
     • chips live in `flex-wrap`, so they run onto a new line rather than
       overflowing, at any width down to 320px
     • each chip is `whitespace-nowrap` and short ("ED · Nov 1") so the
       label and date never split across lines mid-token
     • nothing is absolutely positioned, so nothing can overlap a sibling
   ══════════════════════════════════════════════════════════════════════ */

const ROUND_STYLE: Record<string, string> = {
  // Binding rounds are amber so a student's eye catches the commitment.
  rea: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  ed:  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  ed2: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  ea:  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25',
  rd:  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/25',
};

const SHORT: Record<string, string> = { rea: 'REA', ed: 'ED', ed2: 'ED II', ea: 'EA', rd: 'RD' };
const LABEL: Record<string, string> = {
  rea: 'Restrictive Early Action',
  ed: 'Early Decision',
  ed2: 'Early Decision II',
  ea: 'Early Action',
  rd: 'Regular Decision',
};
const BINDING = new Set(['ed', 'ed2']);

interface Props {
  deadlines: Deadlines | null;
  collegeName: string;
  variant?: 'compact' | 'full';
  className?: string;
}

export default function DeadlineChips({ deadlines, collegeName, variant = 'compact', className = '' }: Props) {
  if (!deadlines) return null;
  const rounds = orderedRounds(deadlines);
  const hasRolling = deadlines.rolling;
  if (rounds.length === 0 && !hasRolling) return null;

  const anyBinding = rounds.some(r => BINDING.has(r.key));

  if (variant === 'compact') {
    return (
      <div className={`min-w-0 flex flex-wrap items-center gap-1.5 ${className}`}>
        {rounds.map(r => (
          <span
            key={r.key}
            title={`${LABEL[r.key]} — typically ${r.date}`}
            className={`inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${ROUND_STYLE[r.key]}`}
          >
            {SHORT[r.key]}
            <span className="mx-1 opacity-50">·</span>
            {r.date}
          </span>
        ))}
        {hasRolling && (
          <span className="inline-flex items-center whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            Rolling
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <ul className="space-y-1.5">
        {rounds.map(r => (
          <li key={r.key} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex items-baseline gap-1.5">
              <span className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${ROUND_STYLE[r.key]}`}>
                {SHORT[r.key]}
              </span>
              <span className="truncate text-xs text-slate-600 dark:text-slate-300">{LABEL[r.key]}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary">{r.date}</span>
          </li>
        ))}
        {hasRolling && (
          <li className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-slate-600 dark:text-slate-300">Rolling admission</span>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary">
              {deadlines.priority ? `Priority ${deadlines.priority}` : 'Reviewed as received'}
            </span>
          </li>
        )}
        {!hasRolling && deadlines.priority && (
          <li className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-slate-600 dark:text-slate-300">Priority / aid</span>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary">{deadlines.priority}</span>
          </li>
        )}
      </ul>

      {anyBinding && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          ED is binding — if you are admitted you must enrol and withdraw your other applications.
        </p>
      )}

      {/* Never let a student treat these as confirmed. Deadlines shift every
          cycle and a missed one cannot be undone. */}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Typical dates for recent cycles.{' '}
        <a
          href={verifyUrl(collegeName)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:underline"
        >
          Confirm with {collegeName}
        </a>
      </p>
    </div>
  );
}

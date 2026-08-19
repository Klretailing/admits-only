import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* ──────────────────────────────────────────────────────────────────────
   PROGRESS SUMMARY — the student's "how far am I" block.

   Design brief: motivating, but not gamified. That rules out points, levels,
   badges, confetti, and loss-aversion streaks ("don't break your streak!"),
   all of which read as a toy bolted onto serious work.

   What's here instead:
     • ONE honest progress bar measuring real application tasks — the thing
       students actually care about — with the raw counts spelled out.
     • A quiet seven-day activity strip. Consistency shown as fact, not as a
       reward to protect: no flame, no counter to defend, and it never scolds
       you for a gap.
     • One concrete next action, so the block tells you what to do rather
       than only how you're doing.

   Deliberately replaces the earlier ring + mini-bar + emoji cluster: three
   meters competing in one card is noise, and noise reads as gimmick.
   ────────────────────────────────────────────────────────────────────── */

interface ChecklistItem { id: string; label: string; complete: boolean; href: string }
interface AppTask { id: string; label: string; done: boolean }
interface StoredApp { id?: string; name: string; deadline?: string; status?: string; tasks?: AppTask[] }

const DONE_STATUSES = new Set(['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred']);
const ACTIVE_DAYS_KEY = 'ao_active_days';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The last 7 day-keys, oldest first, with a one-letter label. */
function lastSevenDays(): { key: string; letter: string; isToday: boolean }[] {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = dayKey(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, letter: letters[d.getDay()], isToday: key === today };
  });
}

function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const t = new Date(deadline + 'T23:59:59').getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

export default function ProgressSummary({ checklist }: { checklist?: ChecklistItem[] }) {
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [activeDays, setActiveDays] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/applications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.applications)) setApps(d.applications); })
      .catch(() => {});
  }, []);

  // Record today as an active day, then read the recent window back.
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(ACTIVE_DAYS_KEY) || '[]');
      const days: string[] = Array.isArray(raw) ? raw : [];
      const today = dayKey(new Date());
      if (!days.includes(today)) days.push(today);
      // Keep a rolling ~30 days so this never grows unbounded.
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const trimmed = days.filter((d) => d >= dayKey(cutoff)).sort();
      localStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(trimmed));
      setActiveDays(trimmed);
    } catch { /* private mode — the strip simply stays empty */ }
  }, []);

  /* ─ real task progress across every tracked application ─ */
  const progress = useMemo(() => {
    let total = 0, done = 0, schools = 0;
    for (const app of apps) {
      const tasks = app.tasks || [];
      if (tasks.length === 0) continue;
      schools++;
      const closed = app.status ? DONE_STATUSES.has(app.status) : false;
      for (const t of tasks) { total++; if (closed || t.done) done++; }
    }
    return { total, done, schools, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [apps]);

  /* ─ before any schools are tracked, measure setup instead ─ */
  const setup = useMemo(() => {
    if (!checklist || checklist.length === 0) return null;
    const done = checklist.filter((c) => c.complete).length;
    return { done, total: checklist.length, pct: Math.round((done / checklist.length) * 100) };
  }, [checklist]);

  const usingSetup = progress.total === 0;
  const pct = usingSetup ? (setup?.pct ?? 0) : progress.pct;
  const heading = usingSetup ? 'Getting set up' : 'Application progress';
  const detail = usingSetup
    ? setup ? `${setup.done} of ${setup.total} setup steps complete` : 'Add your first school to start tracking'
    : `${progress.done} of ${progress.total} tasks complete across ${progress.schools} school${progress.schools === 1 ? '' : 's'}`;

  /* ─ the single most useful next action ─ */
  const nextUp = useMemo(() => {
    const open: { label: string; sub: string; days: number | null; href: string }[] = [];
    for (const app of apps) {
      if (app.status && DONE_STATUSES.has(app.status)) continue;
      const d = daysUntil(app.deadline);
      for (const t of app.tasks || []) {
        if (t.done || !t.label) continue;
        open.push({ label: t.label, sub: app.name, days: d, href: '/dashboard/progress' });
      }
    }
    if (open.length) {
      // Soonest genuine deadline first; treat undated work as furthest out.
      open.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
      return open[0];
    }
    const gap = (checklist || []).find((c) => !c.complete);
    return gap ? { label: gap.label, sub: 'Setup', days: null, href: gap.href } : null;
  }, [apps, checklist]);

  const week = lastSevenDays();
  const activeCount = week.filter((d) => activeDays.includes(d.key)).length;

  const barTone = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-accent' : 'bg-amber-500';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 surface p-5 lg:p-6">
      {/* headline number + bar */}
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-500">{heading}</h3>
          <p className="mt-1 text-3xl font-bold font-display text-primary tabular-nums leading-none">{pct}%</p>
        </div>
        <p className="text-xs text-slate-500 text-right max-w-[16rem]">{detail}</p>
      </div>

      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${heading}: ${pct} percent`}
      >
        <div
          className={`h-full rounded-full ${barTone} transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>

      {/* next action + quiet consistency strip */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-start justify-between gap-5 flex-wrap">
        {nextUp ? (
          <Link href={nextUp.href} className="group min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next up</p>
            <p className="mt-1 text-sm font-medium text-primary truncate group-hover:text-accent transition-colors">
              {nextUp.label}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {nextUp.sub}
              {nextUp.days !== null && nextUp.days >= 0 && (
                <span className={nextUp.days <= 7 ? ' text-amber-700 font-medium' : ''}>
                  {' · '}{nextUp.days === 0 ? 'due today' : `${nextUp.days} day${nextUp.days === 1 ? '' : 's'} left`}
                </span>
              )}
              {/* Overdue is stated plainly, once, without alarm styling —
                  a wall of red "overdue" reads as failure, not motivation. */}
              {nextUp.days !== null && nextUp.days < 0 && <span className="text-slate-400">{' · past due'}</span>}
            </p>
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next up</p>
            <p className="mt-1 text-sm font-medium text-emerald-700">Nothing outstanding — you&apos;re all caught up.</p>
          </div>
        )}

        <div className="flex-shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Active {activeCount} of 7 days
          </p>
          <div className="flex items-end gap-1">
            {week.map((d, i) => {
              const on = activeDays.includes(d.key);
              return (
                <div key={d.key} className="flex flex-col items-center gap-1" title={d.key}>
                  <span
                    className={`w-3.5 rounded-sm transition-all ${
                      on ? 'bg-accent' : 'bg-slate-200'
                    } ${d.isToday ? 'h-5' : 'h-3.5'}`}
                  />
                  <span className={`text-[9px] leading-none ${d.isToday ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                    {d.letter}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* "Daily Progress" — the student dashboard's daily hub.
   Combines two things students asked for:
     1. A GAUGE of collective progress — how many of all their application
        tasks are done across every school they track (the "judge").
     2. A short list of the 1–3 highest-leverage small wins to knock out
        TODAY (nearest deadline first), with a streak to build the habit.
   Checking a daily item is a per-day motivational marker (localStorage); the
   → link takes the student to where the real work happens. */

interface ChecklistItem { id: string; label: string; complete: boolean; href: string }
interface AppTask { id: string; label: string; done: boolean }
interface StoredApp { id?: string; name: string; deadline?: string; status?: string; tasks?: AppTask[] }

interface FocusItem { key: string; label: string; sub?: string; href: string; days: number | null }

const DONE_STATUSES = new Set(['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred']);

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const t = new Date(deadline + 'T23:59:59').getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

export default function TodaysFocus({ checklist }: { checklist?: ChecklistItem[] }) {
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);

  // Pull applications from the server (source of truth), so it works immediately.
  useEffect(() => {
    fetch('/api/applications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.applications)) setApps(d.applications); })
      .catch(() => {});
  }, []);

  // Load today's completions + current streak.
  useEffect(() => {
    try {
      const done = JSON.parse(localStorage.getItem('ao_focus_done_' + todayStr()) || '[]');
      setDoneToday(new Set(Array.isArray(done) ? done : []));
      const s = JSON.parse(localStorage.getItem('ao_focus_streak') || 'null');
      if (s && typeof s.count === 'number' && (s.lastDate === todayStr() || s.lastDate === yesterdayStr())) {
        setStreak(s.count);
      } else {
        setStreak(0);
      }
    } catch { /* ignore */ }
  }, []);

  // Collective task gauge across every tracked application. A submitted (or
  // otherwise closed) app counts all its tasks as done.
  const gauge = useMemo(() => {
    let total = 0, done = 0, appCount = 0;
    for (const app of apps) {
      const tasks = app.tasks || [];
      if (tasks.length === 0) continue;
      appCount++;
      const closed = app.status ? DONE_STATUSES.has(app.status) : false;
      for (const t of tasks) {
        total++;
        if (closed || t.done) done++;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct, appCount, remaining: total - done };
  }, [apps]);

  const items: FocusItem[] = useMemo(() => {
    const out: FocusItem[] = [];
    // 1. Urgent, incomplete application tasks (nearest deadline first).
    const candidates: FocusItem[] = [];
    for (const app of apps) {
      if (app.status && DONE_STATUSES.has(app.status)) continue;
      const d = daysUntil(app.deadline);
      for (const t of app.tasks || []) {
        if (t.done || !t.label) continue;
        candidates.push({ key: `app:${app.id || app.name}:${t.id}`, label: t.label, sub: app.name, href: '/dashboard/progress', days: d });
      }
    }
    candidates.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
    out.push(...candidates.slice(0, 3));

    // 2. Fill remaining slots with setup gaps from the readiness checklist.
    if (out.length < 3 && checklist) {
      for (const c of checklist) {
        if (out.length >= 3) break;
        if (!c.complete) out.push({ key: `chk:${c.id}`, label: c.label, href: c.href, days: null });
      }
    }
    return out.slice(0, 3);
  }, [apps, checklist]);

  function toggle(key: string) {
    setDoneToday((prev) => {
      const next = new Set(prev);
      const wasEmpty = next.size === 0;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem('ao_focus_done_' + todayStr(), JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      if (wasEmpty && next.size > 0) bumpStreak();
      return next;
    });
  }

  function bumpStreak() {
    try {
      const s = JSON.parse(localStorage.getItem('ao_focus_streak') || 'null');
      let count = 1;
      if (s && typeof s.count === 'number') {
        if (s.lastDate === todayStr()) count = s.count;
        else if (s.lastDate === yesterdayStr()) count = s.count + 1;
      }
      localStorage.setItem('ao_focus_streak', JSON.stringify({ count, lastDate: todayStr() }));
      setStreak(count);
    } catch { /* ignore */ }
  }

  const doneCount = items.filter((it) => doneToday.has(it.key)).length;
  const allDone = items.length > 0 && doneCount === items.length;

  // Gauge ring geometry
  const R = 26, C = 2 * Math.PI * R;
  const ringColor = gauge.pct >= 80 ? '#10b981' : gauge.pct >= 40 ? '#6366f1' : '#f59e0b';

  return (
    <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-purple-500/[0.05] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-base font-bold font-display text-primary">Daily Progress</h3>
        </div>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1" title="Days in a row you've made progress">
            🔥 {streak}-day streak
          </span>
        )}
      </div>

      {/* Collective task gauge */}
      {gauge.total > 0 && (
        <div className="flex items-center gap-4 bg-white/70 rounded-xl border border-white p-3.5 mb-4">
          <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx={32} cy={32} r={R} fill="none" stroke="#e2e8f0" strokeWidth={6} />
              <circle
                cx={32} cy={32} r={R} fill="none" stroke={ringColor} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C - (gauge.pct / 100) * C}
                transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary tabular-nums">{gauge.pct}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              {gauge.done} of {gauge.total} tasks done
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              across {gauge.appCount} application{gauge.appCount !== 1 ? 's' : ''}
              {gauge.remaining > 0 ? ` · ${gauge.remaining} to go` : ' · all clear! 🎉'}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 mb-3 font-medium">
        {items.length === 0
          ? 'You’re all caught up — nice work.'
          : allDone
          ? 'Today’s wins complete — see you tomorrow. 🎉'
          : 'Knock out a few small wins today:'}
      </p>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Nothing urgent today. Keep the streak alive tomorrow!
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((it) => {
              const done = doneToday.has(it.key);
              const urgent = it.days !== null && it.days <= 7;
              return (
                <div key={it.key} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                  <button
                    onClick={() => toggle(it.key)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                      done ? 'bg-accent border-accent text-white' : 'bg-white border-slate-300 hover:border-accent'
                    }`}
                    aria-label={done ? 'Mark not done' : 'Mark done for today'}
                  >
                    {done && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? 'text-slate-400 line-through' : 'text-primary'}`}>{it.label}</p>
                    {(it.sub || it.days !== null) && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {it.sub}
                        {it.sub && it.days !== null ? ' · ' : ''}
                        {it.days !== null && (
                          <span className={urgent ? 'text-rose-500 font-semibold' : ''}>
                            {it.days < 0 ? `${Math.abs(it.days)}d overdue` : it.days === 0 ? 'due today' : `${it.days}d left`}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Link href={it.href} className="text-xs font-semibold text-accent hover:underline flex-shrink-0" aria-label="Go">→</Link>
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">{doneCount}/{items.length} today</span>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* "Today's Focus" — a small daily nudge on the student dashboard.
   Surfaces the 1–3 highest-leverage things to do today (nearest-deadline
   application tasks first, then setup gaps), framed as a daily goal with a
   streak. Checking an item is a per-day motivational marker (localStorage);
   the → link takes the student to where the real work happens. */

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
      // First completion of the day lights/extends the streak.
      if (wasEmpty && next.size > 0) bumpStreak();
      return next;
    });
  }

  function bumpStreak() {
    try {
      const s = JSON.parse(localStorage.getItem('ao_focus_streak') || 'null');
      let count = 1;
      if (s && typeof s.count === 'number') {
        if (s.lastDate === todayStr()) count = s.count;          // already counted today
        else if (s.lastDate === yesterdayStr()) count = s.count + 1; // consecutive day
      }
      localStorage.setItem('ao_focus_streak', JSON.stringify({ count, lastDate: todayStr() }));
      setStreak(count);
    } catch { /* ignore */ }
  }

  const doneCount = items.filter((it) => doneToday.has(it.key)).length;
  const allDone = items.length > 0 && doneCount === items.length;

  return (
    <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-purple-500/[0.05] p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-base font-bold font-display text-primary">Today&apos;s Focus</h3>
        </div>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1" title="Days in a row you've made progress">
            🔥 {streak}-day streak
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {items.length === 0
          ? 'You’re all caught up — nice work.'
          : allDone
          ? 'Daily goal complete — see you tomorrow. 🎉'
          : 'Small steps every day add up. Knock out today’s goal:'}
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
            <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">{doneCount}/{items.length} done today</span>
          </div>
        </>
      )}
    </div>
  );
}

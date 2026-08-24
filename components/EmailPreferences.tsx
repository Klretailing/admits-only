import { useEffect, useState } from 'react';

/* Student-facing control over the three emails. Every one is on by default
   and every one can be turned off here or from the link in any email. */

interface Prefs { essayFeedback: boolean; deadlineReminders: boolean; weeklyDigest: boolean }

const ROWS: { key: keyof Prefs; label: string; detail: string }[] = [
  { key: 'essayFeedback', label: 'Essay feedback', detail: 'When your tutor finishes reading a draft and leaves notes.' },
  { key: 'deadlineReminders', label: 'Deadline reminders', detail: 'A heads-up at 7, 3, and 1 day before an application is due. Once each, never repeated.' },
  { key: 'weeklyDigest', label: 'Weekly catch-up', detail: 'A short Sunday summary — only sent when something actually happened.' },
];

export default function EmailPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/email-preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.prefs) setPrefs(d.prefs); })
      .catch(() => {});
  }, []);

  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setSaving(key);
    try {
      await fetch('/api/email-preferences', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      });
    } catch { setPrefs(prefs); }
    setSaving(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 surface p-5 lg:p-6">
      <h3 className="text-sm font-bold text-primary">Email</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-xl">
        We keep email rare and useful. Turn anything off here — it takes effect immediately.
      </p>
      <div className="mt-4 divide-y divide-slate-100">
        {ROWS.map(r => {
          const on = prefs ? prefs[r.key] : true;
          return (
            <div key={r.key} className="flex items-start justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">{r.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.detail}</p>
              </div>
              <button
                role="switch"
                aria-checked={on}
                aria-label={`${r.label}: ${on ? 'on' : 'off'}`}
                disabled={!prefs || saving === r.key}
                onClick={() => toggle(r.key)}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

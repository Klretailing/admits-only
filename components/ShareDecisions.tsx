import { useMemo, useState } from 'react';

/* ──────────────────────────────────────────────────────────────────────
   SHARE DECISIONS → #CollegeDecisions

   Turns something a student already does — marking a result in their own
   tracker — into a post other students can read. That single-player-to-
   multiplayer conversion is the point: a channel with no upstream action
   feeding it goes quiet, and this gives #CollegeDecisions a steady supply
   of the exact content it exists for.

   Two deliberate constraints:
     • Nothing posts automatically. The student picks each school, every
       time, and sees the exact text before it goes anywhere.
     • Every outcome can be shared, not just acceptances. A feed of nothing
       but wins is miserable for the student who just got deferred, and it
       misrepresents what an application season actually looks like.
   ────────────────────────────────────────────────────────────────────── */

type DecisionStatus = 'accepted' | 'rejected' | 'waitlisted' | 'deferred';

interface DecidedApp {
  id: string;
  name: string;
  status: string;
  type: string;
}

const DECISION_LABEL: Record<DecisionStatus, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  deferred: 'Deferred',
};

const DECISION_STYLE: Record<DecisionStatus, string> = {
  accepted: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  rejected: 'text-slate-600 bg-slate-100 border-slate-200',
  waitlisted: 'text-amber-700 bg-amber-50 border-amber-200',
  deferred: 'text-blue-700 bg-blue-50 border-blue-200',
};

function isDecision(s: string): s is DecisionStatus {
  return s === 'accepted' || s === 'rejected' || s === 'waitlisted' || s === 'deferred';
}

export default function ShareDecisions({ apps }: { apps: DecidedApp[] }) {
  const decided = useMemo(() => apps.filter(a => isDecision(a.status)), [apps]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (decided.length === 0) return null;

  function toggle(id: string) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const chosen = decided.filter(a => picked.has(a.id));

  /** The exact text that will be posted — shown to the student before sending. */
  const preview = useMemo(() => {
    if (chosen.length === 0) return '';
    const lines = chosen.map(a => `${DECISION_LABEL[a.status as DecisionStatus]} — ${a.name}${a.type ? ` (${a.type})` : ''}`);
    return [note.trim(), ...lines].filter(Boolean).join('\n');
  }, [chosen, note]);

  async function share() {
    if (chosen.length === 0 || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          podId: 'community_college-decisions',
          content: preview,
          type: 'discussion',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not share');
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setPicked(new Set()); setNote(''); }, 1600);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 text-sm font-semibold text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all"
      >
        Share results
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-backdrop" onClick={() => !busy && setOpen(false)} />
          <div className="relative modal-card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold font-display text-primary">Share to #CollegeDecisions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick which results you want to post. Nothing is shared until you choose it.
            </p>

            <div className="mt-4 space-y-2">
              {decided.map(a => {
                const st = a.status as DecisionStatus;
                const on = picked.has(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      on ? 'border-accent bg-accent/[0.06]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(a.id)}
                      className="w-4 h-4 rounded accent-accent flex-shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-sm font-medium text-primary truncate">{a.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${DECISION_STYLE[st]}`}>
                      {DECISION_LABEL[st]}
                    </span>
                  </label>
                );
              })}
            </div>

            <label className="block mt-4">
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Add a note (optional)</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 400))}
                rows={2}
                placeholder="How are you feeling about it? Deciding between any of these?"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </label>

            {preview && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">This is exactly what will be posted</p>
                <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed font-sans">
                  {preview}
                </pre>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
            {done && <p className="mt-3 text-xs text-emerald-700 font-medium">Shared to #CollegeDecisions.</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={share}
                disabled={chosen.length === 0 || busy || done}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Sharing…' : done ? 'Shared' : `Share ${chosen.length || ''}`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, type FormEvent } from 'react';

/* Current + new password, posted to /api/auth/change-password. */
export default function ChangePasswordForm({ minLength = 8 }: { minLength?: number }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'done' | 'error'; message?: string }>({ kind: 'idle' });

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= minLength && next === confirm && state.kind !== 'saving';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: 'saving' });
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change your password.');
      setCurrent(''); setNext(''); setConfirm('');
      setState({ kind: 'done', message: 'Password changed.' });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  }

  const input = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent';
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="pw-current" className="block text-sm font-medium text-primary mb-1.5">Current password</label>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor="pw-new" className="block text-sm font-medium text-primary mb-1.5">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
        <p className="text-xs text-slate-500 mt-1">At least {minLength} characters.</p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="block text-sm font-medium text-primary mb-1.5">Confirm new password</label>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} aria-invalid={mismatch} />
        {mismatch && <p className="text-xs text-red-pencil mt-1">The two new passwords don&apos;t match.</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!canSubmit} className="btn-primary text-sm !py-2.5 !px-5 disabled:opacity-50 disabled:cursor-not-allowed">
          {state.kind === 'saving' ? 'Saving…' : 'Change password'}
        </button>
        {state.message && (
          <p role="status" className={`text-sm ${state.kind === 'error' ? 'text-red-pencil' : 'text-slate-700'}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}

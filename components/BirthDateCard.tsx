import { useEffect, useState, type FormEvent } from 'react';

/* For accounts created before sign-up asked for a date of birth. Until one
   is added, a student account gets the under-18 protections by default. */
export default function BirthDateCard() {
  const [state, setState] = useState<{ loaded: boolean; birthMonth: string | null }>({ loaded: false, birthMonth: null });
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/account/age')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState({ loaded: true, birthMonth: d?.birthMonth ?? null }))
      .catch(() => setState({ loaded: true, birthMonth: null }));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!dob || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/account/age', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateOfBirth: dob }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not save your date of birth.');
      setState({ loaded: true, birthMonth: d.birthMonth });
      setMessage({ kind: 'ok', text: 'Saved. Your account protections are set for your age.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
    setSaving(false);
  }

  if (!state.loaded || state.birthMonth) return message?.kind === 'ok' ? (
    <p role="status" className="text-sm text-slate-700">{message.text}</p>
  ) : null;

  return (
    <section className="bg-white rounded-2xl border p-5 lg:p-6">
      <h3 className="text-sm font-bold text-primary">Date of birth</h3>
      <p className="mt-1 text-sm text-slate-700 max-w-xl">
        Add your date of birth so we can set the right privacy protections for your account. We keep only the month and
        year. Until it&apos;s added, your account uses the protections for students under 18.
      </p>
      <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-primary mb-1">Date of birth</span>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            autoComplete="bday"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            required
          />
        </label>
        <button type="submit" disabled={!dob || saving} className="btn-primary text-sm !py-2 !px-4 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-sm ${message.kind === 'error' ? 'text-red-pencil' : 'text-slate-700'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

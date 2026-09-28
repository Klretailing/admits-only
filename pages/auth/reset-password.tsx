import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthShell, { inputClass } from '../../components/AuthShell';

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check the link up front, so an expired one is caught before any typing.
  useEffect(() => {
    if (!router.isReady) return;
    if (!token) { setValid(false); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json()).then(d => setValid(!!d.valid)).catch(() => setValid(false));
  }, [router.isReady, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Please use at least 8 characters.');
    if (password !== confirm) return setError("Those two passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) { router.replace('/auth/login?reset=true'); return; }
      if (data.expired) setValid(false);
      setError(data.error || 'Something went wrong. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Choose a new password | AdmitsOnly</title>
        {/* The token is in the URL; keep this page out of search indexes. */}
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <AuthShell
        title={valid === false ? 'This link has expired' : 'Choose a new password'}
        subtitle={valid === false ? 'Reset links work once and last 60 minutes' : 'Pick something you haven’t used here before'}
        footer={<Link href="/auth/login" className="text-accent font-semibold hover:underline">Back to sign in</Link>}
      >
        {valid === null && <p className="text-sm text-slate-500 text-center">Checking your link…</p>}

        {valid === false && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              It may have been used already, or a newer reset email replaced it. You can request a fresh one — it only takes a moment.
            </p>
            <Link href="/auth/forgot-password" className="btn-primary w-full text-base inline-flex justify-center">Send a new link</Link>
          </div>
        )}

        {valid === true && (
          <form onSubmit={submit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="rp-new" className="text-sm font-semibold text-primary">New password</label>
                <button type="button" onClick={() => setShow(s => !s)} className="text-xs font-semibold text-accent hover:underline">
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
              <input id="rp-new" type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputClass}
                placeholder="Minimum 8 characters" required minLength={8} autoFocus />
            </div>
            <div>
              <label htmlFor="rp-confirm" className="block mb-2 text-sm font-semibold text-primary">Confirm new password</label>
              <input id="rp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} className={inputClass}
                placeholder="Type it again" required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </AuthShell>
    </>
  );
}

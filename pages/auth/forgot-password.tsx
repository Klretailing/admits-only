import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthShell, { inputClass } from '../../components/AuthShell';

export default function ForgotPassword() {
  const router = useRouter();
  // Carry over whatever they typed on the sign-in page, so they don't retype it.
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (router.isReady && typeof router.query.email === 'string') setEmail(router.query.email);
  }, [router.isReady, router.query.email]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Something went wrong. Please try again.');
      else setSent(data.message);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Reset your password | AdmitsOnly</title></Head>
      <AuthShell
        title={sent ? 'Check your email' : 'Forgot your password?'}
        subtitle={sent ? 'We sent instructions if the account exists' : "Enter your email and we'll send you a reset link"}
        footer={<>Remembered it?{' '}<Link href="/auth/login" className="text-accent font-semibold hover:underline">Back to sign in</Link></>}
      >
        {sent ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">{sent}</div>
            <p className="text-sm text-slate-500 leading-relaxed">
              The link expires in 60 minutes. Nothing there? Check your spam or promotions folder, or{' '}
              <button type="button" onClick={() => setSent(null)} className="text-accent font-semibold hover:underline">try again</button>.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}
            <div>
              <label htmlFor="fp-email" className="block mb-2 text-sm font-semibold text-primary">Email</label>
              <input id="fp-email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={inputClass}
                placeholder="you@example.com" required autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </AuthShell>
    </>
  );
}

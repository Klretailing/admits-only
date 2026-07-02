import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as 'student' | 'parent' | 'educator' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [tutorName, setTutorName] = useState('');

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  // Read invite/email from the query and prefill for an invited student
  useEffect(() => {
    if (!router.isReady) return;
    const invite = typeof router.query.invite === 'string' ? router.query.invite : '';
    const email = typeof router.query.email === 'string' ? router.query.email : '';
    if (invite) {
      setInviteToken(invite);
      setForm((prev) => ({ ...prev, role: 'student', email: email || prev.email }));
      fetch(`/api/join/${invite}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => { if (data?.tutorName) setTutorName(data.tutorName); })
        .catch(() => {});
    }
  }, [router.isReady, router.query.invite, router.query.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteToken ? { ...form, inviteToken } : form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/auth/login?registered=true');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account | AdmitsOnly</title>
      </Head>

      <div className="min-h-[80vh] flex items-center justify-center bg-surface bg-grid py-16">
        <div className="w-full max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
                  <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <line x1="20" y1="9" x2="20" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="20" cy="19.5" r="1.2" fill="white" />
                </svg>
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-primary">
                Admits<span className="gradient-text">Only</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold font-display text-primary">Create your account</h1>
            <p className="mt-2 text-slate-500">Join 500+ families on their admissions journey</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
            {inviteToken && (
              <div className="mb-5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium">
                {tutorName
                  ? `You're joining ${tutorName}'s student roster`
                  : "You're joining your tutor's student roster"}
              </div>
            )}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">I am a</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'student' as const, label: 'Student', icon: (
                      <svg className="w-5 h-5 mb-1.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )},
                    { value: 'parent' as const, label: 'Parent', icon: (
                      <svg className="w-5 h-5 mb-1.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )},
                    { value: 'educator' as const, label: 'Educator', icon: (
                      <svg className="w-5 h-5 mb-1.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2L2 9l10 7 10-7-10-7zM2 17l10 7 10-7M2 12l10 7 10-7" />
                      </svg>
                    )},
                  ]).map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => update('role', role.value)}
                      className={`p-3.5 rounded-xl border text-sm font-semibold transition-all text-center ${
                        form.role === role.value
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {role.icon}
                      {role.label}
                    </button>
                  ))}
                </div>
                {form.role === 'educator' && (
                  <p className="mt-2 text-xs text-slate-400">
                    Set up your coaching business — manage students, sessions, and earnings.
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

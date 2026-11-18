import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { safeNext } from '../../lib/authHint';
import Head from 'next/head';
import Link from 'next/link';
import LogoMark from '../../components/LogoMark';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', dateOfBirth: '', role: 'student' as 'student' | 'parent' | 'educator' });
  // Neutral age screen: an under-13 attempt shows a kind message (nothing is
  // stored on our side), and this browser keeps showing it for a day so the
  // form can't simply be retried with a different birthday.
  const [ageBlocked, setAgeBlocked] = useState(false);
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem('ao_age_gate') || 0);
      if (t && Date.now() - t < 24 * 60 * 60 * 1000) setAgeBlocked(true);
    } catch { /* storage unavailable */ }
  }, []);
  const todayIso = new Date().toISOString().slice(0, 10);
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
    } else {
      // "Create a parent account" / "Create a tutor account" links preselect
      // the role, so a parent doesn't land on a form that says Student.
      const role = router.query.role;
      if (role === 'parent' || role === 'educator') setForm((prev) => ({ ...prev, role }));
    }
  }, [router.isReady, router.query.invite, router.query.email, router.query.role]);

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
        if (data.code === 'under_13') {
          try { localStorage.setItem('ao_age_gate', String(Date.now())); } catch { /* ignore */ }
          setAgeBlocked(true);
          setLoading(false);
          return;
        }
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      /* Sign them straight in. Making someone retype the credentials they
         entered seconds ago, at the highest-intent moment in the funnel, cost
         us a step for nothing. If auto sign-in fails for any reason, fall
         back to the old path so they are never stuck. */
      const signed = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (signed && !signed.error) {
        const role = data.user?.role || form.role;
        const next = role === 'student' ? safeNext(router.query.next) : null;
        router.push(next || (role === 'parent' ? '/parent' : role === 'educator' ? '/educator' : '/dashboard'));
        return;
      }
      const nextQ = safeNext(router.query.next);
      router.push('/auth/login?registered=true' + (nextQ ? `&next=${encodeURIComponent(nextQ)}` : ''));
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
              <div className="w-10 h-10 rounded-xl logo-tile flex items-center justify-center">
                <LogoMark size={20} />
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-primary">
                Admits<span className="gradient-text">Only</span>
              </span>
            </Link>
            {!ageBlocked && (
              <>
                <h1 className="text-2xl font-bold font-display text-primary">Create your account</h1>
                <p className="mt-2 text-slate-500">Start your notebook. Free, in any grade.</p>
              </>
            )}
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
              <div role="alert" className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {ageBlocked ? (
              <div role="status" className="py-4 text-center">
                <h2 className="text-lg font-bold text-primary">Thanks for your interest in AdmitsOnly</h2>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                  AdmitsOnly is for students 13 and older, so we can&apos;t create an account right now. We didn&apos;t save
                  anything you entered. When you&apos;re older, we&apos;d love to have you.
                </p>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  A parent or guardian can learn more on our <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy</Link> page.
                </p>
                <Link href="/" className="mt-5 inline-block btn-secondary text-sm">Back to the homepage</Link>
              </div>
            ) : (
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
                <label htmlFor="reg-name" className="block mb-2 text-sm font-semibold text-primary">Full Name</label>
                <input
                  id="reg-name"
                  autoComplete="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block mb-2 text-sm font-semibold text-primary">Email</label>
                <input
                  id="reg-email"
                  autoComplete="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-dob" className="block mb-2 text-sm font-semibold text-primary">Date of birth</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update('dateOfBirth', e.target.value)}
                  max={todayIso}
                  min="1900-01-01"
                  autoComplete="bday"
                  aria-describedby="reg-dob-hint"
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  required
                />
                <p id="reg-dob-hint" className="mt-1.5 text-xs text-slate-600">
                  We use this to set the right privacy protections for your account. We keep only the month and year.
                </p>
              </div>

              <div>
                <label htmlFor="reg-password" className="block mb-2 text-sm font-semibold text-primary">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                />
                <p className="mt-1.5 text-xs text-slate-600">A short phrase is easier to remember and harder to guess than a common word with numbers.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            )}
          </div>

          {!ageBlocked && (
          <>
          <p className="text-center text-xs text-slate-600 mt-4">By creating an account you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy</Link> notice.</p>
          <p className="text-center text-xs text-slate-600 mt-2">Under 18? Please read them with a parent or guardian before you sign up.</p>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href={safeNext(router.query.next) ? `/auth/login?next=${encodeURIComponent(safeNext(router.query.next)!)}` : '/auth/login'} className="text-accent font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </>
  );
}

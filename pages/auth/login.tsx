import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password. Please try again.');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | AdmitsOnly Dashboard</title>
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
            <h1 className="text-2xl font-bold font-display text-primary">Welcome back</h1>
            <p className="mt-2 text-slate-500">Sign in to access your student dashboard</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {router.query.registered === 'true' && (
              <div className="mb-5 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                Account created successfully! Sign in to continue.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-primary">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-accent font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

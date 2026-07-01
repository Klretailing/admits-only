import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

interface InviteInfo {
  tutorName: string;
  studentName: string;
  studentEmail: string;
}

export default function JoinInvite() {
  const router = useRouter();
  const { token } = router.query;
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!token || typeof token !== 'string') return;
    fetch(`/api/join/${token}`)
      .then(async r => {
        if (!r.ok) {
          setInvalid(true);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setInvalid(true);
        setLoading(false);
      });
  }, [token]);

  const registerHref = () => {
    const params = new URLSearchParams({ role: 'student', invite: String(token) });
    if (info?.studentEmail) params.set('email', info.studentEmail);
    return `/auth/register?${params.toString()}`;
  };

  return (
    <>
      <Head>
        <title>You&apos;re invited | AdmitsOnly</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.95" />
                <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">AdmitsOnly</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            {loading && !invalid && (
              <div className="flex items-center justify-center py-10">
                <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {invalid && (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-900 mb-1">This invite link is no longer valid</h1>
                <p className="text-sm text-slate-500 mb-6">The link may have expired or already been used. Ask your tutor for a fresh invite.</p>
                <Link href="/auth/login" className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                  Already have an account? Sign in
                </Link>
              </div>
            )}

            {info && !invalid && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-snug">
                  {info.tutorName} invited you to AdmitsOnly
                </h1>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Your tutor will see your essays and progress right here, and give you feedback along the way. Create your free account to get started.
                </p>

                <div className="mt-6 space-y-3">
                  <Link
                    href={registerHref()}
                    className="block w-full text-center py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Create my free account
                  </Link>
                  <Link
                    href="/auth/login"
                    className="block w-full text-center py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            AdmitsOnly helps students and tutors work together on college admissions.
          </p>
        </div>
      </div>
    </>
  );
}

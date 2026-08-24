import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import PageHeader from '../../components/PageHeader';
import EmailPreferences from '../../components/EmailPreferences';

interface Connection {
  id: string;
  studentId?: string;
  connectedUserId?: string;
  role: string;
  createdAt: string;
  studentName?: string;
  studentEmail?: string;
  connectedName?: string;
  connectedEmail?: string;
}

export default function StudentSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [myCode, setMyCode] = useState('');
  const [connectionsAsStudent, setConnectionsAsStudent] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch('/api/connection-code')
      .then(r => r.json())
      .then(data => {
        setMyCode(data.code || '');
        setConnectionsAsStudent(data.connectionsAsStudent || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await fetch('/api/connection-code', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      fetchData();
    } catch {}
    setRemoveConfirm(null);
  };

  if (status !== 'authenticated') return null;

  if (loading) {
    return (
      <DashboardLayout>
        <Head><title>Settings | AdmitsOnly Dashboard</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Settings | AdmitsOnly Dashboard</title></Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          subtitle="Manage your connection code and account."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>}
        />

        <EmailPreferences />

        {/* Your Connection Code */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Your Connection Code</h2>
              <p className="text-xs text-slate-400">Share this code with parents or tutors to connect</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 text-center">
              <p className="text-2xl font-mono font-bold text-primary tracking-[0.3em]">{myCode}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`px-5 py-4 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/10">
            <p className="text-xs text-slate-600">
              <span className="font-bold text-accent">How it works:</span> Share your connection code with a parent or tutor.
              They&apos;ll enter it in their settings to get read-only access to your application progress and essays.
            </p>
          </div>
        </div>

        {/* Connected People */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Connected People</h2>
              <p className="text-xs text-slate-400">Parents and tutors who can view your progress</p>
            </div>
          </div>

          {connectionsAsStudent.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-primary mb-1">No one connected yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Share your connection code above with a parent or tutor to give them read-only access to your progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectionsAsStudent.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      conn.role === 'parent'
                        ? 'bg-teal-500'
                        : 'bg-emerald-500'
                    }`}>
                      {(conn.connectedName || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{conn.connectedName}</p>
                      <p className="text-xs text-slate-400">
                        {conn.role === 'parent' ? 'Parent' : 'Tutor'} &middot; Connected {new Date(conn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {removeConfirm === conn.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Remove?</span>
                      <button
                        onClick={() => handleRemoveConnection(conn.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setRemoveConfirm(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemoveConfirm(conn.id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary">Account</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
              <p className="text-sm font-medium text-primary bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                {session?.user?.name || 'Student'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <p className="text-sm font-medium text-primary bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                {session?.user?.email || '—'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <p className="text-sm font-medium text-primary bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 capitalize">
                {(session?.user as any)?.role || 'student'}
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary">Privacy &amp; Sharing</h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <p className="text-sm font-semibold text-primary">Parents can see:</p>
              </div>
              <p className="text-xs text-slate-500 ml-4">Application progress, essay scores, college list, estimated costs, readiness status</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-semibold text-primary">Tutors can see:</p>
              </div>
              <p className="text-xs text-slate-500 ml-4">Application progress, essay content for review, session history</p>
            </div>
            <p className="text-xs text-slate-400 italic">Connected people have read-only access. They cannot edit your essays or profile.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

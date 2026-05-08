import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import ParentLayout from '../../components/ParentLayout';

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

export default function ParentSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [myCode, setMyCode] = useState('');
  const [connectionsAsStudent, setConnectionsAsStudent] = useState<Connection[]>([]);
  const [connectionsAsParent, setConnectionsAsParent] = useState<Connection[]>([]);
  const [enteredCode, setEnteredCode] = useState('');
  const [connectRole, setConnectRole] = useState<'parent' | 'tutor'>('parent');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(() => {
    fetch('/api/connection-code')
      .then(r => r.json())
      .then(data => {
        setMyCode(data.code || '');
        setConnectionsAsStudent(data.connectionsAsStudent || []);
        setConnectionsAsParent(data.connectionsAsParentOrTutor || []);
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

  const handleSubmitCode = async () => {
    if (!enteredCode.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/connection-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: enteredCode.trim(), role: connectRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Connected to ${data.studentName}!` });
        setEnteredCode('');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to connect' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
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
  };

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <Head><title>Settings | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <Head><title>Settings | AdmitsOnly Parent</title></Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account connections and sharing codes</p>
        </div>

        {/* Your Connection Code */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Your Connection Code</h2>
              <p className="text-xs text-slate-400">Share this code so others can connect to your account</p>
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
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">
              <span className="font-bold">How it works:</span> Students share their code with parents and tutors.
              Parents/tutors enter the student&apos;s code to get read-only access to their application progress.
            </p>
          </div>
        </div>

        {/* Connect to a Student */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Connect to a Student</h2>
              <p className="text-xs text-slate-400">Enter a student&apos;s code to view their application progress</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setConnectRole('parent')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  connectRole === 'parent'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-100 hover:border-slate-200'
                }`}
              >
                I&apos;m a Parent
              </button>
              <button
                onClick={() => setConnectRole('tutor')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  connectRole === 'tutor'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-100 hover:border-slate-200'
                }`}
              >
                I&apos;m a Tutor
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={enteredCode}
                onChange={e => setEnteredCode(e.target.value.toUpperCase())}
                placeholder="Enter student code (e.g. K7M2-9FPD)"
                maxLength={9}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
              <button
                onClick={handleSubmitCode}
                disabled={!enteredCode.trim() || submitting}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:opacity-90 transition-all disabled:opacity-40"
              >
                {submitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-lg font-bold text-primary mb-4">Active Connections</h2>

          {connectionsAsParent.length === 0 && connectionsAsStudent.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">No connections yet. Share your code or enter a student&apos;s code above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectionsAsParent.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-4 rounded-xl bg-teal-50/50 border border-teal-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                      {(conn.studentName || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{conn.studentName}</p>
                      <p className="text-xs text-slate-400">You are their {conn.role} &middot; Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveConnection(conn.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {connectionsAsStudent.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                      {(conn.connectedName || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{conn.connectedName}</p>
                      <p className="text-xs text-slate-400">{conn.role === 'parent' ? 'Parent' : 'Tutor'} &middot; Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveConnection(conn.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Access Permissions Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-lg font-bold text-primary mb-4">What Each Role Can See</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100">
              <h3 className="text-sm font-bold text-teal-700 mb-2">Parents Can See</h3>
              <ul className="space-y-1.5">
                {['Application progress & statuses', 'Deadline calendar', 'Task completion %', 'College list & stats', 'Acceptance/rejection decisions', 'Financial estimates'].map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
                {['Essay content', 'Personal notes', 'Study pod messages'].map((item, i) => (
                  <li key={`no-${i}`} className="text-xs text-slate-400 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
              <h3 className="text-sm font-bold text-purple-700 mb-2">Tutors Can See</h3>
              <ul className="space-y-1.5">
                {['Application progress & statuses', 'Essay titles & scores', 'College list & stats', 'Student profile (GPA, SAT)', 'Task completion %'].map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
                {['Financial information', 'Acceptance decisions', 'Personal notes'].map((item, i) => (
                  <li key={`no-${i}`} className="text-xs text-slate-400 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}

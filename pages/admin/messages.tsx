import Head from 'next/head';
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AdminMessages() {
  const { loading } = useAdminGuard();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    fetch('/api/admin/contacts')
      .then((r) => r.json())
      .then((d) => setSubmissions(d.submissions || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  function markRead(sub: Submission) {
    setSelected(sub);
    if (!sub.read) {
      fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, read: true }),
      }).then(() => {
        setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, read: true } : s)));
      });
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const unread = submissions.filter((s) => !s.read).length;

  return (
    <AdminLayout>
      <Head><title>Messages | Admin — AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Contact Messages</h1>
          <p className="mt-1 text-slate-500">
            {submissions.length} total{unread > 0 && <span className="text-accent font-semibold"> &middot; {unread} unread</span>}
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400">No messages yet. Contact form submissions will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            {/* Message list */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {submissions.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => markRead(sub)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected?.id === sub.id
                      ? 'bg-accent/5 border-accent/30'
                      : sub.read
                      ? 'bg-white border-slate-100 hover:border-slate-200'
                      : 'bg-white border-accent/20 hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!sub.read && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                      <p className={`text-sm ${sub.read ? 'font-medium text-primary' : 'font-bold text-primary'}`}>{sub.name}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{sub.email}</p>
                  <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{sub.message}</p>
                </button>
              ))}
            </div>

            {/* Detail view */}
            {selected ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-primary">{selected.name}</h3>
                    <a href={`mailto:${selected.email}`} className="text-sm text-accent hover:underline">{selected.email}</a>
                    {selected.phone && <p className="text-sm text-slate-500 mt-0.5">{selected.phone}</p>}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <hr className="my-4 border-slate-100" />
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                <div className="mt-6">
                  <a
                    href={`mailto:${selected.email}?subject=Re: Your inquiry to AdmitsOnly`}
                    className="btn-primary text-sm !py-2.5 !px-5 inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9 6 9-6M3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8" />
                    </svg>
                    Reply via Email
                  </a>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex bg-white rounded-2xl border border-slate-100 p-12 items-center justify-center text-center">
                <div>
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <p className="text-slate-400 text-sm">Select a message to view details</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

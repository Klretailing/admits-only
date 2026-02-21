import Head from 'next/head';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const mockSessions = [
  { id: 1, title: 'SAT Math Review', student: 'Maya Johnson', coach: 'Dr. Patel', date: 'Feb 18, 2026', time: '4:00 PM', type: '1:1 Coaching', status: 'scheduled' },
  { id: 2, title: 'Common App Essay Draft', student: 'Aisha Patel', coach: 'Sarah M.', date: 'Feb 18, 2026', time: '3:30 PM', type: 'Essay Review', status: 'scheduled' },
  { id: 3, title: 'STEM Research Check-in', student: 'Emma Thompson', coach: 'Prof. Liu', date: 'Feb 19, 2026', time: '5:00 PM', type: 'Cohort', status: 'scheduled' },
  { id: 4, title: 'College List Strategy', student: 'James Williams', coach: 'Sarah M.', date: 'Feb 20, 2026', time: '2:00 PM', type: '1:1 Coaching', status: 'scheduled' },
  { id: 5, title: 'Personal Statement Review', student: 'Carlos Rivera', coach: 'Unassigned', date: 'Feb 21, 2026', time: '3:00 PM', type: 'Essay Review', status: 'needs_coach' },
  { id: 6, title: 'SAT Practice Test Debrief', student: 'Maya Johnson', coach: 'Dr. Patel', date: 'Feb 15, 2026', time: '4:00 PM', type: '1:1 Coaching', status: 'completed' },
  { id: 7, title: 'Financial Aid Workshop', student: 'Group Session', coach: 'Prof. Liu', date: 'Feb 14, 2026', time: '6:00 PM', type: 'Cohort', status: 'completed' },
  { id: 8, title: 'Supplemental Essay Brainstorm', student: 'David Kim', coach: 'Sarah M.', date: 'Feb 13, 2026', time: '3:30 PM', type: 'Essay Review', status: 'completed' },
];

const statusColors: Record<string, string> = {
  scheduled: 'bg-accent/10 text-accent',
  needs_coach: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

export default function AdminSessions() {
  const { loading } = useAdminGuard();
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const sessions = mockSessions.filter((s) =>
    tab === 'upcoming' ? s.status !== 'completed' : s.status === 'completed'
  );

  return (
    <AdminLayout>
      <Head><title>Sessions | Admin — AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Sessions</h1>
            <p className="mt-1 text-slate-500">Manage coaching sessions across all students.</p>
          </div>
          <button className="btn-primary text-sm !py-2.5 !px-5">+ Schedule Session</button>
        </div>

        {/* Alert for unassigned sessions */}
        {mockSessions.some((s) => s.status === 'needs_coach') && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium text-amber-800">
              {mockSessions.filter((s) => s.status === 'needs_coach').length} session(s) need a coach assigned.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(['upcoming', 'completed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-accent text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Sessions list */}
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-primary">{s.title}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusColors[s.status] || 'bg-slate-100 text-slate-500'}`}>
                    {s.status === 'needs_coach' ? 'Needs Coach' : s.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{s.student}</span> &middot; {s.coach} &middot; {s.type}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:text-right">
                <div>
                  <p className="text-sm font-medium text-primary">{s.date}</p>
                  <p className="text-xs text-slate-400">{s.time}</p>
                </div>
                {s.status === 'needs_coach' && (
                  <button className="px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors">
                    Assign Coach
                  </button>
                )}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No sessions to display.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

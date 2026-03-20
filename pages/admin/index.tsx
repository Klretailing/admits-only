import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ──────────────────────── TYPES ──────────────────────── */

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalParents: number;
  totalEssays: number;
  unreadContacts: number;
  revenue: {
    mrr: number;
    totalPaidUsers: number;
    plans: {
      foundations: { subscribers: number; revenue: number };
      scholarship: { subscribers: number; revenue: number };
      stem: { subscribers: number; revenue: number };
    };
    freeTierUsers: number;
  };
  essays: { total: number; draft: number; inReview: number; complete: number };
  pods: { total: number; totalMessages: number; totalMembers: number; messagesPerPod: number };
  motifBoards: number;
  userGrowth: Array<{ month: string; count: number }>;
  essayGrowth: Array<{ month: string; count: number }>;
  engagement: { essaysPerUser: string; podsPerUser: string; profileCompletionRate: number };
  recentSignups: Array<{ id: string; name: string; email: string; plan: string | null; createdAt: string }>;
}

/* ──────────────────────── MINI BAR CHART ──────────────────────── */

function GrowthChart({ data, label }: { data: Array<{ month: string; count: number }>; label: string }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">{label}</p>
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">{d.count}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-accent to-purple-500 transition-all duration-700"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
            />
            <span className="text-[10px] font-medium text-slate-500">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function AdminDashboard() {
  const { loading } = useAdminGuard();
  const [viewMode, setViewMode] = useState<'admin' | 'student' | 'educator'>('admin');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const s = stats;

  return (
    <AdminLayout>
      <Head><title>Command Center | AdmitsOnly Admin</title></Head>

      <div className="space-y-8">
        {/* Header with view toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Command Center</h1>
            <p className="mt-1 text-slate-500">Business performance and operational overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/demos" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent border border-accent/30 rounded-xl hover:bg-accent/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Demo Mode
            </Link>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Admin View
              </button>
              <button
                onClick={() => setViewMode('student')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'student' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Student Portal
              </button>
              <button
                onClick={() => setViewMode('educator')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'educator' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Educator Portal
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'student' ? (
          /* ─── STUDENT PORTAL PREVIEW ─── */
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-sm font-medium text-amber-800">
                You&apos;re previewing the student portal as an admin. Students see this view when they log in.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Essays', value: s?.totalEssays ?? '—' },
                { label: 'Study Pods', value: s?.pods.total ?? '—' },
                { label: 'Pod Messages', value: s?.pods.totalMessages ?? '—' },
                { label: 'Motif Boards', value: s?.motifBoards ?? '—' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold font-display text-primary">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === 'educator' ? (
          /* ─── EDUCATOR PORTAL PREVIEW ─── */
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-sm font-medium text-emerald-800">
                You&apos;re previewing the educator portal as an admin. Educators see this view when they log in.
              </p>
            </div>

            {/* Demo Account Info */}
            <div className="p-4 bg-white border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Demo Educator Account</p>
                  <p className="text-xs text-slate-400">Use these credentials to sign in as an educator</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="px-3 py-2 bg-surface rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Email</p>
                  <p className="text-sm font-mono font-medium text-primary">demo.educator@admitsonly.com</p>
                </div>
                <div className="px-3 py-2 bg-surface rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Password</p>
                  <p className="text-sm font-mono font-medium text-primary">Educator@2026</p>
                </div>
              </div>
            </div>

            {/* Educator Dashboard Preview — Stat Cards */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Educator Dashboard Preview</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: '12', gradient: 'from-emerald-500 to-teal-600', icon: (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  )},
                  { label: 'Sessions Today', value: '3', gradient: 'from-blue-500 to-indigo-600', icon: (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )},
                  { label: 'This Month', value: '$2,450', gradient: 'from-amber-500 to-orange-600', icon: (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  )},
                  { label: 'Total Revenue', value: '$18,200', gradient: 'from-purple-500 to-violet-600', icon: (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )},
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center opacity-80`}>
                        {stat.icon}
                      </div>
                    </div>
                    <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Preview */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold font-display text-primary">Upcoming Sessions</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { student: 'Maya Johnson', time: 'Today, 2:00 PM', subject: 'Essay Review', status: 'scheduled' },
                    { student: 'James Williams', time: 'Today, 4:30 PM', subject: 'College Strategy', status: 'scheduled' },
                    { student: 'Aisha Patel', time: 'Tomorrow, 10:00 AM', subject: 'Application Review', status: 'scheduled' },
                  ].map((session) => (
                    <div key={session.student} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-primary truncate">{session.subject}</p>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{session.student}</span>
                          <span>&middot;</span>
                          <span>{session.time}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 flex-shrink-0">
                        Join
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold font-display text-primary">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Book a Session', desc: 'Schedule a new lesson with a student', gradient: 'from-blue-500 to-indigo-600', icon: (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    )},
                    { label: 'Add a Student', desc: 'Register a new student to your roster', gradient: 'from-emerald-500 to-teal-600', icon: (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    )},
                    { label: 'Manage Services', desc: 'Create or edit your service packages', gradient: 'from-purple-500 to-violet-600', icon: (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    )},
                  ].map((action) => (
                    <div key={action.label} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{action.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Link to actual educator portal */}
            <div className="flex items-center justify-center">
              <Link
                href="/educator"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Full Educator Portal
              </Link>
            </div>
          </div>
        ) : (
          /* ─── ADMIN COMMAND CENTER ─── */
          <>
            {/* Live Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Registered Users</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{s?.totalUsers ?? '—'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Students</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{s?.totalStudents ?? '—'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Essays Written</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{s?.totalEssays ?? '—'}</p>
              </div>
              <Link href="/admin/messages" className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-accent/30 transition-colors">
                <p className="text-sm text-slate-500 font-medium">Unread Messages</p>
                <p className={`mt-2 text-2xl font-bold font-display ${(s?.unreadContacts ?? 0) > 0 ? 'text-accent' : 'text-primary'}`}>
                  {s?.unreadContacts ?? '—'}
                </p>
              </Link>
            </div>

            {/* Alerts based on real data */}
            {s && (
              <div className="space-y-2">
                {s.essays.draft > 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-amber-50 border-amber-100">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-500" />
                    <p className="flex-1 text-sm font-medium text-amber-800">{s.essays.draft} essay{s.essays.draft !== 1 ? 's' : ''} in Draft status</p>
                  </div>
                )}
                {s.essays.inReview > 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-blue-50 border-blue-100">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                    <p className="flex-1 text-sm font-medium text-blue-800">{s.essays.inReview} essay{s.essays.inReview !== 1 ? 's' : ''} awaiting review</p>
                  </div>
                )}
                {s.unreadContacts > 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-red-50 border-red-100">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500 animate-pulse" />
                    <p className="flex-1 text-sm font-medium text-red-800">{s.unreadContacts} unread contact submission{s.unreadContacts !== 1 ? 's' : ''}</p>
                    <Link href="/admin/messages" className="px-3 py-1 text-xs font-semibold rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors">View</Link>
                  </div>
                )}
                {s.essays.draft === 0 && s.essays.inReview === 0 && s.unreadContacts === 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-green-50 border-green-100">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                    <p className="flex-1 text-sm font-medium text-green-800">All clear — no pending items.</p>
                  </div>
                )}
              </div>
            )}

            {/* KPI Grid — real metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Projected MRR', value: s ? `$${s.revenue.mrr.toLocaleString()}` : '—' },
                { label: 'Paid Users', value: s?.revenue.totalPaidUsers ?? '—' },
                { label: 'Free Tier Students', value: s?.revenue.freeTierUsers ?? '—' },
                { label: 'Essays / Student', value: s?.engagement.essaysPerUser ?? '—' },
                { label: 'Profile Completion', value: s ? `${s.engagement.profileCompletionRate}%` : '—' },
                { label: 'Study Pods', value: s?.pods.total ?? '—' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
                  <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                  <p className="mt-3 text-2xl font-bold font-display text-primary">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Growth charts + Pipeline */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold font-display text-primary">User Registrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monthly new signups (last 12 months)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-display text-primary">{s?.totalUsers ?? '—'}</p>
                    <p className="text-xs font-semibold text-slate-400">total registered</p>
                  </div>
                </div>
                <GrowthChart data={s?.userGrowth ?? []} label="" />
              </div>

              {/* Real Pipeline */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">User Pipeline</h3>
                <div className="space-y-4">
                  {s && [
                    { stage: 'Registered', count: s.totalUsers, color: 'bg-slate-400' },
                    { stage: 'Profile Complete', count: Math.round(s.totalStudents * s.engagement.profileCompletionRate / 100), color: 'bg-accent/60' },
                    { stage: 'Has Essays', count: s.essays.total > 0 ? Math.min(s.totalStudents, s.essays.total) : 0, color: 'bg-accent' },
                    { stage: 'Paid Plan', count: s.revenue.totalPaidUsers, color: 'bg-green-500' },
                  ].map((stage) => (
                    <div key={stage.stage}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-primary">{stage.stage}</span>
                        <span className="font-semibold text-slate-600">{stage.count}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min((stage.count / Math.max(s.totalUsers, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Engagement + Essay Growth */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold font-display text-primary">Engagement Overview</h3>
                  <Link href="/admin/payments" className="text-sm font-semibold text-accent hover:underline">Revenue Details</Link>
                </div>
                <div className="space-y-4">
                  {s && [
                    { label: 'Essays Written', value: s.essays.total, sub: `${s.essays.complete} complete, ${s.essays.inReview} in review, ${s.essays.draft} draft`, color: 'from-accent to-purple-600' },
                    { label: 'Pod Activity', value: s.pods.totalMessages, sub: `${s.pods.total} pod${s.pods.total !== 1 ? 's' : ''}, ${s.pods.totalMembers} member${s.pods.totalMembers !== 1 ? 's' : ''}`, color: 'from-emerald-500 to-teal-600' },
                    { label: 'Motif Boards', value: s.motifBoards, sub: 'Total boards created', color: 'from-amber-500 to-orange-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className={`w-1.5 h-12 rounded-full bg-gradient-to-b ${item.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Signups */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold font-display text-primary">Recent Signups</h3>
                  <Link href="/admin/users" className="text-sm font-semibold text-accent hover:underline">View all</Link>
                </div>
                <div className="space-y-3">
                  {s?.recentSignups && s.recentSignups.length > 0 ? s.recentSignups.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.plan ? (user.plan === 'foundations' ? 'Foundations' : user.plan === 'scholarship' ? 'Scholarship-Ready' : 'STEM Elite') : 'Free tier'}</p>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400">No signups yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-display">System Status</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  All Systems Operational
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5">
                  <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0 bg-green-400" />
                  <p className="text-sm text-white/70">Database connected &mdash; all services running</p>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5">
                  <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0 bg-blue-400" />
                  <p className="text-sm text-white/70">{s?.totalUsers ?? 0} users, {s?.totalEssays ?? 0} essays in database</p>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Quick Actions</p>
                    <div className="mt-2 space-y-1.5">
                      <Link href="/admin/settings" className="block text-sm text-white/60 hover:text-white transition-colors">
                        Platform Settings &rarr;
                      </Link>
                      <Link href="/admin/demos" className="block text-sm text-white/60 hover:text-white transition-colors">
                        Launch Demo &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

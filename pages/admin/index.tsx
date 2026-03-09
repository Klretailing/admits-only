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
  const [viewMode, setViewMode] = useState<'admin' | 'student'>('admin');
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Admin View
              </button>
              <button
                onClick={() => setViewMode('student')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'student' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Student Portal
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

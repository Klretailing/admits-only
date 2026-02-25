import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ──────────────────────── DATA ──────────────────────── */

const kpiCards = [
  { label: 'Monthly Revenue', value: '$42.8k', change: '+15.2%', positive: true, sparkline: [28, 32, 30, 38, 35, 40, 42.8] },
  { label: 'Active Students', value: '284', change: '+12%', positive: true, sparkline: [210, 225, 240, 248, 260, 272, 284] },
  { label: 'Retention Rate', value: '98%', change: '+1.2%', positive: true, sparkline: [94, 95, 95, 96, 97, 97, 98] },
  { label: 'Avg. Score Improvement', value: '+127', change: 'SAT pts', positive: true, sparkline: [85, 92, 100, 108, 115, 120, 127] },
  { label: 'Sessions This Month', value: '156', change: '+8%', positive: true, sparkline: [120, 128, 135, 140, 145, 150, 156] },
  { label: 'Acceptance Rate', value: '94%', change: '+3%', positive: true, sparkline: [82, 85, 87, 89, 91, 92, 94] },
];

const revenueByMonth = [
  { month: 'Sep', value: 28400 },
  { month: 'Oct', value: 31200 },
  { month: 'Nov', value: 29800 },
  { month: 'Dec', value: 34500 },
  { month: 'Jan', value: 38900 },
  { month: 'Feb', value: 42800 },
];

const programPerformance = [
  { name: 'Scholarship-Ready Academy', students: 124, revenue: '$61.9k', retention: '99%', avgImprovement: '+142 SAT', color: 'from-accent to-purple-600' },
  { name: 'STEM Innovators Lab', students: 62, revenue: '$27.8k', retention: '97%', avgImprovement: '+118 SAT', color: 'from-emerald-500 to-teal-600' },
  { name: 'Humanities Leadership', students: 48, revenue: '$21.6k', retention: '98%', avgImprovement: '+135 SAT', color: 'from-amber-500 to-orange-600' },
  { name: 'Foundations for Growth', students: 50, revenue: '$14.9k', retention: '96%', avgImprovement: 'N/A', color: 'from-rose-500 to-pink-600' },
];

const coachLeaderboard = [
  { name: 'Dr. Ravi Patel', role: 'SAT/Math Lead', students: 42, satisfaction: 4.9, sessions: 186 },
  { name: 'Sarah Mitchell', role: 'Essay Strategist', students: 38, satisfaction: 4.8, sessions: 164 },
  { name: 'Prof. Wei Liu', role: 'STEM Director', students: 35, satisfaction: 4.9, sessions: 152 },
  { name: 'Dr. Lisa Chen', role: 'Admissions Advisor', students: 28, satisfaction: 4.7, sessions: 120 },
];

const pipelineStages = [
  { stage: 'Leads', count: 89, color: 'bg-slate-400' },
  { stage: 'Discovery Calls', count: 34, color: 'bg-accent/60' },
  { stage: 'Enrolled', count: 18, color: 'bg-accent' },
  { stage: 'Active', count: 284, color: 'bg-green-500' },
];

const operationalAlerts = [
  { type: 'urgent', message: '3 essay reviews overdue by 48+ hours', action: 'Assign Now' },
  { type: 'warning', message: '2 sessions next week have no coach assigned', action: 'Review' },
  { type: 'info', message: '12 students approaching application deadlines (March 1)', action: 'View List' },
  { type: 'success', message: 'February billing cycle completed — 0 failed payments', action: null },
];

const systemAlerts = [
  { type: 'success', message: 'All systems operational — 99.9% uptime' },
  { type: 'info', message: 'Next scheduled maintenance: Mar 1, 2:00 AM ET' },
];

/* ──────────────────────── MINI SPARKLINE ──────────────────────── */

function Sparkline({ data, color = 'stroke-accent' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={points} fill="none" className={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ──────────────────────── MINI BAR CHART ──────────────────────── */

function RevenueChart({ data }: { data: typeof revenueByMonth }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-400">${(d.value / 1000).toFixed(1)}k</span>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-accent to-purple-500 transition-all duration-700" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="text-[10px] font-medium text-slate-500">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function AdminDashboard() {
  const { loading } = useAdminGuard();
  const [viewMode, setViewMode] = useState<'admin' | 'student'>('admin');
  const [stats, setStats] = useState({ totalUsers: 0, totalStudents: 0, totalEssays: 0, unreadContacts: 0 });

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

            {/* Student stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'SAT Score', value: '1480', change: '+40', positive: true },
                { label: 'Essays Drafted', value: '7', change: '3 in review', positive: true },
                { label: 'Sessions Completed', value: '24', change: 'this semester', positive: true },
                { label: 'College List', value: '12', change: 'schools', positive: true },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
                    <span className="text-xs font-semibold text-green-600">{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Progress */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Academic Progress</h3>
                <div className="space-y-4">
                  {[
                    { subject: 'SAT Math', pct: 88, color: 'bg-accent' },
                    { subject: 'SAT Reading & Writing', pct: 82, color: 'bg-purple-500' },
                    { subject: 'Essay Writing', pct: 75, color: 'bg-emerald-500' },
                    { subject: 'Research Project', pct: 60, color: 'bg-amber-500' },
                  ].map((item) => (
                    <div key={item.subject}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-primary">{item.subject}</span>
                        <span className="font-semibold text-slate-500">{item.pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming sessions */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Upcoming Sessions</h3>
                <div className="space-y-3">
                  {[
                    { title: 'SAT Math Review', coach: 'Dr. Patel', date: 'Tomorrow, 4:00 PM' },
                    { title: 'Common App Essay Draft 2', coach: 'Sarah M.', date: 'Wed, 3:30 PM' },
                    { title: 'STEM Research Check-in', coach: 'Prof. Liu', date: 'Fri, 5:00 PM' },
                  ].map((s) => (
                    <div key={s.title} className="flex items-center gap-4 p-3 rounded-xl bg-surface border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{s.title}</p>
                        <p className="text-xs text-slate-400">{s.coach}</p>
                      </div>
                      <span className="text-xs font-medium text-accent">{s.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── ADMIN COMMAND CENTER ─── */
          <>
            {/* Live Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Registered Users</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{stats.totalUsers}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Students</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{stats.totalStudents}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium">Essays Written</p>
                <p className="mt-2 text-2xl font-bold font-display text-primary">{stats.totalEssays}</p>
              </div>
              <Link href="/admin/messages" className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-accent/30 transition-colors">
                <p className="text-sm text-slate-500 font-medium">Unread Messages</p>
                <p className={`mt-2 text-2xl font-bold font-display ${stats.unreadContacts > 0 ? 'text-accent' : 'text-primary'}`}>
                  {stats.unreadContacts}
                </p>
              </Link>
            </div>

            {/* Operational Alerts */}
            <div className="space-y-2">
              {operationalAlerts.map((alert, i) => (
                <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                  alert.type === 'urgent' ? 'bg-red-50 border-red-100' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                  alert.type === 'success' ? 'bg-green-50 border-green-100' :
                  'bg-blue-50 border-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.type === 'urgent' ? 'bg-red-500 animate-pulse' :
                    alert.type === 'warning' ? 'bg-amber-500' :
                    alert.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                  <p className={`flex-1 text-sm font-medium ${
                    alert.type === 'urgent' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-amber-800' :
                    alert.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>{alert.message}</p>
                  {alert.action && (
                    <button className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      alert.type === 'urgent' ? 'text-red-700 bg-red-100 hover:bg-red-200' :
                      alert.type === 'warning' ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' :
                      'text-blue-700 bg-blue-100 hover:bg-blue-200'
                    }`}>{alert.action}</button>
                  )}
                </div>
              ))}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiCards.map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                    <Sparkline data={kpi.sparkline} />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-2xl font-bold font-display text-primary">{kpi.value}</span>
                    <span className={`text-xs font-semibold ${kpi.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue + Pipeline row */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold font-display text-primary">Revenue Trend</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monthly recurring revenue (MRR)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-display text-primary">$42.8k</p>
                    <p className="text-xs font-semibold text-green-600">+15.2% vs last month</p>
                  </div>
                </div>
                <RevenueChart data={revenueByMonth} />
              </div>

              {/* Enrollment Pipeline */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Enrollment Pipeline</h3>
                <div className="space-y-4">
                  {pipelineStages.map((stage) => (
                    <div key={stage.stage}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-primary">{stage.stage}</span>
                        <span className="font-semibold text-slate-600">{stage.count}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min((stage.count / 300) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Conversion Rate</p>
                    <p className="text-lg font-bold font-display text-accent">20.2%</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Lead to enrolled (last 90 days)</p>
                </div>
              </div>
            </div>

            {/* Program Performance + Coach Leaderboard */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Program Performance */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold font-display text-primary">Program Performance</h3>
                  <Link href="/admin/payments" className="text-sm font-semibold text-accent hover:underline">Details</Link>
                </div>
                <div className="space-y-4">
                  {programPerformance.map((prog) => (
                    <div key={prog.name} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className={`w-1.5 h-12 rounded-full bg-gradient-to-b ${prog.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{prog.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{prog.students} students</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-bold text-primary">{prog.revenue}</p>
                        <p className="text-xs text-slate-400">revenue</p>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-green-600">{prog.retention}</p>
                        <p className="text-xs text-slate-400">retention</p>
                      </div>
                      <div className="hidden lg:block text-right">
                        <p className="text-sm font-bold text-accent">{prog.avgImprovement}</p>
                        <p className="text-xs text-slate-400">avg. gain</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Leaderboard */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold font-display text-primary">Coach Leaderboard</h3>
                  <Link href="/admin/users" className="text-sm font-semibold text-accent hover:underline">View all</Link>
                </div>
                <div className="space-y-3">
                  {coachLeaderboard.map((coach, i) => (
                    <div key={coach.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-100 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{coach.name}</p>
                        <p className="text-xs text-slate-400">{coach.role}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-bold text-primary">{coach.satisfaction}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{coach.sessions} sessions</p>
                      </div>
                    </div>
                  ))}
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
                {systemAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      alert.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <p className="text-sm text-white/70">{alert.message}</p>
                  </div>
                ))}
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

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';

const upcomingSessions = [
  { title: 'SAT Math Review', coach: 'Dr. Patel', date: 'Tomorrow, 4:00 PM', type: '1:1 Coaching' },
  { title: 'Common App Essay Draft 2', coach: 'Sarah M.', date: 'Wed, 3:30 PM', type: 'Essay Review' },
  { title: 'STEM Research Check-in', coach: 'Prof. Liu', date: 'Fri, 5:00 PM', type: 'Cohort' },
];

const recentActivity = [
  { action: 'Essay draft submitted', detail: 'Personal Statement — Draft 2', time: '2 hours ago' },
  { action: 'SAT practice completed', detail: 'Score: 1480 (+40 from last)', time: 'Yesterday' },
  { action: 'Session completed', detail: 'College List Strategy with Sarah M.', time: '2 days ago' },
  { action: 'Milestone reached', detail: 'Completed 10 practice essays', time: '3 days ago' },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | AdmitsOnly</title>
      </Head>

      <div className="space-y-8">
        {/* Welcome + payment success banner */}
        {router.query.payment === 'success' && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700 font-medium">
            Payment successful! Your subscription is now active.
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold font-display text-primary">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="mt-1 text-slate-500">Here&apos;s your academic progress at a glance.</p>
        </div>

        {/* Stat cards */}
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
                <span className={`text-xs font-semibold ${stat.positive ? 'text-green-600' : 'text-slate-400'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Progress chart placeholder */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-primary">Academic Progress</h3>
              <span className="badge-accent">This Semester</span>
            </div>
            <div className="space-y-4">
              {[
                { subject: 'SAT Math', pct: 88, color: 'bg-accent' },
                { subject: 'SAT Verbal', pct: 82, color: 'bg-purple-500' },
                { subject: 'Essay Writing', pct: 75, color: 'bg-emerald-500' },
                { subject: 'Research Project', pct: 60, color: 'bg-amber-500' },
                { subject: 'Extracurricular Portfolio', pct: 45, color: 'bg-rose-500' },
              ].map((item) => (
                <div key={item.subject}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-primary">{item.subject}</span>
                    <span className="font-semibold text-slate-500">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming sessions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-primary">Upcoming Sessions</h3>
              <Link href="/dashboard/sessions" className="text-sm font-semibold text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingSessions.map((s) => (
                <div key={s.title} className="flex items-start gap-4 p-4 rounded-xl bg-surface border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.coach} &middot; {s.type}</p>
                  </div>
                  <span className="text-xs font-medium text-accent whitespace-nowrap">{s.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{a.action}</p>
                  <p className="text-xs text-slate-500">{a.detail}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

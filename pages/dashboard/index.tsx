import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';

/* ─── Upcoming Deadlines Widget ─── */

interface StoredApp {
  id: string;
  name: string;
  deadline: string;
  type: string;
  status: string;
  tasks: { id: string; label: string; done: boolean }[];
}

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineBadge(days: number): { label: string; className: string } {
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'bg-red-100 text-red-700 border-red-200' };
  if (days === 0) return { label: 'Due today', className: 'bg-red-100 text-red-700 border-red-200 animate-pulse' };
  if (days <= 7) return { label: `${days}d left`, className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (days <= 30) return { label: `${days}d left`, className: 'bg-blue-100 text-blue-600 border-blue-200' };
  return { label: `${days}d left`, className: 'bg-slate-100 text-slate-500 border-slate-200' };
}

function UpcomingDeadlines() {
  const [apps, setApps] = useState<StoredApp[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      if (stored) setApps(JSON.parse(stored));
    } catch {}
  }, []);

  const upcoming = useMemo(() => {
    return apps
      .filter(a => a.status !== 'submitted' && a.status !== 'accepted' && a.status !== 'rejected')
      .map(a => ({ ...a, days: daysUntil(a.deadline) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 4);
  }, [apps]);

  if (upcoming.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-display text-primary">Upcoming Deadlines</h3>
          <Link href="/dashboard/progress" className="text-sm font-semibold text-accent hover:underline">Add Schools</Link>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No deadlines tracked yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add schools in Applications to see countdowns here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold font-display text-primary">Upcoming Deadlines</h3>
        <Link href="/dashboard/progress" className="text-sm font-semibold text-accent hover:underline">View All</Link>
      </div>
      <div className="space-y-3">
        {upcoming.map((app) => {
          const badge = deadlineBadge(app.days);
          const doneTasks = app.tasks.filter(t => t.done).length;
          const totalTasks = app.tasks.length;
          const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          return (
            <Link
              key={app.id}
              href="/dashboard/progress"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-primary truncate">{app.name}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">{app.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{doneTasks}/{totalTasks}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex-shrink-0 ${badge.className}`}>
                {badge.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface DashboardStats {
  satScore: string;
  essayCount: string;
  essayStatus: string;
  holisticScore: string;
  percentile: string;
  gpa: string;
}

interface DashboardProfile {
  gpaScore: number | null;
  satScore: number | null;
  ecScore: number | null;
  holisticScore: number | null;
  percentile: number | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Fetch real dashboard data
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setStats(data.stats);
        setProfile(data.profile);
      })
      .catch(() => {});
  }, [status]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const hasProfile = profile && profile.holisticScore != null;

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | AdmitsOnly</title>
      </Head>

      <div className="space-y-8">
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

        {/* Stat cards — real data from DB */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'SAT Score', value: stats?.satScore || '—', change: hasProfile ? 'from profile' : 'add in profile', positive: hasProfile },
            { label: 'Essays', value: stats?.essayCount || '0', change: stats?.essayStatus || 'none yet', positive: (parseInt(stats?.essayCount || '0') > 0) },
            { label: 'Holistic Score', value: stats?.holisticScore || '—', change: hasProfile ? '/100' : 'evaluate profile', positive: hasProfile },
            { label: 'GPA', value: stats?.gpa || '—', change: hasProfile ? 'from profile' : 'add in profile', positive: hasProfile },
          ].map((stat) => (
            <Link href="/dashboard/profile" key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
                <span className={`text-xs font-semibold ${stat.positive ? 'text-green-600' : 'text-slate-400'}`}>
                  {stat.change}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Progress / CTA */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {hasProfile ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display text-primary">Score Breakdown</h3>
                <Link href="/dashboard/profile" className="text-sm font-semibold text-accent hover:underline">Update Profile</Link>
              </div>
              <div className="space-y-4">
                {[
                  { subject: 'GPA Score', pct: profile?.gpaScore || 0, color: 'bg-accent' },
                  { subject: 'SAT Score', pct: profile?.satScore || 0, color: 'bg-purple-500' },
                  { subject: 'Extracurriculars', pct: profile?.ecScore || 0, color: 'bg-emerald-500' },
                  { subject: 'Overall Holistic', pct: profile?.holisticScore || 0, color: 'bg-gradient-to-r from-accent to-purple-500' },
                ].map((item) => (
                  <div key={item.subject}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-primary">{item.subject}</span>
                      <span className="font-semibold text-slate-500">{item.pct}/100</span>
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
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display text-primary">Get Started</h3>
              </div>
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 font-medium mb-1">Build your student profile</p>
                <p className="text-xs text-slate-400 mb-4">Add your GPA, SAT scores, and extracurriculars to see your holistic evaluation.</p>
                <Link href="/dashboard/profile" className="btn-primary text-sm inline-block">
                  Go to Profile
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-primary">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link href="/dashboard/essays" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Write an Essay</p>
                  <p className="text-xs text-slate-500 mt-0.5">Start or continue your college essays</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/dashboard/progress" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Track Applications</p>
                  <p className="text-xs text-slate-500 mt-0.5">Manage deadlines & checklists</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/dashboard/pods" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Study Pods</p>
                  <p className="text-xs text-slate-500 mt-0.5">Collaborate with peers</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <UpcomingDeadlines />
      </div>
    </DashboardLayout>
  );
}

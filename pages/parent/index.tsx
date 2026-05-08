import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';

/* ─── Types ─── */

interface Task {
  id: string;
  label: string;
  done: boolean;
}

interface Application {
  id: string;
  name: string;
  deadline: string;
  type: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred';
  tasks: Task[];
  notes: string;
}

interface StudentProfile {
  gpa: number;
  satMath: number;
  satRW: number;
  holisticScore: number;
}

interface Essay {
  id: string;
  title: string;
  status: string;
  overallScore: number;
}

interface Student {
  id: string;
  name: string;
  applications: Application[];
  profile: StudentProfile | null;
  essays: Essay[];
}

interface ParentOverview {
  connected: boolean;
  students: Student[];
}

/* ─── Helpers ─── */

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<Application['status'], string> = {
  not_started: '#94a3b8',   // slate
  in_progress: '#3b82f6',   // blue
  submitted: '#8b5cf6',     // violet
  accepted: '#10b981',      // emerald
  rejected: '#ef4444',      // red
  waitlisted: '#f59e0b',    // amber
  deferred: '#6366f1',      // indigo
};

const STATUS_LABELS: Record<Application['status'], string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  deferred: 'Deferred',
};

/* ─── Page Component ─── */

export default function ParentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ParentOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  /* Not connected or no data state */
  if (!data || !data.connected) {
    return (
      <ParentLayout>
        <Head>
          <title>Parent Dashboard | AdmitsOnly</title>
        </Head>
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-6">
              Link your account to your student&apos;s profile to see their application progress, deadlines, and more.
            </p>
            <Link
              href="/parent/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
            >
              Go to Settings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </ParentLayout>
    );
  }

  const student = data?.students[0];
  const apps = student?.applications || [];

  /* Computed stats */
  const schoolsCount = apps.length;
  const submittedCount = apps.filter((a) => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(a.status)).length;
  const acceptedCount = apps.filter((a) => a.status === 'accepted').length;
  const totalTasks = apps.reduce((sum, a) => sum + (a.tasks?.length || 0), 0);
  const doneTasks = apps.reduce((sum, a) => sum + (a.tasks?.filter((t: any) => t.done).length || 0), 0);

  /* Upcoming deadlines */
  const upcomingDeadlines = useMemo(() => {
    return apps
      .filter((a) => a.deadline && !['submitted', 'accepted', 'rejected'].includes(a.status))
      .map((a) => ({ ...a, days: daysUntil(a.deadline) }))
      .filter((a) => a.days >= 0 && isFinite(a.days))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [apps]);

  /* Status distribution */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of Object.keys(STATUS_COLORS)) counts[s] = 0;
    for (const a of apps) counts[a.status] = (counts[a.status] || 0) + 1;
    return counts;
  }, [apps]);

  const parentName = session.user?.name?.split(' ')[0] || 'Parent';
  const studentName = student?.name?.split(' ')[0] || 'your student';

  return (
    <ParentLayout>
      <Head>
        <title>Parent Dashboard | AdmitsOnly</title>
      </Head>

      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">
            Welcome, {parentName}
          </h1>
          <p className="mt-1 text-slate-500">
            Here&apos;s how {studentName}&apos;s applications are going
          </p>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Schools',
              value: schoolsCount,
              icon: (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
            },
            {
              label: 'Submitted',
              value: submittedCount,
              icon: (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: 'Accepted',
              value: acceptedCount,
              icon: (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ),
            },
            {
              label: 'Tasks Done',
              value: `${doneTasks}/${totalTasks}`,
              icon: (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                  {stat.icon}
                </div>
              </div>
              <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* ─── Deadline Alerts ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold font-display text-primary">Deadline Alerts</h3>
            </div>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No upcoming deadlines.</p>
              <p className="text-xs text-slate-400 mt-1">All caught up — great job!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((app) => {
                const urgencyClass =
                  app.days < 7
                    ? 'border-l-red-500 bg-red-50/40'
                    : app.days < 30
                    ? 'border-l-amber-500 bg-amber-50/40'
                    : 'border-l-slate-300 bg-slate-50/40';

                const badgeClass =
                  app.days < 7
                    ? 'bg-red-100 text-red-700'
                    : app.days < 30
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-l-4 ${urgencyClass}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{app.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(app.deadline + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${badgeClass}`}>
                      {app.days === 0 ? 'Due today' : `${app.days}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Application Status Overview ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary">Application Status Overview</h3>
          </div>

          {apps.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No applications tracked yet.</p>
            </div>
          ) : (
            <>
              {/* Horizontal bar chart */}
              <div className="w-full h-8 rounded-full overflow-hidden flex bg-slate-100">
                {(Object.keys(STATUS_COLORS) as Application['status'][]).map((s) => {
                  const count = statusCounts[s] || 0;
                  if (count === 0) return null;
                  const pct = (count / apps.length) * 100;
                  return (
                    <div
                      key={s}
                      className="h-full transition-all duration-500 relative group"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }}
                      title={`${STATUS_LABELS[s]}: ${count}`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {(Object.keys(STATUS_COLORS) as Application['status'][]).map((s) => {
                  const count = statusCounts[s] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s] }} />
                      <span className="text-xs font-medium text-slate-600">
                        {STATUS_LABELS[s]} ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ─── Quick Links ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary">Quick Links</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/parent/financial"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Financial Planner</p>
                <p className="text-xs text-slate-500 mt-0.5">Compare costs across schools</p>
              </div>
            </Link>

            <Link
              href="/parent/settings"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Settings</p>
                <p className="text-xs text-slate-500 mt-0.5">Manage connection & preferences</p>
              </div>
            </Link>

            <Link
              href="/parent/financial"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all sm:col-span-2 lg:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Aid & Scholarships</p>
                <p className="text-xs text-slate-500 mt-0.5">Financial aid tips & resources</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}

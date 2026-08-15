import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import PageHeader from '../../components/PageHeader';
import TodaysFocus from '../../components/TodaysFocus';
import { useCountUp, useInView } from '../../hooks/useAnimations';

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

/* ─── Animated Stat Card ─── */
function AnimatedStatCard({ label, value, change, positive, href, accentColor, delay }: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  href: string;
  accentColor: string;
  delay: number;
}) {
  const numericValue = parseFloat(value);
  const isNumeric = !isNaN(numericValue) && value !== '—';
  const { count, ref: countRef } = useCountUp(isNumeric ? numericValue : 0, 1200);

  return (
    <Link
      href={href}
      className={`dash-stat-card dash-card-hover bg-white rounded-2xl border border-slate-100 p-5 dash-card-enter visible`}
      style={{
        '--stat-accent': accentColor,
        transitionDelay: `${delay}ms`,
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${label === 'SAT Score' ? 'bg-amber-100' : label === 'Essays' ? 'bg-accent/10' : label === 'Holistic Score' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
          {label === 'SAT Score' && (
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          )}
          {label === 'Essays' && (
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
          {label === 'Holistic Score' && (
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          )}
          {label === 'GPA' && (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          )}
        </div>
      </div>
      <div ref={countRef} className="flex items-end gap-2">
        <span className="text-2xl font-bold font-display text-primary">
          {isNumeric ? count : value}
        </span>
        <span className={`text-xs font-semibold mb-0.5 ${positive ? 'text-green-600' : 'text-slate-400'}`}>
          {change}
        </span>
      </div>
    </Link>
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
  const [readiness, setReadiness] = useState<{ readiness: number; checklist: any[]; nudges: any[] } | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

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

  // Fetch readiness data
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/readiness')
      .then(r => r.json())
      .then(data => setReadiness(data))
      .catch(() => {});
  }, [status]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const hasProfile = profile && profile.holisticScore != null;

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | AdmitsOnly</title>
      </Head>

      <div className="space-y-6">
        {router.query.payment === 'success' && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700 font-medium">
            Payment successful! Your subscription is now active.
          </div>
        )}

        <PageHeader
          eyebrow="Overview"
          title={`Welcome back, ${session.user?.name?.split(' ')[0] || 'Student'}`}
          subtitle="Here's your academic progress at a glance."
        />

        {/* Today's Focus — daily nudge */}
        <TodaysFocus checklist={readiness?.checklist} />

        {/* Smart Nudges Banner */}
        {readiness?.nudges && readiness.nudges.filter(n => !dismissedNudges.has(n.id)).length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="space-y-2">
              {readiness.nudges
                .filter(n => !dismissedNudges.has(n.id))
                .slice(0, 3)
                .map(nudge => (
                  <div key={nudge.id} className="flex items-start sm:items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-shrink-0">
                      {nudge.type === 'info' && (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {nudge.type === 'warning' && (
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )}
                      {nudge.type === 'success' && (
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="flex-1 min-w-[14rem] text-sm text-slate-700">{nudge.message}</p>
                    <Link href={nudge.href} className="text-xs font-semibold text-accent hover:underline flex-shrink-0 ml-8 sm:ml-0">
                      {nudge.action}
                    </Link>
                    <button
                      onClick={() => setDismissedNudges(prev => { const next = new Set(Array.from(prev)); next.add(nudge.id); return next; })}
                      className="flex-shrink-0 p-1 rounded-lg hover:bg-white/60 transition-colors"
                      aria-label="Dismiss nudge"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Stat cards — real data from DB with animated counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'SAT Score', value: stats?.satScore || '—', change: hasProfile ? 'from profile' : 'add in profile', positive: hasProfile, accentColor: '#d97706' },
            { label: 'Essays', value: stats?.essayCount || '0', change: stats?.essayStatus || 'none yet', positive: (parseInt(stats?.essayCount || '0') > 0), accentColor: '#6366f1' },
            { label: 'Holistic Score', value: stats?.holisticScore || '—', change: hasProfile ? '/100' : 'evaluate profile', positive: hasProfile, accentColor: '#059669' },
            { label: 'GPA', value: stats?.gpa || '—', change: hasProfile ? 'from profile' : 'add in profile', positive: hasProfile, accentColor: '#2563eb' },
          ].map((stat, i) => (
            <AnimatedStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              change={stat.change}
              positive={stat.positive}
              href="/dashboard/profile"
              accentColor={stat.accentColor}
              delay={i * 100}
            />
          ))}
        </div>

        {/* Application Readiness Ring & Checklist — hidden once fully ready to keep the dashboard clean */}
        {readiness && readiness.readiness < 100 && (
          <div className="grid lg:grid-cols-[240px_1fr] gap-6">
            {/* Readiness Ring */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center">
              <div className="relative w-[120px] h-[120px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-100"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-accent"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - readiness.readiness / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold font-display text-primary">{readiness.readiness}%</span>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Application Ready</p>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-display text-primary">Getting Started</h3>
                <span className="text-sm font-medium text-slate-400">
                  {readiness.checklist.filter(c => c.complete).length}/{readiness.checklist.length} complete
                </span>
              </div>
              <div className="space-y-2">
                {readiness.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="flex-shrink-0">
                      {item.complete ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <span className={`flex-1 text-sm ${item.complete ? 'text-slate-400 line-through' : 'text-primary font-medium'}`}>
                      {item.label}
                    </span>
                    <Link href={item.href} className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress / CTA */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {hasProfile ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 dash-card-hover">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold font-display text-primary">Score Breakdown</h3>
                </div>
                <Link href="/dashboard/profile" className="text-sm font-semibold text-accent hover:underline">Update Profile</Link>
              </div>
              <div className="space-y-4">
                {[
                  { subject: 'GPA Score', pct: profile?.gpaScore || 0, color: 'bg-accent' },
                  { subject: 'SAT Score', pct: profile?.satScore || 0, color: 'bg-purple-500' },
                  { subject: 'Extracurriculars', pct: profile?.ecScore || 0, color: 'bg-emerald-500' },
                  { subject: 'Overall Holistic', pct: profile?.holisticScore || 0, color: 'bg-accent' },
                ].map((item) => (
                  <div key={item.subject}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-primary">{item.subject}</span>
                      <span className="font-semibold text-slate-500">{item.pct}/100</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {profile?.holisticScore != null && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${profile.holisticScore >= 70 ? 'bg-emerald-500' : profile.holisticScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'} status-pulse`} />
                    <span className="text-xs font-medium text-slate-500">
                      {profile.holisticScore >= 70 ? 'Strong Profile' : profile.holisticScore >= 40 ? 'Building' : 'Getting Started'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-accent">{profile.holisticScore}/100 Overall</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display text-primary">Get Started</h3>
              </div>
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
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
          <div className="bg-white rounded-2xl border border-slate-100 p-6 dash-card-hover">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-lg font-bold font-display text-primary">Quick Actions</h3>
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/dashboard/essays" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-accent/20 hover:bg-slate-50 hover:-translate-y-0.5 transition-all">
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
              <Link href="/dashboard/progress" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-purple-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all">
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
              <Link href="/dashboard/pods" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all">
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

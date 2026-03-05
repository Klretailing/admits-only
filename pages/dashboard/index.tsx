import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';

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

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/dashboard/profile" className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors">My Profile</p>
            <p className="text-xs text-slate-400 mt-0.5">Update scores & activities</p>
          </Link>
          <Link href="/dashboard/essays" className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-primary group-hover:text-purple-600 transition-colors">Essay Workspace</p>
            <p className="text-xs text-slate-400 mt-0.5">Write & analyze essays</p>
          </Link>
          <Link href="/dashboard/progress" className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-bold text-primary group-hover:text-emerald-600 transition-colors">Applications</p>
            <p className="text-xs text-slate-400 mt-0.5">Track deadlines & tasks</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

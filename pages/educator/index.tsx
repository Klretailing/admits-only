import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface AwaitingReview {
  reviewId: string;
  studentId: string;
  studentName: string;
  essayTitle: string;
  submittedAt: string | null;
}
interface UpcomingDeadline {
  studentId: string;
  studentName: string;
  school: string;
  type: string;
  deadline: string;
  daysLeft: number;
}
interface AtRiskStudent {
  studentId: string;
  studentName: string;
  reason: string;
}
interface TodaySession {
  id: string;
  title: string;
  date: string;
  studentName: string;
  meetingLink: string;
  platform: string;
  duration: number;
}

interface ActionQueue {
  essaysAwaitingReview: { count: number; items: AwaitingReview[] };
  upcomingDeadlines: { count: number; items: UpcomingDeadline[] };
  atRiskStudents: { count: number; items: AtRiskStudent[] };
  todaySessions: { count: number; items: TodaySession[] };
}

interface OverviewData {
  totalStudents: number;
  activeStudents: number;
  totalBookings: number;
  upcomingToday: number;
  monthRevenue: number;
  totalRevenue: number;
  recentBookings: {
    id: string;
    title: string;
    date: string;
    status: string;
    studentName: string;
    platform: string;
    meetingLink: string;
    duration: number;
  }[];
  actionQueue?: ActionQueue;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const mins = Math.max(1, Math.floor(diff / (60 * 1000)));
  return `${mins} min${mins === 1 ? '' : 's'} ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-4 px-1 text-sm text-slate-400">
      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function SectionLabel({ children, count, tone = 'emerald' }: { children: React.ReactNode; count: number; tone?: 'emerald' | 'red' | 'amber' }) {
  const toneClasses =
    count === 0
      ? 'bg-slate-100 text-slate-400'
      : tone === 'red'
      ? 'bg-red-100 text-red-600'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-600'
      : 'bg-emerald-100 text-emerald-600';
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{children}</p>
      <span className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[10px] font-bold text-center ${toneClasses}`}>
        {count}
      </span>
    </div>
  );
}

export default function EducatorOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated') {
      // Admins can preview the educator portal; only students/parents are redirected.
      const role = (session?.user as any)?.role;
      if (role !== 'educator' && role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/educator/overview')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [status]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const queue = data?.actionQueue;
  const reviewCount = queue?.essaysAwaitingReview.count ?? 0;
  const deadlineCount = queue?.upcomingDeadlines.count ?? 0;
  const atRiskCount = queue?.atRiskStudents.count ?? 0;

  // One-line summary of what needs attention.
  const summaryParts: string[] = [];
  if (reviewCount > 0) summaryParts.push(`${reviewCount} essay${reviewCount === 1 ? '' : 's'} to review`);
  if (deadlineCount > 0) summaryParts.push(`${deadlineCount} deadline${deadlineCount === 1 ? '' : 's'} soon`);
  if (atRiskCount > 0) summaryParts.push(`${atRiskCount} student${atRiskCount === 1 ? '' : 's'} to nudge`);
  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : "You're all caught up — nothing needs attention right now.";

  const stats = [
    { label: 'Active Students', value: data?.activeStudents || 0, icon: 'students', color: 'bg-emerald-500', href: '/educator/students' },
    { label: 'Sessions Today', value: data?.upcomingToday || 0, icon: 'today', color: 'bg-blue-500', href: '/educator/schedule' },
    { label: 'This Month', value: formatCurrency(data?.monthRevenue || 0), icon: 'revenue', color: 'bg-amber-500', href: '/educator/earnings' },
    { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue || 0), icon: 'total', color: 'bg-purple-500', href: '/educator/earnings' },
  ];

  return (
    <EducatorDashboardLayout>
      <Head>
        <title>Educator Dashboard | AdmitsOnly</title>
      </Head>

      <div className="space-y-8">
        {/* Greeting header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">
            {greeting()}, {session.user?.name?.split(' ')[0] || 'Educator'}
          </h1>
          <p className="mt-1 text-slate-500">{summary}</p>
        </div>

        {/* Action Queue — the centerpiece */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Essays awaiting review */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <h3 className="text-base font-bold font-display text-primary leading-tight">Essays awaiting your review</h3>
            </div>
            <SectionLabel count={reviewCount} tone="emerald">To review</SectionLabel>
            {reviewCount === 0 ? (
              <EmptyState label="You're all caught up ✓" />
            ) : (
              <div className="space-y-2 flex-1">
                {queue!.essaysAwaitingReview.items.map((r) => (
                  <Link
                    key={r.reviewId}
                    href="/educator/essay-reviews"
                    className="block p-3 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 transition-all"
                  >
                    <p className="text-sm font-semibold text-primary truncate">{r.essayTitle}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="truncate">{r.studentName}</span>
                      <span>&middot;</span>
                      <span className="flex-shrink-0">waited {timeAgo(r.submittedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {reviewCount > 0 && (
              <Link href="/educator/essay-reviews" className="text-sm font-semibold text-emerald-600 hover:underline mt-3 inline-block">
                Review all →
              </Link>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-base font-bold font-display text-primary leading-tight">Upcoming deadlines</h3>
            </div>
            <SectionLabel count={deadlineCount} tone="red">This month</SectionLabel>
            {deadlineCount === 0 ? (
              <EmptyState label="No deadlines coming up ✓" />
            ) : (
              <div className="space-y-2 flex-1">
                {queue!.upcomingDeadlines.items.map((d, i) => {
                  const urgent = d.daysLeft <= 7;
                  const warn = !urgent && d.daysLeft <= 14;
                  const pill = urgent
                    ? 'bg-red-100 text-red-600'
                    : warn
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-slate-100 text-slate-500';
                  return (
                    <Link
                      key={`${d.studentId}-${d.school}-${i}`}
                      href={`/educator/student/${d.studentId}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-slate-100 hover:border-red-200 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{d.school}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="truncate">{d.studentName}</span>
                          <span>&middot;</span>
                          <span className="flex-shrink-0">{d.type}</span>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold ${pill}`}>
                        {d.daysLeft}d
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* At-risk students */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.99l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" /></svg>
              </div>
              <h3 className="text-base font-bold font-display text-primary leading-tight">Students who may need a nudge</h3>
            </div>
            <SectionLabel count={atRiskCount} tone="amber">At risk</SectionLabel>
            {atRiskCount === 0 ? (
              <EmptyState label="Everyone's active ✓" />
            ) : (
              <div className="space-y-2 flex-1">
                {queue!.atRiskStudents.items.map((s) => (
                  <Link
                    key={s.studentId}
                    href={`/educator/student/${s.studentId}`}
                    className="block p-3 rounded-xl bg-surface border border-slate-100 hover:border-amber-200 transition-all"
                  >
                    <p className="text-sm font-semibold text-primary truncate">{s.studentName}</p>
                    <p className="text-xs text-amber-600 mt-0.5 truncate">{s.reason}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Key stats strip */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Your numbers</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 dash-card-hover"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center opacity-80`}>
                    {stat.icon === 'students' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )}
                    {stat.icon === 'today' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    {stat.icon === 'revenue' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    )}
                    {stat.icon === 'total' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>
                </div>
                <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming sessions + quick actions */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-lg font-bold font-display text-primary">Upcoming Sessions</h3>
              </div>
              <Link href="/educator/schedule" className="text-sm font-semibold text-emerald-600 hover:underline">View All</Link>
            </div>

            {(!data?.recentBookings || data.recentBookings.length === 0) ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No upcoming sessions.</p>
                <Link href="/educator/schedule" className="text-sm font-semibold text-emerald-600 hover:underline mt-2 inline-block">
                  Add a session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-primary truncate">{booking.title}</p>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          booking.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{booking.studentName}</span>
                        <span>&middot;</span>
                        <span>{formatDate(booking.date)} at {formatTime(booking.date)}</span>
                        <span>&middot;</span>
                        <span>{booking.duration}m</span>
                      </div>
                    </div>
                    {booking.meetingLink && booking.status === 'scheduled' && (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        Join
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-lg font-bold font-display text-primary">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link href="/educator/schedule" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Book a Session</p>
                  <p className="text-xs text-slate-500 mt-0.5">Schedule a new lesson with a student</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/educator/students" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Add a Student</p>
                  <p className="text-xs text-slate-500 mt-0.5">Register a new student to your roster</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/educator/essay-reviews" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Review Essays</p>
                  <p className="text-xs text-slate-500 mt-0.5">Give feedback on student essays</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/educator/settings" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Meeting Links</p>
                  <p className="text-xs text-slate-500 mt-0.5">Set up Zoom & Google Meet integration</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </EducatorDashboardLayout>
  );
}

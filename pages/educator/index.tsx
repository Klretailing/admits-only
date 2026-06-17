import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

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

export default function EducatorOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') {
      router.push('/dashboard');
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

  const stats = [
    { label: 'Total Students', value: data?.totalStudents || 0, icon: 'students', color: 'bg-emerald-500', href: '/educator/students' },
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
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Educator'}
          </h1>
          <p className="mt-1 text-slate-500">Here&apos;s your teaching business at a glance.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl border border-slate-100 p-5 dash-card-enter visible dash-card-hover"
              style={{ transitionDelay: `${i * 100}ms` }}
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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
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
          <div className="bg-white rounded-2xl border border-slate-100 p-6 dash-card-hover">
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
              <Link href="/educator/services" className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Manage Services</p>
                  <p className="text-xs text-slate-500 mt-0.5">Create or edit your service packages</p>
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

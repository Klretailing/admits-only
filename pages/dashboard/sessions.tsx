import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

const sessions = [
  { title: 'SAT Math Review', coach: 'Dr. Patel', date: 'Tomorrow, 4:00 PM', type: '1:1', status: 'upcoming' },
  { title: 'Common App Essay Draft 2', coach: 'Sarah M.', date: 'Wed, 3:30 PM', type: 'Essay Review', status: 'upcoming' },
  { title: 'STEM Research Check-in', coach: 'Prof. Liu', date: 'Fri, 5:00 PM', type: 'Cohort', status: 'upcoming' },
  { title: 'College List Strategy', coach: 'Sarah M.', date: 'Last Monday', type: '1:1', status: 'completed' },
  { title: 'SAT Reading & Writing Practice', coach: 'Dr. Patel', date: 'Last Friday', type: '1:1', status: 'completed' },
  { title: 'Essay Brainstorm Workshop', coach: 'Sarah M.', date: '2 weeks ago', type: 'Group', status: 'completed' },
];

export default function Sessions() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);
  if (status !== 'authenticated') return null;

  const upcoming = sessions.filter((s) => s.status === 'upcoming');
  const completed = sessions.filter((s) => s.status === 'completed');

  return (
    <DashboardLayout>
      <Head><title>Sessions | AdmitsOnly Dashboard</title></Head>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-md shadow-accent/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Sessions</h1>
            <p className="mt-0.5 text-sm text-slate-500">Manage your upcoming and past coaching sessions.</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent status-pulse" />
            <h2 className="text-lg font-bold text-primary">Upcoming</h2>
          </div>
          <div className="space-y-3">
            {upcoming.map((s, i) => (
              <div key={s.title + s.date} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 dash-card-hover">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-accent/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary">{s.title}</p>
                  <p className="text-sm text-slate-500">{s.coach} &middot; <span className="px-1.5 py-0.5 rounded-md bg-accent/5 text-accent text-[11px] font-semibold">{s.type}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-accent">{s.date}</p>
                  <button className="mt-1 text-xs font-semibold text-white bg-accent px-3 py-1 rounded-lg hover:bg-accent/90 transition-all shadow-sm shadow-accent/20">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-primary mb-4">Completed</h2>
          <div className="space-y-3">
            {completed.map((s) => (
              <div key={s.title + s.date} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary">{s.title}</p>
                  <p className="text-sm text-slate-500">{s.coach} &middot; {s.type}</p>
                </div>
                <span className="text-sm text-slate-400">{s.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

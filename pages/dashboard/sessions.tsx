import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

interface SessionData {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: string;
  meetingLink: string;
  platform: string;
  amount: number;
  paid: boolean;
  notes: string;
  studentName: string;
  educatorName: string;
  serviceName: string | null;
  serviceType: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const dayMs = 86400000;

  // For upcoming sessions, show relative labels
  if (diff > 0 && diff < dayMs) {
    return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diff > 0 && diff < 2 * dayMs) {
    return `Tomorrow, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  // For past sessions, show relative labels
  if (diff < 0 && Math.abs(diff) < dayMs) {
    return 'Today';
  }
  if (diff < 0 && Math.abs(diff) < 2 * dayMs) {
    return 'Yesterday';
  }
  if (diff < 0 && Math.abs(diff) < 7 * dayMs) {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    return `Last ${dayName}`;
  }

  // Default: full date with time
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatAmount(amount: number): string {
  if (amount === 0) return '';
  return `$${amount.toFixed(0)}`;
}

function getStatusLabel(status: string, date: string): 'upcoming' | 'completed' | 'cancelled' {
  if (status === 'cancelled' || status === 'no_show') return 'cancelled';
  if (status === 'completed') return 'completed';
  // If scheduled, check if it's in the future or past
  const d = new Date(date);
  return d.getTime() > Date.now() ? 'upcoming' : 'completed';
}

export default function Sessions() {
  const { status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/student/sessions')
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status !== 'authenticated') return null;

  const upcoming = sessions.filter((s) => getStatusLabel(s.status, s.date) === 'upcoming');
  const completed = sessions.filter((s) => getStatusLabel(s.status, s.date) === 'completed');
  const cancelled = sessions.filter((s) => getStatusLabel(s.status, s.date) === 'cancelled');

  return (
    <DashboardLayout>
      <Head><title>Sessions | AdmitsOnly Dashboard</title></Head>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Sessions</h1>
            <p className="mt-0.5 text-sm text-slate-500">Manage your upcoming and past coaching sessions.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-3 text-sm text-slate-500">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary mb-2">No sessions yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-1">
              Sessions with your tutor will show up here once scheduled.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Connect with a tutor through your connection code in settings, then they can book sessions with you.
            </p>
          </div>
        ) : (
          <>
            {/* Upcoming sessions */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-accent status-pulse" />
                <h2 className="text-lg font-bold text-primary">Upcoming</h2>
                {upcoming.length > 0 && (
                  <span className="text-xs text-slate-400 ml-1">({upcoming.length})</span>
                )}
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-400 pl-4">No upcoming sessions scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 dash-card-hover">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary">{s.title}</p>
                        <p className="text-sm text-slate-500">
                          {s.educatorName}
                          {s.serviceName && (
                            <> &middot; <span className="px-1.5 py-0.5 rounded-md bg-accent/5 text-accent text-[11px] font-semibold">{s.serviceName}</span></>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDuration(s.duration)}
                          {formatAmount(s.amount) && <> &middot; {formatAmount(s.amount)}{!s.paid && <span className="text-amber-500 ml-1">unpaid</span>}</>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-accent">{formatDate(s.date)}</p>
                        {s.meetingLink ? (
                          <a
                            href={s.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-white bg-accent px-3 py-1 rounded-lg hover:bg-accent/90 transition-all shadow-sm"
                          >
                            Join
                          </a>
                        ) : (
                          <span className="mt-1 inline-block text-xs font-medium text-slate-400 px-3 py-1 rounded-lg bg-slate-50">
                            {s.platform === 'in_person' ? 'In Person' : 'Link TBD'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed sessions */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-primary mb-4">Completed</h2>
                <div className="space-y-3">
                  {completed.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary">{s.title}</p>
                        <p className="text-sm text-slate-500">
                          {s.educatorName}
                          {s.serviceName && <> &middot; {s.serviceName}</>}
                        </p>
                        {s.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">Notes: {s.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm text-slate-400">{formatDate(s.date)}</span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDuration(s.duration)}
                          {formatAmount(s.amount) && <> &middot; {formatAmount(s.amount)}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled sessions */}
            {cancelled.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-primary mb-4">Cancelled</h2>
                <div className="space-y-3">
                  {cancelled.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 opacity-50 hover:opacity-80 transition-opacity">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary line-through">{s.title}</p>
                        <p className="text-sm text-slate-500">{s.educatorName}</p>
                      </div>
                      <span className="text-sm text-slate-400">{formatDate(s.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

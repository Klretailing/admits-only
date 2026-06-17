import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import ParentLayout from '../../components/ParentLayout';

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  submitted: { label: 'Submitted', color: 'bg-teal-50 text-teal-600' },
  accepted: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-500' },
  waitlisted: { label: 'Waitlisted', color: 'bg-amber-50 text-amber-600' },
  deferred: { label: 'Deferred', color: 'bg-orange-50 text-orange-500' },
  researching: { label: 'Researching', color: 'bg-slate-100 text-slate-500' },
};

const TYPE_BADGE: Record<string, string> = {
  EA: 'bg-blue-50 text-blue-600 border-blue-200', ED: 'bg-purple-50 text-purple-600 border-purple-200',
  ED2: 'bg-violet-50 text-violet-600 border-violet-200', RD: 'bg-slate-50 text-slate-600 border-slate-200',
  REA: 'bg-indigo-50 text-indigo-600 border-indigo-200', Rolling: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Regular Decision': 'bg-slate-50 text-slate-600 border-slate-200',
};

interface AppData {
  id: string; name: string; deadline: string; type: string;
  status: string; tasks: { id: string; label: string; done: boolean }[];
}

export default function ParentProgress() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [apps, setApps] = useState<AppData[]>([]);
  const [studentName, setStudentName] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview').then(r => r.json()).then(data => {
      setConnected(data.connected);
      if (data.students?.length) {
        setStudentName(data.students[0].name);
        setApps(data.students[0].applications || []);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  const totalTasks = apps.reduce((s, a) => s + (a.tasks?.length || 0), 0);
  const doneTasks = apps.reduce((s, a) => s + (a.tasks?.filter(t => t.done).length || 0), 0);
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const submitted = apps.filter(a => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(a.status)).length;

  const sortedApps = [...apps].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const getDaysUntil = (d: string) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  };

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <Head><title>Progress | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ParentLayout>
    );
  }

  if (connected === false) {
    return (
      <ParentLayout>
        <Head><title>Progress | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-4">Enter your student&apos;s connection code to view their progress.</p>
            <button onClick={() => router.push('/parent/settings')} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600">Go to Settings</button>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <Head><title>Progress | AdmitsOnly Parent</title></Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Application Progress</h1>
          <p className="text-sm text-slate-500 mt-1">{studentName ? `${studentName}'s` : 'Your student\'s'} checklist status</p>
        </div>

        {/* Overall Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Progress Ring */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#0d9488" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${overallPct * 2.64} 264`}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold font-display text-primary">{overallPct}%</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <p className="text-2xl font-bold font-display text-primary">{apps.length}</p>
                <p className="text-xs text-slate-400">Schools</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-teal-600">{submitted}</p>
                <p className="text-xs text-slate-400">Submitted</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-primary">{doneTasks}<span className="text-sm text-slate-300">/{totalTasks}</span></p>
                <p className="text-xs text-slate-400">Tasks Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Per-School Cards */}
        {sortedApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-sm text-slate-400">No applications tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedApps.map(app => {
              const isExpanded = expandedApp === app.id;
              const si = STATUS_INFO[app.status] || STATUS_INFO.not_started;
              const completed = app.tasks?.filter(t => t.done).length || 0;
              const total = app.tasks?.length || 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              const days = getDaysUntil(app.deadline);
              const isUrgent = days !== null && days >= 0 && days <= 7 && !['submitted', 'accepted'].includes(app.status);

              return (
                <div key={app.id} className={`bg-white rounded-2xl border transition-all ${
                  isExpanded ? 'border-teal-200 shadow-sm' : 'border-slate-100'
                } ${isUrgent ? 'ring-2 ring-amber-200' : ''}`}>
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    className="w-full flex items-center gap-3 p-4 lg:p-5 text-left"
                  >
                    <svg className={`w-4 h-4 text-slate-300 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm lg:text-base font-bold text-primary truncate">{app.name}</h3>
                        {app.type && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${TYPE_BADGE[app.type] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{app.type}</span>
                        )}
                      </div>
                      {app.deadline && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {days !== null && days >= 0 && (
                            <span className={`ml-2 font-semibold ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}
                            </span>
                          )}
                          {days !== null && days < 0 && <span className="ml-2 font-semibold text-slate-300">Past due</span>}
                        </p>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 w-8">{pct}%</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${si.color}`}>{si.label}</span>
                  </button>

                  {/* Expanded checklist (read-only) */}
                  {isExpanded && app.tasks && (
                    <div className="px-4 lg:px-5 pb-5 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-3">Checklist ({completed}/{total})</p>
                      <div className="space-y-1.5">
                        {app.tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 ${
                              task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-200'
                            }`}>
                              {task.done && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-primary'}`}>{task.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mobile progress */}
                      <div className="sm:hidden mt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ParentLayout>
  );
}

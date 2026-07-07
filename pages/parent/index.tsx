import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';

interface Milestone { type: string; label: string; date: string | null; }
interface Deadline { school: string; type: string; deadline: string; daysLeft: number; }
interface ParentAction { label: string; reason: string; urgency: string; }
interface OnTrack {
  schoolsTotal: number; submitted: number; accepted: number;
  essaysInProgress: number; essaysComplete: number; tasksDone: number; tasksTotal: number;
}
interface Digest {
  recentActivity: Milestone[];
  upcomingDeadlines: Deadline[];
  parentActionNeeded: ParentAction[];
  onTrack: OnTrack;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysLabel(d: number): string {
  if (d === 0) return 'Due today';
  if (d === 1) return '1 day left';
  return `${d} days left`;
}

// Urgency color for a deadline: red <= 7, amber <= 14, else slate.
function deadlineTone(days: number) {
  if (days <= 7) return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
  if (days <= 14) return { text: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
  return { text: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-300' };
}

function actionTone(urgency: string) {
  if (urgency === 'high') return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', dot: 'bg-red-500' };
  if (urgency === 'medium') return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' };
  return { text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-100', dot: 'bg-teal-500' };
}

const EMPTY_DIGEST: Digest = {
  recentActivity: [], upcomingDeadlines: [], parentActionNeeded: [],
  onTrack: { schoolsTotal: 0, submitted: 0, accepted: 0, essaysInProgress: 0, essaysComplete: 0, tasksDone: 0, tasksTotal: 0 },
};

export default function ParentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview')
      .then(function(r) { return r.json(); })
      .then(function(d) { setOverview(d); setLoading(false); })
      .catch(function(e) { setError(e.message); setLoading(false); });
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <Head><title>Parent Dashboard | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ParentLayout>
    );
  }

  if (error) {
    return (
      <ParentLayout>
        <Head><title>Parent Dashboard | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-500 mb-2">Something went wrong</p>
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        </div>
      </ParentLayout>
    );
  }

  if (!overview || !overview.connected) {
    return (
      <ParentLayout>
        <Head><title>Parent Dashboard | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-4">Enter your student&apos;s connection code to view their progress.</p>
            <button onClick={function() { router.push('/parent/settings'); }} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600">
              Go to Settings
            </button>
          </div>
        </div>
      </ParentLayout>
    );
  }

  const student = overview.students && overview.students[0];
  const digest: Digest = (student && student.digest) || EMPTY_DIGEST;
  const onTrack = digest.onTrack || EMPTY_DIGEST.onTrack;

  const parentName = (session && session.user && session.user.name) ? session.user.name.split(' ')[0] : 'Parent';
  const studentName = (student && student.name) ? student.name.split(' ')[0] : 'your student';

  // One-line summary sentence.
  const weekDeadlines = digest.upcomingDeadlines.filter((d) => d.daysLeft <= 7).length;
  const wins = digest.recentActivity.length;
  const summaryParts: string[] = [];
  if (weekDeadlines > 0) summaryParts.push(`${weekDeadlines} deadline${weekDeadlines === 1 ? '' : 's'} this week`);
  const essayWins = digest.recentActivity.filter((a) => a.type === 'essay_complete').length;
  if (essayWins > 0) summaryParts.push(`finished ${essayWins} essay${essayWins === 1 ? '' : 's'}`);
  else if (wins > 0) summaryParts.push(`${wins} recent update${wins === 1 ? '' : 's'}`);
  const summary = summaryParts.length > 0
    ? `${studentName} has ${summaryParts.join(' and ')}.`
    : `${studentName} has no new deadlines this week — all quiet for now.`;

  const statTiles = [
    { label: 'Schools', value: String(onTrack.schoolsTotal) },
    { label: 'Submitted', value: String(onTrack.submitted) },
    { label: 'Accepted', value: String(onTrack.accepted) },
    { label: 'Essays Done', value: `${onTrack.essaysComplete}` },
    { label: 'Essays Active', value: `${onTrack.essaysInProgress}` },
    { label: 'Tasks Done', value: `${onTrack.tasksDone}/${onTrack.tasksTotal}` },
  ];

  const quickLinks = [
    { href: '/parent/progress', title: 'Progress', desc: 'Task checklists' },
    { href: '/parent/calendar', title: 'Calendar', desc: 'Deadline overview' },
    { href: '/parent/financial', title: 'Financial', desc: 'Compare costs' },
    { href: '/parent/compare', title: 'Compare', desc: 'Side by side' },
  ];

  return (
    <ParentLayout>
      <Head><title>Parent Dashboard | AdmitsOnly</title></Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Greeting + one-line summary */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">{greeting()}, {parentName}</h1>
          <p className="text-sm text-slate-500 mt-1">{summary}</p>
        </div>

        {/* This Week */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">This Week with {studentName}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Recent activity / wins */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-primary">Recent activity</h3>
              </div>
              {digest.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No new activity this week.</p>
              ) : (
                <div className="space-y-2.5">
                  {digest.recentActivity.map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base leading-5 shrink-0">
                        {m.type === 'app_accepted' ? '🎉' : m.type === 'essay_complete' ? '✅' : m.type === 'app_submitted' ? '📨' : '✏️'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-primary">
                          {m.type === 'essay_complete' || m.type === 'app_accepted' ? (
                            <span className="font-semibold text-emerald-700">{studentName} </span>
                          ) : (
                            <span className="font-semibold">{studentName} </span>
                          )}
                          <span className="text-slate-600">{m.label.replace(/^Finished /, 'finished ').replace(/^Accepted /, 'was accepted ').replace(/^Submitted /, 'submitted ').replace(/^Worked on /, 'worked on ')}</span>
                        </p>
                        {m.date && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming deadlines */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <h3 className="text-sm font-bold text-primary">Upcoming deadlines</h3>
              </div>
              {digest.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No deadlines in the next 30 days.</p>
              ) : (
                <div className="space-y-2">
                  {digest.upcomingDeadlines.map((d, i) => {
                    const tone = deadlineTone(d.daysLeft);
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{d.school}</p>
                          <p className="text-xs text-slate-400">{d.type ? d.type + ' • ' : ''}{d.deadline}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${tone.bg} ${tone.text}`}>
                          {daysLabel(d.daysLeft)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Needs your attention — parent-owned to-dos */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <h3 className="text-sm font-bold text-primary">Needs your attention</h3>
                </div>
                <Link href="/parent/action-items" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                  View all →
                </Link>
              </div>
              {digest.parentActionNeeded.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Nothing needs a parent right now. We&apos;ll flag FAFSA, deposits, and fee waivers here.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {digest.parentActionNeeded.map((a, i) => {
                    const tone = actionTone(a.urgency);
                    return (
                      <Link key={i} href="/parent/action-items" className={`block p-4 rounded-xl border ${tone.border} ${tone.bg} hover:shadow-sm transition-all`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          <p className={`text-sm font-bold ${tone.text}`}>{a.label}</p>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{a.reason}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* On-track snapshot */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">On-track snapshot</p>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {statTiles.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-400 font-medium mb-1">{stat.label}</p>
                <span className="text-xl font-bold font-display text-primary">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-teal-200 transition-all">
              <p className="text-sm font-semibold text-primary">{l.title}</p>
              <p className="text-xs text-slate-400 mt-1">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </ParentLayout>
  );
}

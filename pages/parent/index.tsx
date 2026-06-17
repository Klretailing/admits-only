import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';

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

  var student = overview.students && overview.students[0];
  var apps = (student && student.applications) || [];
  var schoolsCount = apps.length;
  var submittedCount = 0;
  var acceptedCount = 0;
  var totalTasks = 0;
  var doneTasks = 0;

  for (var i = 0; i < apps.length; i++) {
    var a = apps[i];
    var s = a.status || '';
    if (s === 'submitted' || s === 'accepted' || s === 'rejected' || s === 'waitlisted' || s === 'deferred') submittedCount++;
    if (s === 'accepted') acceptedCount++;
    var tasks = a.tasks || [];
    totalTasks += tasks.length;
    for (var j = 0; j < tasks.length; j++) {
      if (tasks[j].done) doneTasks++;
    }
  }

  var parentName = (session && session.user && session.user.name) ? session.user.name.split(' ')[0] : 'Parent';
  var studentName = (student && student.name) ? student.name.split(' ')[0] : 'your student';

  return (
    <ParentLayout>
      <Head><title>Parent Dashboard | AdmitsOnly</title></Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Welcome, {parentName}</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s how {studentName}&apos;s applications are going</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Schools', value: String(schoolsCount) },
            { label: 'Submitted', value: String(submittedCount) },
            { label: 'Accepted', value: String(acceptedCount) },
            { label: 'Tasks Done', value: doneTasks + '/' + totalTasks },
          ].map(function(stat) {
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-sm text-slate-500 font-medium mb-2">{stat.label}</p>
                <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
              </div>
            );
          })}
        </div>

        {/* Applications list */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-lg font-bold font-display text-primary mb-4">Applications</h3>
          {apps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No applications tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {apps.map(function(app: any) {
                return (
                  <div key={app.id || app.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-primary">{app.name}</p>
                      <p className="text-xs text-slate-400">{app.type || ''} {app.deadline ? '• Due ' + app.deadline : ''}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                      {(app.status || 'not_started').replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/parent/progress" className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal-200 transition-all">
            <p className="text-sm font-semibold text-primary">Progress Tracker</p>
            <p className="text-xs text-slate-400 mt-1">View task checklists</p>
          </Link>
          <Link href="/parent/calendar" className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal-200 transition-all">
            <p className="text-sm font-semibold text-primary">Calendar</p>
            <p className="text-xs text-slate-400 mt-1">Deadline overview</p>
          </Link>
          <Link href="/parent/financial" className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal-200 transition-all">
            <p className="text-sm font-semibold text-primary">Financial Planner</p>
            <p className="text-xs text-slate-400 mt-1">Compare costs</p>
          </Link>
        </div>
      </div>
    </ParentLayout>
  );
}

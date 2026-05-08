import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';
import { colleges, type College } from '../../lib/colleges';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

interface ApplicationTask {
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
  tasks: ApplicationTask[];
  notes: string;
}

interface StudentProfile {
  gpa: number;
  satMath: number;
  satRW: number;
  holisticScore: number;
}

interface Student {
  id: string;
  name: string;
  applications: Application[];
  profile: StudentProfile | null;
  essays: Array<{ id: string; title: string; status: string; overallScore: number }>;
}

interface OverviewData {
  connected: boolean;
  students: Student[];
}

/* ══════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════ */

const STATUS_LABELS: Record<Application['status'], string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  deferred: 'Deferred',
};

const STATUS_COLORS: Record<Application['status'], string> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-600',
  submitted: 'bg-teal-50 text-teal-600',
  accepted: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-500',
  waitlisted: 'bg-amber-50 text-amber-600',
  deferred: 'bg-orange-50 text-orange-500',
};

function findCollegeByName(name: string): College | undefined {
  const lower = name.toLowerCase().trim();
  return colleges.find(
    (c) => c.name.toLowerCase() === lower || c.id === lower
  );
}

function rateColor(value: number, thresholds: { green: number; amber: number }, invert = false): string {
  // invert: lower is better (e.g. acceptance rate)
  if (invert) {
    if (value <= thresholds.green) return 'text-emerald-600 bg-emerald-50';
    if (value <= thresholds.amber) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
  }
  if (value >= thresholds.green) return 'text-emerald-600 bg-emerald-50';
  if (value >= thresholds.amber) return 'text-amber-600 bg-amber-50';
  return 'text-red-500 bg-red-50';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function CollegeComparison() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview')
      .then((r) => r.json())
      .then((data: OverviewData) => {
        setOverview(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const toggleSelection = (appId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        if (next.size >= 3) return prev; // max 3
        next.add(appId);
      }
      return next;
    });
  };

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </ParentLayout>
    );
  }

  // Not connected state
  if (overview && !overview.connected) {
    return (
      <ParentLayout>
        <Head>
          <title>College Comparison | AdmitsOnly Parent</title>
        </Head>
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary mb-2">Connect to Your Student</h3>
            <p className="text-sm text-slate-400 mb-5">Link your account to your student to compare colleges from their application list.</p>
            <Link
              href="/parent/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/20"
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

  // Gather all applications from all students
  const allApps: (Application & { studentName: string })[] = [];
  for (const student of overview?.students || []) {
    for (const app of student.applications) {
      allApps.push({ ...app, studentName: student.name });
    }
  }

  const selectedApps = allApps.filter((a) => selectedIds.has(a.id));

  // Build comparison data for selected apps
  const comparisonRows: {
    label: string;
    key: string;
    values: { appId: string; display: string; colorClass: string }[];
  }[] = [];

  if (selectedApps.length >= 2) {
    const entries = selectedApps.map((app) => {
      const college = findCollegeByName(app.name);
      const totalTasks = app.tasks?.length || 0;
      const doneTasks = app.tasks?.filter((t: any) => t.done).length || 0;
      const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const annualCost = college ? (college.type === 'Private' ? 62000 : 28000) : null;
      return { app, college, taskPct, annualCost };
    });

    // Acceptance Rate
    comparisonRows.push({
      label: 'Acceptance Rate',
      key: 'acceptanceRate',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? `${e.college.acceptanceRate}%` : 'Data not available',
        colorClass: e.college
          ? rateColor(e.college.acceptanceRate, { green: 15, amber: 35 }, true)
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // Avg GPA
    comparisonRows.push({
      label: 'Avg GPA',
      key: 'avgGPA',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? e.college.avgGPA.toFixed(2) : 'Data not available',
        colorClass: e.college
          ? rateColor(e.college.avgGPA, { green: 3.8, amber: 3.5 })
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // SAT Range
    comparisonRows.push({
      label: 'SAT Range',
      key: 'satRange',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? `${e.college.satRange[0]}-${e.college.satRange[1]}` : 'Data not available',
        colorClass: e.college
          ? rateColor(e.college.satRange[0], { green: 1400, amber: 1200 })
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // Location
    comparisonRows.push({
      label: 'Location',
      key: 'location',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? e.college.location : 'Data not available',
        colorClass: e.college ? 'text-primary bg-white' : 'text-slate-400 bg-slate-50',
      })),
    });

    // Type
    comparisonRows.push({
      label: 'Type (Private/Public)',
      key: 'type',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? e.college.type : 'Data not available',
        colorClass: e.college
          ? e.college.type === 'Private'
            ? 'text-purple-600 bg-purple-50'
            : 'text-blue-600 bg-blue-50'
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // Size
    comparisonRows.push({
      label: 'Size',
      key: 'size',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? e.college.size : 'Data not available',
        colorClass: e.college ? 'text-primary bg-white' : 'text-slate-400 bg-slate-50',
      })),
    });

    // Strengths
    comparisonRows.push({
      label: 'Strengths',
      key: 'strengths',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.college ? e.college.strengths.join(', ') : 'Data not available',
        colorClass: e.college ? 'text-primary bg-white' : 'text-slate-400 bg-slate-50',
      })),
    });

    // Est. Annual Cost
    comparisonRows.push({
      label: 'Est. Annual Cost',
      key: 'annualCost',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.annualCost ? formatCurrency(e.annualCost) : 'Data not available',
        colorClass: e.annualCost
          ? rateColor(e.annualCost, { green: 30000, amber: 50000 }, true)
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // Est. 4-Year Cost
    comparisonRows.push({
      label: 'Est. 4-Year Cost',
      key: 'fourYearCost',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: e.annualCost ? formatCurrency(e.annualCost * 4) : 'Data not available',
        colorClass: e.annualCost
          ? rateColor(e.annualCost * 4, { green: 120000, amber: 200000 }, true)
          : 'text-slate-400 bg-slate-50',
      })),
    });

    // Application Status
    comparisonRows.push({
      label: 'Application Status',
      key: 'appStatus',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: STATUS_LABELS[e.app.status],
        colorClass: STATUS_COLORS[e.app.status],
      })),
    });

    // Task Progress %
    comparisonRows.push({
      label: 'Task Progress',
      key: 'taskProgress',
      values: entries.map((e) => ({
        appId: e.app.id,
        display: `${e.taskPct}%`,
        colorClass: rateColor(e.taskPct, { green: 80, amber: 40 }),
      })),
    });
  }

  return (
    <ParentLayout>
      <Head>
        <title>College Comparison | AdmitsOnly Parent</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-display text-primary tracking-tight">
            College Comparison
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Compare schools on what matters to your family
          </p>
        </div>

        {/* School Selector */}
        {allApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary mb-2">No Applications Yet</h3>
            <p className="text-sm text-slate-400">Your student hasn&apos;t added any schools to compare yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-primary">Select Schools to Compare</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose 2-3 schools ({selectedIds.size}/3 selected)
                  </p>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allApps.map((app) => {
                  const isSelected = selectedIds.has(app.id);
                  const college = findCollegeByName(app.name);
                  const totalTasks = app.tasks.length;
                  const doneTasks = app.tasks.filter((t) => t.done).length;
                  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  const atLimit = selectedIds.size >= 3 && !isSelected;

                  return (
                    <button
                      key={app.id}
                      onClick={() => toggleSelection(app.id)}
                      disabled={atLimit}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 shadow-sm shadow-teal-500/10'
                          : atLimit
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-100 bg-white hover:border-teal-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`absolute top-3 right-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-200'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-primary pr-7 truncate">{app.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_COLORS[app.status]}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                        {college && (
                          <span className="text-[10px] text-slate-400">{college.type}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${taskPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">{taskPct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comparison Table */}
            {selectedApps.length >= 2 ? (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-primary">Side-by-Side Comparison</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comparing {selectedApps.map((a) => a.name).join(' vs ')}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="sticky top-0 bg-slate-50 z-10">
                        <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3 border-b border-slate-100 min-w-[160px]">
                          Metric
                        </th>
                        {selectedApps.map((app) => (
                          <th
                            key={app.id}
                            className="text-left text-[11px] font-bold text-teal-700 uppercase tracking-wider px-5 py-3 border-b border-slate-100 min-w-[180px]"
                          >
                            <div className="truncate max-w-[200px]">{app.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, idx) => (
                        <tr
                          key={row.key}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-teal-50/30 transition-colors`}
                        >
                          <td className="px-5 py-3 border-b border-slate-50 text-xs font-semibold text-slate-500">
                            {row.label}
                          </td>
                          {row.values.map((v) => (
                            <td key={v.appId} className="px-5 py-3 border-b border-slate-50">
                              {row.key === 'taskProgress' ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                                      style={{ width: v.display }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${v.colorClass}`}>
                                    {v.display}
                                  </span>
                                </div>
                              ) : row.key === 'appStatus' ? (
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${v.colorClass}`}>
                                  {v.display}
                                </span>
                              ) : row.key === 'strengths' ? (
                                <div className="flex flex-wrap gap-1">
                                  {v.display === 'Data not available' ? (
                                    <span className="text-xs text-slate-400 italic">{v.display}</span>
                                  ) : (
                                    v.display.split(', ').map((s, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100"
                                      >
                                        {s}
                                      </span>
                                    ))
                                  )}
                                </div>
                              ) : (
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                    v.display === 'Data not available' ? 'text-slate-400 italic bg-transparent' : v.colorClass
                                  }`}
                                >
                                  {v.display}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cost note */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-[11px] text-slate-400">
                    Cost estimates are based on average sticker prices (Private: $62,000/yr, Public: $28,000/yr).
                    Actual costs may vary significantly based on financial aid, scholarships, and residency status.
                  </p>
                </div>
              </div>
            ) : selectedIds.size === 1 ? (
              <div className="bg-white rounded-2xl border border-dashed border-teal-200 p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Select at least one more school to start comparing
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ParentLayout>
  );
}

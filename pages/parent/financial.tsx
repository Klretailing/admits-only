import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';
import { colleges } from '../../lib/colleges';

/* ─── Types ─── */

interface Task {
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
  tasks: Task[];
  notes: string;
}

interface StudentProfile {
  gpa: number;
  satMath: number;
  satRW: number;
  holisticScore: number;
}

interface Essay {
  id: string;
  title: string;
  status: string;
  overallScore: number;
}

interface Student {
  id: string;
  name: string;
  applications: Application[];
  profile: StudentProfile | null;
  essays: Essay[];
}

interface ParentOverview {
  connected: boolean;
  students: Student[];
}

/* ─── Cost Helpers ─── */

interface SchoolCost {
  name: string;
  schoolType: 'Private' | 'Public';
  annualCost: number;
  fourYearCost: number;
}

function estimateCost(schoolName: string): SchoolCost {
  const match = colleges.find(
    (c) => c.name.toLowerCase() === schoolName.toLowerCase()
  );

  if (match && match.type === 'Private') {
    return {
      name: schoolName,
      schoolType: 'Private',
      annualCost: 62000,
      fourYearCost: 62000 * 4,
    };
  }

  if (match && match.type === 'Public') {
    // Default to out-of-state for conservative estimate; show in-state too
    return {
      name: schoolName,
      schoolType: 'Public',
      annualCost: 28000,
      fourYearCost: 28000 * 4,
    };
  }

  // If we can't match the college, assume private
  return {
    name: schoolName,
    schoolType: 'Private',
    annualCost: 62000,
    fourYearCost: 62000 * 4,
  };
}

function affordabilityTier(annual: number): { label: string; color: string; bg: string } {
  if (annual < 30000) return { label: 'Affordable', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  if (annual < 50000) return { label: 'Moderate', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'Premium', color: 'text-red-700', bg: 'bg-red-100' };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ─── Page Component ─── */

export default function FinancialPlanner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ParentOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const student = data?.students?.[0];
  const apps = student?.applications || [];

  /* Cost data */
  const schoolCosts = useMemo(() => {
    return apps.map((a) => estimateCost(a.name));
  }, [apps]);

  const sortedByCost = useMemo(() => {
    return [...schoolCosts].sort((a, b) => a.annualCost - b.annualCost);
  }, [schoolCosts]);

  const maxAnnualCost = useMemo(() => {
    return schoolCosts.length > 0 ? Math.max(...schoolCosts.map((s) => s.annualCost)) : 0;
  }, [schoolCosts]);

  /* Summary stats */
  const totalFourYearMin = useMemo(() => {
    if (schoolCosts.length === 0) return 0;
    return Math.min(...schoolCosts.map((s) => s.fourYearCost));
  }, [schoolCosts]);

  const totalFourYearMax = useMemo(() => {
    if (schoolCosts.length === 0) return 0;
    return Math.max(...schoolCosts.map((s) => s.fourYearCost));
  }, [schoolCosts]);

  const avgAnnualCost = useMemo(() => {
    if (schoolCosts.length === 0) return 0;
    return Math.round(schoolCosts.reduce((sum, s) => sum + s.annualCost, 0) / schoolCosts.length);
  }, [schoolCosts]);

  if (status === 'loading' || loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  /* Not connected state */
  if (data && !data.connected) {
    return (
      <ParentLayout>
        <Head>
          <title>Financial Planner | AdmitsOnly</title>
        </Head>
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-6">
              Link your account to your student&apos;s profile to see financial planning data.
            </p>
            <Link
              href="/parent/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
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

  /* Empty state */
  if (apps.length === 0) {
    return (
      <ParentLayout>
        <Head>
          <title>Financial Planner | AdmitsOnly</title>
        </Head>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Financial Planner</h1>
            <p className="mt-1 text-slate-500">
              Compare estimated costs across your student&apos;s college list
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold font-display text-primary mb-2">No Schools Added Yet</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Once your student adds schools to their application list, you&apos;ll see estimated costs and financial comparisons here.
            </p>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <Head>
        <title>Financial Planner | AdmitsOnly</title>
      </Head>

      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Financial Planner</h1>
          <p className="mt-1 text-slate-500">
            Estimated costs for {student?.name?.split(' ')[0] || 'your student'}&apos;s college list
          </p>
        </div>

        {/* ─── Summary Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">4-Year Cost Range</p>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold font-display text-primary">
              {formatCurrency(totalFourYearMin)} &ndash; {formatCurrency(totalFourYearMax)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">Avg. Annual Cost</p>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold font-display text-primary">{formatCurrency(avgAnnualCost)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">Schools on List</p>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold font-display text-primary">{schoolCosts.length}</p>
          </div>
        </div>

        {/* ─── Cost Comparison Table ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary">Cost Comparison</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">School</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Annual</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. 4-Year</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                </tr>
              </thead>
              <tbody>
                {schoolCosts.map((sc, i) => {
                  const tier = affordabilityTier(sc.annualCost);
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-primary">{sc.name}</td>
                      <td className="py-3 px-3 text-slate-500">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          sc.schoolType === 'Private' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {sc.schoolType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-primary">{formatCurrency(sc.annualCost)}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(sc.fourYearCost)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${tier.bg} ${tier.color}`}>
                          {tier.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Public school note */}
          <p className="text-xs text-slate-400 mt-4">
            * Public university estimates use in-state tuition ($28k/yr). Out-of-state estimate is ~$48k/yr.
            Private university estimate is $62k/yr (tuition + room &amp; board). Actual costs vary.
          </p>
        </div>

        {/* ─── Cost Bar Chart (CSS) ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary">Annual Cost Comparison</h3>
          </div>

          <div className="space-y-3">
            {sortedByCost.map((sc, i) => {
              const pct = maxAnnualCost > 0 ? (sc.annualCost / maxAnnualCost) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-36 sm:w-48 text-sm font-medium text-primary truncate flex-shrink-0">
                    {sc.name}
                  </div>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-semibold text-slate-600 flex-shrink-0">
                    {formatCurrency(sc.annualCost)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Financial Aid Tips ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary">Financial Aid Tips</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: 'File FAFSA Early',
                desc: 'The Free Application for Federal Student Aid opens October 1. Filing early maximizes your aid eligibility since many programs are first-come, first-served.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: 'CSS Profile',
                desc: 'Many private colleges require the CSS Profile in addition to the FAFSA. Check each school\'s requirements early and note their individual deadlines.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                title: 'Merit Scholarships',
                desc: 'Research merit-based scholarships at each school. Many universities offer automatic merit aid based on GPA and test scores. Apply to schools where your student is in the top tier of applicants.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
              },
              {
                title: 'Compare Net Price',
                desc: 'Use each college\'s Net Price Calculator to get a personalized estimate. The sticker price rarely reflects what families actually pay after grants and scholarships.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: 'Appeal Financial Aid',
                desc: 'If an offer falls short, don\'t hesitate to contact the financial aid office. Especially if circumstances have changed or a competing school offered more, colleges may adjust your package.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
              {
                title: 'Outside Scholarships',
                desc: 'Encourage your student to apply for external scholarships through community organizations, employers, and national foundations. Even small awards add up over four years.',
                icon: (
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
              },
            ].map((tip, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  {tip.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary mb-1">{tip.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}

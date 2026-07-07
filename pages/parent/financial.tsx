import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ParentLayout from '../../components/ParentLayout';
import { colleges } from '../../lib/colleges';

/* ─────────────────────────── Types ─────────────────────────── */

interface Application {
  id: string;
  name: string;
  deadline: string;
  type: string;
  status: string;
}

interface Student {
  id: string;
  name: string;
  applications: Application[];
}

interface ParentOverview {
  connected: boolean;
  students: Student[];
}

interface Plan {
  id: string | null;
  studentId: string | null;
  annualBudget: number;
  savings: number;
  estimatedEFC: number | null;
  incomeBracket: string | null;
  notes: string;
  netCostOverrides: Record<string, number>;
}

interface Scholarship {
  id: string;
  name: string;
  amount: number;
  type: 'scholarship' | 'grant' | 'loan' | 'other';
  status: 'potential' | 'applied' | 'awarded' | 'declined';
  schoolName: string | null;
  deadline: string | null;
  notes: string;
}

/* ─────────────────────── Cost / aid model ─────────────────────── */
// All figures below are transparent, clearly-labeled ESTIMATES — not quotes.

const STICKER = {
  private: 62000,
  publicInState: 28000,
  publicOutState: 48000,
};

// Income brackets drive a simple, transparent grant-aid heuristic.
// aidPct = share of sticker price we assume grant aid covers at that income.
const INCOME_BRACKETS: { value: string; label: string; aidPct: number }[] = [
  { value: 'under60', label: 'Under $60k', aidPct: 0.65 },
  { value: '60to110', label: '$60k – $110k', aidPct: 0.45 },
  { value: '110to200', label: '$110k – $200k', aidPct: 0.22 },
  { value: 'over200', label: 'Over $200k', aidPct: 0.07 },
];

function collegeType(name: string): 'Private' | 'Public' | null {
  const match = colleges.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match ? match.type : null;
}

function stickerFor(name: string, inState: boolean): number {
  const type = collegeType(name);
  if (type === 'Public') return inState ? STICKER.publicInState : STICKER.publicOutState;
  // Private, or unknown school -> treat as private (conservative).
  return STICKER.private;
}

function aidPctFor(bracket: string | null): number {
  const b = INCOME_BRACKETS.find((x) => x.value === bracket);
  return b ? b.aidPct : 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

function affordability(netAnnual: number, budgetAnnual: number): {
  label: string;
  chip: string;
  bar: string;
} {
  // No budget set yet — stay neutral.
  if (!budgetAnnual || budgetAnnual <= 0) {
    return { label: 'Set budget', chip: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300' };
  }
  if (netAnnual <= budgetAnnual) {
    return { label: 'Affordable', chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
  }
  if (netAnnual <= budgetAnnual * 1.25) {
    return { label: 'Moderate', chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' };
  }
  return { label: 'Stretch', chip: 'bg-red-100 text-red-700', bar: 'bg-red-500' };
}

/* ─────────────────────── Small UI helpers ─────────────────────── */

function EstimateTag() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 text-[10px] font-semibold uppercase tracking-wide">
      Estimate
    </span>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold font-display text-primary leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

const emptyPlan: Plan = {
  id: null,
  studentId: null,
  annualBudget: 0,
  savings: 0,
  estimatedEFC: null,
  incomeBracket: null,
  notes: '',
  netCostOverrides: {},
};

const emptyScholarshipForm = {
  name: '',
  amount: '',
  type: 'scholarship',
  status: 'potential',
  schoolName: '',
  deadline: '',
  notes: '',
};

export default function FinancialPlanner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // Per-school in-state toggle (publics only). Default = in-state.
  const [inStateMap, setInStateMap] = useState<Record<string, boolean>>({});
  // Projection target school.
  const [targetSchool, setTargetSchool] = useState<string>('');

  // Scholarship form
  const [schForm, setSchForm] = useState<typeof emptyScholarshipForm>(emptyScholarshipForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSchForm, setShowSchForm] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/parent/overview').then((r) => r.json()).catch(() => ({ connected: false, students: [] })),
      fetch('/api/parent/financial').then((r) => r.json()).catch(() => ({ plan: emptyPlan, scholarships: [] })),
    ])
      .then(([ov, fin]) => {
        setOverview(ov);
        if (fin?.plan) {
          setPlan({
            ...emptyPlan,
            ...fin.plan,
            annualBudget: Number(fin.plan.annualBudget) || 0,
            savings: Number(fin.plan.savings) || 0,
            estimatedEFC: fin.plan.estimatedEFC == null ? null : Number(fin.plan.estimatedEFC),
            netCostOverrides: fin.plan.netCostOverrides || {},
          });
        }
        if (Array.isArray(fin?.scholarships)) {
          setScholarships(
            fin.scholarships.map((s: any) => ({ ...s, amount: Number(s.amount) || 0 }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const student = overview?.students?.[0];
  const apps = useMemo(() => student?.applications || [], [student]);

  // Default the projection target once schools load.
  useEffect(() => {
    if (!targetSchool && apps.length > 0) setTargetSchool(apps[0].name);
  }, [apps, targetSchool]);

  const isInState = useCallback(
    (name: string) => (name in inStateMap ? inStateMap[name] : true),
    [inStateMap]
  );

  /* ── Persist plan ── */
  const savePlan = useCallback(
    async (next: Plan) => {
      setSavingPlan(true);
      setPlanSaved(false);
      try {
        const res = await fetch('/api/parent/financial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'savePlan',
            studentId: student?.id || null,
            annualBudget: next.annualBudget,
            savings: next.savings,
            estimatedEFC: next.estimatedEFC,
            incomeBracket: next.incomeBracket,
            notes: next.notes,
            netCostOverrides: next.netCostOverrides,
          }),
        });
        const data = await res.json();
        if (data?.plan) {
          setPlan((p) => ({ ...p, id: data.plan.id }));
        }
        setPlanSaved(true);
        setTimeout(() => setPlanSaved(false), 2000);
      } catch {
        /* non-fatal */
      } finally {
        setSavingPlan(false);
      }
    },
    [student]
  );

  const setOverride = useCallback(
    (name: string, value: string) => {
      const next = { ...plan.netCostOverrides };
      const num = Number(value);
      if (value === '' || !Number.isFinite(num) || num <= 0) {
        delete next[name];
      } else {
        next[name] = num;
      }
      const updated = { ...plan, netCostOverrides: next };
      setPlan(updated);
      savePlan(updated);
    },
    [plan, savePlan]
  );

  /* ── Scholarship totals ── */
  const scholarshipTotals = useMemo(() => {
    let potential = 0;
    let awarded = 0;
    for (const s of scholarships) {
      if (s.status === 'declined') continue;
      if (s.status === 'awarded') awarded += s.amount;
      else potential += s.amount;
    }
    return { potential, awarded };
  }, [scholarships]);

  const awardedForSchool = useCallback(
    (name: string) => {
      // Awarded aid tied to this school + school-agnostic awarded aid both count.
      return scholarships
        .filter((s) => s.status === 'awarded' && (!s.schoolName || s.schoolName === name))
        .reduce((sum, s) => sum + s.amount, 0);
    },
    [scholarships]
  );

  /* ── Per-school affordability rows ── */
  const rows = useMemo(() => {
    const aidPct = aidPctFor(plan.incomeBracket);
    return apps.map((a) => {
      const type = collegeType(a.name);
      const inState = isInState(a.name);
      const sticker = stickerFor(a.name, inState);
      const estAid = Math.round(sticker * aidPct);
      const override = plan.netCostOverrides[a.name];
      const hasOverride = typeof override === 'number' && override > 0;
      const netAnnual = hasOverride ? override : Math.max(0, sticker - estAid);
      const fourYear = netAnnual * 4;
      const tier = affordability(netAnnual, plan.annualBudget);
      const awarded = awardedForSchool(a.name);
      // Annual "gap to cover" = net − (annual budget + per-year share of awarded aid)
      const gap = Math.max(0, netAnnual - plan.annualBudget - awarded / 4);
      return {
        name: a.name,
        type: type || 'Private',
        isPublic: type === 'Public',
        inState,
        sticker,
        estAid,
        hasOverride,
        netAnnual,
        fourYear,
        tier,
        gap,
      };
    });
  }, [apps, plan, isInState, awardedForSchool]);

  const coverOverFour = (plan.annualBudget || 0) * 4 + (plan.savings || 0);

  /* ── Projection for target school ── */
  const projection = useMemo(() => {
    const row = rows.find((r) => r.name === targetSchool) || rows[0];
    if (!row) return null;
    const totalCost = row.fourYear;
    const savings = plan.savings || 0;
    const budgetContribution = (plan.annualBudget || 0) * 4;
    const awarded = scholarships
      .filter((s) => s.status === 'awarded' && (!s.schoolName || s.schoolName === row.name))
      .reduce((sum, s) => sum + s.amount, 0);
    const covered = savings + budgetContribution + awarded;
    const gap = Math.max(0, totalCost - covered);
    return { row, totalCost, savings, budgetContribution, awarded, covered, gap };
  }, [rows, targetSchool, plan, scholarships]);

  /* ── Scholarship CRUD ── */
  const resetSchForm = () => {
    setSchForm(emptyScholarshipForm);
    setEditingId(null);
    setShowSchForm(false);
  };

  const submitScholarship = async () => {
    if (!schForm.name.trim()) return;
    const payload = {
      name: schForm.name.trim(),
      amount: Number(schForm.amount) || 0,
      type: schForm.type,
      status: schForm.status,
      schoolName: schForm.schoolName || null,
      deadline: schForm.deadline || null,
      notes: schForm.notes || '',
    };
    try {
      if (editingId) {
        await fetch('/api/parent/financial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateScholarship', id: editingId, ...payload }),
        });
        setScholarships((list) =>
          list.map((s) => (s.id === editingId ? ({ ...s, ...payload } as Scholarship) : s))
        );
      } else {
        const res = await fetch('/api/parent/financial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addScholarship', studentId: student?.id || null, ...payload }),
        });
        const data = await res.json();
        if (data?.scholarship) {
          setScholarships((list) => [...list, { ...data.scholarship, amount: Number(data.scholarship.amount) || 0 }]);
        }
      }
    } catch {
      /* non-fatal */
    }
    resetSchForm();
  };

  const editScholarship = (s: Scholarship) => {
    setSchForm({
      name: s.name,
      amount: String(s.amount || ''),
      type: s.type,
      status: s.status,
      schoolName: s.schoolName || '',
      deadline: s.deadline || '',
      notes: s.notes || '',
    });
    setEditingId(s.id);
    setShowSchForm(true);
  };

  const deleteScholarship = async (id: string) => {
    setScholarships((list) => list.filter((s) => s.id !== id));
    try {
      await fetch('/api/parent/financial', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* non-fatal */
    }
  };

  /* ─────────────── Loading ─────────────── */
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

  /* ─────────────── Not connected ─────────────── */
  if (overview && !overview.connected) {
    return (
      <ParentLayout>
        <Head><title>Financial Planner | AdmitsOnly</title></Head>
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-6">
              Link your account to your student&apos;s profile to build a financial plan around their real college list.
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

  const firstName = student?.name?.split(' ')[0] || 'your student';

  return (
    <ParentLayout>
      <Head><title>Financial Planner | AdmitsOnly</title></Head>

      <div className="space-y-8 pb-12">
        {/* ─── Header ─── */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Financial Planner</h1>
          <p className="mt-1 text-slate-500">
            Plan and compare the real cost of {firstName}&apos;s college list. All figures are estimates until you
            enter a real award letter.
          </p>
        </div>

        {/* ─── 1. Family Budget ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <CardHeader
            title="Family budget"
            subtitle="What your family can put toward college each year, plus what you've saved."
            icon={
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Annual budget (per year)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={plan.annualBudget || ''}
                  onChange={(e) => setPlan({ ...plan, annualBudget: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Total savings (e.g. 529)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={plan.savings || ''}
                  onChange={(e) => setPlan({ ...plan, savings: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Household income</label>
              <select
                value={plan.incomeBracket || ''}
                onChange={(e) => setPlan({ ...plan, incomeBracket: e.target.value || null })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none bg-white"
              >
                <option value="">Select…</option>
                {INCOME_BRACKETS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Estimated EFC / SAI <span className="text-slate-300">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={plan.estimatedEFC ?? ''}
                  onChange={(e) => setPlan({ ...plan, estimatedEFC: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50">
              <div>
                <p className="text-xs text-teal-700 font-medium">You can cover about</p>
                <p className="text-xl font-bold font-display text-teal-800">{formatCurrency(coverOverFour)}</p>
              </div>
              <p className="text-xs text-teal-600 max-w-[14rem] leading-snug">
                over 4 years (annual budget &times; 4 + savings). Loans &amp; scholarships add to this.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {planSaved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
              <button
                onClick={() => savePlan(plan)}
                disabled={savingPlan}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {savingPlan ? 'Saving…' : 'Save budget'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Empty (connected, no schools) ─── */}
        {apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold font-display text-primary mb-2">No schools on the list yet</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Once {firstName} adds schools to their application list, you&apos;ll see per-school affordability,
              net-price estimates, and a 4-year projection here.
            </p>
          </div>
        ) : (
          <>
            {/* ─── 2. Affordability by school ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <CardHeader
                title="Affordability by school"
                subtitle="Estimated net price after aid, compared with your annual budget."
                icon={
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
              />

              {!plan.incomeBracket && (
                <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 text-xs">
                  Select a household income bracket above to estimate grant aid. Until then, net price shows the full
                  sticker price.
                </div>
              )}

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">School</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sticker / yr</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. aid / yr</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net / yr</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">4-year net</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Real net (award letter)</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.name} className="border-b border-slate-50 align-top">
                        <td className="py-3 px-3">
                          <div className="font-medium text-primary">{r.name}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              r.type === 'Private' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {r.type}
                            </span>
                            {r.isPublic && (
                              <button
                                onClick={() => setInStateMap((m) => ({ ...m, [r.name]: !r.inState }))}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700"
                              >
                                <span className={`w-2 h-2 rounded-full ${r.inState ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {r.inState ? 'In-state' : 'Out-of-state'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(r.sticker)}</td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {r.hasOverride ? <span className="text-slate-300">—</span> : formatCurrency(r.estAid)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-primary">
                          {formatCurrency(r.netAnnual)}
                          {r.hasOverride && (
                            <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-semibold">real</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(r.fourYear)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="relative w-28 ml-auto">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              min={0}
                              defaultValue={r.hasOverride ? plan.netCostOverrides[r.name] : ''}
                              onBlur={(e) => setOverride(r.name, e.target.value)}
                              placeholder="—"
                              className="w-full pl-5 pr-2 py-1.5 text-xs text-right rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${r.tier.chip}`}>
                            {r.tier.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                <EstimateTag />
                <p>
                  Sticker: Private ~{formatCurrency(STICKER.private)}, Public in-state ~{formatCurrency(STICKER.publicInState)},
                  Public out-of-state ~{formatCurrency(STICKER.publicOutState)} per year (tuition + room &amp; board).
                  Estimated aid is a rough heuristic from your income bracket, not a quote. For a personalized figure use each
                  college&apos;s official <span className="font-medium text-slate-500">Net Price Calculator</span>, then enter the
                  real net cost in the &ldquo;Real net&rdquo; column — it overrides the estimate everywhere.
                </p>
              </div>
            </div>

            {/* ─── 3. Scholarship & grant tracker ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-5">
                <CardHeader
                  title="Scholarship & grant tracker"
                  subtitle="Track outside aid — awarded amounts reduce your remaining gap."
                  icon={
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  }
                />
                {!showSchForm && (
                  <button
                    onClick={() => { setSchForm(emptyScholarshipForm); setEditingId(null); setShowSchForm(true); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Potential / applied</p>
                  <p className="text-lg font-bold font-display text-slate-700">{formatCurrency(scholarshipTotals.potential)}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-medium">Awarded</p>
                  <p className="text-lg font-bold font-display text-emerald-700">{formatCurrency(scholarshipTotals.awarded)}</p>
                </div>
              </div>

              {/* Form */}
              {showSchForm && (
                <div className="mb-5 p-4 rounded-xl border border-teal-100 bg-teal-50/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                      <input
                        value={schForm.name}
                        onChange={(e) => setSchForm({ ...schForm, name: e.target.value })}
                        placeholder="e.g. National Merit Scholarship"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          value={schForm.amount}
                          onChange={(e) => setSchForm({ ...schForm, amount: e.target.value })}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <select
                        value={schForm.type}
                        onChange={(e) => setSchForm({ ...schForm, type: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none bg-white"
                      >
                        <option value="scholarship">Scholarship</option>
                        <option value="grant">Grant</option>
                        <option value="loan">Loan</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                      <select
                        value={schForm.status}
                        onChange={(e) => setSchForm({ ...schForm, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none bg-white"
                      >
                        <option value="potential">Potential</option>
                        <option value="applied">Applied</option>
                        <option value="awarded">Awarded</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">School (optional)</label>
                      <select
                        value={schForm.schoolName}
                        onChange={(e) => setSchForm({ ...schForm, schoolName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none bg-white"
                      >
                        <option value="">Any / general</option>
                        {apps.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Deadline (optional)</label>
                      <input
                        type="date"
                        value={schForm.deadline}
                        onChange={(e) => setSchForm({ ...schForm, deadline: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={submitScholarship}
                      disabled={!schForm.name.trim()}
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {editingId ? 'Save changes' : 'Add scholarship'}
                    </button>
                    <button onClick={resetSchForm} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {scholarships.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No scholarships tracked yet. Add merit awards, grants, or outside scholarships to see them subtracted from your gap.
                </p>
              ) : (
                <div className="space-y-2">
                  {scholarships.map((s) => {
                    const statusStyle: Record<string, string> = {
                      potential: 'bg-slate-100 text-slate-600',
                      applied: 'bg-blue-50 text-blue-700',
                      awarded: 'bg-emerald-100 text-emerald-700',
                      declined: 'bg-red-50 text-red-600',
                    };
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-primary text-sm truncate">{s.name}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusStyle[s.status] || statusStyle.potential}`}>
                              {s.status}
                            </span>
                            <span className="text-[11px] text-slate-400 capitalize">{s.type}</span>
                          </div>
                          {(s.schoolName || s.deadline) && (
                            <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                              {s.schoolName && <span>{s.schoolName}</span>}
                              {s.deadline && <span>Due {s.deadline}</span>}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold font-display text-primary flex-shrink-0">{formatCurrency(s.amount)}</div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => editScholarship(s)} className="p-1.5 text-slate-400 hover:text-teal-600" aria-label="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteScholarship(s.id)} className="p-1.5 text-slate-400 hover:text-red-500" aria-label="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── 4. 4-year projection / summary ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
                <CardHeader
                  title="4-year projection"
                  subtitle="Estimated total cost, minus what you've lined up, equals the gap to close."
                  icon={
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                <div className="flex-shrink-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Target school</label>
                  <select
                    value={targetSchool}
                    onChange={(e) => setTargetSchool(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none bg-white"
                  >
                    {apps.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {projection && (
                <>
                  {/* Numbers */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        4-yr {projection.row.hasOverride ? 'net cost' : 'est. cost'}
                        {!projection.row.hasOverride && <EstimateTag />}
                      </p>
                      <p className="text-lg font-bold font-display text-primary">{formatCurrency(projection.totalCost)}</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Savings</p>
                      <p className="text-lg font-bold font-display text-slate-700">{formatCurrency(projection.savings)}</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Budget &times; 4</p>
                      <p className="text-lg font-bold font-display text-slate-700">{formatCurrency(projection.budgetContribution)}</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-medium">Awarded aid</p>
                      <p className="text-lg font-bold font-display text-emerald-700">{formatCurrency(projection.awarded)}</p>
                    </div>
                  </div>

                  {/* Stacked bar: coverage vs total */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Coverage vs. 4-year cost</span>
                      <span>{formatCurrency(projection.covered)} of {formatCurrency(projection.totalCost)}</span>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-slate-100 overflow-hidden flex">
                      {(() => {
                        const total = Math.max(projection.totalCost, projection.covered, 1);
                        const seg = (v: number) => `${(v / total) * 100}%`;
                        return (
                          <>
                            <div className="h-full bg-teal-500" style={{ width: seg(projection.savings) }} title="Savings" />
                            <div className="h-full bg-teal-400" style={{ width: seg(projection.budgetContribution) }} title="Budget × 4" />
                            <div className="h-full bg-emerald-500" style={{ width: seg(projection.awarded) }} title="Awarded aid" />
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />Savings</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-400" />Budget &times; 4</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Awarded aid</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />Remaining gap</span>
                    </div>
                  </div>

                  {/* Gap callout */}
                  <div className={`mt-5 flex items-center justify-between gap-4 px-5 py-4 rounded-xl ${
                    projection.gap <= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                  }`}>
                    <div>
                      <p className={`text-xs font-semibold ${projection.gap <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {projection.gap <= 0 ? 'Fully covered' : 'Remaining gap to close (4 years)'}
                      </p>
                      <p className={`text-2xl font-bold font-display ${projection.gap <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {projection.gap <= 0 ? formatCurrency(0) : formatCurrency(projection.gap)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xs leading-snug hidden sm:block">
                      {projection.gap <= 0
                        ? `Your savings, budget, and awarded aid cover ${projection.row.name} over 4 years.`
                        : `That's about ${formatCurrency(projection.gap / 4)}/yr to find through additional aid, loans, or scholarships.`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}

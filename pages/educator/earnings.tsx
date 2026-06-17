import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface MonthlyData {
  month: string;
  label: string;
  earnings: number;
  cumulative: number;
}

interface ManualEarningEntry {
  id: string;
  description: string;
  hours: number;
  amount: number;
  date: string;
  type: 'manual';
}

interface EarningsData {
  totalRevenue: number;
  monthRevenue: number;
  paidAmount: number;
  unpaidAmount: number;
  totalSessions: number;
  completedSessions: number;
  totalHours: number;
  avgHourlyRate: number;
  monthlyBreakdown: MonthlyData[];
  payments: {
    id: string;
    title: string;
    date: string;
    amount: number;
    paid: boolean;
    status: string;
    studentName: string;
    type: 'booking';
  }[];
  manualEarnings: ManualEarningEntry[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatCompact(amount: number) {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

function BarChart({ data, valueKey, gradientFrom, gradientTo }: {
  data: MonthlyData[];
  valueKey: 'earnings' | 'cumulative';
  gradientFrom: string;
  gradientTo: string;
}) {
  const values = data.map(d => d[valueKey]);
  const max = Math.max(...values, 1);
  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks }, (_, i) => Math.round((max / (yTicks - 1)) * i));

  return (
    <div className="relative">
      <div className="flex">
        <div className="flex flex-col justify-between pr-3 py-1" style={{ height: 260 }}>
          {[...tickValues].reverse().map((v, i) => (
            <span key={i} className="text-[10px] text-slate-400 text-right whitespace-nowrap">{formatCompact(v)}</span>
          ))}
        </div>
        <div className="flex-1">
          <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height: 260 }}>
            {data.map((d, i) => {
              const value = d[valueKey];
              const height = max > 0 ? (value / max) * 100 : 0;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full flex justify-center mb-1">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                      {formatCurrency(value)}
                    </div>
                    <div
                      className="w-full max-w-[36px] rounded-t-lg transition-all duration-500 ease-out"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        backgroundColor: gradientFrom,
                        opacity: 0.85 + (i / data.length) * 0.15,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 sm:gap-2.5 mt-2 border-t border-slate-100 pt-2">
            {data.map(d => (
              <div key={d.month} className="flex-1 text-center">
                <span className="text-[10px] text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentBreakdown({ payments }: { payments: EarningsData['payments'] }) {
  const breakdown = useMemo(() => {
    const map: Record<string, { name: string; total: number; sessions: number; paid: number; unpaid: number }> = {};
    payments.forEach(p => {
      if (p.status !== 'completed') return;
      const key = p.studentName || 'Unassigned';
      if (!map[key]) map[key] = { name: key, total: 0, sessions: 0, paid: 0, unpaid: 0 };
      map[key].total += p.amount;
      map[key].sessions += 1;
      if (p.paid) map[key].paid += p.amount;
      else map[key].unpaid += p.amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [payments]);

  if (breakdown.length === 0) return null;
  const max = Math.max(...breakdown.map(s => s.total), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-primary">Revenue by Student</h3>
          <p className="text-xs text-slate-400">Earnings breakdown per student</p>
        </div>
      </div>
      <div className="space-y-3">
        {breakdown.map(s => {
          const pct = (s.total / max) * 100;
          const paidPct = s.total > 0 ? (s.paid / s.total) * 100 : 0;
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {s.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-primary truncate">{s.name}</span>
                  <span className="text-slate-400 shrink-0">{s.sessions} session{s.sessions !== 1 ? 's' : ''}</span>
                </div>
                <span className="font-bold text-primary shrink-0 ml-2">{formatCurrency(s.total)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full relative" style={{ width: `${pct}%` }}>
                  <div className="absolute inset-0 rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
                  <div className="absolute inset-0 rounded-full bg-amber-400" style={{ left: `${paidPct}%`, width: `${100 - paidPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-slate-400">Paid</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          <span className="text-slate-400">Unpaid</span>
        </div>
      </div>
    </div>
  );
}

export default function EducatorEarnings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [earningForm, setEarningForm] = useState({ description: '', hours: '', amount: '', date: '' });
  const [earningError, setEarningError] = useState('');
  const [savingEarning, setSavingEarning] = useState(false);
  const [chartView, setChartView] = useState<'monthly' | 'cumulative'>('monthly');
  const [chartRange, setChartRange] = useState<'3m' | '6m' | '1y' | 'all' | 'custom'>('1y');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const exportCSV = useCallback(() => {
    if (!data) return;
    const rows: string[][] = [['Date', 'Type', 'Title/Description', 'Student', 'Duration (min)', 'Amount', 'Status', 'Paid']];
    data.payments.forEach(p => {
      rows.push([
        new Date(p.date).toLocaleDateString('en-US'),
        'Session',
        `"${p.title.replace(/"/g, '""')}"`,
        `"${p.studentName.replace(/"/g, '""')}"`,
        '',
        p.amount.toFixed(2),
        p.status,
        p.paid ? 'Yes' : 'No',
      ]);
    });
    data.manualEarnings.forEach(e => {
      rows.push([
        new Date(e.date).toLocaleDateString('en-US'),
        'Manual',
        `"${e.description.replace(/"/g, '""')}"`,
        '',
        String(Math.round(e.hours * 60)),
        e.amount.toFixed(2),
        'completed',
        'Yes',
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admitsonly-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.monthlyBreakdown) return [];
    const all = data.monthlyBreakdown;
    let sliced: MonthlyData[];

    if (chartRange === 'all') {
      sliced = all;
    } else if (chartRange === 'custom' && customFrom) {
      const from = customFrom;
      const to = customTo || '9999-12';
      sliced = all.filter(d => d.month >= from && d.month <= to);
    } else {
      const months = chartRange === '3m' ? 3 : chartRange === '6m' ? 6 : 12;
      sliced = all.slice(-months);
    }

    if (sliced.length === 0) return [];

    let cum = 0;
    return sliced.map(d => {
      cum += d.earnings;
      return { ...d, cumulative: cum };
    });
  }, [data, chartRange, customFrom, customTo]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  const fetchEarnings = () => {
    fetch('/api/educator/earnings')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchEarnings();
  }, [status]);

  const handleTogglePaid = async (bookingId: string, currentPaid: boolean) => {
    await fetch(`/api/educator/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !currentPaid }),
    });
    fetchEarnings();
  };

  const handleAddEarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEarning(true);
    setEarningError('');
    try {
      const res = await fetch('/api/educator/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: earningForm.description,
          hours: parseFloat(earningForm.hours),
          amount: parseFloat(earningForm.amount),
          date: earningForm.date || undefined,
        }),
      });
      if (res.ok) {
        setShowAddEarning(false);
        setEarningForm({ description: '', hours: '', amount: '', date: '' });
        fetchEarnings();
      } else {
        const d = await res.json();
        setEarningError(d.error || 'Failed to add earning');
      }
    } catch {
      setEarningError('Network error. Please try again.');
    }
    setSavingEarning(false);
  };

  const handleDeleteEarning = async (id: string) => {
    await fetch('/api/educator/earnings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchEarnings();
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.payments.filter(p => {
      if (filter === 'paid') return p.paid;
      if (filter === 'unpaid') return !p.paid;
      return true;
    });
  }, [data, filter]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>Earnings | AdmitsOnly Educator</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Earnings</h1>
            <p className="mt-1 text-slate-500">Track your revenue and payment history</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={exportCSV} disabled={!data || (data.payments.length === 0 && data.manualEarnings.length === 0)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
            <button onClick={() => setShowAddEarning(true)} className="btn-primary text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Log Earnings
            </button>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue || 0), color: 'bg-emerald-500' },
            { label: 'This Month', value: formatCurrency(data?.monthRevenue || 0), color: 'bg-blue-500' },
            { label: 'Collected', value: formatCurrency(data?.paidAmount || 0), color: 'bg-green-500' },
            { label: 'Outstanding', value: formatCurrency(data?.unpaidAmount || 0), color: 'bg-amber-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm text-slate-500 font-medium mb-2">{stat.label}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-xl font-bold font-display text-primary">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Inline Revenue Chart */}
        {data?.monthlyBreakdown && data.monthlyBreakdown.some(d => d.earnings > 0) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            {/* Chart header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{chartView === 'monthly' ? 'Monthly Earnings' : 'Cumulative Revenue'}</h3>
                  <p className="text-xs text-slate-400">{chartView === 'monthly' ? 'Revenue earned each month' : 'Total revenue growth over time'}</p>
                </div>
              </div>
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setChartView('monthly')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${chartView === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Monthly</button>
                <button onClick={() => setChartView('cumulative')} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${chartView === 'cumulative' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Cumulative</button>
              </div>
            </div>

            {/* Date range selector */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              {([
                { key: '3m' as const, label: '3 Months' },
                { key: '6m' as const, label: '6 Months' },
                { key: '1y' as const, label: '1 Year' },
                { key: 'all' as const, label: 'All Time' },
                { key: 'custom' as const, label: 'Custom' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setChartRange(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartRange === opt.key
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {chartRange === 'custom' && (
                <div className="flex items-center gap-2 ml-1">
                  <input
                    type="month"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="month"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              )}
              {chartData.length > 0 && (
                <span className="text-[10px] text-slate-400 ml-auto">
                  {chartData[0].label} — {chartData[chartData.length - 1].label}
                  {' · '}
                  {formatCurrency(chartData.reduce((s, d) => s + d.earnings, 0))} total
                </span>
              )}
            </div>

            {chartData.length > 0 ? (
              <BarChart
                data={chartData}
                valueKey={chartView === 'monthly' ? 'earnings' : 'cumulative'}
                gradientFrom={chartView === 'monthly' ? '#ea580c' : '#059669'}
                gradientTo={chartView === 'monthly' ? '#f97316' : '#34d399'}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-slate-400">
                No data for the selected range
              </div>
            )}
          </div>
        )}

        {/* Student Breakdown */}
        {data && data.payments.length > 0 && <StudentBreakdown payments={data.payments} />}

        {/* Avg Hourly Rate & Hours Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Earnings Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold font-display text-emerald-600">{formatCurrency(data?.avgHourlyRate || 0)}</p>
              <p className="text-sm text-slate-500">Avg. Hourly Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-primary">{data?.totalHours || 0}</p>
              <p className="text-sm text-slate-500">Total Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-primary">{data?.completedSessions || 0}</p>
              <p className="text-sm text-slate-500">Completed Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-primary">{data?.totalSessions || 0}</p>
              <p className="text-sm text-slate-500">Total Sessions</p>
            </div>
          </div>
          {data && data.totalSessions > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-500">Completion Rate</span>
                <span className="font-semibold text-emerald-600">{Math.round((data.completedSessions / data.totalSessions) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full progress-animated" style={{ width: `${(data.completedSessions / data.totalSessions) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Manual Earnings */}
        {data && data.manualEarnings && data.manualEarnings.length > 0 && (
          <div>
            <h3 className="text-lg font-bold font-display text-primary mb-4">Logged Earnings</h3>
            <div className="space-y-2">
              {data.manualEarnings.map(entry => (
                <div key={entry.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-purple-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{entry.hours}h</span>
                        <span>&middot;</span>
                        <span>{formatCurrency(entry.amount / entry.hours)}/hr</span>
                        <span>&middot;</span>
                        <span>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{formatCurrency(entry.amount)}</span>
                    {deleteConfirmId === entry.id ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => { handleDeleteEarning(entry.id); setDeleteConfirmId(null); }} className="text-[10px] font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded bg-red-50">Delete</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-50">Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(entry.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-primary">Payment History</h3>
            <div className="flex gap-2">
              {(['all', 'paid', 'unpaid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-sm text-slate-500">No payment records yet.</p>
              <p className="text-xs text-slate-400 mt-1">Completed sessions with amounts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(payment => (
                <div key={payment.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${payment.paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{payment.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{payment.studentName}</span>
                        <span>&middot;</span>
                        <span>{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{formatCurrency(payment.amount)}</span>
                    <button
                      onClick={() => handleTogglePaid(payment.id, payment.paid)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        payment.paid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {payment.paid ? 'Paid' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Manual Earning Modal */}
      {showAddEarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowAddEarning(false)} />
          <div className="relative bg-white rounded-2xl shadow-sm w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-4">Log Earnings</h2>
            <p className="text-sm text-slate-500 mb-4">Add earnings from outside classes or other sources.</p>
            {earningError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-4">{earningError}</div>
            )}
            <form onSubmit={handleAddEarning} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Description</label>
                <input
                  type="text"
                  value={earningForm.description}
                  onChange={e => setEarningForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. Private SAT tutoring, Workshop at community center"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Hours Spent</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={earningForm.hours}
                    onChange={e => setEarningForm(p => ({ ...p, hours: e.target.value }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Amount Earned ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={earningForm.amount}
                    onChange={e => setEarningForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="125.00"
                    required
                  />
                </div>
              </div>
              {earningForm.hours && earningForm.amount && parseFloat(earningForm.hours) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-sm text-emerald-700 font-medium">
                    Rate: {formatCurrency(parseFloat(earningForm.amount) / parseFloat(earningForm.hours))}/hr
                  </p>
                </div>
              )}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Date (optional)</label>
                <input
                  type="date"
                  value={earningForm.date}
                  onChange={e => setEarningForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEarning(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={savingEarning} className="flex-1 btn-primary text-sm disabled:opacity-60">{savingEarning ? 'Saving...' : 'Log Earning'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </EducatorDashboardLayout>
  );
}

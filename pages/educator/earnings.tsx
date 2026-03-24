import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
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
  color?: string;
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
                        background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
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

export default function EducatorEarnings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [chartModal, setChartModal] = useState<'monthly' | 'total' | null>(null);
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [earningForm, setEarningForm] = useState({ description: '', hours: '', amount: '', date: '' });
  const [earningError, setEarningError] = useState('');
  const [savingEarning, setSavingEarning] = useState(false);

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
    return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="animate-pulse text-slate-400">Loading...</div></div>;
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
          <button onClick={() => setShowAddEarning(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Log Earnings
          </button>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue || 0), gradient: 'from-emerald-500 to-teal-600', clickable: 'total' as const },
            { label: 'This Month', value: formatCurrency(data?.monthRevenue || 0), gradient: 'from-blue-500 to-indigo-600', clickable: 'monthly' as const },
            { label: 'Collected', value: formatCurrency(data?.paidAmount || 0), gradient: 'from-green-500 to-emerald-600', clickable: null },
            { label: 'Outstanding', value: formatCurrency(data?.unpaidAmount || 0), gradient: 'from-amber-500 to-orange-600', clickable: null },
          ].map(stat => (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl border border-slate-100 p-5 transition-all ${
                stat.clickable ? 'cursor-pointer hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 active:translate-y-0' : ''
              }`}
              onClick={() => stat.clickable && setChartModal(stat.clickable)}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                {stat.clickable && (
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${stat.gradient}`} />
                <span className="text-xl font-bold font-display text-primary">{stat.value}</span>
              </div>
              {stat.clickable && (
                <p className="text-[10px] text-slate-400 mt-2">Click to view chart</p>
              )}
            </div>
          ))}
        </div>

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
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full progress-animated" style={{ width: `${(data.completedSessions / data.totalSessions) * 100}%` }} />
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
                    <button
                      onClick={() => handleDeleteEarning(entry.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
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
            <div className="text-center py-12 text-slate-400">Loading...</div>
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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddEarning(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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

      {/* Monthly Earnings Chart Modal */}
      {chartModal === 'monthly' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setChartModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold font-display text-primary">Monthly Earnings</h2>
                <p className="text-sm text-slate-400 mt-0.5">Revenue earned each month over the last 12 months</p>
              </div>
              <button onClick={() => setChartModal(null)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {data?.monthlyBreakdown && data.monthlyBreakdown.length > 0 ? (
              <BarChart
                data={data.monthlyBreakdown}
                valueKey="earnings"
                gradientFrom="#ea580c"
                gradientTo="#f97316"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                No earnings data available yet
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to top, #ea580c, #f97316)' }} />
              <span className="text-xs text-slate-500 font-medium">Monthly earnings</span>
              <span className="text-xs text-slate-400 ml-auto">Hover bars for exact amounts</span>
            </div>
          </div>
        </div>
      )}

      {/* Total Revenue Chart Modal */}
      {chartModal === 'total' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setChartModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold font-display text-primary">Cumulative Revenue</h2>
                <p className="text-sm text-slate-400 mt-0.5">Total revenue growth over the last 12 months</p>
              </div>
              <button onClick={() => setChartModal(null)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {data?.monthlyBreakdown && data.monthlyBreakdown.length > 0 ? (
              <BarChart
                data={data.monthlyBreakdown}
                valueKey="cumulative"
                gradientFrom="#059669"
                gradientTo="#34d399"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                No revenue data available yet
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to top, #059669, #34d399)' }} />
              <span className="text-xs text-slate-500 font-medium">Cumulative revenue</span>
              <span className="text-xs text-slate-400 ml-auto">Hover bars for exact amounts</span>
            </div>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface EarningsData {
  totalRevenue: number;
  monthRevenue: number;
  paidAmount: number;
  unpaidAmount: number;
  totalSessions: number;
  completedSessions: number;
  payments: {
    id: string;
    title: string;
    date: string;
    amount: number;
    paid: boolean;
    status: string;
    studentName: string;
  }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function EducatorEarnings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/educator/earnings')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  const handleTogglePaid = async (bookingId: string, currentPaid: boolean) => {
    await fetch(`/api/educator/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !currentPaid }),
    });
    // Refetch
    const r = await fetch('/api/educator/earnings');
    const d = await r.json();
    setData(d);
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
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Earnings</h1>
          <p className="mt-1 text-slate-500">Track your revenue and payment history</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue || 0), gradient: 'from-emerald-500 to-teal-600' },
            { label: 'This Month', value: formatCurrency(data?.monthRevenue || 0), gradient: 'from-blue-500 to-indigo-600' },
            { label: 'Collected', value: formatCurrency(data?.paidAmount || 0), gradient: 'from-green-500 to-emerald-600' },
            { label: 'Outstanding', value: formatCurrency(data?.unpaidAmount || 0), gradient: 'from-amber-500 to-orange-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm text-slate-500 font-medium mb-2">{stat.label}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${stat.gradient}`} />
                <span className="text-xl font-bold font-display text-primary">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Session stats */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Session Summary</h3>
          <div className="grid grid-cols-2 gap-4">
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
    </EducatorDashboardLayout>
  );
}

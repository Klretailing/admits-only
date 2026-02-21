import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const revenueStats = [
  { label: 'Monthly Revenue', value: '$42,800', change: '+15.2%', positive: true },
  { label: 'Active Subscriptions', value: '284', change: '+12', positive: true },
  { label: 'Avg Revenue/User', value: '$150.70', change: '+$8.20', positive: true },
  { label: 'Churn Rate', value: '2.1%', change: '-0.3%', positive: true },
];

const recentTransactions = [
  { id: 'INV-001', student: 'Maya Johnson', plan: 'Scholarship-Ready', amount: '$499.00', date: 'Feb 17, 2026', status: 'paid' },
  { id: 'INV-002', student: 'Robert Chen', plan: 'Foundations', amount: '$299.00', date: 'Feb 17, 2026', status: 'paid' },
  { id: 'INV-003', student: 'Aisha Patel', plan: 'STEM Elite', amount: '$449.00', date: 'Feb 16, 2026', status: 'paid' },
  { id: 'INV-004', student: 'James Williams', plan: 'Scholarship-Ready', amount: '$499.00', date: 'Feb 15, 2026', status: 'paid' },
  { id: 'INV-005', student: 'Emma Thompson', plan: 'STEM Elite', amount: '$449.00', date: 'Feb 14, 2026', status: 'paid' },
  { id: 'INV-006', student: 'David Kim', plan: 'Scholarship-Ready', amount: '$499.00', date: 'Feb 13, 2026', status: 'refunded' },
  { id: 'INV-007', student: 'Carlos Rivera', plan: 'Foundations', amount: '$299.00', date: 'Feb 12, 2026', status: 'paid' },
];

const planBreakdown = [
  { plan: 'Foundations', subscribers: 98, revenue: '$29,302', pct: 34 },
  { plan: 'Scholarship-Ready', subscribers: 124, revenue: '$61,876', pct: 44 },
  { plan: 'STEM Elite', subscribers: 62, revenue: '$27,838', pct: 22 },
];

export default function AdminPayments() {
  const { loading } = useAdminGuard();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head><title>Payments | Admin — AdmitsOnly</title></Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Payments & Revenue</h1>
          <p className="mt-1 text-slate-500">Financial overview and transaction history.</p>
        </div>

        {/* Revenue stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold font-display text-primary">{stat.value}</span>
                <span className={`text-xs font-semibold ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Recent transactions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold font-display text-primary mb-6">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 text-slate-500 font-medium">Invoice</th>
                    <th className="text-left py-3 text-slate-500 font-medium">Student</th>
                    <th className="text-left py-3 text-slate-500 font-medium hidden md:table-cell">Plan</th>
                    <th className="text-right py-3 text-slate-500 font-medium">Amount</th>
                    <th className="text-right py-3 text-slate-500 font-medium hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3">
                        <p className="font-mono text-xs text-slate-500">{tx.id}</p>
                        <p className="text-xs text-slate-400">{tx.date}</p>
                      </td>
                      <td className="py-3 font-medium text-primary">{tx.student}</td>
                      <td className="py-3 text-slate-500 hidden md:table-cell">{tx.plan}</td>
                      <td className="py-3 text-right font-semibold text-primary">{tx.amount}</td>
                      <td className="py-3 text-right hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          tx.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold font-display text-primary mb-6">Plan Breakdown</h3>
            <div className="space-y-5">
              {planBreakdown.map((plan) => (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-primary">{plan.plan}</p>
                      <p className="text-xs text-slate-400">{plan.subscribers} subscribers</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{plan.revenue}</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-1000"
                      style={{ width: `${plan.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-surface border border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Payment Provider</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
                  <span className="text-[#635BFF] font-bold text-sm">S</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Stripe</p>
                  <p className="text-xs text-green-600 font-medium">Connected &middot; Live mode</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

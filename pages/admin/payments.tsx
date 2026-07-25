import Head from 'next/head';
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

interface StatsData {
  totalUsers: number;
  totalStudents: number;
  totalEssays: number;
  revenue: {
    mrr: number;
    arr: number;
    avgRevenuePerUser: number;
    totalPaidUsers: number;
    plans: {
      foundations: { subscribers: number; revenue: number };
      scholarship: { subscribers: number; revenue: number };
      stem: { subscribers: number; revenue: number };
    };
    freeTierUsers: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    plan: string | null;
    createdAt: string;
  }>;
  engagement: {
    essaysPerUser: string;
    profileCompletionRate: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  foundations: 'Foundations',
  scholarship: 'Scholarship-Ready',
  stem: 'STEM Elite',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
}

export default function AdminPayments() {
  const { loading } = useAdminGuard();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const rev = stats?.revenue;
  const plans = rev?.plans;

  const planRows = plans
    ? [
        { key: 'scholarship', ...plans.scholarship },
        { key: 'stem', ...plans.stem },
        { key: 'foundations', ...plans.foundations },
      ]
    : [];

  const totalPlanUsers = planRows.reduce((s, p) => s + p.subscribers, 0) || 1;

  return (
    <AdminLayout>
      <Head><title>Payments | Admin — AdmitsOnly</title></Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Payments &amp; Revenue</h1>
          <p className="mt-1 text-slate-500">Live financial overview based on plan subscriptions.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            Failed to load stats. Please refresh.
          </div>
        )}

        {/* Revenue stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Projected MRR', value: rev ? fmt(rev.mrr) : '—' },
            { label: 'Projected ARR', value: rev ? fmt(rev.arr) : '—' },
            { label: 'Paid Users', value: rev?.totalPaidUsers ?? '—' },
            { label: 'Avg Revenue / User', value: rev ? fmt(rev.avgRevenuePerUser) : '—' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold font-display text-primary">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Recent signups table */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold font-display text-primary mb-6">Recent Signups</h3>
            {stats?.recentSignups && stats.recentSignups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-3 text-slate-500 font-medium">Email</th>
                      <th className="text-left py-3 text-slate-500 font-medium">Plan</th>
                      <th className="text-right py-3 text-slate-500 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSignups.map((user) => (
                      <tr key={user.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 font-medium text-primary">{user.name}</td>
                        <td className="py-3 text-slate-500">{user.email}</td>
                        <td className="py-3">
                          {user.plan ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent/10 text-accent">
                              {PLAN_LABELS[user.plan] || user.plan}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500">
                              Free
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No signups yet.</p>
            )}
          </div>

          {/* Plan breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold font-display text-primary mb-6">Plan Breakdown</h3>
            {planRows.length > 0 ? (
              <div className="space-y-5">
                {planRows.map((plan) => {
                  const pct = Math.round((plan.subscribers / totalPlanUsers) * 100);
                  return (
                    <div key={plan.key}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-primary">{PLAN_LABELS[plan.key]}</p>
                          <p className="text-xs text-slate-400">{plan.subscribers} subscriber{plan.subscribers !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{fmt(plan.revenue)}</p>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {(rev?.freeTierUsers ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Free Tier</p>
                        <p className="text-xs text-slate-400">{rev!.freeTierUsers} student{rev!.freeTierUsers !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-400">$0</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 rounded-full" style={{ width: `${Math.round((rev!.freeTierUsers / (totalPlanUsers + rev!.freeTierUsers)) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No plan data available.</p>
            )}

            <div className="mt-8 p-4 rounded-xl bg-surface border border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Payment Provider</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-400 font-bold text-sm">S</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Stripe</p>
                  <p className="text-xs text-slate-400 font-medium">Not configured &middot; Integration pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

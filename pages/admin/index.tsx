import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const platformStats = [
  { label: 'Total Students', value: '2,847', change: '+12%', positive: true, icon: '👤' },
  { label: 'Active Sessions', value: '156', change: '+8%', positive: true, icon: '📅' },
  { label: 'Essays Submitted', value: '1,293', change: '+23%', positive: true, icon: '📝' },
  { label: 'Revenue (MRR)', value: '$42.8k', change: '+15%', positive: true, icon: '💰' },
];

const recentSignups = [
  { name: 'Maya Johnson', email: 'maya.j@email.com', role: 'student', plan: 'Scholarship-Ready', time: '2 hours ago' },
  { name: 'Robert Chen', email: 'robert.c@email.com', role: 'parent', plan: 'Foundations', time: '5 hours ago' },
  { name: 'Aisha Patel', email: 'aisha.p@email.com', role: 'student', plan: 'STEM Elite', time: '8 hours ago' },
  { name: 'James Williams', email: 'james.w@email.com', role: 'student', plan: 'Scholarship-Ready', time: '1 day ago' },
  { name: 'Sofia Garcia', email: 'sofia.g@email.com', role: 'parent', plan: 'Foundations', time: '1 day ago' },
];

const systemAlerts = [
  { type: 'info', message: '3 essay reviews pending coach assignment', time: '10 min ago' },
  { type: 'warning', message: '2 sessions have no coach assigned for next week', time: '1 hour ago' },
  { type: 'success', message: 'Payment processing operational — 99.9% uptime', time: '2 hours ago' },
];

export default function AdminDashboard() {
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
      <Head><title>Admin Dashboard | AdmitsOnly</title></Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Admin Dashboard</h1>
          <p className="mt-1 text-slate-500">Platform overview and key metrics.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {platformStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <span className="text-lg">{stat.icon}</span>
              </div>
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
          {/* Recent signups */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-primary">Recent Signups</h3>
              <Link href="/admin/users" className="text-sm font-semibold text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 text-slate-500 font-medium">Name</th>
                    <th className="text-left py-3 text-slate-500 font-medium hidden sm:table-cell">Role</th>
                    <th className="text-left py-3 text-slate-500 font-medium hidden md:table-cell">Plan</th>
                    <th className="text-right py-3 text-slate-500 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSignups.map((user) => (
                    <tr key={user.email} className="border-b border-slate-50 last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-primary">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                          user.role === 'student' ? 'bg-accent/10 text-accent' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 hidden md:table-cell">{user.plan}</td>
                      <td className="py-3 text-right text-slate-400">{user.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System alerts */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold font-display text-primary mb-6">System Alerts</h3>
            <div className="space-y-4">
              {systemAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                    alert.type === 'success' ? 'bg-green-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-accent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary font-medium">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary to-slate-800 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Quick Actions</p>
              <div className="space-y-2 mt-3">
                <Link href="/admin/users" className="block text-sm font-medium text-white/80 hover:text-white transition-colors">
                  &rarr; Review pending applications
                </Link>
                <Link href="/admin/sessions" className="block text-sm font-medium text-white/80 hover:text-white transition-colors">
                  &rarr; Assign coaches to sessions
                </Link>
                <Link href="/admin/essays" className="block text-sm font-medium text-white/80 hover:text-white transition-colors">
                  &rarr; Review submitted essays
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

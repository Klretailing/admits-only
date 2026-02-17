import Head from 'next/head';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const mockUsers = [
  { id: 1, name: 'Maya Johnson', email: 'maya.j@email.com', role: 'student', plan: 'Scholarship-Ready', status: 'active', joined: 'Jan 15, 2026', essays: 4, sessions: 12 },
  { id: 2, name: 'Robert Chen', email: 'robert.c@email.com', role: 'parent', plan: 'Foundations', status: 'active', joined: 'Jan 18, 2026', essays: 0, sessions: 3 },
  { id: 3, name: 'Aisha Patel', email: 'aisha.p@email.com', role: 'student', plan: 'STEM Elite', status: 'active', joined: 'Jan 20, 2026', essays: 6, sessions: 18 },
  { id: 4, name: 'James Williams', email: 'james.w@email.com', role: 'student', plan: 'Scholarship-Ready', status: 'active', joined: 'Jan 22, 2026', essays: 3, sessions: 8 },
  { id: 5, name: 'Sofia Garcia', email: 'sofia.g@email.com', role: 'parent', plan: 'Foundations', status: 'active', joined: 'Jan 25, 2026', essays: 0, sessions: 2 },
  { id: 6, name: 'David Kim', email: 'david.k@email.com', role: 'student', plan: 'Scholarship-Ready', status: 'inactive', joined: 'Dec 10, 2025', essays: 7, sessions: 24 },
  { id: 7, name: 'Emma Thompson', email: 'emma.t@email.com', role: 'student', plan: 'STEM Elite', status: 'active', joined: 'Feb 1, 2026', essays: 2, sessions: 6 },
  { id: 8, name: 'Carlos Rivera', email: 'carlos.r@email.com', role: 'student', plan: 'Foundations', status: 'active', joined: 'Feb 3, 2026', essays: 1, sessions: 4 },
];

export default function AdminUsers() {
  const { loading } = useAdminGuard();
  const [filter, setFilter] = useState<'all' | 'student' | 'parent'>('all');
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const filtered = mockUsers.filter((u) => {
    const matchRole = filter === 'all' || u.role === filter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <AdminLayout>
      <Head><title>Users | Admin — AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Users</h1>
            <p className="mt-1 text-slate-500">{mockUsers.length} registered accounts</p>
          </div>
          <button className="btn-primary text-sm !py-2.5 !px-5">+ Add User</button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'student', 'parent'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-accent text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left py-3.5 px-5 text-slate-500 font-medium">User</th>
                  <th className="text-left py-3.5 px-5 text-slate-500 font-medium hidden sm:table-cell">Role</th>
                  <th className="text-left py-3.5 px-5 text-slate-500 font-medium hidden md:table-cell">Plan</th>
                  <th className="text-left py-3.5 px-5 text-slate-500 font-medium hidden lg:table-cell">Status</th>
                  <th className="text-center py-3.5 px-5 text-slate-500 font-medium hidden lg:table-cell">Essays</th>
                  <th className="text-center py-3.5 px-5 text-slate-500 font-medium hidden lg:table-cell">Sessions</th>
                  <th className="text-right py-3.5 px-5 text-slate-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-primary">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 hidden sm:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                        user.role === 'student' ? 'bg-accent/10 text-accent' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 hidden md:table-cell">{user.plan}</td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        user.status === 'active' ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center text-slate-600 hidden lg:table-cell">{user.essays}</td>
                    <td className="py-3.5 px-5 text-center text-slate-600 hidden lg:table-cell">{user.sessions}</td>
                    <td className="py-3.5 px-5 text-right text-slate-400">{user.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No users match your search.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

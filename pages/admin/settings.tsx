import Head from 'next/head';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

export default function AdminSettings() {
  const { session, loading } = useAdminGuard();
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AdminLayout>
      <Head><title>Settings | Admin — AdmitsOnly</title></Head>

      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Settings</h1>
          <p className="mt-1 text-slate-500">Manage platform configuration and preferences.</p>
        </div>

        {saved && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700 font-medium">
            Settings saved successfully.
          </div>
        )}

        {/* General */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-6">General</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Platform Name</label>
              <input
                type="text"
                defaultValue="AdmitsOnly"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Support Email</label>
              <input
                type="email"
                defaultValue="support@admitsonly.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Time Zone</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                <option>Eastern Time (ET)</option>
                <option>Central Time (CT)</option>
                <option>Mountain Time (MT)</option>
                <option>Pacific Time (PT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-6">Notifications</h3>
          <div className="space-y-4">
            {[
              { label: 'New user registrations', desc: 'Get notified when a student or parent signs up', defaultChecked: true },
              { label: 'Essay submissions', desc: 'Get notified when students submit essays for review', defaultChecked: true },
              { label: 'Payment events', desc: 'Get notified about successful payments and refunds', defaultChecked: true },
              { label: 'Session reminders', desc: 'Receive reminders before upcoming coaching sessions', defaultChecked: false },
            ].map((item) => (
              <label key={item.label} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                <div>
                  <p className="text-sm font-medium text-primary">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Admin Account */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-6">Admin Account</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Admin Email</label>
              <input
                type="email"
                defaultValue={session?.user?.email || 'admin@admitsonly.com'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
                disabled
              />
              <p className="text-xs text-slate-400 mt-1">Contact support to change the admin email.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Change Password</label>
              <input
                type="password"
                placeholder="New password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h3 className="text-lg font-bold font-display text-red-600 mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-500 mb-4">These actions are irreversible. Proceed with caution.</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
              Reset All Data
            </button>
            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
              Delete Platform
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="btn-primary text-sm !py-2.5 !px-8">
            Save Settings
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

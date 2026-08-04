import Head from 'next/head';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ──────────────────────── TOGGLE COMPONENT ──────────────────────── */

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-accent' : 'bg-slate-200'
        }`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
          enabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
        }`} />
      </button>
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function AdminSettings() {
  const { session, loading } = useAdminGuard();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'programs' | 'access' | 'integrations' | 'account'>('general');

  // Adam (AI assistant) live connection check
  const [adamChecking, setAdamChecking] = useState(false);
  const [adamHealth, setAdamHealth] = useState<{ status: string; title: string; detail: string } | null>(null);

  async function testAdam() {
    setAdamChecking(true);
    setAdamHealth(null);
    try {
      const r = await fetch('/api/admin/adam-health');
      const data = await r.json();
      setAdamHealth(data);
    } catch {
      setAdamHealth({ status: 'error', title: 'Could not run the test', detail: 'The check itself failed to run. Try again in a moment.' });
    } finally {
      setAdamChecking(false);
    }
  }

  // PayPal (payments) live connection check
  const [paypalChecking, setPaypalChecking] = useState(false);
  const [paypalHealth, setPaypalHealth] = useState<{ status: string; title: string; detail: string } | null>(null);

  async function testPaypal() {
    setPaypalChecking(true);
    setPaypalHealth(null);
    try {
      const r = await fetch('/api/admin/paypal-health');
      const data = await r.json();
      setPaypalHealth(data);
    } catch {
      setPaypalHealth({ status: 'error', title: 'Could not run the test', detail: 'The check itself failed to run. Try again in a moment.' });
    } finally {
      setPaypalChecking(false);
    }
  }

  // Master toggles
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [demoDataEnabled, setDemoDataEnabled] = useState(true);
  const [autoAssignCoach, setAutoAssignCoach] = useState(true);
  const [essayReminders, setEssayReminders] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [parentAccess, setParentAccess] = useState(true);
  const [publicPricing, setPublicPricing] = useState(true);

  // Program toggles
  const [scholarshipReady, setScholarshipReady] = useState(true);
  const [stemLab, setStemLab] = useState(true);
  const [humanities, setHumanities] = useState(true);
  const [foundations, setFoundations] = useState(true);

  // Notification toggles
  const [notifSignups, setNotifSignups] = useState(true);
  const [notifEssays, setNotifEssays] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifSessions, setNotifSessions] = useState(false);

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

  const tabs = [
    { key: 'general' as const, label: 'General' },
    { key: 'programs' as const, label: 'Programs' },
    { key: 'access' as const, label: 'Access & Permissions' },
    { key: 'integrations' as const, label: 'Integrations' },
    { key: 'account' as const, label: 'Account' },
  ];

  return (
    <AdminLayout>
      <Head><title>Settings | Admin — AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Platform Settings</h1>
            <p className="mt-1 text-slate-500">Master controls and configuration for the entire platform.</p>
          </div>
          <button onClick={handleSave} className="btn-primary text-sm !py-2.5 !px-8">
            Save All Changes
          </button>
        </div>

        {saved && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700 font-medium">
            Settings saved successfully.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl space-y-6">
          {/* ─── GENERAL TAB ─── */}
          {activeTab === 'general' && (
            <>
              {/* Master Controls */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-2">Master Controls</h3>
                <p className="text-sm text-slate-400 mb-4">Global switches that affect the entire platform.</p>
                <div className="space-y-1 -mx-4">
                  <Toggle
                    enabled={registrationOpen}
                    onChange={setRegistrationOpen}
                    label="Open Registration"
                    description="Allow new students and parents to create accounts."
                  />
                  <Toggle
                    enabled={maintenanceMode}
                    onChange={setMaintenanceMode}
                    label="Maintenance Mode"
                    description="Show a maintenance page to all non-admin users. Use during updates."
                  />
                  <Toggle
                    enabled={demoDataEnabled}
                    onChange={setDemoDataEnabled}
                    label="Demo Data"
                    description="Populate dashboards with sample data for demos and presentations."
                  />
                  <Toggle
                    enabled={autoAssignCoach}
                    onChange={setAutoAssignCoach}
                    label="Auto-Assign Coaches"
                    description="Automatically match new students with available coaches based on program."
                  />
                </div>
              </div>

              {/* Platform Info */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Platform Details</h3>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Time Zone</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                        <option>Eastern Time (ET)</option>
                        <option>Central Time (CT)</option>
                        <option>Mountain Time (MT)</option>
                        <option>Pacific Time (PT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Academic Year</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white">
                        <option>2025–2026</option>
                        <option>2026–2027</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-2">Admin Notifications</h3>
                <p className="text-sm text-slate-400 mb-4">Choose which events send you alerts.</p>
                <div className="space-y-1 -mx-4">
                  <Toggle enabled={notifSignups} onChange={setNotifSignups} label="New user registrations" description="Get notified when a student or parent signs up." />
                  <Toggle enabled={notifEssays} onChange={setNotifEssays} label="Essay submissions" description="Get notified when students submit essays for review." />
                  <Toggle enabled={notifPayments} onChange={setNotifPayments} label="Payment events" description="Get notified about successful payments and refunds." />
                  <Toggle enabled={notifSessions} onChange={setNotifSessions} label="Session reminders" description="Receive reminders before upcoming coaching sessions." />
                </div>
              </div>
            </>
          )}

          {/* ─── PROGRAMS TAB ─── */}
          {activeTab === 'programs' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-2">Program Availability</h3>
                <p className="text-sm text-slate-400 mb-4">Enable or disable programs. Disabled programs won&apos;t appear on the public site or accept new enrollments.</p>
                <div className="space-y-1 -mx-4">
                  <Toggle enabled={scholarshipReady} onChange={setScholarshipReady} label="Scholarship-Ready Academy" description="Grades 9–12 — Holistic admissions prep with narrative coaching." />
                  <Toggle enabled={stemLab} onChange={setStemLab} label="STEM Innovators Lab" description="Grades 8–12 — Research, coding, and competition prep." />
                  <Toggle enabled={humanities} onChange={setHumanities} label="Humanities Leadership Studio" description="Grades 9–12 — Debate, writing, and civic leadership." />
                  <Toggle enabled={foundations} onChange={setFoundations} label="Foundations for Growth" description="Grades 5–8 — Executive function and confidence coaching." />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Session Defaults</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Default Session Length</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                        <option>30 minutes</option>
                        <option>45 minutes</option>
                        <option selected>60 minutes</option>
                        <option>90 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Max Sessions / Week</label>
                      <input type="number" defaultValue={5} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Cancellation Window</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                        <option>12 hours</option>
                        <option selected>24 hours</option>
                        <option>48 hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1.5">Essay Review SLA</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                        <option>24 hours</option>
                        <option selected>48 hours</option>
                        <option>72 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── ACCESS TAB ─── */}
          {activeTab === 'access' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-2">Visibility & Access</h3>
                <p className="text-sm text-slate-400 mb-4">Control who can see and access platform features.</p>
                <div className="space-y-1 -mx-4">
                  <Toggle enabled={parentAccess} onChange={setParentAccess} label="Parent Dashboard Access" description="Allow parent accounts to view their student's progress and sessions." />
                  <Toggle enabled={publicPricing} onChange={setPublicPricing} label="Public Pricing Page" description="Show pricing information on the public website." />
                  <Toggle enabled={essayReminders} onChange={setEssayReminders} label="Auto Essay Reminders" description="Send automated reminders to students with pending essay drafts." />
                  <Toggle enabled={deadlineAlerts} onChange={setDeadlineAlerts} label="Deadline Alerts" description="Notify students and coaches about upcoming application deadlines." />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Admin Roles</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 text-slate-500 font-medium">Role</th>
                        <th className="text-center py-3 text-slate-500 font-medium">Users</th>
                        <th className="text-center py-3 text-slate-500 font-medium">Settings</th>
                        <th className="text-center py-3 text-slate-500 font-medium">Payments</th>
                        <th className="text-center py-3 text-slate-500 font-medium">Demos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { role: 'Super Admin', users: true, settings: true, payments: true, demos: true },
                        { role: 'Coach', users: false, settings: false, payments: false, demos: false },
                        { role: 'Operations', users: true, settings: false, payments: true, demos: true },
                      ].map((r) => (
                        <tr key={r.role} className="border-b border-slate-50">
                          <td className="py-3 font-medium text-primary">{r.role}</td>
                          {[r.users, r.settings, r.payments, r.demos].map((has, i) => (
                            <td key={i} className="py-3 text-center">
                              {has ? (
                                <span className="inline-flex w-5 h-5 rounded-full bg-green-100 items-center justify-center">
                                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 items-center justify-center">
                                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── INTEGRATIONS TAB ─── */}
          {activeTab === 'integrations' && (
            <>
              {/* Adam (AI Assistant) — live connection check */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                      A
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-primary">Adam (AI Assistant)</h3>
                      <p className="text-xs text-slate-400">Checks whether Adam can reach the Anthropic API right now.</p>
                    </div>
                  </div>
                  <button
                    onClick={testAdam}
                    disabled={adamChecking}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    {adamChecking ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>

                {adamHealth && (
                  <div
                    className={`p-4 rounded-xl border ${
                      adamHealth.status === 'connected'
                        ? 'bg-green-50 border-green-100'
                        : adamHealth.status === 'rate_limited'
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          adamHealth.status === 'connected'
                            ? 'bg-green-500'
                            : adamHealth.status === 'rate_limited'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <p
                        className={`text-sm font-bold ${
                          adamHealth.status === 'connected'
                            ? 'text-green-800'
                            : adamHealth.status === 'rate_limited'
                            ? 'text-amber-800'
                            : 'text-red-800'
                        }`}
                      >
                        {adamHealth.title}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{adamHealth.detail}</p>
                  </div>
                )}
                {!adamHealth && !adamChecking && (
                  <p className="text-sm text-slate-400">
                    Click <span className="font-semibold text-slate-500">Test Connection</span> to check Adam&apos;s status. If he isn&apos;t
                    replying to students, this will tell you exactly why.
                  </p>
                )}
              </div>

              {/* PayPal (Payments) — live connection check */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#003087] flex items-center justify-center text-white font-bold italic">P</div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-primary">PayPal (Payments)</h3>
                      <p className="text-xs text-slate-400">Confirms your keys work — without making a real purchase.</p>
                    </div>
                  </div>
                  <button
                    onClick={testPaypal}
                    disabled={paypalChecking}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    {paypalChecking ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>

                {paypalHealth && (
                  <div
                    className={`p-4 rounded-xl border ${
                      paypalHealth.status === 'connected'
                        ? 'bg-green-50 border-green-100'
                        : paypalHealth.status === 'sandbox'
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          paypalHealth.status === 'connected'
                            ? 'bg-green-500'
                            : paypalHealth.status === 'sandbox'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <p
                        className={`text-sm font-bold ${
                          paypalHealth.status === 'connected'
                            ? 'text-green-800'
                            : paypalHealth.status === 'sandbox'
                            ? 'text-amber-800'
                            : 'text-red-800'
                        }`}
                      >
                        {paypalHealth.title}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{paypalHealth.detail}</p>
                  </div>
                )}
                {!paypalHealth && !paypalChecking && (
                  <p className="text-sm text-slate-400">
                    Click <span className="font-semibold text-slate-500">Test Connection</span> to verify PayPal is hooked up and in live mode — no charge is made.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-6">Connected Services</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Stripe', status: 'Connected', statusColor: 'text-green-600', desc: 'Payment processing — Live mode', icon: 'S', iconBg: 'bg-[#635BFF]/10', iconColor: 'text-[#635BFF]' },
                    { name: 'Google Calendar', status: 'Connected', statusColor: 'text-green-600', desc: 'Session scheduling and reminders', icon: 'G', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { name: 'SendGrid', status: 'Connected', statusColor: 'text-green-600', desc: 'Transactional emails and notifications', icon: 'SG', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { name: 'Zoom', status: 'Not connected', statusColor: 'text-slate-400', desc: 'Video coaching sessions', icon: 'Z', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                  ].map((svc) => (
                    <div key={svc.name} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-slate-100">
                      <div className={`w-10 h-10 rounded-xl ${svc.iconBg} flex items-center justify-center`}>
                        <span className={`${svc.iconColor} font-bold text-sm`}>{svc.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{svc.name}</p>
                        <p className="text-xs text-slate-400">{svc.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${svc.statusColor}`}>{svc.status}</p>
                        <button className="text-xs text-accent font-medium hover:underline mt-0.5">
                          {svc.status === 'Connected' ? 'Configure' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-2">API Access</h3>
                <p className="text-sm text-slate-400 mb-4">Manage API keys for external integrations.</p>
                <div className="p-4 rounded-xl bg-surface border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">Production API Key</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">ao_live_****************************7f3k</p>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors">
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── ACCOUNT TAB ─── */}
          {activeTab === 'account' && (
            <>
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
                    <label className="block text-sm font-medium text-primary mb-1.5">Display Name</label>
                    <input
                      type="text"
                      defaultValue={session?.user?.name || 'Admin'}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
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
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

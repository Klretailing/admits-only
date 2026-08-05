import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ──────────────────────── TYPES ──────────────────────── */

interface AnalyticsData {
  period: { days: number; since: string };
  overview: {
    totalEvents: number;
    totalSessions: number;
    uniqueSessions: number;
    uniqueUsers: number;
    totalPageviews: number;
    totalClicks: number;
    totalFeatureEvents: number;
    totalNavEvents: number;
  };
  dailyVisits: Array<{ day: string; sessions: number; pageviews: number }>;
  topPages: Array<{ path: string; views: number }>;
  featureUsage: Array<{ feature: string; action: string; count: number }>;
  navSources: Array<{ source: string; count: number }>;
  navTargets: Array<{ target: string; count: number }>;
  durationStats: { avg: number; max: number; median: number };
  depthStats: { avgPageviews: number; avgClicks: number; avgFeatures: number };
  scrollDepth: Array<{ path: string; avgDepth: number; count: number }>;
  deviceBreakdown: { mobile: number; desktop: number };
  topUsers: Array<{ userId: string; name: string; email: string; sessions: number; pageviews: number; features: number }>;
  hourlyActivity: Array<{ dow: number; hour: number; count: number }>;
}

/* ──────────────────────── HELPERS ──────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const NAV_SOURCE_LABELS: Record<string, string> = {
  sidebar: 'Desktop Sidebar',
  mobile_tab: 'Mobile Tab Bar',
  breadcrumb: 'Breadcrumb',
  in_page: 'In-Page Link',
};

/* ──────────────────────── BAR CHART ──────────────────────── */

function BarChart({ data, labelKey, valueKey, secondaryKey, color = 'from-accent to-purple-500', secondaryColor = 'from-purple-400 to-pink-500' }: {
  data: Array<Record<string, any>>;
  labelKey: string;
  valueKey: string;
  secondaryKey?: string;
  color?: string;
  secondaryColor?: string;
}) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;
  const max = Math.max(...data.map(d => Math.max(d[valueKey] || 0, secondaryKey ? (d[secondaryKey] || 0) : 0)), 1);
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] font-semibold text-slate-400 tabular-nums">{d[valueKey]}</span>
          <div className="w-full flex gap-px items-end" style={{ height: '100%' }}>
            <div
              className={`flex-1 rounded-t bg-gradient-to-t ${color} transition-all duration-500`}
              style={{ height: `${(d[valueKey] / max) * 100}%`, minHeight: d[valueKey] > 0 ? 3 : 0 }}
            />
            {secondaryKey && (
              <div
                className={`flex-1 rounded-t bg-gradient-to-t ${secondaryColor} transition-all duration-500 opacity-60`}
                style={{ height: `${((d[secondaryKey] || 0) / max) * 100}%`, minHeight: d[secondaryKey] > 0 ? 3 : 0 }}
              />
            )}
          </div>
          <span className="text-[8px] font-medium text-slate-400 truncate w-full text-center">
            {String(d[labelKey]).replace(/^\d{4}-\d{2}-/, '').replace(/^\d{4}-/, '')}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── HORIZONTAL BAR LIST ──────────────────────── */

function HorizontalBarList({ items, color = 'bg-accent' }: {
  items: Array<{ label: string; value: number; suffix?: string }>;
  color?: string;
}) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-slate-600 font-medium truncate mr-2">{item.label}</span>
            <span className="text-slate-400 tabular-nums shrink-0">{formatNumber(item.value)}{item.suffix || ''}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── ACTIVITY HEATMAP ──────────────────────── */

function ActivityHeatmap({ data }: { data: Array<{ dow: number; hour: number; count: number }> }) {
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const d of data) g[d.dow][d.hour] = d.count;
    return g;
  }, [data]);

  const max = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  if (data.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div className="flex gap-0.5 mb-1 ml-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[8px] text-slate-400">
              {h % 4 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
        {DAY_NAMES.map((day, dow) => (
          <div key={dow} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-9 text-[10px] text-slate-400 font-medium text-right pr-1">{day}</span>
            {grid[dow].map((count, hour) => {
              const intensity = count / max;
              return (
                <div
                  key={hour}
                  className="flex-1 h-4 rounded-sm transition-colors"
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(99, 102, 241, ${0.08 + intensity * 0.85})`
                      : 'rgb(241, 245, 249)',
                  }}
                  title={`${day} ${hour}:00 — ${count} pageviews`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function AdminAnalyticsPage() {
  const { loading: guardLoading } = useAdminGuard();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'features' | 'users'>('overview');

  useEffect(() => {
    if (guardLoading) return;
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guardLoading, days]);

  // Aggregate feature usage by feature ID
  const featureAgg = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const f of data.featureUsage) {
      map.set(f.feature, (map.get(f.feature) || 0) + f.count);
    }
    return Array.from(map.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Guard AFTER all hooks so the hook count is stable across renders.
  if (guardLoading) return null;

  return (
    <AdminLayout>
      <Head><title>Analytics | Admin | AdmitsOnly</title></Head>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-primary">Analytics</h1>
              <p className="text-sm text-slate-400">
                {data ? `${formatNumber(data.overview.totalEvents)} events · ${data.overview.uniqueUsers} users` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days === d ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading analytics...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard label="Unique Users" value={data.overview.uniqueUsers} icon="users" />
              <KPICard label="Sessions" value={data.overview.uniqueSessions} icon="sessions" />
              <KPICard label="Pageviews" value={data.overview.totalPageviews} icon="pages" />
              <KPICard label="Avg Duration" value={formatDuration(data.durationStats.avg)} icon="clock" />
              <KPICard label="Avg Pages/Sess" value={data.depthStats.avgPageviews} icon="depth" />
              <KPICard label="Feature Events" value={data.overview.totalFeatureEvents} icon="features" />
            </div>

            {/* Tab nav */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {(['overview', 'pages', 'features', 'users'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                    activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily traffic */}
                <Card title="Daily Traffic" subtitle="Sessions & pageviews over time">
                  <BarChart
                    data={data.dailyVisits}
                    labelKey="day"
                    valueKey="sessions"
                    secondaryKey="pageviews"
                    color="from-accent to-purple-500"
                    secondaryColor="from-emerald-400 to-teal-500"
                  />
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-accent to-purple-500" />
                      Sessions
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-emerald-400 to-teal-500 opacity-60" />
                      Pageviews
                    </div>
                  </div>
                </Card>

                {/* Session quality */}
                <Card title="Session Quality" subtitle="How deeply users engage per session">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                      <div className="text-xl font-bold text-primary">{formatDuration(data.durationStats.median)}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Median Duration</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                      <div className="text-xl font-bold text-primary">{data.depthStats.avgClicks}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Avg Clicks</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                      <div className="text-xl font-bold text-primary">{data.depthStats.avgFeatures}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Avg Features</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Max session: {formatDuration(data.durationStats.max)} · {data.overview.totalClicks} total clicks
                  </div>
                </Card>

                {/* Device breakdown */}
                <Card title="Device Breakdown" subtitle="Mobile vs Desktop sessions">
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">{data.deviceBreakdown.desktop}</div>
                          <div className="text-xs text-slate-400">Desktop</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">{data.deviceBreakdown.mobile}</div>
                          <div className="text-xs text-slate-400">Mobile</div>
                        </div>
                      </div>
                    </div>
                    <div className="w-24 h-24">
                      <DeviceDonut desktop={data.deviceBreakdown.desktop} mobile={data.deviceBreakdown.mobile} />
                    </div>
                  </div>
                </Card>

                {/* Activity heatmap */}
                <Card title="Activity Heatmap" subtitle="When users are most active (hour × day)">
                  <ActivityHeatmap data={data.hourlyActivity} />
                </Card>

                {/* Nav engagement */}
                <Card title="Navigation Sources" subtitle="How users navigate the app">
                  <HorizontalBarList
                    items={data.navSources.map(n => ({
                      label: NAV_SOURCE_LABELS[n.source] || n.source,
                      value: n.count,
                    }))}
                    color="bg-gradient-to-r from-accent to-purple-500"
                  />
                </Card>

                {/* Nav targets */}
                <Card title="Nav Destinations" subtitle="Most clicked nav links">
                  <HorizontalBarList
                    items={data.navTargets.map(n => ({ label: n.target, value: n.count }))}
                    color="bg-gradient-to-r from-emerald-400 to-teal-500"
                  />
                </Card>
              </div>
            )}

            {/* TAB: Pages */}
            {activeTab === 'pages' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Pages" subtitle="Most visited pages">
                  <HorizontalBarList
                    items={data.topPages.map(p => ({ label: p.path, value: p.views, suffix: ' views' }))}
                    color="bg-gradient-to-r from-accent to-purple-500"
                  />
                </Card>

                <Card title="Scroll Engagement" subtitle="Average scroll depth by page">
                  <HorizontalBarList
                    items={data.scrollDepth.map(s => ({
                      label: s.path,
                      value: s.avgDepth,
                      suffix: `% (${s.count})`,
                    }))}
                    color="bg-gradient-to-r from-amber-400 to-orange-500"
                  />
                </Card>
              </div>
            )}

            {/* TAB: Features */}
            {activeTab === 'features' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Feature Adoption" subtitle="Which tools are used most">
                  <HorizontalBarList
                    items={featureAgg.map(f => ({ label: f.feature, value: f.count }))}
                    color="bg-gradient-to-r from-accent to-purple-500"
                  />
                </Card>

                <Card title="Feature Actions" subtitle="Detailed feature interactions">
                  <div className="max-h-[400px] overflow-y-auto space-y-1.5">
                    {data.featureUsage.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-accent shrink-0">{f.feature}</span>
                          <span className="text-[10px] text-slate-400 truncate">{f.action}</span>
                        </div>
                        <span className="text-xs font-bold text-primary tabular-nums shrink-0 ml-2">{f.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB: Users */}
            {activeTab === 'users' && (
              <Card title="Top Active Users" subtitle={`Most engaged users in the last ${days} days`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sessions</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pageviews</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUsers.map((u, i) => (
                        <tr key={u.userId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {(u.name || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-primary truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-right text-sm font-bold text-primary tabular-nums">{u.sessions}</td>
                          <td className="text-right text-sm font-bold text-primary tabular-nums">{u.pageviews}</td>
                          <td className="text-right">
                            <span className={`text-sm font-bold tabular-nums ${u.features > 0 ? 'text-accent' : 'text-slate-300'}`}>{u.features}</span>
                          </td>
                        </tr>
                      ))}
                      {data.topUsers.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No user data yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-sm text-slate-400">Failed to load analytics data.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────── KPI CARD ──────────────────────── */

function KPICard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  const iconMap: Record<string, JSX.Element> = {
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    sessions: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    pages: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    clock: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" strokeWidth={1.8} fill="none" stroke="currentColor" /></>,
    depth: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />,
    features: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {iconMap[icon] || iconMap.pages}
        </svg>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold text-primary tabular-nums">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
    </div>
  );
}

/* ──────────────────────── CARD WRAPPER ──────────────────────── */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ──────────────────────── DEVICE DONUT ──────────────────────── */

function DeviceDonut({ desktop, mobile }: { desktop: number; mobile: number }) {
  const total = desktop + mobile || 1;
  const desktopPct = Math.round((desktop / total) * 100);
  const mobilePct = 100 - desktopPct;
  const circumference = 2 * Math.PI * 36;
  const desktopArc = (desktopPct / 100) * circumference;

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle
        cx="40" cy="40" r="36" fill="none"
        stroke="url(#donut-grad)" strokeWidth="8"
        strokeDasharray={`${desktopArc} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <defs>
        <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <text x="40" y="38" textAnchor="middle" className="fill-primary text-[13px] font-bold">{desktopPct}%</text>
      <text x="40" y="50" textAnchor="middle" className="fill-slate-400 text-[8px]">desktop</text>
    </svg>
  );
}

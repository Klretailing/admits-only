import { useEffect, useState } from 'react';

/* Aggregate, privacy-safe audience & usage insights for the admin Command Center.
   Renders only counts/percentages from /api/admin/audience — no PII. */

interface Audience {
  activeUsers: { dau: number; wau: number; mau: number };
  activeSessions: { today: number; week: number; month: number };
  returning: { total: number; returning: number; rate: number };
  byHour: { hour: number; count: number }[];
  byWeekday: { dow: number; count: number }[];
  peakHour: number | null;
  peakDay: number | null;
  roleMix: { role: string; count: number }[];
  deviceMix: { mobile: number; desktop: number };
  topFeatures: { feature: string; count: number }[];
  topPages: { path: string; views: number }[];
  signups: { last7: number; last30: number };
  totalEvents: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ROLE_LABEL: Record<string, string> = { student: 'Students', parent: 'Parents', educator: 'Educators', admin: 'Admins', unknown: 'Other' };
const ROLE_COLOR: Record<string, string> = { student: 'bg-accent', parent: 'bg-teal-500', educator: 'bg-emerald-500', admin: 'bg-amber-500', unknown: 'bg-slate-300' };

function hourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="mt-1.5 text-2xl font-bold font-display text-primary">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Bars({ data, peakIndex, labelFor }: { data: number[]; peakIndex: number | null; labelFor: (i: number) => string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-28">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
          <div
            className={`w-full rounded-t transition-all ${i === peakIndex ? 'bg-accent' : 'bg-accent/25 group-hover:bg-accent/40'}`}
            style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0 }}
            title={`${labelFor(i)}: ${v}`}
          />
          <span className="text-[8px] text-slate-400 mt-1 leading-none">{labelFor(i)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AudienceInsights() {
  const [data, setData] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audience')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="animate-pulse text-slate-300 text-sm">Loading audience insights…</div>
      </div>
    );
  }
  if (!data) return null;

  const a = data;
  const hasActivity = a.totalEvents > 0;
  const totalDevice = a.deviceMix.mobile + a.deviceMix.desktop;
  const mobilePct = totalDevice ? Math.round((a.deviceMix.mobile / totalDevice) * 100) : 0;
  const roleTotal = a.roleMix.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-display text-primary">Audience &amp; Usage</h3>
          <p className="text-xs text-slate-400">How your community uses the app — last 30 days.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold" title="Only aggregate counts — no personal data or content.">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Aggregate &amp; anonymized
        </span>
      </div>

      {!hasActivity ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No activity captured yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">As your new users explore the app, usage patterns — when they’re active, what they use, and how they return — will appear here automatically.</p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Active this week" value={a.activeUsers.wau} sub={`${a.activeSessions.week} sessions`} />
            <Stat label="Active this month" value={a.activeUsers.mau} sub={`${a.activeSessions.month} sessions`} />
            <Stat label="Returning rate" value={`${a.returning.rate}%`} sub={`${a.returning.returning} came back`} />
            <Stat label="Mobile share" value={`${mobilePct}%`} sub={`${100 - mobilePct}% desktop`} />
            <Stat label="Peak time" value={a.peakHour !== null ? hourLabel(a.peakHour) : '—'} sub={a.peakDay !== null ? DAYS[a.peakDay] + 's' : 'UTC'} />
            <Stat label="New signups" value={a.signups.last30} sub={`${a.signups.last7} this week`} />
          </div>

          {/* When: hour + weekday */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-primary">When they’re active — by hour</h4>
                <span className="text-[10px] text-slate-400">UTC</span>
              </div>
              <Bars
                data={a.byHour.map(h => h.count)}
                peakIndex={a.peakHour}
                labelFor={i => (i % 6 === 0 ? hourLabel(i) : '')}
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-sm font-bold text-primary mb-4">When they’re active — by day</h4>
              <Bars
                data={a.byWeekday.map(d => d.count)}
                peakIndex={a.peakDay}
                labelFor={i => DAYS[i]}
              />
            </div>
          </div>

          {/* Composition: roles, device, top features, top pages */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-sm font-bold text-primary mb-4">Who your audience is</h4>
              <div className="space-y-3">
                {a.roleMix.map(r => (
                  <div key={r.role}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-primary">{ROLE_LABEL[r.role] || r.role}</span>
                      <span className="text-slate-500">{r.count} · {Math.round((r.count / roleTotal) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ROLE_COLOR[r.role] || 'bg-slate-300'}`} style={{ width: `${(r.count / roleTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[11px] text-slate-400">Device</p>
                  <div className="mt-1.5 h-2.5 rounded-full overflow-hidden bg-slate-100 flex">
                    <div className="h-full bg-accent" style={{ width: `${mobilePct}%` }} title={`Mobile ${mobilePct}%`} />
                    <div className="h-full bg-slate-300" style={{ width: `${100 - mobilePct}%` }} title={`Desktop ${100 - mobilePct}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>📱 {mobilePct}% mobile</span>
                    <span>🖥️ {100 - mobilePct}% desktop</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <h4 className="text-sm font-bold text-primary mb-3">Top features</h4>
                  {a.topFeatures.length ? (
                    <ul className="space-y-2">
                      {a.topFeatures.map(f => (
                        <li key={f.feature} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate mr-2">{f.feature}</span>
                          <span className="font-semibold text-slate-500 flex-shrink-0">{f.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-slate-400">No feature usage yet.</p>}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary mb-3">Top pages</h4>
                  {a.topPages.length ? (
                    <ul className="space-y-2">
                      {a.topPages.map(p => (
                        <li key={p.path} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate mr-2">{p.path.replace('/dashboard', '') || '/'}</span>
                          <span className="font-semibold text-slate-500 flex-shrink-0">{p.views}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-slate-400">No page views yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

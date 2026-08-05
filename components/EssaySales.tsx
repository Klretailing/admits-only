import { useEffect, useState } from 'react';

/* Essay Library sales (one-time PayPal purchases) for the admin Payments page. */

interface Tier { key: string; label: string; count: number; revenueCents: number }
interface Recent { id: string; name: string; email: string; label: string; amountCents: number; createdAt: string }
interface Sales {
  configured: boolean;
  totalRevenueCents: number;
  totalCount: number;
  month: { count: number; revenueCents: number };
  byTier: Tier[];
  recent: Recent[];
}

const money = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TIER_COLOR: Record<string, string> = { 'Full Repository': 'bg-accent', 'UC Essay Vault': 'bg-blue-500' };

function relDate(d: string): string {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const day = Math.floor(diff / 86400000);
  if (day < 1) return 'Today';
  if (day < 2) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EssaySales() {
  const [data, setData] = useState<Sales | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/essay-sales')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="animate-pulse text-slate-300 text-sm">Loading essay sales…</div>
      </div>
    );
  }
  if (!data) return null;

  const maxTier = Math.max(...data.byTier.map((t) => t.revenueCents), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold font-display text-primary">Essay Library Sales</h3>
          <p className="text-xs text-slate-400">One-time PayPal purchases (UC Vault + Full Repository)</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#003087]/5 text-[#003087] text-[11px] font-semibold">
          <span className="italic font-bold">P</span> PayPal
        </span>
      </div>

      {data.totalCount === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-medium text-slate-600">No essay purchases yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {data.configured
              ? 'Sales will appear here the moment a student unlocks the UC Vault or Full Repository.'
              : 'PayPal isn’t connected yet — connect it in Settings → Integrations to start selling access.'}
          </p>
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl bg-surface border border-slate-100 p-4">
              <p className="text-xs text-slate-500 font-medium">Total revenue</p>
              <p className="mt-1 text-2xl font-bold font-display text-primary">{money(data.totalRevenueCents)}</p>
            </div>
            <div className="rounded-xl bg-surface border border-slate-100 p-4">
              <p className="text-xs text-slate-500 font-medium">Purchases</p>
              <p className="mt-1 text-2xl font-bold font-display text-primary">{data.totalCount}</p>
            </div>
            <div className="rounded-xl bg-surface border border-slate-100 p-4">
              <p className="text-xs text-slate-500 font-medium">This month</p>
              <p className="mt-1 text-2xl font-bold font-display text-primary">{money(data.month.revenueCents)}</p>
              <p className="text-[11px] text-slate-400">{data.month.count} sale{data.month.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-xl bg-surface border border-slate-100 p-4">
              <p className="text-xs text-slate-500 font-medium">Avg / sale</p>
              <p className="mt-1 text-2xl font-bold font-display text-primary">
                {money(data.totalCount ? Math.round(data.totalRevenueCents / data.totalCount) : 0)}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Tier breakdown */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">By tier</p>
              <div className="space-y-3">
                {data.byTier.map((t) => (
                  <div key={t.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-primary">{t.label}</span>
                      <span className="text-slate-500">{money(t.revenueCents)} · {t.count} sold</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${TIER_COLOR[t.label] || 'bg-slate-400'}`} style={{ width: `${(t.revenueCents / maxTier) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent purchases */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recent purchases</p>
              <div className="space-y-2">
                {data.recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      {(r.name || 'S')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{r.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-700">{money(r.amountCents)}</p>
                      <p className="text-[11px] text-slate-400">{relDate(r.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

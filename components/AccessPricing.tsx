import { useEffect, useState } from 'react';

/* Shows the LIVE essay-access pricing (the two tiers students actually pay).
   Read-only source of truth so the admin can always see current prices. */

interface Tier { id: string; name: string; scope: string; price: number; anchor: number; includes: string }

const money = (v: number) => `$${v.toFixed(2)}`;
const TIER_TINT: Record<string, string> = { uc: 'from-blue-500 to-indigo-600', all: 'from-accent to-purple-600' };

export default function AccessPricing() {
  const [tiers, setTiers] = useState<Tier[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTiers(d?.tiers || []))
      .catch(() => setTiers([]));
  }, []);

  if (!tiers) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold font-display text-primary">Live Access Pricing</h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live on the storefront
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        What students actually pay to unlock essays (on the <span className="font-medium text-slate-500">Essay Samples</span> paywall). This is the source of truth.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((t) => {
          const save = t.anchor > t.price ? Math.round(((t.anchor - t.price) / t.anchor) * 100) : 0;
          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${TIER_TINT[t.id] || 'from-slate-400 to-slate-600'}`} />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-primary">{t.name}</p>
                  {t.id === 'all' && (
                    <span className="text-[10px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5">BEST VALUE</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[2rem]">{t.includes}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold font-display text-primary">{money(t.price)}</span>
                  {t.anchor > t.price && <span className="text-sm text-slate-400 line-through mb-1">{money(t.anchor)}</span>}
                  {save > 0 && <span className="mb-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">SAVE {save}%</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

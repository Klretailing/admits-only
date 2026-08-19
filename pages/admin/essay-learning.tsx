import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';

/* Admin review desk for the essay learning loop.
   Candidates derived from tutor-reviewed essays appear here; nothing reaches
   a student until it is promoted from this screen. */

interface Corpus { total: number; strong: number; weak: number; mixed: number; unlabeled: number; ready: boolean; shortfall: number }
interface PatternCandidate {
  kind: 'caution' | 'style'; target: string; label: string;
  weakRate: number; strongRate: number; lift: number; nWeak: number; nStrong: number; message: string;
}
interface FeatureCandidate {
  target: string; label: string; strongMean: number; weakMean: number; effect: number;
  direction: 'higher-in-strong' | 'higher-in-weak';
}
interface Rule {
  id: string; kind: 'caution' | 'style'; target: string; label: string;
  status: 'candidate' | 'active' | 'rejected'; message: string; stats: any;
}
interface Payload {
  corpus: Corpus; patterns: PatternCandidate[]; features: FeatureCandidate[]; rules: Rule[];
  thresholds: { minCohort: number; minPatternObs: number; cautionLift: number; minEffect: number };
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 surface p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold font-display ${tone || 'text-primary'}`}>{value}</p>
    </div>
  );
}

export default function EssayLearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const load = useCallback(() => {
    fetch('/api/admin/essay-learning')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  async function post(body: any, key: string) {
    setBusy(key); setNotice(null);
    try {
      const r = await fetch('/api/admin/essay-learning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.error) setNotice(d.error);
      else if (body.action === 'derive') setNotice(`Recomputed — ${d.saved} candidate rule(s) saved.`);
      load();
    } catch { setNotice('Something went wrong. Try again.'); }
    setBusy(null);
  }

  if (status !== 'authenticated') return null;

  const c = data?.corpus;
  const active = (data?.rules || []).filter(r => r.status === 'active');
  const candidates = (data?.rules || []).filter(r => r.status === 'candidate');
  const rejected = (data?.rules || []).filter(r => r.status === 'rejected');

  return (
    <AdminLayout>
      <Head><title>Essay Learning | Admin</title></Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Essay Learning Loop</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-3xl">
            Every saved essay contributes anonymous craft measurements — never its text. When a tutor
            completes a review with scores, that essay becomes labelled data. Patterns that separate
            strong from weak essays surface here as candidates. Nothing reaches a student until you promote it.
          </p>
        </div>

        {notice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-slate-400">Couldn&apos;t load the learning data.</p>
        ) : (
          <>
            {/* corpus */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Essays measured" value={c!.total} />
              <Stat label="Rated strong" value={c!.strong} tone="text-emerald-600" />
              <Stat label="Rated weak" value={c!.weak} tone="text-rose-600" />
              <Stat label="Middling" value={c!.mixed} />
              <Stat label="Awaiting review" value={c!.unlabeled} />
            </div>

            {!c!.ready && (
              <div className="rounded-2xl border border-slate-200 bg-white surface p-5">
                <p className="text-sm font-semibold text-primary">Not enough labelled data yet</p>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                  Deriving rules needs at least {data.thresholds.minCohort} tutor-rated strong essays and{' '}
                  {data.thresholds.minCohort} weak ones. You currently have {c!.strong} and {c!.weak}.
                  Until then the loop keeps collecting measurements and proposes nothing — small samples
                  produce confident-looking rules that are mostly noise.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => post({ action: 'derive' }, 'derive')}
                disabled={busy === 'derive'}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {busy === 'derive' ? 'Recomputing…' : 'Recompute candidates'}
              </button>
              <span className="text-xs text-slate-400">
                Thresholds: lift ≥ {data.thresholds.cautionLift}, ≥ {data.thresholds.minPatternObs} observations per pattern
              </span>
            </div>

            {/* active rules */}
            <section>
              <h2 className="text-sm font-bold text-primary mb-2">Live for students ({active.length})</h2>
              {active.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing promoted yet.</p>
              ) : (
                <div className="space-y-2">
                  {active.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-emerald-200 surface p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.kind === 'caution' ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>{r.kind}</span>
                            <span className="text-sm font-semibold text-primary">{r.label}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-2xl">{r.message}</p>
                        </div>
                        <button
                          onClick={() => post({ action: 'reject', id: r.id }, r.id)}
                          disabled={busy === r.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-50"
                        >
                          Retire
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* candidates */}
            <section>
              <h2 className="text-sm font-bold text-primary mb-2">Candidates awaiting your call ({candidates.length})</h2>
              {candidates.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {c!.ready ? 'No pattern currently clears the thresholds.' : 'Collecting data.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {candidates.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 surface p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.kind === 'caution' ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>{r.kind}</span>
                            <span className="text-sm font-semibold text-primary">{r.label}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-2xl">{r.message}</p>
                          {r.stats && (
                            <p className="mt-2 text-[11px] text-slate-400 tabular-nums">
                              {Math.round((r.stats.weakRate || 0) * 100)}% of weak · {Math.round((r.stats.strongRate || 0) * 100)}% of strong
                              {' '}· lift {r.stats.lift}× · n={r.stats.nWeak}/{r.stats.nStrong}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => post({ action: 'promote', id: r.id }, r.id)}
                            disabled={busy === r.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => post({ action: 'reject', id: r.id }, r.id)}
                            disabled={busy === r.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* discriminating measurements — read-only insight */}
            {data.features.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-primary mb-2">What separates strong from weak</h2>
                <p className="text-xs text-slate-500 mb-3 max-w-2xl">
                  Measurements whose averages differ meaningfully between the two cohorts. Shown for insight —
                  these do not change scoring on their own.
                </p>
                <div className="bg-white rounded-xl border border-slate-100 surface overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Measurement</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Strong avg</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Weak avg</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Effect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.features.map(f => (
                          <tr key={f.target} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-2.5 text-primary font-medium">{f.label}</td>
                            <td className="px-4 py-2.5 text-slate-600 tabular-nums">{f.strongMean}</td>
                            <td className="px-4 py-2.5 text-slate-600 tabular-nums">{f.weakMean}</td>
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${f.direction === 'higher-in-strong' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {f.effect > 0 ? '+' : ''}{f.effect}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {rejected.length > 0 && (
              <p className="text-xs text-slate-400">{rejected.length} rule(s) dismissed.</p>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

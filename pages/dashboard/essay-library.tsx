import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

/* ── Types (mirror /api/sample-essays) ── */
interface EssayMeta {
  id: string;
  school: string;
  schoolSlug: string;
  essayType: string;
  promptLabel: string;
  prompt: string;
  wordCount: number;
  preview: string;
}
interface SchoolBucket {
  school: string;
  schoolSlug: string;
  count: number;
  essays: EssayMeta[];
}
interface FullEssay extends EssayMeta {
  essay: string;
}

const TYPE_COLORS: Record<string, string> = {
  'Personal Statement': 'bg-indigo-50 text-indigo-600',
  'UC Personal Insight': 'bg-amber-50 text-amber-600',
  'Supplemental Essay': 'bg-emerald-50 text-emerald-600',
  'Short Answer': 'bg-sky-50 text-sky-600',
};

function typeColor(t: string): string {
  return TYPE_COLORS[t] || 'bg-slate-100 text-slate-500';
}

export default function EssaySamples() {
  const { status } = useSession();
  const router = useRouter();
  const [buckets, setBuckets] = useState<SchoolBucket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const PAGE = 24; // cap rendered cards per bucket to keep the DOM light

  const [selected, setSelected] = useState<FullEssay | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/sample-essays')
      .then((r) => r.json())
      .then((d) => {
        setBuckets(d.buckets || []);
        setTotal(d.total || 0);
        // Auto-expand the first bucket for immediate content
        if (d.buckets && d.buckets[0]) setExpanded({ [d.buckets[0].schoolSlug]: true });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const openEssay = async (id: string) => {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/sample-essays?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.essay) setSelected(data.essay);
    } catch { /* silent */ }
    setLoadingDoc(false);
  };

  // Filter buckets/essays by the search query
  const filtered = useMemo(() => {
    if (!search.trim()) return buckets;
    const q = search.toLowerCase();
    return buckets
      .map((b) => {
        const schoolHit = b.school.toLowerCase().includes(q);
        const essays = schoolHit
          ? b.essays
          : b.essays.filter(
              (e) =>
                e.essayType.toLowerCase().includes(q) ||
                e.promptLabel.toLowerCase().includes(q) ||
                e.prompt.toLowerCase().includes(q) ||
                e.preview.toLowerCase().includes(q),
            );
        return { ...b, essays, count: essays.length };
      })
      .filter((b) => b.essays.length > 0);
  }, [buckets, search]);

  // When searching, expand everything that matched
  const isExpanded = (slug: string) => (search.trim() ? true : !!expanded[slug]);

  if (status !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <Head><title>Essay Samples | AdmitsOnly</title></Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Essay Samples</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Real, anonymized admissions essays — organized by the school and prompt each was written for.
            {total > 0 && <span className="text-slate-400"> {total} essays available.</span>}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school, prompt, or topic…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading essay samples…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h3 className="text-lg font-bold text-primary">
              {search ? 'No essays match your search' : 'Essay samples coming soon'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {search ? 'Try a different school or topic.' : 'A curated library of successful essays will appear here shortly.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((bucket) => {
              const open = isExpanded(bucket.schoolSlug);
              return (
                <div key={bucket.schoolSlug} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {/* Accordion header */}
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [bucket.schoolSlug]: !p[bucket.schoolSlug] }))}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4.5 h-4.5 text-accent" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 14l6.16-3.42A12 12 0 0112 21a12 12 0 01-6.16-10.42L12 14z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-primary truncate">{bucket.school}</h3>
                      <p className="text-xs text-slate-400">{bucket.count} {bucket.count === 1 ? 'essay' : 'essays'}</p>
                    </div>
                    <svg className={`w-5 h-5 text-slate-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Accordion body — cap rendered cards to keep the DOM light on big buckets */}
                  {open && (() => {
                    const all = showAll[bucket.schoolSlug] || search.trim();
                    const visible = all ? bucket.essays : bucket.essays.slice(0, PAGE);
                    return (
                      <div className="px-3 pb-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {visible.map((e) => (
                            <button
                              key={e.id}
                              onClick={() => openEssay(e.id)}
                              className="text-left bg-white rounded-xl border border-slate-100 p-4 hover:border-accent/30 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeColor(e.essayType)}`}>{e.essayType}</span>
                                <span className="text-[10px] text-slate-300 font-medium ml-auto">{e.wordCount} words</span>
                              </div>
                              {e.promptLabel && <h4 className="text-xs font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">{e.promptLabel}</h4>}
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">{e.preview}</p>
                            </button>
                          ))}
                        </div>
                        {!all && bucket.essays.length > PAGE && (
                          <button
                            onClick={() => setShowAll((p) => ({ ...p, [bucket.schoolSlug]: true }))}
                            className="mt-3 w-full py-2 text-xs font-semibold text-accent hover:bg-accent/5 rounded-lg transition-colors"
                          >
                            Show all {bucket.essays.length} essays
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* Reader modal (view-only, no download) */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-accent/10 text-accent text-xs font-bold rounded-full">{selected.school}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${typeColor(selected.essayType)}`}>{selected.essayType}</span>
                    </div>
                    {selected.prompt && <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">&ldquo;{selected.prompt}&rdquo;</p>}
                    <p className="text-[11px] text-slate-300 mt-2">{selected.wordCount} words</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 select-none">
                <div className="max-w-none">
                  {selected.essay.split('\n').map((para, i) =>
                    para.trim() ? (
                      <p key={i} className="text-sm text-slate-700 leading-relaxed mb-4">{para}</p>
                    ) : null,
                  )}
                </div>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex-shrink-0">
                <p className="text-[11px] text-slate-400 text-center">Anonymized sample · written for {selected.school} · view only</p>
              </div>
            </div>
          </div>
        )}

        {loadingDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center">
            <div className="bg-white rounded-xl px-6 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Loading essay…</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

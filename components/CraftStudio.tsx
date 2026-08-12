import { useState } from 'react';
import type { CraftReport, CraftSuggestion, CraftSeverity } from '../lib/essayCraft';
import { craftCategoryLabel } from '../lib/essayCraft';

/* Craft Studio — renders the deep writing-craft analysis (rhythm, readability,
   tone, structure, line edits, and originality angles) as a compact,
   scannable coaching panel inside the essay editor sidebar. */

const SEV_STYLE: Record<CraftSeverity, { dot: string; chip: string; ring: string }> = {
  caution: { dot: 'bg-rose-400', chip: 'text-rose-700 bg-rose-50', ring: 'border-rose-100' },
  tip: { dot: 'bg-amber-400', chip: 'text-amber-700 bg-amber-50', ring: 'border-amber-100' },
  praise: { dot: 'bg-emerald-400', chip: 'text-emerald-700 bg-emerald-50', ring: 'border-emerald-100' },
};

const METRIC_COLOR: Record<string, string> = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444' };

function SuggestionCard({ s }: { s: CraftSuggestion }) {
  const [open, setOpen] = useState(false);
  const sev = SEV_STYLE[s.severity];
  return (
    <div className={`rounded-xl border ${sev.ring} bg-white`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot} mt-1.5 flex-shrink-0`} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${sev.chip}`}>{craftCategoryLabel(s.category)}</span>
            <span className="text-[11px] font-semibold text-primary leading-snug">{s.title}</span>
          </span>
        </span>
        <svg className={`w-3 h-3 text-slate-300 mt-1 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0.5 ml-3.5 space-y-2">
          <p className="text-[11px] text-slate-600 leading-relaxed">{s.detail}</p>
          {s.excerpt && (
            <div className="text-[10.5px] text-slate-500 italic border-l-2 border-slate-200 pl-2.5 leading-relaxed">
              “{s.excerpt}”
            </div>
          )}
          {s.example && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose-500 mt-0.5 w-10 flex-shrink-0">Before</span>
                <span className="text-[10.5px] text-slate-500 leading-relaxed">{s.example.before}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5 w-10 flex-shrink-0">After</span>
                <span className="text-[10.5px] text-slate-700 leading-relaxed font-medium">{s.example.after}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CraftStudio({ report }: { report: CraftReport }) {
  if (!report.ready) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm">✍️</span>
          <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Craft Studio</h4>
        </div>
        <p className="text-[10.5px] text-slate-400 leading-relaxed">Keep writing — once you have about 40 words, you&apos;ll get live coaching on rhythm, readability, tone, structure, and originality.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-indigo-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">✍️</span>
          <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Craft Studio</h4>
        </div>
        {report.theme && (
          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 capitalize">{report.theme}</span>
        )}
      </div>

      {/* Metric dials */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {report.metrics.map((m) => (
          <div key={m.key} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2 text-center">
            <div className="text-[13px] font-bold" style={{ color: METRIC_COLOR[m.status] }}>{m.value}</div>
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">{m.label}</div>
            <div className="mt-1 h-1 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.value}%`, backgroundColor: METRIC_COLOR[m.status] }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9.5px] text-slate-400 mb-3 leading-relaxed">
        {report.metrics.map((m) => `${m.label}: ${m.hint}`).join(' · ')}
      </p>

      {/* Suggestions */}
      {report.suggestions.length > 0 ? (
        <div className="space-y-1.5">
          {report.suggestions.map((s) => <SuggestionCard key={s.id} s={s} />)}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Clean pass — rhythm, tone, and clarity all look strong.
        </div>
      )}
      <p className="text-[9px] text-slate-300 mt-2.5 text-center">Tap a suggestion to expand · guidance, not grading</p>
    </div>
  );
}

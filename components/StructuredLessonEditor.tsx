import { type Block, type RowCol, emptyRow, chartPoints } from '../lib/structuredTemplates';

/* Interactive renderer for structured premium lesson templates.
   Renders a schema against a `value` data object and emits changes. */

function MiniChart({ points, kind, max, unit }: { points: { label: string; value: number }[]; kind: 'bar' | 'line'; max?: number; unit?: string }) {
  if (!points.length) {
    return (
      <div className="h-28 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
        Add rows above to build the chart
      </div>
    );
  }
  const W = 320, H = 128, padL = 8, padR = 8, padT = 12, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(max || 0, ...points.map(p => p.value), 1);
  const n = points.length;
  const short = (s: string) => (s.length > 7 ? s.slice(0, 6) + '…' : s);
  const y = (v: number) => padT + innerH - (v / maxVal) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
      {/* baseline */}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="#e2e8f0" strokeWidth={1} />
      {kind === 'bar'
        ? points.map((p, i) => {
            const slot = innerW / n;
            const bw = slot * 0.56;
            const x = padL + slot * i + (slot - bw) / 2;
            const h = (p.value / maxVal) * innerH;
            return (
              <g key={i}>
                <rect x={x} y={padT + innerH - h} width={bw} height={Math.max(h, 1)} rx={3} fill="#10b981" opacity={0.85} />
                <text x={x + bw / 2} y={padT + innerH - h - 3} textAnchor="middle" fontSize={9} fill="#475569">{p.value}</text>
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{short(p.label)}</text>
              </g>
            );
          })
        : (() => {
            const px = (i: number) => (n === 1 ? padL + innerW / 2 : padL + (innerW / (n - 1)) * i);
            const line = points.map((p, i) => `${px(i)},${y(p.value)}`).join(' ');
            return (
              <g>
                <polyline points={line} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={px(i)} cy={y(p.value)} r={3} fill="#10b981" />
                    <text x={px(i)} y={y(p.value) - 6} textAnchor="middle" fontSize={9} fill="#475569">{p.value}</text>
                    <text x={px(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{short(p.label)}</text>
                  </g>
                ))}
              </g>
            );
          })()}
    </svg>
  );
}

function Rating({ value, max, onChange }: { value: any; max: number; onChange: (v: number) => void }) {
  const v = Number(value) || 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(v === n ? 0 : n)}
          className={`w-6 h-6 rounded-md text-xs font-bold transition-colors ${
            v >= n ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function StructuredLessonEditor({
  schema,
  value,
  onChange,
}: {
  schema: Block[];
  value: any;
  onChange: (next: any) => void;
}) {
  const data = value || {};
  const set = (key: string, v: any) => onChange({ ...data, [key]: v });
  const setRow = (rowsKey: string, idx: number, col: string, v: any) => {
    const rows = Array.isArray(data[rowsKey]) ? [...data[rowsKey]] : [];
    rows[idx] = { ...rows[idx], [col]: v };
    onChange({ ...data, [rowsKey]: rows });
  };
  const addRow = (rowsKey: string, columns: RowCol[]) => {
    const rows = Array.isArray(data[rowsKey]) ? [...data[rowsKey]] : [];
    onChange({ ...data, [rowsKey]: [...rows, emptyRow(columns)] });
  };
  const removeRow = (rowsKey: string, idx: number) => {
    const rows = Array.isArray(data[rowsKey]) ? [...data[rowsKey]] : [];
    rows.splice(idx, 1);
    onChange({ ...data, [rowsKey]: rows });
  };
  const toggleCheck = (key: string, k: string) => {
    const cur = data[key] || {};
    onChange({ ...data, [key]: { ...cur, [k]: !cur[k] } });
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 bg-white';

  return (
    <div className="space-y-4">
      {schema.map((b, i) => {
        if (b.t === 'group') {
          return (
            <div key={i} className="pt-2">
              <p className="text-sm font-bold text-slate-800">{b.label}</p>
              {b.help && <p className="text-xs text-slate-400 mt-0.5">{b.help}</p>}
            </div>
          );
        }
        if (b.t === 'text') {
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{b.label}</label>
              <input value={data[b.key] || ''} onChange={e => set(b.key, e.target.value)} placeholder={b.placeholder} className={inputCls} />
            </div>
          );
        }
        if (b.t === 'notes') {
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{b.label}</label>
              <textarea value={data[b.key] || ''} onChange={e => set(b.key, e.target.value)} placeholder={b.placeholder} rows={2} className={`${inputCls} resize-none leading-relaxed`} />
            </div>
          );
        }
        if (b.t === 'select') {
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{b.label}</label>
              <select value={data[b.key] || ''} onChange={e => set(b.key, e.target.value)} className={`${inputCls} cursor-pointer ${data[b.key] ? '' : 'text-slate-400'}`}>
                <option value="">Choose…</option>
                {b.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        }
        if (b.t === 'number') {
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{b.label}{b.unit ? ` (${b.unit})` : ''}</label>
              <input type="number" value={data[b.key] ?? ''} onChange={e => set(b.key, e.target.value)} placeholder={b.placeholder} className={`${inputCls} w-40`} />
            </div>
          );
        }
        if (b.t === 'rating') {
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{b.label}</label>
              <div className="flex items-center gap-3">
                <Rating value={data[b.key]} max={b.max || 5} onChange={v => set(b.key, v)} />
                {(b.lowLabel || b.highLabel) && (
                  <span className="text-[11px] text-slate-400">{b.lowLabel} → {b.highLabel}</span>
                )}
              </div>
            </div>
          );
        }
        if (b.t === 'checklist') {
          const cur = data[b.key] || {};
          return (
            <div key={i}>
              {b.label && <label className="block text-xs font-semibold text-slate-500 mb-1.5">{b.label}</label>}
              <div className="flex flex-wrap gap-2">
                {b.items.map(it => {
                  const on = !!cur[it.k];
                  return (
                    <button
                      key={it.k}
                      type="button"
                      onClick={() => toggleCheck(b.key, it.k)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        on ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center ${on ? 'bg-white/20' : 'bg-slate-100'}`}>
                        {on && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {it.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (b.t === 'rows') {
          const rows: any[] = Array.isArray(data[b.key]) ? data[b.key] : [];
          return (
            <div key={i}>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{b.label}</label>
              <div className="space-y-1.5">
                <div className="hidden sm:flex items-center gap-2 px-1">
                  {b.columns.map(c => (
                    <span key={c.key} className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${c.type === 'text' ? 'flex-1' : ''}`} style={c.type !== 'text' ? { width: c.type === 'rating' ? (c.max || 5) * 28 + 8 : 96 } : undefined}>{c.label}</span>
                  ))}
                  <span className="w-6" />
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    {b.columns.map(c => {
                      if (c.type === 'select') {
                        return (
                          <select key={c.key} value={row[c.key] || ''} onChange={e => setRow(b.key, ri, c.key, e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white" style={{ width: 120 }}>
                            <option value="">—</option>
                            {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        );
                      }
                      if (c.type === 'rating') {
                        return <div key={c.key} style={{ width: (c.max || 5) * 28 + 8 }}><Rating value={row[c.key]} max={c.max || 5} onChange={v => setRow(b.key, ri, c.key, v)} /></div>;
                      }
                      if (c.type === 'number') {
                        return <input key={c.key} type="number" value={row[c.key] ?? ''} onChange={e => setRow(b.key, ri, c.key, e.target.value)} placeholder={c.unit || c.label} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white" style={{ width: 96 }} />;
                      }
                      return <input key={c.key} value={row[c.key] || ''} onChange={e => setRow(b.key, ri, c.key, e.target.value)} placeholder={c.placeholder || c.label} className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 bg-white" />;
                    })}
                    <button type="button" onClick={() => removeRow(b.key, ri)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0" title="Remove row">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addRow(b.key, b.columns)} className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700">+ {b.addLabel || 'Add row'}</button>
            </div>
          );
        }
        if (b.t === 'chart') {
          return (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-700">{b.label}</p>
                {b.help && <p className="text-[10px] text-slate-400">{b.help}</p>}
              </div>
              <MiniChart points={chartPoints(data, b.rowsKey, b.labelCol, b.valueCol)} kind={b.kind} max={b.max} unit={b.unit} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

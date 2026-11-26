/* ──────────────────────────────────────────────────────────────────────
   ESSAY SCORING CALIBRATION: a backtest for the essay analyzer.

     npx tsx scripts/essay-calibration/run.ts                 # new engine
     npx tsx scripts/essay-calibration/run.ts --engine=legacy # old engine
     npx tsx scripts/essay-calibration/run.ts --split=test    # holdout only

   The corpus is data/sampleEssays.json: 292 essays by admitted students,
   from 50-word Stanford short answers to 650-word personal statements. They
   are final versions, so they set the bar for "what a good essay looks
   like". Three things are checked:

   1. FAIRNESS   Admitted essays should score high whatever their length or
                 type. A 350-word UC answer must not lose points for not
                 being a 650-word personal statement.
   2. DRAFTS     Each essay is degraded the way real early drafts are weak,
                 and the original must beat the degraded copy:
                   half     only the first half (underdeveloped)
                   shuffle  sentences in random order (no arc, no flow)
                   generic  names, numbers and quotes stripped (vague)
                   cliche   stock "this taught me" lines padded in
                   over     pushed 30% past the word limit
   3. PROMPT     The same essay scored against a different prompt of the
                 same kind (another UC question, another supplement) should
                 score lower on "answers the prompt".

   The corpus is split deterministically by id: tune on "train", report on
   "test", so the numbers are not just the engine memorising its examples.
   ────────────────────────────────────────────────────────────────────── */

import corpus from '../../data/sampleEssays.json';
import { SAMPLE_ESSAYS } from '../../lib/sampleEssays';
import { scoreEssayLegacy } from '../../lib/essayScoreLegacy';

type Row = { id: string; school: string; essayType: string; promptLabel: string; prompt: string; essay: string; wordCount: number };
const ESSAYS = (corpus as any).essays as Row[];

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const ENGINE = args.engine || 'new';
const SPLIT = args.split || 'all';

/* ─── engines, behind one shape ─── */
interface Scored { overall: number; prompt: number | null; insight: number | null; parts: Record<string, number | null> }
let scoreNew: any = null;
async function load() {
  if (ENGINE !== 'legacy') scoreNew = (await import('../../lib/essayScore')).scoreEssay;
}
function score(text: string, prompt: string, school?: string): Scored {
  if (ENGINE === 'legacy') {
    const s = scoreEssayLegacy(text, prompt);
    return { overall: s.overallScore ?? 0, prompt: null, insight: null, parts: { voice: s.aiScore == null ? null : 100 - s.aiScore, words: s.vocabScore, structure: s.grammarScore, story: s.originalityScore } };
  }
  const s = scoreNew(text, prompt, { school });
  return { overall: s.overallScore ?? 0, prompt: s.promptScore, insight: s.insightScore, parts: { voice: s.aiScore == null ? null : 100 - s.aiScore, words: s.vocabScore, structure: s.grammarScore, story: s.originalityScore } };
}

/* ─── deterministic helpers ─── */
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
const inSplit = (id: string) => SPLIT === 'all' || ((hash(id) % 10 < 7) === (SPLIT === 'train'));
const sentencesOf = (t: string) => t.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [t];
const wc = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const limitOf = (e: Row) => { const m = e.prompt.match(/(\d{2,3})\s*(?:-|–)?\s*words?/i); return m ? +m[1] : e.essayType === 'UC Personal Insight' ? 350 : e.essayType === 'Personal Statement' ? 650 : Math.max(50, Math.round(e.wordCount / 50) * 50); };

/* ─── degradations ─── */
const CLICHES = [
  'This experience taught me the importance of hard work and never giving up.',
  'It made me who I am today and showed me that anything is possible.',
  'I learned that if you put your mind to something, you can achieve your dreams.',
  'Ultimately, this journey helped me grow as a person in so many ways.',
];
const PERTURB: Record<string, (e: Row, r: () => number) => string> = {
  half: (e) => { const s = sentencesOf(e.essay); let out = '', n = 0; for (const x of s) { if (n >= wc(e.essay) / 2) break; out += x + ' '; n += wc(x); } return out.trim(); },
  // Keeps the paragraph shape (same number of sentences per paragraph), so
  // the engine has to notice lost flow, not just lost line breaks.
  shuffle: (e, r) => {
    const paras = e.essay.split(/\n\s*\n/).filter((p) => p.trim()).map(sentencesOf);
    const s = paras.flat();
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    let k = 0; return paras.map((p) => p.map(() => s[k++]).join(' ')).join('\n\n');
  },
  generic: (e) => e.essay
    .replace(/"[^"]{3,}"|“[^”]{3,}”/g, 'something')
    .replace(/\b\d[\d,.:%]*\b/g, 'some')
    .replace(/(?<=[a-z,;] )[A-Z][a-z]+(?: [A-Z][a-z]+)*/g, 'something'),
  cliche: (e) => { const s = sentencesOf(e.essay); const keep = s.slice(0, Math.max(2, Math.round(s.length * 0.7))); return [...keep, ...CLICHES.slice(0, wc(e.essay) > 200 ? 4 : 2)].join(' '); },
  over: (e) => { const target = Math.round(limitOf(e) * 1.3); const s = sentencesOf(e.essay); let out = e.essay; let i = 0; while (wc(out) < target && s.length) out += ' ' + s[i++ % s.length]; return out; },
};

/* ─── stats ─── */
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
function spearman(x: number[], y: number[]) {
  const rank = (a: number[]) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = Array(a.length); idx.forEach(([, i], k) => (r[i] = k)); return r; };
  const rx = rank(x), ry = rank(y), mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy || 1);
}

async function main() {
  await load();
  const rows = ESSAYS.filter((e) => inSplit(e.id));

  // --fit: print calibration anchors (raw 10th percentile and median of
  // admitted essays, per format) to paste into CALIBRATION in essayScore.ts.
  if (args.fit === 'true') {
    const { rawOverall } = await import('../../lib/essayScore');
    const by: Record<string, number[]> = {};
    for (const e of rows) { const r = rawOverall(e.essay, e.prompt, { school: e.school }); if (r) (by[r.format] ||= []).push(r.raw); }
    console.log('CALIBRATION anchors (split ' + SPLIT + '):');
    for (const [f, v] of Object.entries(by)) console.log(`  ${f}: { rawP10: ${pct(v, 0.1).toFixed(1)}, rawMedian: ${median(v).toFixed(1)} },   // n=${v.length}`);
    return;
  }
  console.log(`Engine: ${ENGINE} · split: ${SPLIT} · ${rows.length} admitted essays\n`);

  /* 1. Fairness */
  const types = ['Short Answer', 'Supplemental Essay', 'UC Personal Insight', 'Personal Statement'];
  const base = new Map<string, Scored>();
  for (const e of rows) base.set(e.id, score(e.essay, e.prompt, e.school));
  console.log('1. ADMITTED ESSAYS BY TYPE   (overall: p10 / median · share scored Strong ≥ 70)');
  const medians: number[] = [];
  for (const t of types) {
    const s = rows.filter((e) => e.essayType === t).map((e) => base.get(e.id)!);
    if (!s.length) continue;
    const o = s.map((x) => x.overall); medians.push(median(o));
    const extra = ENGINE === 'legacy' ? '' : ` · prompt ${median(s.map((x) => x.prompt ?? 0))} · insight ${median(s.map((x) => x.insight ?? 0))}`;
    console.log(`   ${t.padEnd(22)} n=${String(s.length).padStart(3)}  ${String(pct(o, 0.1)).padStart(3)} / ${String(median(o)).padStart(3)} · ${Math.round((100 * o.filter((v) => v >= 70).length) / o.length)}% strong${extra}`);
  }
  const all = rows.map((e) => base.get(e.id)!.overall);
  const gap = Math.max(...medians) - Math.min(...medians);
  console.log(`   All                    n=${String(all.length).padStart(3)}  ${pct(all, 0.1)} / ${median(all)} · ${Math.round((100 * all.filter((v) => v >= 70).length) / all.length)}% strong`);
  console.log(`   Gap between type medians: ${gap} points (target ≤ 6)\n`);

  /* 2. Drafts */
  console.log('2. ORIGINAL BEATS A WEAKER VERSION   (share of essays, target ≥ 90%)');
  const wins: Record<string, number> = {};
  for (const [name, fn] of Object.entries(PERTURB)) {
    let w = 0, n = 0, drop: number[] = [];
    for (const e of rows) {
      if (name === 'half' && wc(e.essay) < 80) continue; // a 50-word answer has no half to cut
      if (name === 'generic' && PERTURB.generic(e, rng(1)) === e.essay) continue;
      const d = score(fn(e, rng(hash(e.id))), e.prompt, e.school);
      const o = base.get(e.id)!;
      n++; if (o.overall > d.overall) w++; drop.push(o.overall - d.overall);
    }
    wins[name] = n ? w / n : 1;
    console.log(`   ${name.padEnd(8)} ${String(Math.round(100 * wins[name])).padStart(3)}%  (n=${n}, median drop ${median(drop)} pts)`);
  }

  /* 3. Prompt */
  if (ENGINE !== 'legacy') {
    let w = 0, n = 0; const drop: number[] = [];
    for (const e of rows) {
      const pool = ESSAYS.filter((o) => o.essayType === e.essayType && o.promptLabel !== e.promptLabel && o.prompt.slice(0, 40) !== e.prompt.slice(0, 40));
      if (!pool.length) continue;
      const other = pool[hash(e.id + 'p') % pool.length];
      const right = base.get(e.id)!.prompt ?? 0, wrong = score(e.essay, other.prompt, other.school).prompt ?? 0;
      n++; if (right > wrong) w++; drop.push(right - wrong);
    }
    console.log(`\n3. ANSWERS ITS OWN PROMPT BETTER THAN ANOTHER   ${Math.round((100 * w) / n)}%  (n=${n}, median gap ${median(drop)} pts, target ≥ 80%)`);
  }

  /* 4. Benchmark essays with human rubric scores */
  const bench = SAMPLE_ESSAYS.map((b) => ({ tier: b.tier, rubric: b.scoring.overall, s: score(b.essay, b.prompt).overall }));
  const byTier = ['exceptional', 'strong', 'good', 'needs_work'].map((t) => { const x = bench.filter((b) => b.tier === t); return x.length ? `${t} ${Math.round(mean(x.map((b) => b.s)))} (n=${x.length})` : ''; }).filter(Boolean);
  console.log(`\n4. RUBRIC-SCORED BENCHMARKS   mean by tier: ${byTier.join(' · ')} · Spearman vs rubric ${spearman(bench.map((b) => b.s), bench.map((b) => b.rubric)).toFixed(2)}`);

  /* 5. Diagnostics: which measure holds each type back, which asks fail */
  if (args.diag === 'true' && ENGINE !== 'legacy') {
    console.log('\n5. DIAGNOSTICS   (median of each measure by type)');
    for (const t of types) {
      const es = rows.filter((e) => e.essayType === t);
      const full = es.map((e) => scoreNew(e.essay, e.prompt, { school: e.school }));
      const med = (k: string) => median(full.map((s: any) => (k === 'voice' ? 100 - s.aiScore : s[k]) ?? -1));
      const kinds: Record<string, number> = {}; full.forEach((s: any) => { kinds[s.detail.kind] = (kinds[s.detail.kind] || 0) + 1; });
      console.log(`   ${t.padEnd(22)} prompt ${med('promptScore')} insight ${med('insightScore')} story ${med('originalityScore')} voice ${med('voice')} words ${med('vocabScore')} structure ${med('grammarScore')}   kinds ${JSON.stringify(kinds)}`);
      const fails: Record<string, number> = {};
      full.forEach((s: any) => s.detail.asks.forEach((a: any) => { if (!a.met) fails[`${s.detail.kind}:${a.id}`] = (fails[`${s.detail.kind}:${a.id}`] || 0) + 1; }));
      console.log(`      most-missed asks: ${Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    }
  }

  /* 6. Fixed cases: detection and hard limits */
  const unit: [string, boolean][] = [];
  if (ENGINE !== 'legacy') {
    const { resolveContext } = await import('../../lib/essayPrompt');
    const c1 = resolveContext('What historical moment or event do you wish you could have witnessed? (50 word limit)', 45);
    unit.push(['Stanford short answer → 50-word short answer', c1.limit === 50 && c1.format === 'micro']);
    const c2 = resolveContext('Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time.', 340);
    unit.push(['UC leadership question → UC PIQ, 350 words', c2.kind === 'uc_piq' && c2.uc === 'leadership' && c2.limit === 350]);
    const c3 = resolveContext('Why Columbia? Please tell us what you value most about Columbia and why. (150 words or fewer)', 140);
    unit.push(['"Why Columbia?" → why-school essay, 150 words', c3.kind === 'why_school' && c3.limit === 150]);
    const c4 = resolveContext('Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it.', 600);
    unit.push(['Common App prompt → personal statement, 650 words', c4.kind === 'personal_statement' && c4.limit === 650]);
    const uc = ESSAYS.find((e) => e.essayType === 'UC Personal Insight' && e.wordCount >= 330)!;
    const okUc = scoreNew(uc.essay, uc.prompt);
    unit.push(['A full UC answer is not marked short', okUc.detail.length.status === 'good']);
    const over = scoreNew(uc.essay + ' ' + uc.essay, uc.prompt);
    unit.push(['Double the UC limit caps the score at 60', over.overallScore <= 60 && over.detail.length.status === 'over']);
    console.log('\n6. FIXED CASES');
    for (const [name, pass] of unit) console.log(`   ${pass ? 'pass' : 'FAIL'}  ${name}`);
  }

  /* Regression floors: what the engine achieved when it was calibrated
     (2026-11, all 292 essays). A change that drops below one fails. */
  const strongShare = all.filter((v) => v >= 70).length / all.length;
  const floors: [string, boolean][] = [
    [`admitted essays rated 70+ ≥ 85% (${Math.round(100 * strongShare)}%)`, strongShare >= 0.85],
    [`type medians within 6 pts (${gap})`, gap <= 6],
    [`half ≥ 88% (${Math.round(100 * wins.half)}%)`, wins.half >= 0.88],
    [`generic ≥ 88% (${Math.round(100 * wins.generic)}%)`, wins.generic >= 0.88],
    [`over ≥ 88% (${Math.round(100 * wins.over)}%)`, wins.over >= 0.88],
    [`cliche ≥ 80% (${Math.round(100 * wins.cliche)}%)`, wins.cliche >= 0.8],
    [`shuffle ≥ 50% (${Math.round(100 * wins.shuffle)}%)`, wins.shuffle >= 0.5],
    ...unit,
  ];
  const ok = floors.every(([, p]) => p);
  console.log(`\n${ok ? 'PASS' : 'FAIL'}: ${floors.filter(([, p]) => !p).map(([n]) => n).join('; ') || 'every regression floor holds'}`);
  if (args.strict === 'true' && !ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

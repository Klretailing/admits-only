/* ══════════════════════════════════════════════════════════════════════
   ESSAY SCORE: how strong is this draft, for THIS kind of essay?

   What changed from the old engine (lib/essayScoreLegacy.ts), and why
   ───────────────────────────────────────────────────────────────────
   The old engine judged everything as if it were a 650-word personal
   statement. It gave full marks for length only at 500–700 words, so a
   perfect 350-word UC answer lost a third of its length credit, and it
   counted features (scenes, voice markers) instead of measuring them per
   100 words, so padding a draft raised its score. Backtested on 292
   essays by admitted students, it rated none of them "Strong", and a
   half-finished copy of an essay beat the full essay 83% of the time.

   Now:
   • The essay's kind and word limit come first (lib/essayPrompt.ts), and
     length, storytelling and reflection are judged against them. A
     50-word Stanford short answer isn't expected to tell a story; a
     350-word UC answer is expected to tell a compact one; a personal
     statement a full one.
   • "Answers the prompt" checks each thing the prompt asks for.
   • "Reflection" measures what the essay reveals about the writer, and
     marks down stock lessons ("this taught me the importance of hard work").
   • Every measure is a density or a share, so length can't buy points.
   • Flow is measured: sentences that follow from each other share words
     and ideas, so an essay in a scrambled order scores lower.
   • The weights differ by kind: a "Why us?" essay lives on specifics and
     fit; a personal statement on story and reflection.

   Scores are anchored to the admitted-essay corpus: the calibration step
   at the bottom maps raw scores so that the typical admitted essay of any
   kind reads as Strong (about 85). Rerun the backtest after any change:
       npx tsx scripts/essay-calibration/run.ts
   ══════════════════════════════════════════════════════════════════════ */

import { checkGrammar } from './grammarCheck';
import { analyzeVocabulary } from './essayVocabulary';
import { resolveContext, checkPrompt, sentencesOf, wordsOf, stem, RX, type EssayContext, type PromptAsk } from './essayPrompt';
import { AI_VOCAB_STRONG, AI_PHRASES, AI_HEDGING, PERSONAL_VOICE_MARKERS } from './essayScoreLegacy';

export type { EssayContext, PromptAsk } from './essayPrompt';

export interface ScoreDetail {
  kind: EssayContext['kind'];
  kindLabel: string;
  limit: number | null;
  limitSource: EssayContext['limitSource'];
  format: EssayContext['format'];
  wordCount: number;
  length: { status: 'good' | 'short' | 'very_short' | 'over' | 'unknown'; note: string };
  asks: PromptAsk[];
  /** False for answers too short to be judged as stories. */
  storyApplies: boolean;
}

export interface EssayScores {
  aiScore: number | null;          // stored inverted (100 - "sounds like you"), as before
  vocabScore: number | null;       // word choice
  grammarScore: number | null;     // structure and flow
  originalityScore: number | null; // storytelling (null when it doesn't apply)
  overallScore: number | null;
  promptScore: number | null;      // answers the prompt
  insightScore: number | null;     // reflection and insight
  detail: ScoreDetail | null;
}

const EMPTY: EssayScores = { aiScore: null, vocabScore: null, grammarScore: null, originalityScore: null, overallScore: null, promptScore: null, insightScore: null, detail: null };

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const count = (t: string, rx: RegExp) => (t.match(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g')) || []).length;
const countAll = (t: string, list: RegExp[]) => list.reduce((n, rx) => n + count(t, rx), 0);

/* ─── word lists ─── */

const FILLER = /\b(?:very|really|a lot|lots of|things?|stuff|good|nice|amazing|awesome|incredible|extremely|basically|literally|interesting|passionate|unique|special|truly|definitely|so much)\b/gi;
const SENSORY_ACTION = /\b(?:saw|heard|smelled|tasted|watched|stared|listened|whispered|shouted|yelled|grabbed|ran|walked|sat|stood|held|pressed|typed|opened|closed|slammed|dropped|picked|reached|shook|laughed|cried|froze|glanced|scribbled|clicked|poured|lifted|pulled|pushed|knocked|squinted|wiped|tapped)\b/gi;
const SEQUENCE = /\b(?:then|after(?:ward)?|when|until|by the time|later|finally|before|the next (?:day|week|morning|year)|that (?:night|summer|fall|spring|winter|day|week)|soon|eventually|at first|now)\b/gi;
const TURN = /\b(?:but|until|instead|however|yet|still|that'?s when|it wasn'?t until|suddenly|realized|turned out|only then)\b/i;
const CONTRAST_REFLECTION = /\b(?:I used to (?:think|believe|see)|at first,? I|I (?:thought|assumed|believed)[^.!?]{3,80}(?:but|until|now)|it wasn'?t until|now I (?:see|know|understand|realize)|I no longer|I'?ve stopped|what I didn'?t (?:know|realize|see))\b/i;
/* Lessons any applicant could claim. They aren't wrong, but they say
   nothing about this writer, so they cost reflection points. */
const STOCK_LESSONS = RX.stock;
const STOCK_LESSONS_ONE = new RegExp(STOCK_LESSONS.source, 'i');
const CLICHE_OPENING = /^(?:(?:ever since I was|for as long as I can remember|throughout my life|in today'?s (?:world|society)|have you ever|webster|according to the dictionary|the dictionary defines|as [A-Z][a-z]+ (?:once )?said)|"[^"]{5,}"\s*[-—–]\s*[A-Z])/i;
const CLOSING_CLICHE = /\b(?:in conclusion|to sum up|in summary|all in all|to conclude)\b/i;
const CONNECTIVE_START = /^(?:this|that|it|these|those|he|she|they|then|but|so|and|still|instead|yet|now|soon|later|after|when|by|because|even|one|another|the next|that night|that day)\b/i;
const CONTENT_STOP = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'would', 'could', 'should', 'about', 'into', 'than', 'then', 'just', 'like', 'also', 'only', 'even', 'more', 'much', 'very', 'some', 'every', 'because', 'while', 'after', 'before', 'over', 'still', 'will', 'your', 'mine', 'each', 'other', 'being', 'make', 'made', 'know', 'knew', 'want', 'wanted', 'time']);

/* ─── length against the limit ─── */

function lengthFit(wc: number, ctx: EssayContext): { score: number; status: ScoreDetail['length']['status']; note: string } {
  const L = ctx.limit;
  if (!L) return { score: 85, status: 'unknown', note: 'Add the full prompt, including its word limit, for a length check.' };
  const r = wc / L;
  if (r > 1) {
    const over = wc - L;
    return { score: clamp(100 - (r - 1) * 300), status: 'over', note: `${over} word${over === 1 ? '' : 's'} over the ${L}-word limit. The application won't accept it as it is.` };
  }
  const floor = ctx.format === 'micro' ? 0.6 : 0.85;
  if (r >= floor) return { score: 100, status: 'good', note: `${wc} of ${L} words: a good use of the space.` };
  if (r >= 0.7) return { score: 85 + ((r - 0.7) / (floor - 0.7)) * 15, status: 'short', note: `${wc} of ${L} words. There's room for one more detail or a line of reflection.` };
  if (r >= 0.5) return { score: 55 + ((r - 0.5) / 0.2) * 30, status: 'short', note: `${wc} of ${L} words. Readers will expect you to use more of the space.` };
  return { score: clamp(55 * (r / 0.5)), status: 'very_short', note: `${wc} of ${L} words: well under the limit, so this reads as unfinished.` };
}

/* ─── measures ─── */

function contentStems(s: string): Set<string> {
  return new Set(wordsOf(s).filter((w) => w.length >= 4 && !CONTENT_STOP.has(w.toLowerCase())).map(stem));
}
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let i = 0; for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};

/** How much more each sentence follows from the one before it than from a
 *  random sentence in the same essay. About 1 in a scrambled essay. */
function cohesion(sentences: string[]): number {
  if (sentences.length < 4) return 1.3;
  const sets = sentences.map(contentStems);
  let adj = 0;
  for (let i = 0; i + 1 < sets.length; i++) adj += jaccard(sets[i], sets[i + 1]) + (CONNECTIVE_START.test(sentences[i + 1]) ? 0.04 : 0);
  adj /= sets.length - 1;
  let far = 0, n = 0;
  for (let i = 0; i < sets.length; i++) for (let j = i + 2; j < sets.length; j++) { far += jaccard(sets[i], sets[j]); n++; }
  far = n ? far / n : 0.05;
  return adj / Math.max(far + 0.02, 0.03);
}

const PRESENT = /\b(?:am|is|are|now|today|still|will|want|wants|hope|plan|can|believe|know|understand|see|value|I'm|I've|I'll|isn't|aren't|don't|doesn't|continue|remain)\b/gi;
const PAST = /\b(?:was|were|had|did|\w{3,}ed)\b/gi;

/** Does the essay move from what happened (past) toward what it means now
 *  (present, future)? Rank correlation of position with that orientation:
 *  positive in a told story, about zero when the order is scrambled. */
function arcDirection(sentences: string[]): number {
  if (sentences.length < 5) return 0.3;
  const o = sentences.map((x) => { const pr = count(x, PRESENT), pa = count(x, PAST); return (pr - pa) / (pr + pa + 1); });
  const idx = o.map((_, i) => i);
  const rank = (a: number[]) => { const r = Array(a.length); a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]).forEach(([, i], k) => (r[i] = k)); return r as number[]; };
  const rx = rank(idx), ry = rank(o);
  const m = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const mx = m(rx), my = m(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < o.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

const NARRATIVE = new Set(['personal_statement', 'uc_piq', 'challenge', 'activity', 'community', 'identity', 'other', 'creative']);

/** Opening, ending, and the direction of travel between them. */
function flowScore(sentences: string[], ctx: EssayContext): number {
  if (!sentences.length) return 0;
  const first = sentences[0];
  const opening = CLICHE_OPENING.test(first) || RX.tell.test(first)
    ? 0
    : count(first, RX.specific) + count(first, SENSORY_ACTION) + count(first, RX.dialogue) > 0 || /\?$/.test(first.trim()) ? 1 : 0.5;
  const tail = sentences.slice(-2).join(' ');
  const ending = RX.reflect.test(tail) || RX.future.test(tail) || count(tail, PRESENT) > count(tail, PAST) ? 1 : 0.3;
  if (ctx.format === 'micro') return 100 * (0.5 * opening + 0.5 * ending);
  if (NARRATIVE.has(ctx.kind)) {
    const arc = clamp((arcDirection(sentences) + 0.05) / 0.45, 0, 1);
    return 100 * (0.45 * arc + 0.3 * ending + 0.25 * opening);
  }
  return 100 * (0.55 * ending + 0.45 * opening);
}

function voiceScore(text: string, sentences: string[], wc: number): number {
  const per100 = (x: number) => x / Math.max(1, wc / 100);
  let s = 72;
  s += Math.min(18, per100(countAll(text, PERSONAL_VOICE_MARKERS)) * 5);
  s -= Math.min(30, per100(countAll(text, AI_VOCAB_STRONG)) * 10);
  s -= Math.min(20, per100(countAll(text, AI_PHRASES)) * 7);
  s -= Math.min(12, countAll(text, AI_HEDGING) * 4);
  s -= Math.min(12, count(text, RX.tell) * 4);
  const lens = sentences.map((x) => wordsOf(x).length).filter((n) => n > 2);
  if (lens.length >= 5) {
    const m = lens.reduce((a, b) => a + b, 0) / lens.length;
    const cv = Math.sqrt(lens.reduce((a, l) => a + (l - m) ** 2, 0) / lens.length) / Math.max(m, 1);
    if (cv < 0.25) s -= 10; else if (cv < 0.35) s -= 4; else if (cv > 0.5) s += 4;
  }
  const firstPerson = sentences.filter((x) => /\b(?:I|my|me|I'm|I've|I'd)\b/.test(x)).length / Math.max(1, sentences.length);
  if (firstPerson >= 0.3) s += 4; else if (firstPerson < 0.1 && wc > 80) s -= 10;
  if (per100(count(text, /\b\w+'(?:m|ve|d|ll|re|s|t)\b/gi)) >= 1) s += 3;
  return clamp(Math.round(s));
}

function wordChoiceScore(text: string, wc: number, ctx: EssayContext): number {
  const per100 = (x: number) => x / Math.max(1, wc / 100);
  const target = { micro: 5, short: 3, medium: 2.5, long: 2 }[ctx.format];
  const spec = Math.min(1, per100(count(text, RX.specific)) / target) * 100;
  const filler = Math.min(35, per100(count(text, FILLER)) * 9);
  const vocab = analyzeVocabulary(text);
  const plain = vocab.ready ? vocab.score : 85;
  // Praise any school could get ("world-class professors") isn't a detail.
  const praise = Math.min(36, count(text, RX.genericPraise) * 12);
  return clamp(Math.round(0.5 * spec + 0.25 * (100 - filler) + 0.25 * plain - praise));
}

function structureScore(text: string, sentences: string[], wc: number, ctx: EssayContext): number {
  const issues = checkGrammar(text);
  const per100 = (x: number) => x / Math.max(1, wc / 100);
  const errors = per100(issues.filter((i) => i.severity === 'error').length);
  const minor = per100(issues.filter((i) => i.severity !== 'error').length);
  const grammar = clamp(100 - errors * 12 - minor * 3);

  const flow = 0.8 * flowScore(sentences, ctx) + 0.2 * clamp(((cohesion(sentences) - 0.9) / (1.6 - 0.9)) * 100);

  let shape = 100;
  if (sentences.length && CLICHE_OPENING.test(sentences[0])) shape -= 25;
  if (CLOSING_CLICHE.test(sentences.slice(-3).join(' '))) shape -= 20;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  if (wc > 250 && paragraphs === 1) shape -= 20;
  if (ctx.format === 'long' && paragraphs < 3) shape -= 10;
  // Reflection belongs after the experience that earns it.
  const refl = sentences.map((s, i) => (RX.reflect.test(s) ? i / Math.max(1, sentences.length - 1) : -1)).filter((p) => p >= 0);
  if (refl.length >= 2 && ctx.format !== 'micro') {
    const meanPos = refl.reduce((a, b) => a + b, 0) / refl.length;
    if (meanPos < 0.4) shape -= 15;
  }
  return clamp(Math.round(0.3 * grammar + 0.45 * flow + 0.25 * clamp(shape)));
}

function storyScore(text: string, sentences: string[], wc: number, ctx: EssayContext): number | null {
  if (ctx.format === 'micro' || ctx.kind === 'short_answer') return null;
  const per100 = (x: number) => x / Math.max(1, wc / 100);
  const scene = per100(count(text, RX.specific) + count(text, SENSORY_ACTION) + count(text, RX.dialogue) * 2);
  const sceneTarget = { short: 3, medium: 3.5, long: 4, micro: 3 }[ctx.format];
  const arcTarget = { short: 2, medium: 3, long: 5, micro: 1 }[ctx.format];
  const arc = Math.min(1, (count(text, SEQUENCE) + (RX.overTime.test(text) ? 1 : 0)) / arcTarget);
  const turn = TURN.test(text) ? 1 : 0;
  const first = sentences[0] || '';
  const opening = CLICHE_OPENING.test(first) || RX.tell.test(first)
    ? 0
    : (count(first, RX.specific) + count(first, SENSORY_ACTION) + count(first, RX.dialogue)) > 0 ? 1 : 0.45;
  const direction = clamp((arcDirection(sentences) + 0.05) / 0.45, 0, 1);
  let s = 100 * (0.3 * Math.min(1, scene / sceneTarget) + 0.2 * arc + 0.15 * direction + 0.1 * turn + 0.25 * opening);
  s -= Math.min(24, count(text, RX.tell) * 8);
  s -= Math.min(24, count(text, STOCK_LESSONS) * 8);
  return clamp(Math.round(s));
}

function insightScore(text: string, sentences: string[], ctx: EssayContext): number {
  const n = Math.max(1, sentences.length);
  // A stock lesson ("this taught me the importance of hard work") reads like
  // reflection but says nothing about the writer, so it doesn't count as one.
  const reflective = sentences.map((s) => !STOCK_LESSONS_ONE.test(s) && (RX.reflect.test(s) || (ctx.format === 'micro' && RX.why.test(s))));
  const refl = reflective.filter(Boolean).length;
  const stock = count(text, STOCK_LESSONS);
  if (ctx.format === 'micro') {
    return clamp(Math.round((refl > 0 ? 88 : 55) + (count(text, RX.specific) > 0 ? 8 : 0) - stock * 15));
  }
  const rr = refl / n;
  const [lo, hi] = ctx.format === 'long' ? [0.12, 0.45] : [0.15, 0.5];
  const ratio = rr < lo ? rr / lo : rr <= hi ? 1 : Math.max(0.6, 1 - (rr - hi) * 1.5);
  const lateFrom = Math.floor(n * 0.6);
  const late = reflective.slice(lateFrom).some(Boolean) ? 1 : refl > 0 ? 0.4 : 0;
  // Reflection that is specific or that shows a change of mind is worth more
  // than a general statement of what was learned.
  const specificRefl = sentences.filter((s, i) => reflective[i] && (count(s, RX.specific) > 0 || SENSORY_ACTION.test(s))).length;
  const depth = Math.min(1, (CONTRAST_REFLECTION.test(text) ? 0.6 : 0) + (refl ? specificRefl / refl : 0) * 0.8);
  let s = 100 * (0.55 * ratio + 0.25 * late + 0.2 * depth);
  if (['personal_statement', 'uc_piq', 'academic', 'why_school'].includes(ctx.kind) && RX.future.test(sentences.slice(lateFrom).join(' '))) s += 5;
  s -= Math.min(40, stock * 14);
  return clamp(Math.round(s));
}

/* ─── weights by kind ─── */

type W = { prompt: number; insight: number; story: number; voice: number; words: number; structure: number; length: number };
const WEIGHTS: Record<string, W> = {
  personal_statement: { prompt: 0.12, insight: 0.2, story: 0.2, voice: 0.11, words: 0.12, structure: 0.15, length: 0.1 },
  uc_piq: { prompt: 0.24, insight: 0.18, story: 0.1, voice: 0.09, words: 0.14, structure: 0.15, length: 0.1 },
  why_school: { prompt: 0.3, insight: 0.12, story: 0, voice: 0.12, words: 0.2, structure: 0.14, length: 0.12 },
  micro: { prompt: 0.3, insight: 0.1, story: 0, voice: 0.22, words: 0.22, structure: 0.06, length: 0.1 },
  default: { prompt: 0.22, insight: 0.18, story: 0.12, voice: 0.11, words: 0.14, structure: 0.15, length: 0.08 },
};

/* ─── calibration ───
   Raw scores are mapped linearly so that the admitted-essay corpus lands
   where a reader would put it: its 10th percentile at RAW_P10 becomes 72,
   its median at RAW_MEDIAN becomes 85. Weaker drafts keep their order and
   fall below. Fitted on the train split of data/sampleEssays.json; see
   scripts/essay-calibration/run.ts --fit. */
export const CALIBRATION: Record<EssayContext['format'], { rawP10: number; rawMedian: number }> = {
  micro: { rawP10: 53.2, rawMedian: 69.6 },  // fitted on the train split, n=15
  short: { rawP10: 49.5, rawMedian: 71.3 },  // n=82
  medium: { rawP10: 50.2, rawMedian: 72.6 }, // n=87
  long: { rawP10: 51.5, rawMedian: 76.4 },   // n=27
};
const OUT_P10 = 72, OUT_MEDIAN = 85;
function calibrate(raw: number, format: EssayContext['format']): number {
  const { rawP10, rawMedian } = CALIBRATION[format];
  const slope = (OUT_MEDIAN - OUT_P10) / Math.max(1, rawMedian - rawP10);
  return clamp(Math.round(OUT_MEDIAN + (raw - rawMedian) * slope));
}

/** Overall before calibration, exported for the calibration script. */
export function rawOverall(text: string, prompt: string, opts: { school?: string; wordLimit?: number | null } = {}): { raw: number; format: EssayContext['format'] } | null {
  const c = scoreCore(text, prompt, opts);
  return c ? { raw: c.raw, format: c.ctx.format } : null;
}

function scoreCore(content: string, prompt: string, opts: { school?: string; wordLimit?: number | null }) {
  const text = (content || '').trim();
  const words = wordsOf(text);
  const wc = words.length;
  if (wc < 25) return null;
  const sentences = sentencesOf(text);
  const ctx = resolveContext(prompt || '', wc, { wordLimit: opts.wordLimit });

  const p = checkPrompt(text, prompt || '', ctx, opts.school);
  const voice = voiceScore(text, sentences, wc);
  const wordsS = wordChoiceScore(text, wc, ctx);
  const structure = structureScore(text, sentences, wc, ctx);
  const story = storyScore(text, sentences, wc, ctx);
  const insight = insightScore(text, sentences, ctx);
  const len = lengthFit(wc, ctx);

  const w = WEIGHTS[ctx.format === 'micro' || ctx.kind === 'short_answer' ? 'micro' : ctx.kind] || WEIGHTS.default;
  const parts: [number, number][] = [
    [p.score, w.prompt], [insight, w.insight], [voice, w.voice], [wordsS, w.words], [structure, w.structure], [len.score, w.length],
  ];
  if (story != null && w.story) parts.push([story, w.story]);
  const totalW = parts.reduce((s, [, x]) => s + x, 0);
  const mean = parts.reduce((s, [v, x]) => s + v * x, 0) / totalW;
  // One glaring weakness should show in the overall, not be averaged away:
  // a draft with no story and no specifics isn't rescued by clean grammar.
  const core = ctx.format === 'micro' || ctx.kind === 'short_answer' ? [p.score, wordsS]
    : ctx.kind === 'why_school' ? [p.score, wordsS, insight]
    : [p.score, insight, wordsS, ...(story != null ? [story] : [])];
  const raw = 0.8 * mean + 0.2 * Math.min(...core);

  return { ctx, p, voice, wordsS, structure, story, insight, len, raw, wc };
}

export function scoreEssay(content: string, prompt: string = '', opts: { school?: string; wordLimit?: number | null } = {}): EssayScores {
  const c = scoreCore(content, prompt, opts);
  if (!c) return EMPTY;
  let overall = calibrate(c.raw, c.ctx.format);

  // Hard limits a reader would apply whatever else is good.
  if (c.len.status === 'over' && c.wc > (c.ctx.limit || 0) * 1.1) overall = Math.min(overall, 60);
  if (c.len.status === 'very_short' && c.ctx.format !== 'micro') overall = Math.min(overall, 60);
  if (prompt && c.p.score < 45) overall = Math.min(overall, 64);
  // A story-driven essay with no real moment in it can't read as strong.
  if (c.story != null && c.story < 30 && NARRATIVE.has(c.ctx.kind)) overall = Math.min(overall, 68);

  return {
    aiScore: 100 - c.voice,
    vocabScore: c.wordsS,
    grammarScore: c.structure,
    originalityScore: c.story,
    overallScore: overall,
    promptScore: prompt ? c.p.score : null,
    insightScore: c.insight,
    detail: {
      kind: c.ctx.kind,
      kindLabel: c.ctx.label,
      limit: c.ctx.limit,
      limitSource: c.ctx.limitSource,
      format: c.ctx.format,
      wordCount: c.wc,
      length: { status: c.len.status, note: c.len.note },
      asks: prompt ? c.p.asks : [],
      storyApplies: c.story != null,
    },
  };
}

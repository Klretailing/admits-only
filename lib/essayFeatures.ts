/* ══════════════════════════════════════════════════════════════════════
   ESSAY FEATURE EXTRACTION  —  the input side of the learning loop.

   Turns an essay into (a) a flat vector of numeric craft measurements and
   (b) a set of categorical pattern markers. Nothing here retains the essay:
   no text, no sentences, no n-grams, no vocabulary. The output cannot be
   used to reconstruct what a student wrote — it is the shape of the writing,
   not the writing.

   That is a deliberate privacy posture (these are minors writing about
   family, hardship, and identity) and it is also the right engineering: the
   learning loop wants patterns, and patterns are all it gets.
   ══════════════════════════════════════════════════════════════════════ */

export interface EssayFeatures {
  /* ─ shape ─ */
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  avgSentenceLen: number;
  sentenceLenCV: number;        // coefficient of variation — rhythm variety
  shortSentenceRatio: number;   // <= 7 words
  longSentenceRatio: number;    // >= 20 words

  /* ─ readability ─ */
  readingGrade: number;         // Flesch-Kincaid
  bigWordDensity: number;       // 3+ syllable, excluding proper nouns
  lexicalDiversity: number;     // unique / total

  /* ─ narrative craft ─ */
  causalRatio: number;          // causal vs additive connectives
  reflectionDensity: number;    // per 100 words
  sceneDensity: number;
  figurativeDensity: number;
  dialogueDensity: number;
  iOpenerRatio: number;         // sentences starting with "I"
  showTellRatio: number;        // show markers / (show + tell)
  bookendEcho: number;          // shared distinctive words, first vs last para

  /* ─ tone ─ */
  intensifierDensity: number;
  negativityDensity: number;
  hasGrowthTurn: number;        // 0 | 1

  /* ─ hygiene ─ */
  passiveRatio: number;
  clicheDensity: number;
  fillerDensity: number;
  promptAlignment: number;      // 0-1, or -1 when no prompt supplied
}

/** Numeric feature keys, in a stable order. Used by the aggregator. */
export const FEATURE_KEYS: (keyof EssayFeatures)[] = [
  'wordCount', 'paragraphCount', 'sentenceCount', 'avgSentenceLen', 'sentenceLenCV',
  'shortSentenceRatio', 'longSentenceRatio', 'readingGrade', 'bigWordDensity',
  'lexicalDiversity', 'causalRatio', 'reflectionDensity', 'sceneDensity',
  'figurativeDensity', 'dialogueDensity', 'iOpenerRatio', 'showTellRatio',
  'bookendEcho', 'intensifierDensity', 'negativityDensity', 'hasGrowthTurn',
  'passiveRatio', 'clicheDensity', 'fillerDensity', 'promptAlignment',
];

/** Human labels for the admin review screen. */
export const FEATURE_LABELS: Record<string, string> = {
  wordCount: 'Word count', paragraphCount: 'Paragraphs', sentenceCount: 'Sentences',
  avgSentenceLen: 'Avg sentence length', sentenceLenCV: 'Sentence-length variety',
  shortSentenceRatio: 'Short sentences', longSentenceRatio: 'Long sentences',
  readingGrade: 'Reading grade', bigWordDensity: 'Long-word density',
  lexicalDiversity: 'Vocabulary range', causalRatio: 'Cause-and-effect linking',
  reflectionDensity: 'Reflection', sceneDensity: 'Concrete scene',
  figurativeDensity: 'Figurative language', dialogueDensity: 'Dialogue',
  iOpenerRatio: 'Sentences opening with "I"', showTellRatio: 'Show vs tell',
  bookendEcho: 'Circular structure', intensifierDensity: 'Intensifiers',
  negativityDensity: 'Negative affect', hasGrowthTurn: 'Growth turn at the end',
  passiveRatio: 'Passive voice', clicheDensity: 'Clichés', fillerDensity: 'Filler words',
  promptAlignment: 'Prompt alignment',
};

/* ─── shared lexicons (kept local so this module is self-contained) ─── */

const CAUSAL = ['but', 'yet', 'however', 'because', 'so', 'therefore', 'since', 'although', 'though', 'despite', 'instead', 'unless'];
const ADDITIVE = ['and then', 'then', 'next', 'after that', 'also', 'plus', 'additionally', 'furthermore', 'moreover'];

const REFLECTION = [
  /\bi (?:realized|realised|understood|wondered|questioned|noticed|feared|doubted|assumed)\b/gi,
  /\bwhat i (?:didn'?t|hadn'?t|never) (?:know|realize|realise|understand|expect|see)\b/gi,
  /\blooking back\b/gi, /\bin (?:hindsight|retrospect)\b/gi, /\bit struck me\b/gi,
  /\bi (?:began|started|came) to (?:see|understand|realize|realise|question)\b/gi,
  /\bi now (?:see|know|understand)\b/gi, /\bfor the first time\b/gi, /\bit dawned on me\b/gi,
];
const SCENE = [
  /\b(?:saw|heard|felt|smelled|tasted|watched|listened|noticed)\b/gi,
  /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi,
  /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,
  // Concrete physical action. Deliberately broad: an early version listed only
  // dramatic verbs (slammed, froze) and scored a vividly physical essay at
  // zero because its verbs were ordinary ones — yanked, counted, called.
  /\b(?:ran|grabbed|slammed|whispered|shouted|reached|stumbled|knelt|gripped|dropped|froze|yanked|pulled|pushed|carried|stacked|sorted|counted|called|dialed|knocked|opened|closed|handed|poured|wiped|folded|lifted|dragged|climbed|walked|sat|stood|packed|loaded|unloaded|scrubbed|swept|hauled)\b/gi,
];
const FIGURATIVE = [/\blike a\b/gi, /\blike an\b/gi, /\bas if\b/gi, /\bas though\b/gi, /\breminded me of\b/gi, /\bfelt like\b/gi];
const GROWTH = [
  /\bi (?:learned|grew|changed|overcame|rebuilt|rose)\b/i, /\bnow i\b/i, /\btoday i\b/i,
  /\blooking (?:back|ahead)\b/i, /\bgoing forward\b/i, /\bi will\b/i, /\bstronger\b/i,
  /\bgrateful\b/i, /\bresilien/i, /\bi carry\b/i, /\bi choose\b/i,
];
const INTENSIFIERS = ['very', 'really', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'utterly', 'literally', 'truly', 'always', 'never'];
const NEGATIVE = new Set([
  'hate', 'hated', 'hopeless', 'worthless', 'useless', 'miserable', 'suffering', 'suffered',
  'pain', 'painful', 'despair', 'broken', 'failure', 'failed', 'alone', 'lonely', 'empty',
  'terrible', 'awful', 'horrible', 'devastated', 'depressed', 'anxious', 'anxiety', 'afraid',
  'fear', 'scared', 'lost', 'trapped', 'helpless', 'hurt', 'grief', 'cried', 'tears',
  'ashamed', 'shame', 'guilt', 'regret', 'angry', 'anger', 'bitter', 'struggle', 'struggled',
]);
const CLICHES = [
  'changed my life', 'step outside my comfort zone', 'made me who i am today',
  'passion for helping others', 'opened my eyes', 'broaden my horizons',
  'the world around me', 'hard work and dedication', 'give back to the community',
  'little did i know', 'taught me the importance of', 'defining moment',
];
const FILLER = [/\bvery\b/gi, /\breally\b/gi, /\ba lot of\b/gi, /\bthings\b/gi, /\bstuff\b/gi, /\bkind of\b/gi, /\bsort of\b/gi];
const TELL = [
  /\bi (?:learned|realized|understood|discovered) that\b/gi,
  /\bi felt (?:happy|sad|proud|nervous|excited|grateful|scared|angry)\b/gi,
  /\bthis (?:experience|moment|event) (?:taught|showed)\b/gi,
  /\b(?:it|this) (?:was|is) (?:important|meaningful|special|valuable)\b/gi,
];
const CHRONO_OPENERS = [
  /^i have always\b/i, /^since i was\b/i, /^ever since\b/i, /^growing up\b/i,
  /^from a young age\b/i, /^when i was (?:young|little|a child)\b/i,
  /^for as long as i can remember\b/i, /^throughout my life\b/i,
];
const PASSIVE_RE = /\b(?:was|were|is|are|been|being)\s+(?:\w+ed|given|taken|made|done|seen|shown|known|written|broken|chosen|built|caught|brought|taught|told|held|kept|left|lost|found)\b/i;

const STOP5 = new Set([
  'which', 'there', 'their', 'would', 'could', 'should', 'about', 'these', 'those',
  'being', 'because', 'while', 'where', 'when', 'after', 'before', 'again', 'still',
  'every', 'other', 'another', 'through', 'around', 'really', 'always', 'never',
  'thing', 'things', 'something', 'someone', 'myself', 'people', 'started', 'wanted',
]);

/* ─── helpers ─── */

function words(t: string): string[] { return t.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)); }
function paragraphs(t: string): string[] { return t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); }
function sentences(t: string): string[] {
  const cleaned = t.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const guarded = cleaned.replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|a\.m|p\.m|U\.S)\./gi, m => m.replace(/\./g, '<D>'));
  return (guarded.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(s => s.replace(/<D>/g, '.').trim()).filter(Boolean);
}
function syllables(raw: string): number {
  let w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const g = w.match(/[aeiouy]{1,2}/g);
  return g ? g.length : 1;
}
function countAll(text: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) { const m = text.match(p); if (m) n += m.length; }
  return n;
}
function per100(n: number, wc: number): number {
  return Math.round((n / Math.max(wc / 100, 0.01)) * 100) / 100;
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

/* ══════════════════════════════════════════════════════════════════════
   EXTRACT
   ══════════════════════════════════════════════════════════════════════ */

export function extractFeatures(rawText: string, prompt?: string): EssayFeatures | null {
  const text = (rawText || '').trim();
  const w = words(text);
  const wc = w.length;
  // Too short to measure anything meaningful — refuse rather than emit noise.
  if (wc < 120) return null;

  const lower = text.toLowerCase();
  const paras = paragraphs(text);
  const sents = sentences(text);
  const lens = sents.map(s => words(s).length).filter(n => n > 0);

  /* shape */
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const variance = lens.length ? lens.reduce((s, l) => s + (l - mean) ** 2, 0) / lens.length : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  /* readability */
  const syl = w.reduce((s, x) => s + syllables(x), 0);
  const grade = Math.max(1, 0.39 * (wc / Math.max(lens.length, 1)) + 11.8 * (syl / wc) - 15.59);

  const sentStarts = new Set(sents.map(s => words(s)[0]).filter(Boolean));
  let big = 0, content = 0;
  for (const tok of w) {
    const bare = tok.replace(/[^A-Za-z]/g, '');
    if (bare.length < 2) continue;
    if (/^[A-Z]/.test(bare) && !sentStarts.has(tok)) continue; // skip proper nouns
    content++;
    if (syllables(bare) >= 3) big++;
  }

  const uniq = new Set(w.map(x => x.toLowerCase().replace(/[^a-z']/g, '')));

  /* connectives */
  let causal = 0, additive = 0;
  for (const c of CAUSAL) causal += (lower.split(new RegExp(`\\b${c}\\b`, 'g')).length - 1);
  for (const c of ADDITIVE) additive += (lower.split(new RegExp(`\\b${c}\\b`, 'g')).length - 1);

  /* narrative */
  const reflection = countAll(text, REFLECTION);
  const scene = countAll(text, SCENE);
  const figurative = countAll(text, FIGURATIVE);
  const dialogue = (text.match(/["“][^"”]{4,}["”]/g) || []).length;
  const iOpeners = sents.filter(s => /^i\b/i.test(s.trim())).length;
  const tell = countAll(text, TELL);
  const showish = scene + dialogue + figurative;

  /* bookend echo */
  let echo = 0;
  if (paras.length >= 3) {
    const distinct = (s: string) => new Set(
      s.toLowerCase().split(/\s+/).map(x => x.replace(/[^a-z]/g, '')).filter(x => x.length >= 5 && !STOP5.has(x)),
    );
    const a = distinct(paras[0]), b = distinct(paras[paras.length - 1]);
    for (const x of b) if (a.has(x)) echo++;
  }

  /* tone */
  let intens = 0, neg = 0;
  for (const tok of w) {
    const bare = tok.toLowerCase().replace(/[^a-z]/g, '');
    if (INTENSIFIERS.includes(bare)) intens++;
    if (NEGATIVE.has(bare)) neg++;
  }
  const tail = paras.length >= 2 ? paras[paras.length - 1] : text.slice(-Math.floor(text.length / 3));
  const growth = GROWTH.some(re => re.test(tail)) ? 1 : 0;

  /* hygiene */
  const passive = sents.filter(s => words(s).length >= 5 && PASSIVE_RE.test(s)).length;
  let cliche = 0;
  for (const c of CLICHES) if (lower.includes(c)) cliche++;
  const filler = countAll(text, FILLER);

  /* prompt alignment */
  let alignment = -1;
  if (prompt && prompt.trim().length > 12) {
    const pk = new Set(prompt.toLowerCase().split(/\s+/).map(x => x.replace(/[^a-z]/g, '')).filter(x => x.length > 4));
    if (pk.size) {
      let hit = 0;
      for (const k of pk) if (lower.includes(k)) hit++;
      alignment = r2(hit / pk.size);
    }
  }

  return {
    wordCount: wc,
    paragraphCount: paras.length,
    sentenceCount: lens.length,
    avgSentenceLen: r2(mean),
    sentenceLenCV: r2(cv),
    shortSentenceRatio: r2(lens.filter(l => l <= 7).length / Math.max(lens.length, 1)),
    longSentenceRatio: r2(lens.filter(l => l >= 20).length / Math.max(lens.length, 1)),
    readingGrade: r2(grade),
    bigWordDensity: r2(big / Math.max(content, 1)),
    lexicalDiversity: r2(uniq.size / wc),
    causalRatio: r2(causal / Math.max(causal + additive, 1)),
    reflectionDensity: per100(reflection, wc),
    sceneDensity: per100(scene, wc),
    figurativeDensity: per100(figurative, wc),
    dialogueDensity: per100(dialogue, wc),
    iOpenerRatio: r2(iOpeners / Math.max(lens.length, 1)),
    // Neutral (0.5) when an essay carries neither show nor tell markers.
    // Dividing by max(...,1) would score "no signal" identically to
    // "maximally telling", which mislabelled clean essays as tell-dominant.
    showTellRatio: showish + tell === 0 ? 0.5 : r2(showish / (showish + tell)),
    bookendEcho: echo,
    intensifierDensity: per100(intens, wc),
    negativityDensity: per100(neg, wc),
    hasGrowthTurn: growth,
    passiveRatio: r2(passive / Math.max(lens.length, 1)),
    clicheDensity: cliche,
    fillerDensity: per100(filler, wc),
    promptAlignment: alignment,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   PATTERN MARKERS

   Categorical, human-readable tags describing *how* an essay is built.
   These are what the loop learns styles and cautions from — a marker that
   shows up far more often in tutor-rated-weak essays becomes a caution;
   one concentrated in strong essays becomes a recognized style.

   Every marker is a structural property. None encodes subject matter, so
   the loop cannot learn "essays about immigration score badly."
   ══════════════════════════════════════════════════════════════════════ */

export const PATTERN_LABELS: Record<string, string> = {
  'open:chronological': 'Opens at the start of the timeline',
  'open:in-medias-res': 'Opens mid-scene',
  'open:dialogue': 'Opens on dialogue',
  'rhythm:monotone': 'Little sentence-length variety',
  'rhythm:varied': 'Deliberately varied sentence lengths',
  'rhythm:no-short': 'No short sentences for emphasis',
  'struct:single-block': 'One undivided block of text',
  'struct:bookend': 'Ends by calling back to the opening',
  'struct:many-paragraphs': 'Finely divided into many paragraphs',
  'narr:list-like': 'Events linked by addition, not consequence',
  'narr:causal': 'Events drive each other',
  'narr:no-reflection': 'Recounts events without turning inward',
  'narr:no-scene': 'Abstract throughout, no concrete scene',
  'narr:i-heavy': 'Most sentences open with "I"',
  'narr:has-imagery': 'Uses figurative language',
  'tone:overstated': 'Leans on intensifiers and absolutes',
  'tone:unresolved-negative': 'Heavy affect with no growth turn',
  'tone:measured': 'Measured, credible register',
  'read:dense': 'Dense vocabulary, high reading grade',
  'read:plain': 'Plain and clear',
  'hyg:cliche-heavy': 'Multiple stock phrases',
  'hyg:passive-heavy': 'Frequent passive voice',
  'hyg:filler-heavy': 'Frequent filler words',
  'craft:show-dominant': 'Shows more than it tells',
  'craft:tell-dominant': 'Tells more than it shows',
  'fit:off-prompt': 'Weak overlap with the prompt',
};

export function derivePatterns(f: EssayFeatures, rawText: string): string[] {
  const p: string[] = [];
  const first = sentences(rawText)[0] || '';

  /* opening */
  if (CHRONO_OPENERS.some(re => re.test(first.trim()))) p.push('open:chronological');
  else if (/^["“]/.test(first.trim())) p.push('open:dialogue');
  else if (/\b(?:ran|stood|gripped|slammed|froze|reached|watched|smelled)\b/i.test(first)) p.push('open:in-medias-res');

  /* rhythm */
  if (f.sentenceLenCV < 0.28) p.push('rhythm:monotone');
  else if (f.sentenceLenCV >= 0.5) p.push('rhythm:varied');
  if (f.shortSentenceRatio === 0 && f.sentenceCount >= 5) p.push('rhythm:no-short');

  /* structure */
  if (f.paragraphCount === 1 && f.wordCount > 120) p.push('struct:single-block');
  if (f.bookendEcho >= 2) p.push('struct:bookend');
  if (f.paragraphCount >= 8) p.push('struct:many-paragraphs');

  /* narrative */
  if (f.causalRatio < 0.4) p.push('narr:list-like');
  else if (f.causalRatio >= 0.6) p.push('narr:causal');
  if (f.reflectionDensity === 0) p.push('narr:no-reflection');
  if (f.sceneDensity === 0) p.push('narr:no-scene');
  if (f.iOpenerRatio >= 0.55) p.push('narr:i-heavy');
  if (f.figurativeDensity > 0) p.push('narr:has-imagery');

  /* tone */
  if (f.intensifierDensity >= 2.2) p.push('tone:overstated');
  if (f.negativityDensity >= 3 && !f.hasGrowthTurn) p.push('tone:unresolved-negative');
  if (f.intensifierDensity < 1.2 && f.negativityDensity < 3) p.push('tone:measured');

  /* readability */
  if (f.readingGrade > 14 || f.bigWordDensity > 0.22) p.push('read:dense');
  else if (f.readingGrade >= 7 && f.readingGrade <= 12) p.push('read:plain');

  /* hygiene */
  if (f.clicheDensity >= 2) p.push('hyg:cliche-heavy');
  if (f.passiveRatio >= 0.2) p.push('hyg:passive-heavy');
  if (f.fillerDensity >= 2.5) p.push('hyg:filler-heavy');

  /* craft */
  if (f.showTellRatio >= 0.7) p.push('craft:show-dominant');
  else if (f.showTellRatio <= 0.35) p.push('craft:tell-dominant');

  /* NOTE: there is deliberately no 'fit:off-prompt' marker.
     promptAlignment is kept as a numeric feature (useful in aggregate), but
     it is literal keyword overlap, and a strong essay that answers the prompt
     in its own words scores near zero — a test essay squarely about community
     contribution flagged as off-prompt purely for never using the word
     "community". Turning that into a student-facing rule would be wrong often
     enough to erode trust, so it stays out of the pattern set. */

  return p;
}

/* ══════════════════════════════════════════════════════════════════════
   ESSAY CRAFT ENGINE  —  deep, actionable writing cognition
   ──────────────────────────────────────────────────────────────────────
   Goes beyond scoring to give students concrete, teachable moves for
   creativity, coherence, uniqueness, and style. Every suggestion is
   specific: it quotes the student's own text, names the technique, and
   (where useful) shows a before → after illustration of the fix.

   Dimensions:
     1. SEQUENCE     — narrative order; suggests in-medias-res / reordering
     2. RHYTHM       — sentence-length variety, tempo, punchy short lines
     3. READABILITY  — density / vocabulary load (too many big words)
     4. TONE         — over-negativity and over-exaggeration guardrails
     5. REWRITE      — sentence-level fixes (show-don't-tell, passive, filler)
     6. COHERENCE    — topic drift, weak conclusion, wall-of-text
     7. ANGLE        — theme-aware provocations for a more original take

   Pure string/regex analysis — no dependencies, safe to run on every
   keystroke (debounced by the caller).
   ══════════════════════════════════════════════════════════════════════ */

import { extractFeatures, derivePatterns } from './essayFeatures';

export type CraftCategory =
  | 'sequence' | 'rhythm' | 'readability' | 'tone' | 'rewrite' | 'coherence' | 'angle' | 'narrative';

export type CraftSeverity = 'praise' | 'tip' | 'caution';

/** A rule derived from tutor-reviewed essays and promoted by an admin.
    Supplied by the caller (fetched from /api/essay-rules) so this module
    stays pure and testable. */
export interface LearnedRule {
  id: string;
  kind: 'caution' | 'style';
  target: string;      // a pattern key from lib/essayFeatures
  message: string;
}

export interface CraftSuggestion {
  id: string;
  category: CraftCategory;
  severity: CraftSeverity;
  title: string;
  detail: string;
  excerpt?: string;                      // the student's own text being referenced
  example?: { before: string; after: string };
  /** True when this came from a promoted, tutor-data-derived rule rather
      than a hand-written heuristic. Shown to the student as such. */
  learned?: boolean;
}

export interface CraftMetric {
  key: 'rhythm' | 'readability' | 'tone' | 'narrative';
  label: string;
  value: number;                         // 0–100
  status: 'good' | 'warn' | 'bad';
  hint: string;
}

export interface CraftReport {
  ready: boolean;
  wordCount: number;
  readingGrade: number;                  // Flesch–Kincaid grade level
  theme: string | null;
  metrics: CraftMetric[];
  suggestions: CraftSuggestion[];
}

/* ─── Shared helpers ─────────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<CraftCategory, string> = {
  sequence: 'Structure',
  rhythm: 'Rhythm & Tempo',
  readability: 'Readability',
  tone: 'Tone',
  rewrite: 'Line Edit',
  coherence: 'Coherence',
  angle: 'Fresh Angle',
  narrative: 'Narrative Craft',
};

export function craftCategoryLabel(c: CraftCategory): string {
  return CATEGORY_LABEL[c];
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** Sentence splitter that protects common abbreviations from false breaks. */
function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const guarded = cleaned.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Inc|Ltd|Co|Ph\.?D|e\.g|i\.e|a\.m|p\.m|U\.S)\./gi,
    (m) => m.replace(/\./g, '<DOT>'),
  );
  const parts = guarded.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return parts.map((s) => s.replace(/<DOT>/g, '.').trim()).filter(Boolean);
}

/** Count real words (tokens containing a letter or digit). */
function wordsIn(text: string): string[] {
  return text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
}

/** Heuristic syllable counter (good enough for readability estimates). */
function countSyllables(raw: string): number {
  let w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/** Truncate an excerpt for compact display. */
function clip(s: string, max = 140): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
}

function id(cat: CraftCategory, n: number): string {
  return `${cat}-${n}`;
}

// Common 5+ letter function words to exclude from "distinctive image" matching
// in the bookend/circularity check (which only looks at words length ≥ 5).
const STOP_WORDS_LITE = new Set([
  'which', 'there', 'their', 'would', 'could', 'should', 'about', 'these',
  'those', 'being', 'because', 'while', 'where', 'when', 'what', 'after',
  'before', 'again', 'still', 'every', 'other', 'another', 'through',
  'around', 'really', 'always', 'never', 'thing', 'things', 'something',
  'someone', 'myself', 'himself', 'herself', 'themselves', 'people',
  'started', 'wanted', 'though', 'without', 'between',
]);

/* ─── Curated word lists ─────────────────────────────────────────────── */

// "Thesaurus reach" words → simpler, more confident alternatives.
const OVERWROUGHT: Record<string, string> = {
  utilize: 'use', utilized: 'used', utilizing: 'using',
  endeavor: 'try', endeavored: 'tried', endeavour: 'try',
  commence: 'begin', commenced: 'began', commencing: 'beginning',
  ascertain: 'find out', facilitate: 'help', facilitated: 'helped',
  elucidate: 'explain', cognizant: 'aware', myriad: 'many',
  plethora: 'plenty', ubiquitous: 'everywhere', paramount: 'key',
  utilization: 'use', endeavors: 'efforts', endeavours: 'efforts',
  aforementioned: 'earlier', subsequently: 'later', henceforth: 'from now on',
  nevertheless: 'still', notwithstanding: 'despite', therein: 'in it',
  multifaceted: 'many-sided', delve: 'dig', delved: 'dug',
  culminate: 'end', culminated: 'ended', juxtapose: 'contrast',
  exemplify: 'show', exemplified: 'showed', encapsulate: 'capture',
  garner: 'earn', garnered: 'earned', myriads: 'many',
  quintessential: 'perfect', epitome: 'height', ephemeral: 'fleeting',
  perpetuate: 'keep alive', ameliorate: 'improve', propensity: 'tendency',
  cognizance: 'awareness', erudite: 'learned', copious: 'plenty of',
};

// Intensifiers & absolutes that read as exaggeration in bulk.
const INTENSIFIERS = [
  'very', 'really', 'extremely', 'incredibly', 'absolutely', 'completely',
  'totally', 'utterly', 'literally', 'undoubtedly', 'truly', 'immensely',
  'tremendously', 'insanely', 'unbelievably', 'wildly', 'hugely', 'so',
];
// Only true overgeneralizations — NOT common words like "every"/"all"/"ever"
// that have specific, legitimate uses ("every Sunday", "everything changed").
const ABSOLUTES = [
  'always', 'never', 'everyone', 'everybody', 'no one', 'nobody',
];
const HYPERBOLE = [
  'life-changing', 'life changing', 'the best', 'the worst', 'the most',
  'perfect', 'flawless', 'amazing', 'incredible', 'unforgettable',
  'once in a lifetime', 'greatest', 'ultimate', 'epic', 'phenomenal',
];

// Negative-affect vocabulary (used for tone balance, not to forbid).
const NEGATIVE_WORDS = new Set([
  'hate', 'hated', 'hopeless', 'worthless', 'useless', 'miserable', 'misery',
  'suffering', 'suffered', 'pain', 'painful', 'despair', 'desperate', 'broken',
  'failure', 'failed', 'failing', 'alone', 'lonely', 'loneliness', 'empty',
  'darkness', 'dark', 'terrible', 'awful', 'horrible', 'devastated', 'devastating',
  'depressed', 'depression', 'anxious', 'anxiety', 'afraid', 'fear', 'scared',
  'lost', 'trapped', 'helpless', 'hurt', 'wound', 'grief', 'cry', 'crying',
  'cried', 'tears', 'ashamed', 'shame', 'guilt', 'guilty', 'regret', 'angry',
  'anger', 'rage', 'bitter', 'resent', 'hardship', 'struggle', 'struggled',
  'struggling', 'defeat', 'defeated', 'worst', 'nightmare', 'dread', 'numb',
]);

// Growth / uplift markers — signal a redemptive turn (used in tone check).
const GROWTH_MARKERS = [
  /\bi (?:learned|grew|changed|realized|discovered|found|overcame|rebuilt|rose)\b/i,
  /\bnow i\b/i, /\btoday i\b/i, /\bi (?:understand|know|see) (?:now|that)\b/i,
  /\blooking (?:back|ahead)\b/i, /\bgoing forward\b/i, /\bi will\b/i,
  /\bstronger\b/i, /\bhope\b/i, /\bproud\b/i, /\bgrateful\b/i, /\bresilien/i,
  /\bfor the first time\b/i, /\bi carry\b/i, /\bi choose\b/i, /\bi still\b/i,
];

// Chronological openers that flatten a story.
const CHRONO_OPENERS = [
  /^i have always\b/i, /^since i was\b/i, /^ever since\b/i, /^growing up\b/i,
  /^from a young age\b/i, /^when i was (?:young|little|a child|in)\b/i,
  /^as a (?:child|kid|young)\b/i, /^my (?:whole|entire) life\b/i,
  /^throughout my life\b/i, /^for as long as i can remember\b/i,
];

// Paragraph-initial time markers (a "chronological march").
const TIME_MARKERS = [
  /^then\b/i, /^next\b/i, /^after (?:that|\w+,)/i, /^later\b/i, /^afterward/i,
  /^the (?:next|following) (?:day|week|month|year|morning)/i, /^soon\b/i,
  /^eventually\b/i, /^finally\b/i, /^that (?:day|night|summer|year)\b/i,
  /^by the (?:time|end)\b/i, /^once\b/i, /^first,/i, /^second/i, /^meanwhile\b/i,
];

const CLICHES: Record<string, string> = {
  'changed my life': 'Show HOW you changed — a habit, a choice, a reaction that is different now.',
  'step outside my comfort zone': 'Describe the specific discomfort: what did your body do, what did you almost avoid?',
  'made me who i am today': 'Prove it with one concrete action you take differently now.',
  'passion for helping others': 'Name one person you helped and the exact moment it mattered.',
  'opened my eyes': 'Say what you literally saw differently afterward.',
  'broaden my horizons': 'Name the one new perspective precisely, not the category of it.',
  'the world around me': 'Swap the abstraction for a specific place, person, or object.',
  'hard work and dedication': 'Replace the label with a scene that makes the reader feel the effort.',
  'give back to the community': 'Which community, which need, which afternoon? Get specific.',
  'i realized that anything is possible': 'Cut the platitude; end on a small, true, concrete image instead.',
};

/* ─── Narrative-craft signals ────────────────────────────────────────── */

// Causal / consequential connectives — the texture of cause-and-effect
// storytelling ("this happened, BUT that forced…, SO I…").
const CAUSAL_CONNECTIVES = [
  'but', 'yet', 'however', 'because', 'so', 'therefore', 'thus', 'since',
  'although', 'though', 'despite', 'unless', 'which meant', 'which forced',
  'as a result', 'so that', 'even though', 'instead',
];
// Additive connectives — the texture of a flat list ("and then… and then").
const ADDITIVE_CONNECTIVES = [
  'and then', 'then', 'next', 'after that', 'also', 'plus', 'additionally',
  'furthermore', 'moreover', 'as well', 'and after',
];

// Interiority / reflection markers — a narrative earns its meaning when the
// writer turns inward, not just recounts events.
const REFLECTION_MARKERS = [
  /\bi (?:realized|realised|understood|wondered|questioned|noticed|feared|doubted|assumed|believed|expected)\b/i,
  /\bwhat i (?:didn'?t|hadn'?t|never) (?:know|realize|realise|understand|expect|see)\b/i,
  /\blooking back\b/i, /\bin (?:that|hindsight|retrospect)\b/i, /\bit struck me\b/i,
  /\bi (?:began|started|came) to (?:see|understand|realize|realise|question)\b/i,
  /\bi now (?:see|know|understand|realize|realise)\b/i, /\bfor the first time\b/i,
  /\bi asked myself\b/i, /\bit dawned on me\b/i, /\bi couldn'?t help but\b/i,
];

// Figurative language cues (simile / explicit metaphor framing).
const FIGURATIVE_CUES = [
  /\blike a\b/i, /\blike an\b/i, /\blike the way\b/i, /\bas if\b/i, /\bas though\b/i,
  /\bas \w+ as (?:a|an|the)\b/i, /\breminded me of\b/i, /\bfelt like\b/i,
  /\bas small as\b/i, /\ba kind of\b/i,
];

// Concrete-scene signals — sensory + action + specific anchors.
const SCENE_SIGNALS = [
  /["“][^"”]{4,}["”]/,                                    // dialogue
  /\b(?:saw|heard|felt|smelled|tasted|touched|watched|listened)\b/i,
  /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i,      // a specific time
  /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|June|July|August|September|October|November|December)\b/,
  /\b(?:ran|grabbed|slammed|whispered|shouted|reached|stumbled|knelt|gripped|dropped)\b/i,
];

/* ─── Theme detection & angle library ───────────────────────────────── */

const THEME_CLUSTERS: Record<string, string[]> = {
  leadership: ['lead', 'led', 'leader', 'captain', 'president', 'founded', 'organize', 'team', 'manage', 'initiative', 'mentor', 'delegate', 'club'],
  service: ['volunteer', 'community', 'service', 'nonprofit', 'donate', 'shelter', 'tutor', 'charity', 'fundraise', 'outreach', 'help', 'advocate'],
  sports: ['team', 'game', 'practice', 'coach', 'season', 'athlete', 'court', 'field', 'race', 'training', 'match', 'championship', 'sport', 'run', 'swim'],
  research: ['research', 'experiment', 'hypothesis', 'data', 'lab', 'science', 'biology', 'chemistry', 'physics', 'analysis', 'discovery', 'variable', 'study'],
  identity: ['culture', 'heritage', 'immigrant', 'language', 'tradition', 'family', 'identity', 'roots', 'community', 'religion', 'accent', 'homeland', 'belong'],
  arts: ['music', 'art', 'paint', 'draw', 'dance', 'theater', 'perform', 'instrument', 'piano', 'violin', 'song', 'stage', 'sculpt', 'design', 'photography'],
  family: ['mother', 'father', 'mom', 'dad', 'grandmother', 'grandfather', 'sister', 'brother', 'parent', 'family', 'sibling', 'grandma', 'grandpa'],
  adversity: ['struggle', 'loss', 'illness', 'diagnosis', 'divorce', 'moved', 'poverty', 'hardship', 'overcome', 'challenge', 'failure', 'setback', 'grief'],
  technology: ['code', 'program', 'software', 'app', 'robot', 'website', 'algorithm', 'build', 'computer', 'engineer', 'game', 'hack', 'circuit'],
  work: ['job', 'work', 'shift', 'customer', 'register', 'internship', 'employee', 'boss', 'wage', 'restaurant', 'store', 'business'],
};

const ANGLE_LIBRARY: Record<string, string[]> = {
  leadership: [
    'Most leadership essays celebrate a win. The memorable ones admit a moment you led badly — and what you changed. Is there a harder truth you could tell?',
    'Skip the title. Describe one quiet, unglamorous thing you did for the group that no one clapped for.',
  ],
  service: [
    'Service essays often cast you as the helper. Flip it: what did the people you "served" teach you? Whose name do you still remember?',
    'Avoid the highlight reel of good deeds. Zoom into one five-minute exchange that unsettled or reshaped how you see the work.',
  ],
  sports: [
    'Go past the win/loss. What tiny ritual — taping your wrists, the silent drive home — captures what this sport really means to you?',
    'The strongest sports essays aren\'t about the sport. What does the way you compete reveal about how you\'ll live?',
  ],
  research: [
    'Skip the science-fair recap. What question genuinely keeps you up at night, and what does your obsession with it reveal about how your mind works?',
    'Don\'t narrate the method. Narrate the moment your result surprised you — and what you did when the data disagreed with your hope.',
  ],
  identity: [
    'Avoid the "two worlds" frame. Name one specific object, dish, or phrase that only makes sense in your household and let it carry the whole essay.',
    'Instead of explaining your culture to the reader, show a moment it put you in tension with yourself.',
  ],
  arts: [
    'Instead of "music is my escape," describe one bar, one brushstroke, one mistake you made a thousand times. Specificity is originality.',
    'What does your art let you say that words can\'t — and why do you need that outlet in particular?',
  ],
  family: [
    'Family essays drift into tribute. Keep yourself in the frame: what did you do differently because of this person, not just what they taught you?',
    'Pick one ordinary object of theirs. Let its details carry the relationship instead of adjectives.',
  ],
  adversity: [
    'The strongest hardship essays aren\'t about bouncing back — they\'re about what you still carry. What didn\'t fully heal, and how do you live with it?',
    'Resist the tidy lesson. Show the messy in-between where you didn\'t yet know it would be okay.',
  ],
  technology: [
    'Don\'t list what you built. Describe the bug that humbled you and the ugly, stubborn hours it took to understand it.',
    'What does the thing you built reveal about a problem you actually care about in the world?',
  ],
  work: [
    'A job essay lives in specifics: one regular, one rush, one thing a customer said. What did the work teach you that a classroom couldn\'t?',
    'Show the moment the job stopped being about the paycheck. What shifted?',
  ],
};

const ANGLE_FALLBACK = [
  'Ask: what would ONLY you write about this? Find the detail no other applicant could honestly claim, and build outward from it.',
  'Try telling this through a single object, place, or recurring image. Concrete anchors are what make an essay feel unrepeatable.',
];

function detectTheme(text: string): string | null {
  const words = new Set(text.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z]/g, '')));
  let best: string | null = null;
  let bestHits = 1; // require at least 2
  for (const [theme, keys] of Object.entries(THEME_CLUSTERS)) {
    let hits = 0;
    for (const k of keys) if (words.has(k)) hits++;
    if (hits > bestHits) { bestHits = hits; best = theme; }
  }
  return best;
}

/* ─── Passive-voice + weak-word detection (line edits) ───────────────── */

const IRREGULAR_PARTICIPLES = 'given|taken|made|done|seen|shown|known|written|broken|chosen|driven|eaten|hidden|spoken|stolen|torn|worn|built|caught|brought|taught|thought|told|held|kept|left|lost|found';
const PASSIVE_RE = new RegExp(`\\b(?:was|were|is|are|been|being)\\s+(?:\\w+ed|${IRREGULAR_PARTICIPLES})\\b`, 'i');
const PASSIVE_STATE_EXCEPT = /\b(?:was|were|is|are)\s+(?:tired|excited|scared|worried|interested|surprised|confused|prepared|involved|located|dedicated|determined)\b/i;

/* ══════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════ */

export function analyzeCraft(rawText: string, prompt?: string, learned?: LearnedRule[]): CraftReport {
  const text = (rawText || '').trim();
  const words = wordsIn(text);
  const wordCount = words.length;

  if (wordCount < 40) {
    return { ready: false, wordCount, readingGrade: 0, theme: null, metrics: [], suggestions: [] };
  }

  const lowerText = text.toLowerCase();
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const sentenceLens = sentences.map((s) => wordsIn(s).length).filter((n) => n > 0);
  const suggestions: CraftSuggestion[] = [];

  /* ─── Readability (Flesch–Kincaid) ─── */
  const syllableTotal = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgSentenceLen = sentenceLens.length ? wordCount / sentenceLens.length : wordCount;
  const syllPerWord = syllableTotal / Math.max(wordCount, 1);
  const readingGrade = Math.max(1, Math.round((0.39 * avgSentenceLen + 11.8 * syllPerWord - 15.59) * 10) / 10);

  // Big-word density, excluding likely proper nouns (capitalized mid-sentence).
  let bigWords = 0;
  let contentWords = 0;
  {
    const sentenceStartWords = new Set<string>();
    for (const s of sentences) {
      const first = wordsIn(s)[0];
      if (first) sentenceStartWords.add(first);
    }
    for (const w of words) {
      const bare = w.replace(/[^A-Za-z]/g, '');
      if (bare.length < 2) continue;
      const isProper = /^[A-Z]/.test(bare) && !sentenceStartWords.has(w);
      if (isProper) continue;
      contentWords++;
      if (countSyllables(bare) >= 3) bigWords++;
    }
  }
  const bigWordDensity = bigWords / Math.max(contentWords, 1);

  // Readability metric: reward grades ~8–12, penalize dense prose.
  let readScore = 100 - Math.max(0, readingGrade - 12) * 8 - Math.max(0, 7 - readingGrade) * 3;
  readScore -= Math.max(0, bigWordDensity - 0.16) * 180;
  readScore = Math.max(5, Math.min(100, Math.round(readScore)));

  if (readingGrade > 14 || bigWordDensity > 0.22) {
    // Point to the densest sentence.
    let densest = ''; let densestRatio = 0;
    for (const s of sentences) {
      const sw = wordsIn(s);
      if (sw.length < 6) continue;
      const ratio = sw.reduce((a, w) => a + countSyllables(w), 0) / sw.length;
      if (ratio > densestRatio) { densestRatio = ratio; densest = s; }
    }
    suggestions.push({
      id: id('readability', 1),
      category: 'readability',
      severity: 'caution',
      title: 'Dense — lighten the vocabulary load',
      detail: `Your writing reads at about a grade ${readingGrade} level with a lot of long words. Admissions readers move fast, and clarity signals confidence more than sophistication does. Read it aloud; anywhere you stumble, simplify.`,
      excerpt: densest ? clip(densest) : undefined,
    });
  }

  // Thesaurus-reach words → plain alternatives.
  const foundOverwrought: string[] = [];
  const seenOver = new Set<string>();
  for (const w of words) {
    const bare = w.toLowerCase().replace(/[^a-z]/g, '');
    if (OVERWROUGHT[bare] && !seenOver.has(bare)) {
      seenOver.add(bare);
      foundOverwrought.push(`“${bare}” → “${OVERWROUGHT[bare]}”`);
    }
    if (foundOverwrought.length >= 4) break;
  }
  if (foundOverwrought.length >= 2) {
    suggestions.push({
      id: id('readability', 2),
      category: 'readability',
      severity: 'tip',
      title: 'Trade thesaurus words for plain ones',
      detail: `A few words feel like they are reaching to sound impressive. Simpler choices read as more self-assured: ${foundOverwrought.join(', ')}.`,
    });
  }

  /* ─── Rhythm & tempo ─── */
  let rhythmScore = 60;
  if (sentenceLens.length >= 3) {
    const mean = sentenceLens.reduce((a, b) => a + b, 0) / sentenceLens.length;
    const variance = sentenceLens.reduce((s, l) => s + (l - mean) ** 2, 0) / sentenceLens.length;
    const cv = Math.sqrt(variance) / Math.max(mean, 1);
    const shortCount = sentenceLens.filter((l) => l <= 7).length;
    const longCount = sentenceLens.filter((l) => l >= 20).length;

    rhythmScore = Math.round(Math.max(5, Math.min(100, 45 + cv * 90 + (shortCount && longCount ? 12 : 0))));

    // Longest monotonous run of similar, medium+ sentences.
    let runStart = 0; let bestRun = 1; let bestRunStart = 0;
    for (let i = 1; i < sentenceLens.length; i++) {
      const similar = Math.abs(sentenceLens[i] - sentenceLens[i - 1]) <= 3 && sentenceLens[i] >= 12;
      if (similar) {
        if (i - runStart + 1 > bestRun) { bestRun = i - runStart + 1; bestRunStart = runStart; }
      } else {
        runStart = i;
      }
    }

    if (shortCount === 0 && sentenceLens.length >= 5) {
      suggestions.push({
        id: id('rhythm', 1),
        category: 'rhythm',
        severity: 'tip',
        title: 'Add a short, punchy sentence',
        detail: 'Every sentence is medium or long, so nothing lands hard. A three-to-five-word sentence right after a long one creates a beat of emphasis — use it to mark your turning point.',
        example: { before: 'a long, flowing sentence that builds and builds…', after: '…and then a short one. Everything changed.' },
      });
    } else if (bestRun >= 4) {
      const runExcerpt = sentences.slice(bestRunStart, bestRunStart + 2).join(' ');
      suggestions.push({
        id: id('rhythm', 2),
        category: 'rhythm',
        severity: 'tip',
        title: `Vary the pacing (sentences ${bestRunStart + 1}–${bestRunStart + bestRun})`,
        detail: 'Several sentences in a row run about the same length, which flattens the tempo. Split one into two short beats, or fuse two into a longer, rolling line so the rhythm rises and falls.',
        excerpt: runExcerpt ? clip(runExcerpt) : undefined,
      });
    } else if (cv < 0.28 && sentenceLens.length >= 6) {
      suggestions.push({
        id: id('rhythm', 3),
        category: 'rhythm',
        severity: 'tip',
        title: 'Sentence lengths barely change',
        detail: 'Your sentences are all a similar length. Mixing short and long deliberately — a long one to build, a short one to strike — is what gives prose momentum.',
      });
    } else if (mean < 9 && longCount === 0 && sentenceLens.length >= 6) {
      suggestions.push({
        id: id('rhythm', 4),
        category: 'rhythm',
        severity: 'tip',
        title: 'A little choppy — let some sentences breathe',
        detail: 'You have many short sentences in a row, which can feel staccato. Combine a few into longer, flowing lines so the genuinely short ones stand out and hit harder.',
      });
    } else if (cv >= 0.5 && shortCount && longCount) {
      suggestions.push({
        id: id('rhythm', 5),
        category: 'rhythm',
        severity: 'praise',
        title: 'Strong rhythm',
        detail: 'You mix short and long sentences well — the pacing rises and falls instead of droning. Keep reading aloud to protect this.',
      });
    }
  }

  /* ─── Tone: exaggeration ─── */
  let intensifierHits = 0;
  const offenders: string[] = [];
  const seenOffender = new Set<string>();
  for (const w of words) {
    const bare = w.toLowerCase().replace(/[^a-z]/g, '');
    if (INTENSIFIERS.includes(bare) || ABSOLUTES.includes(bare)) {
      intensifierHits++;
      if (!seenOffender.has(bare) && offenders.length < 5) { seenOffender.add(bare); offenders.push(bare); }
    }
  }
  for (const h of HYPERBOLE) {
    if (lowerText.includes(h)) { intensifierHits++; if (!seenOffender.has(h) && offenders.length < 5) { seenOffender.add(h); offenders.push(h); } }
  }
  const intensifierDensity = intensifierHits / Math.max(wordCount / 100, 1);

  /* ─── Tone: negativity balance ─── */
  let negHits = 0;
  for (const w of words) {
    const bare = w.toLowerCase().replace(/[^a-z]/g, '');
    if (NEGATIVE_WORDS.has(bare)) negHits++;
  }
  const negDensity = negHits / Math.max(wordCount / 100, 1);
  const finalChunk = paragraphs.length >= 2 ? paragraphs.slice(-1)[0] : text.slice(-Math.floor(text.length / 3));
  const hasGrowthTurn = GROWTH_MARKERS.some((re) => re.test(finalChunk));

  // Tone metric: penalize both over-exaggeration and unresolved negativity.
  let toneScore = 100 - Math.max(0, intensifierDensity - 1.5) * 22 - Math.max(0, negDensity - 3) * 10;
  if (negDensity >= 3 && !hasGrowthTurn) toneScore -= 15;
  toneScore = Math.max(5, Math.min(100, Math.round(toneScore)));

  if (intensifierDensity >= 2.2) {
    suggestions.push({
      id: id('tone', 1),
      category: 'tone',
      severity: 'caution',
      title: 'Easing off the exaggeration',
      detail: `You lean on intensifiers and absolutes${offenders.length ? ` (${offenders.slice(0, 5).join(', ')})` : ''}. In bulk they make writing feel overstated and less believable. Cut most of them, and where the point really matters, prove it with a concrete detail instead of turning up the volume.`,
      example: { before: 'It was incredibly, absolutely the most important day of my life.', after: 'I have re-read that day more than any other.' },
    });
  }

  if (negDensity >= 3 && !hasGrowthTurn) {
    suggestions.push({
      id: id('tone', 2),
      category: 'tone',
      severity: 'caution',
      title: 'Heavy tone without a turn',
      detail: 'This essay carries a lot of weight — pain, fear, loss — but the ending does not yet turn toward what you gained, learned, or how you rose. Hardship is powerful when it sets up growth; make sure the final beat shows the reader who you became, not just what you endured.',
    });
  }

  /* ─── Sequence / narrative order ─── */
  const firstSentence = sentences[0] || '';
  const chronoOpen = CHRONO_OPENERS.some((re) => re.test(firstSentence.trim()));
  if (chronoOpen) {
    suggestions.push({
      id: id('sequence', 1),
      category: 'sequence',
      severity: 'tip',
      title: 'Open in the middle of a moment',
      detail: 'Your first line starts at the beginning of the timeline, which is the most common (and least gripping) way in. Try opening in the middle of your most charged scene — drop the reader into an action or image — then loop back to fill in the backstory.',
      excerpt: clip(firstSentence),
      example: { before: 'Since I was young, I have loved building things.', after: 'The bridge held for four seconds before it snapped — and I grinned.' },
    });
  }

  // Reorder suggestion: is the most vivid paragraph buried?
  if (paragraphs.length >= 3) {
    const vivid = paragraphs.map((p) => {
      let s = 0;
      if (/["“][^"”]{4,}["”]/.test(p)) s += 3;                                  // dialogue
      s += (p.match(/\b(?:ran|grabbed|slammed|froze|whispered|shouted|stared|dropped|shook|gasped|reached|stumbled)\b/gi) || []).length * 2;
      s += (p.match(/\b(?:saw|heard|felt|smelled|tasted|cold|warm|bright|dark|loud|silence)\b/gi) || []).length;
      s += (p.match(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi) || []).length * 2;
      return s;
    });
    let peakIdx = 0;
    for (let i = 1; i < vivid.length; i++) if (vivid[i] > vivid[peakIdx]) peakIdx = i;
    // Only suggest if the peak is clearly later and the opener is flat.
    if (peakIdx >= 2 && vivid[peakIdx] >= 4 && vivid[0] <= vivid[peakIdx] / 2) {
      suggestions.push({
        id: id('sequence', 2),
        category: 'sequence',
        severity: 'tip',
        title: `Consider opening with paragraph ${peakIdx + 1}`,
        detail: `Paragraph ${peakIdx + 1} is your most vivid, sensory moment, but it is buried in the middle. Starting there hooks the reader immediately; you can weave the earlier context back in afterward. Great essays rarely tell events in the order they happened.`,
        excerpt: clip(paragraphs[peakIdx]),
      });
    }

    // Chronological march across paragraph openings.
    const marchCount = paragraphs.filter((p) => TIME_MARKERS.some((re) => re.test(p.trim()))).length;
    if (marchCount >= 3) {
      suggestions.push({
        id: id('sequence', 3),
        category: 'sequence',
        severity: 'tip',
        title: 'Break the "and then… and then" march',
        detail: 'Several paragraphs begin with time cues (then, later, the next day), so the essay reads as a straight chronology. Pick the two or three moments that actually changed you and give them room; compress or cut the connective play-by-play.',
      });
    }
  }

  /* ─── Coherence ─── */
  if (wordCount > 120 && paragraphs.length === 1) {
    suggestions.push({
      id: id('coherence', 1),
      category: 'coherence',
      severity: 'caution',
      title: 'One giant paragraph',
      detail: 'Your essay is a single block of text. Break it into 3–5 paragraphs — one per scene, idea, or shift — so the reader can breathe and follow your turns.',
    });
  } else if (paragraphs.length >= 3) {
    // NOTE: lexical topic-drift detection was intentionally removed here.
    // Keyword-overlap between a concrete scene paragraph and an abstract
    // reflection paragraph is naturally low even when they are tightly
    // connected, so it false-flagged strong essays. Numeric coherence is
    // handled by the server's "Structure & Coherence" score instead; Craft
    // Studio keeps only the two high-confidence structural signals below.

    // Conclusion that doesn't circle back to the prompt.
    if (prompt && prompt.trim().length > 12) {
      const promptKeys = new Set(prompt.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z']/g, '')).filter((w) => w.length > 4));
      const lastKeys = new Set(paragraphs.slice(-1)[0].toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z']/g, '')).filter((w) => w.length > 4));
      let hit = 0;
      for (const w of lastKeys) if (promptKeys.has(w)) hit++;
      if (hit === 0) {
        suggestions.push({
          id: id('coherence', 3),
          category: 'coherence',
          severity: 'tip',
          title: 'Land the ending on the prompt',
          detail: 'Your final paragraph drifts from the question being asked. Do not restate the prompt — instead, show how your story answers it, so the reader feels the essay close a loop.',
        });
      }
    }
  }

  /* ─── Rewrite / line edits (show-don't-tell, passive, filler, cliché) ─── */

  // Show-don't-tell: name the emotion the student stated and show the swap.
  const stt = text.match(/\bI (?:felt|was|became|grew) (happy|sad|proud|nervous|excited|grateful|scared|angry|anxious|overwhelmed|disappointed|relieved|frustrated|devastated|ashamed)\b/i);
  if (stt) {
    const emotion = stt[1].toLowerCase();
    const physical: Record<string, string> = {
      nervous: 'my palms went slick and I read the same line three times',
      anxious: 'my chest tightened and I counted the exits',
      excited: 'I could not sit still; my knee bounced under the desk',
      proud: 'I caught myself grinning at the floor',
      happy: 'I laughed before I could stop it',
      sad: 'the words blurred and I looked away',
      scared: 'my hand hovered, unwilling to knock',
      grateful: 'I did not trust my voice to say thank you',
      angry: 'I gripped the edge of the table until my knuckles paled',
      devastated: 'I sat in the parked car long after the engine went quiet',
      relieved: 'the breath I had been holding finally left me',
      overwhelmed: 'the list on the whiteboard swam in front of me',
      disappointed: 'I folded the paper in half, then in half again',
      frustrated: 'I erased the same equation until the page tore',
      ashamed: 'I could not meet her eyes',
    };
    suggestions.push({
      id: id('rewrite', 1),
      category: 'rewrite',
      severity: 'tip',
      title: 'Show the feeling instead of naming it',
      detail: `You told the reader you felt ${emotion}. Naming an emotion is the weakest way to convey it — show the physical tell and let the reader feel it for themselves.`,
      example: { before: `I felt ${emotion}.`, after: physical[emotion] ? `${physical[emotion].charAt(0).toUpperCase()}${physical[emotion].slice(1)}.` : 'Show it through a gesture, a sensation, or what you did next.' },
    });
  }

  // Passive voice: quote one passive sentence and prescribe the active move.
  for (const s of sentences) {
    if (wordsIn(s).length < 5) continue;
    if (PASSIVE_RE.test(s) && !PASSIVE_STATE_EXCEPT.test(s)) {
      suggestions.push({
        id: id('rewrite', 2),
        category: 'rewrite',
        severity: 'tip',
        title: 'Flip a passive sentence to active',
        detail: 'This sentence is in the passive voice, which hides who acted. Put the doer first — it is more direct and puts you in the driver\'s seat of your own story.',
        excerpt: clip(s),
        example: { before: 'The project was completed by our team.', after: 'Our team finished the project.' },
      });
      break;
    }
  }

  // Filler / weak-word sentence.
  const fillerSentence = sentences.find((s) => /\b(?:very|really|a lot of|things|stuff|kind of|sort of)\b/i.test(s) && wordsIn(s).length >= 6);
  if (fillerSentence && suggestions.filter((x) => x.category === 'rewrite').length < 2) {
    suggestions.push({
      id: id('rewrite', 3),
      category: 'rewrite',
      severity: 'tip',
      title: 'Cut filler, add specifics',
      detail: 'This line leans on vague fillers (very, really, things, stuff). Delete them and name the exact thing — precision is what makes a sentence memorable.',
      excerpt: clip(fillerSentence),
    });
  }

  // Cliché phrase (one).
  for (const [phrase, fix] of Object.entries(CLICHES)) {
    if (lowerText.includes(phrase)) {
      suggestions.push({
        id: id('rewrite', 4),
        category: 'rewrite',
        severity: 'tip',
        title: `Rework the cliché “${phrase}”`,
        detail: `“${phrase}” is a phrase admissions readers see thousands of times. ${fix}`,
      });
      break;
    }
  }

  /* ─── Fresh angle (theme-aware, for originality) ─── */
  const theme = detectTheme(text);
  if (wordCount >= 120) {
    const pool = (theme && ANGLE_LIBRARY[theme]) || ANGLE_FALLBACK;
    // Rotate the angle by essay length so it isn't always the same line.
    const pick = pool[wordCount % pool.length];
    suggestions.push({
      id: id('angle', 1),
      category: 'angle',
      severity: 'tip',
      title: theme ? `A more original take on your ${theme} theme` : 'Push for a more original angle',
      detail: pick,
    });
  }

  /* ─── Narrative craft (the sophisticated moves of strong storytelling) ─── */
  let narrativeScore = 55;

  // (a) Cause-and-effect texture vs a flat "and then… and then" list.
  const causalCount = CAUSAL_CONNECTIVES.reduce((n, c) => n + (lowerText.split(new RegExp(`\\b${c}\\b`, 'g')).length - 1), 0);
  const additiveCount = ADDITIVE_CONNECTIVES.reduce((n, c) => n + (lowerText.split(new RegExp(`\\b${c}\\b`, 'g')).length - 1), 0);
  const causalRatio = causalCount / Math.max(causalCount + additiveCount, 1);
  narrativeScore += causalRatio >= 0.6 ? 10 : causalRatio <= 0.3 ? -8 : 0;
  if (wordCount > 160 && additiveCount >= 3 && causalRatio < 0.4) {
    suggestions.push({
      id: id('narrative', 1),
      category: 'narrative',
      severity: 'tip',
      title: 'Build cause-and-effect, not a list',
      detail: 'Your story moves mostly by addition — this happened, and then this, and then this. The most gripping narratives move by consequence: each beat should force the next. Recast the "and then" links as "but…" (a complication) or "so…" (a consequence).',
      example: { before: 'I joined the team. Then we practiced. Then we lost.', after: 'I joined the team — but I could barely keep up, so I stayed after every practice.' },
    });
  }

  // (b) Interiority: does the writer turn inward, or only recount events?
  const reflectionHits = REFLECTION_MARKERS.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  const sceneHits = SCENE_SIGNALS.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  narrativeScore += reflectionHits >= 2 ? 8 : 0;
  narrativeScore += sceneHits >= 2 ? 8 : 0;
  if (wordCount > 180 && reflectionHits === 0) {
    suggestions.push({
      id: id('narrative', 2),
      category: 'narrative',
      severity: 'tip',
      title: 'Add a moment of reflection',
      detail: 'You narrate what happened, but never step back to show what you made of it. A personal essay earns its weight in the turn inward — a line where you reveal what you realized, feared, or misjudged. Let the reader watch you think, not just act.',
    });
  } else if (wordCount > 180 && sceneHits === 0) {
    suggestions.push({
      id: id('narrative', 3),
      category: 'narrative',
      severity: 'tip',
      title: 'Ground the ideas in one real scene',
      detail: 'This reads as reflection without a stage to stand on — lots of insight, but no concrete moment we can see. Anchor it in a single scene: a place, a time, an action, a line of dialogue. Abstraction persuades no one; a vivid moment does.',
    });
  }

  // (c) Figurative language — one resonant image lifts strong prose.
  const figurativeHits = FIGURATIVE_CUES.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  narrativeScore += figurativeHits >= 1 ? 6 : 0;
  if (wordCount > 260 && figurativeHits === 0) {
    suggestions.push({
      id: id('narrative', 4),
      category: 'narrative',
      severity: 'tip',
      title: 'Reach for one resonant image',
      detail: 'There is no figurative language here — no simile, metaphor, or comparison that makes an abstract feeling concrete. You do not need many; one well-placed image ("the silence sat between us like a third person") can carry a whole paragraph. Find the one that fits your story.',
    });
  }

  // (d) Sentence-opening variety — the "I did… I felt… I saw…" trap.
  if (sentences.length >= 6) {
    const iOpeners = sentences.filter((s) => /^i\b/i.test(s.trim())).length;
    const iRatio = iOpeners / sentences.length;
    narrativeScore += iRatio <= 0.35 ? 6 : iRatio >= 0.55 ? -8 : 0;
    if (iRatio >= 0.55) {
      suggestions.push({
        id: id('narrative', 5),
        category: 'narrative',
        severity: 'tip',
        title: 'Vary how your sentences begin',
        detail: `About ${Math.round(iRatio * 100)}% of your sentences start with "I," which makes the prose feel like a checklist. Open some with a dependent clause, an object, or an -ing phrase so the reader's ear stays awake.`,
        example: { before: 'I stepped onto the stage. I gripped the mic. I started to sing.', after: 'Onstage, the lights found me. The mic was cold in my hand. Somehow, the first note came out steady.' },
      });
    }
  }

  // (e) Circular structure (bookend) — a callback to the opening image.
  if (paragraphs.length >= 3 && wordCount >= 150) {
    const distinct = (s: string) => new Set(
      s.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z]/g, '')).filter((w) => w.length >= 5 && !STOP_WORDS_LITE.has(w)),
    );
    const firstKeys = distinct(paragraphs[0]);
    const lastKeys = distinct(paragraphs[paragraphs.length - 1]);
    let echo = 0;
    for (const w of lastKeys) if (firstKeys.has(w)) echo++;
    if (echo >= 2) {
      narrativeScore += 10;
      suggestions.push({
        id: id('narrative', 6),
        category: 'narrative',
        severity: 'praise',
        title: 'Nice circular structure',
        detail: 'Your ending calls back to the image you opened with — a bookend that makes the essay feel whole and deliberate. It is one of the most satisfying moves in narrative writing; you have earned it.',
      });
    }
  }

  narrativeScore = Math.max(5, Math.min(100, Math.round(narrativeScore)));

  /* ─── Assemble metrics ─── */
  const metrics: CraftMetric[] = [
    {
      key: 'rhythm', label: 'Rhythm', value: rhythmScore,
      status: rhythmScore >= 65 ? 'good' : rhythmScore >= 45 ? 'warn' : 'bad',
      hint: rhythmScore >= 65 ? 'Varied, musical pacing' : rhythmScore >= 45 ? 'A bit even — vary sentence length' : 'Monotone pacing',
    },
    {
      key: 'readability', label: 'Readability', value: readScore,
      status: readScore >= 65 ? 'good' : readScore >= 45 ? 'warn' : 'bad',
      hint: readScore >= 65 ? `Clear (grade ${readingGrade})` : readScore >= 45 ? `Slightly dense (grade ${readingGrade})` : `Hard to read (grade ${readingGrade})`,
    },
    {
      key: 'tone', label: 'Tone', value: toneScore,
      status: toneScore >= 65 ? 'good' : toneScore >= 45 ? 'warn' : 'bad',
      hint: toneScore >= 65 ? 'Measured and credible' : intensifierDensity >= 2.2 ? 'Leans exaggerated' : negDensity >= 3 && !hasGrowthTurn ? 'Heavy — needs a turn' : 'Watch overstatement',
    },
    {
      key: 'narrative', label: 'Narrative', value: narrativeScore,
      status: narrativeScore >= 65 ? 'good' : narrativeScore >= 45 ? 'warn' : 'bad',
      hint: narrativeScore >= 65 ? 'Scene, reflection & causality' : narrativeScore >= 45 ? 'Solid — deepen the craft' : 'Recount → story',
    },
  ];

  /* ─── Learned rules ───
     Rules derived from tutor-reviewed essays and promoted by an admin. They
     ADD observations; they never alter the metric scores above, so a bad
     rule can never silently distort the engine's numbers. Anything already
     covered by a hand-written heuristic is skipped so students don't get the
     same note twice. */
  if (learned && learned.length) {
    const feats = extractFeatures(text, prompt);
    if (feats) {
      const present = new Set(derivePatterns(feats, text));
      let added = 0;
      for (const rule of learned) {
        if (added >= 2) break;                       // never let learned rules dominate
        if (!present.has(rule.target)) continue;
        if (suggestions.some(s => s.detail === rule.message)) continue;
        suggestions.push({
          id: `learned-${rule.id}`,
          category: rule.kind === 'caution' ? 'coherence' : 'narrative',
          severity: rule.kind === 'caution' ? 'caution' : 'praise',
          title: rule.kind === 'caution' ? 'Worth a second look' : 'A move strong essays share',
          detail: rule.message,
          learned: true,
        });
        added++;
      }
    }
  }

  // Order suggestions: cautions first, then tips, praise last.
  const sevRank: Record<CraftSeverity, number> = { caution: 0, tip: 1, praise: 2 };
  suggestions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  // Cap at 2 per category so one dimension can't crowd out the others, then
  // cap the whole list so the panel stays scannable.
  const perCategory = new Map<CraftCategory, number>();
  const balanced: CraftSuggestion[] = [];
  for (const s of suggestions) {
    const n = perCategory.get(s.category) || 0;
    if (n >= 2) continue;
    perCategory.set(s.category, n + 1);
    balanced.push(s);
  }

  return {
    ready: true,
    wordCount,
    readingGrade,
    theme,
    metrics,
    suggestions: balanced.slice(0, 9),
  };
}

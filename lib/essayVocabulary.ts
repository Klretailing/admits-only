/* ══════════════════════════════════════════════════════════════════════
   VOCABULARY ACCESSIBILITY

   The question this answers: an admissions officer has about two minutes
   with this essay. Do they take in every word on the first pass, or stall?

   WHY NOT SYLLABLE COUNTING
   The usual readability formulas (Flesch–Kincaid and friends) treat long
   words as hard words. That is the wrong axis:
     "basketball", "grandmother", "immediately" — long, understood instantly.
     "wan", "dour", "trope", "elide" — short, and many readers pause.
   Familiarity, not length, decides whether a reader stumbles.

   ─────────────────────────────────────────────────────────────────────
   THE DESIGN RULE, LEARNED THE HARD WAY

   The obvious build is a list of familiar words: anything missing from it
   is suspicious. That was tried here and it failed badly. Measured against
   the graded sample corpus it called "fingernails", "grandmother's",
   "understood", "absolutely", "invisible", "aluminum" and "thanksgiving"
   too complex, and it scored the exceptional essays WORSE than the weak
   ones. The reason is simple: English has thousands of long, common words,
   so every gap in the familiar list becomes a false accusation.

   So this module separates two jobs that have opposite error costs:

     NAMING A WORD  is done only from hand-curated lists. If a word is
                    called out to a student, it is because it appears on a
                    list somebody wrote on purpose. Precision is 100%; the
                    cost is that genuinely obscure words nobody listed slip
                    through. That is the right trade — a missed word is a
                    quiet loss, while telling a 17-year-old that
                    "fingernails" is too advanced destroys their trust in
                    every other note on the page.

     SCORING        may use aggregate statistics (syllable density, sentence
                    length), because in an average over hundreds of words an
                    individual misjudgement washes out. No student is ever
                    shown a per-word verdict derived from these.

   Anyone extending this: add words to the curated lists, and do not
   reintroduce "not in my dictionary, therefore hard".
   ─────────────────────────────────────────────────────────────────────

   RARE IS NOT THE SAME AS BAD
   A precise uncommon word can be the best word available. Two different
   things are reported:
     swap    — a fancy word with a plain everyday equivalent ("utilize" →
               "use"). Thesaurus reach: the actual common failure in college
               essays, and always worth fixing.
     stumble — an uncommon word with no easy substitute. Worth knowing a
               reader may slow down; not necessarily worth changing.

   And accessible is not the same as good. A clichéd, empty essay can score
   100 here — it is perfectly easy to read. This dial measures whether the
   words land, nothing more; the other metrics judge whether they are worth
   landing.
   ══════════════════════════════════════════════════════════════════════ */

export type VocabFlagKind = 'swap' | 'stumble';

export interface VocabFlag {
  word: string;
  kind: VocabFlagKind;
  /** A plainer everyday word. Present for 'swap' only. */
  simpler?: string;
  count: number;
  /** The first sentence the word appears in, for context. */
  sentence: string;
}

export interface VocabReport {
  ready: boolean;
  /** Accessibility score (0–100) driving the Readability dial. */
  score: number;
  contentWords: number;
  flags: VocabFlag[];
  /** Where a fast reader is most likely to stall: 2+ flagged words at once. */
  hardestSentence: { text: string; hits: string[] } | null;
  /** Sentences of 38+ words — the other way a two-minute reader loses the thread. */
  longSentences: number;
  /** Mean syllables per word. Aggregate only; never shown per word. */
  syllablesPerWord: number;
}

/* ─── helpers ─── */

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=["'“‘]?[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countSyllables(raw: string): number {
  let w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/** Candidate dictionary forms, so the curated lists can hold base forms and
    still match "obfuscated", "obfuscating", "banality". Only ever matched
    against curated sets, never used to decide that a word is unknown. */
function baseForms(w: string): string[] {
  const out = [w];
  const add = (s: string) => { if (s.length >= 3) out.push(s); };
  const dedouble = (s: string) => {
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) add(s.slice(0, -1));
  };
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) { const s = w.slice(0, -2); add(s); add(w.slice(0, -1)); dedouble(s); }
  if (w.endsWith('ing')) { const s = w.slice(0, -3); add(s); add(s + 'e'); dedouble(s); }
  if (w.endsWith('ily')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ly')) add(w.slice(0, -2));
  if (w.endsWith('ness')) add(w.slice(0, -4));
  if (w.endsWith('ity')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); }
  return out;
}

/* ─── curated list 1: thesaurus reach ───
   A fancy word paired with the plain one doing the same work. Inflections
   are spelled out rather than derived, because a wrong replacement is worse
   than a missed one. */
export const PLAIN_SWAPS: Record<string, string> = {
  utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using', utilization: 'use',
  endeavor: 'try', endeavors: 'efforts', endeavored: 'tried', endeavour: 'try', endeavours: 'efforts',
  commence: 'begin', commences: 'begins', commenced: 'began', commencing: 'beginning',
  ascertain: 'find out', ascertained: 'found out',
  facilitate: 'help', facilitates: 'helps', facilitated: 'helped', facilitating: 'helping',
  elucidate: 'explain', elucidated: 'explained',
  cognizant: 'aware', cognizance: 'awareness',
  myriad: 'many', myriads: 'many',
  plethora: 'plenty', ubiquitous: 'everywhere', ubiquity: 'constant presence',
  aforementioned: 'earlier', henceforth: 'from now on', heretofore: 'until now',
  subsequently: 'later', consequently: 'so', furthermore: 'also', moreover: 'also',
  notwithstanding: 'despite', therein: 'in it', thereof: 'of it', whereby: 'by which',
  multifaceted: 'many-sided',
  delve: 'dig', delved: 'dug', delving: 'digging',
  culminate: 'end', culminates: 'ends', culminated: 'ended', culmination: 'high point',
  juxtapose: 'contrast', juxtaposed: 'contrasted', juxtaposition: 'contrast',
  exemplify: 'show', exemplifies: 'shows', exemplified: 'showed',
  encapsulate: 'capture', encapsulates: 'captures', encapsulated: 'captured',
  garner: 'earn', garners: 'earns', garnered: 'earned',
  quintessential: 'perfect', epitome: 'height', epitomize: 'stand for', epitomized: 'stood for',
  perpetuate: 'keep alive', perpetuated: 'kept alive',
  ameliorate: 'improve', ameliorated: 'improved',
  propensity: 'tendency', erudite: 'learned', copious: 'plenty of',
  albeit: 'though', whilst: 'while', amongst: 'among',
  numerous: 'many', requisite: 'needed',
  obtain: 'get', obtained: 'got', obtaining: 'getting',
  reside: 'live', resided: 'lived', residing: 'living',
  inquire: 'ask', inquired: 'asked',
  terminate: 'end', terminated: 'ended',
  comprehend: 'understand', comprehended: 'understood',
  contemplate: 'think about', contemplated: 'thought about',
  cultivate: 'build', cultivated: 'built', cultivating: 'building',
  leverage: 'use', leveraged: 'used', leveraging: 'using',
  spearhead: 'lead', spearheaded: 'led',
  underscore: 'stress', underscored: 'stressed', underscores: 'stresses',
  augment: 'add to', augmented: 'added to',
  disseminate: 'spread', disseminated: 'spread',
  veritable: 'real', tantamount: 'equal', ostensibly: 'apparently',
  vociferous: 'loud', voracious: 'eager', tenacious: 'stubborn',
  arduous: 'hard', laborious: 'hard', onerous: 'heavy',
  nascent: 'new', burgeoning: 'growing', proliferate: 'spread',
  exacerbate: 'worsen', exacerbated: 'worsened',
  mitigate: 'ease', mitigated: 'eased',
  reiterate: 'repeat', reiterated: 'repeated',
  substantiate: 'back up', substantiated: 'backed up',
  necessitate: 'require', necessitated: 'required', necessitates: 'requires',
  antithetical: 'opposed', dichotomy: 'split',
  fervent: 'intense', fervor: 'intensity', fervour: 'intensity',
  unequivocally: 'clearly', immensely: 'greatly', tremendously: 'greatly',
  myopic: 'short-sighted', pontificate: 'lecture', pontificating: 'lecturing',
  esoteric: 'obscure', innocuous: 'harmless', ostentatious: 'showy',
  sagacious: 'wise', loquacious: 'talkative', gregarious: 'outgoing',
  meticulously: 'carefully', inexorably: 'steadily', inextricably: 'tightly',
  irrevocably: 'permanently', indubitably: 'certainly', palpably: 'clearly',
  utilizeable: 'usable', endeavoring: 'trying',
  transpire: 'happen', transpired: 'happened',
  elucidation: 'explanation', ramification: 'result', ramifications: 'results',
  predilection: 'preference', proclivity: 'tendency', penchant: 'liking',
  paradigmatic: 'typical', quotidian: 'everyday', pedagogical: 'teaching',
};

/* ─── curated list 2: words that make a fast reader pause ───
   Deliberately conservative. Anything an educated reader takes in without
   breaking stride ("nuance", "candor", "innate", "novel", "sober") is left
   off, even though it is uncommon-ish, because flagging it reads as
   pedantry and costs more trust than it earns. */
const STUMBLE_WORDS = new Set(`
abstruse abnegation acerbic acrimony adumbrate alacrity anachronistic
anodyne antediluvian apotheosis approbation arcane assiduous atavistic
avuncular bellicose bombastic bowdlerize bucolic byzantine cacophony
calumny canard captious castigate chicanery churlish circumlocution
coalesce comport concomitant conflate contumacious craven cupidity
declaim defenestrate deleterious demarcate denouement desultory diaphanous
diffident dilatory disabuse discomfit disparate dissemble dissolution
doughty draconian ebullient eclat edifice effervescent efficacious effrontery
egregious elegiac elide emollient enervate ephemeral epistemic equanimity
equivocate eschew evanescent excoriate execrable exegesis exigent expiate
extirpate fatuous fecund felicitous flagitious florid foment fractious
fulsome fungible garrulous grandiloquent gustatory halcyon harangue
hegemony heterodox hidebound histrionic hortatory iconoclast idiosyncratic
ignominious imbroglio immutable impecunious imperious impetuous implacable
importune imprecation improvident inchoate incontrovertible inculcate
indefatigable ineffable ineluctable inimical iniquity insouciant
intransigent inured invective inveigh irascible jejune jocose lachrymose
laconic lambent languid lassitude latitudinarian legerdemain licentious
limpid litany lugubrious macerate magnanimous maladroit malfeasance
martinet mawkish mellifluous mendacious mercurial meretricious minatory
misanthrope moribund munificent nadir nefarious neophyte nescient
noisome nugatory obdurate obfuscate obloquy obsequious obstreperous
obviate occlude odious officious opprobrium ossify palliate panegyric
parsimonious pastiche paucity peccadillo pellucid penurious peregrination
perfidious perfunctory pernicious perspicacious pertinacious petulant
philippic phlegmatic pillory pithy platitudinous plenary polemic
portentous postulate prevaricate probity proclivity profligate prolix
propitious protean provenance puerile pugnacious pusillanimous quiescent
quixotic quotidian ratiocinate recalcitrant recondite redoubtable
refractory remonstrate reprobate rescind restive reticent risible
rubicund ruminate salubrious sanctimonious sardonic saturnine schadenfreude
sedulous sententious sinecure solipsistic soporific specious splenetic
stentorian stultify stygian suborn supercilious supine surfeit sycophant
tautological temerity tendentious timorous torpid tortuous tractable
transmogrify trenchant truculent turgid turpitude ubiquitous ultracrepidarian
umbrage unctuous untenable vacuous vainglorious vapid variegated
venal veracity verbose verdant vicissitude vilify vitiate vituperate
volubility voluble winnow zeitgeist
wan dour sate trope chary ennui bathos cadre milieu
ersatz foible gambit guile hubris inane ilk kismet largesse maudlin
morass obtuse pallid paltry parry pique prosaic quell rancor redolent
replete respite sordid staid stoic tacit tepid terse tumult
`.trim().split(/\s+/));

/** Letters, including accented ones, so "quinceañera" and "tajín" survive
    tokenising as single words instead of being split into fragments. */
const NON_LETTER = /[^\p{L}'’-]/gu;

/* ─── analysis ─── */

export function analyzeVocabulary(rawText: string, prompt?: string): VocabReport {
  const text = (rawText || '').trim();
  const empty: VocabReport = {
    ready: false, score: 100, contentWords: 0,
    flags: [], hardestSentence: null, longSentences: 0, syllablesPerWord: 0,
  };
  if (!text) return empty;

  const sentences = splitSentences(text);
  if (!sentences.length) return empty;

  // Words the prompt introduced are the assigned subject, not the writer
  // reaching for effect.
  const promptWords = new Set<string>();
  for (const w of (prompt || '').toLowerCase().match(/[\p{L}']+/gu) || []) {
    for (const b of baseForms(w)) promptWords.add(b);
  }

  // Capitalised anywhere but a sentence start is almost always a name.
  const properNouns = new Set<string>();
  for (const s of sentences) {
    s.split(/\s+/).forEach((tok, i) => {
      const bare = tok.replace(NON_LETTER, '');
      if (i > 0 && /^\p{Lu}/u.test(bare) && bare.length > 1) properNouns.add(bare.toLowerCase());
    });
  }

  interface Hit { kind: VocabFlagKind; simpler?: string; count: number; sentence: string }
  const hits = new Map<string, Hit>();
  let contentWords = 0;
  let syllableTotal = 0;
  let longSentences = 0;
  const perSentence: { text: string; hits: string[] }[] = [];

  for (const sentence of sentences) {
    const tokens = sentence.split(/\s+/);
    if (tokens.filter((t) => /[\p{L}\d]/u.test(t)).length >= 38) longSentences++;
    const sentenceHits: string[] = [];

    for (const tok of tokens) {
      if (/\d/.test(tok)) continue;
      const cleaned = tok.replace(NON_LETTER, '');
      if (!cleaned) continue;
      // Strip possessives and stray quotes: "grandmother's" → "grandmother".
      const lower = cleaned.toLowerCase().replace(/['’]s$/, '').replace(/^['’]+|['’]+$/g, '');
      if (lower.length < 3) continue;

      contentWords++;
      syllableTotal += countSyllables(lower);

      if (properNouns.has(lower) || promptWords.has(lower)) continue;

      let kind: VocabFlagKind | null = null;
      let simpler: string | undefined;

      const forms = baseForms(lower);
      for (const f of forms) {
        if (PLAIN_SWAPS[f]) { kind = 'swap'; simpler = PLAIN_SWAPS[f]; break; }
      }
      if (!kind) {
        for (const f of forms) {
          if (STUMBLE_WORDS.has(f)) { kind = 'stumble'; break; }
        }
      }
      if (!kind) continue;

      sentenceHits.push(lower);
      const existing = hits.get(lower);
      if (existing) existing.count++;
      else hits.set(lower, { kind, simpler, count: 1, sentence });
    }

    if (sentenceHits.length) perSentence.push({ text: sentence, hits: sentenceHits });
  }

  if (contentWords < 40) return { ...empty, contentWords };

  /* A stumble word leaned on three or more times is the essay's subject, not
     a flourish — an essay about ephemerality will say "ephemeral". Swaps get
     no such mercy: repeatedly writing "utilize" is a habit worth breaking. */
  const flags: VocabFlag[] = [];
  for (const [word, h] of hits) {
    if (h.kind === 'stumble' && h.count >= 3) continue;
    flags.push({ word, kind: h.kind, simpler: h.simpler, count: h.count, sentence: h.sentence });
  }
  flags.sort((a, b) => (a.kind === b.kind ? b.count - a.count : a.kind === 'swap' ? -1 : 1));

  /* Keep room for both kinds. Sorted swaps-first, a heavily over-written
     essay would otherwise fill the whole list and hide every stumble word. */
  const shown = [
    ...flags.filter((f) => f.kind === 'swap').slice(0, 8),
    ...flags.filter((f) => f.kind === 'stumble').slice(0, 4),
  ];

  const syllablesPerWord = Math.round((syllableTotal / contentWords) * 100) / 100;

  /* Rates are per 100 words, but the denominator has a floor. Without it a
     200-word supplemental with three reaches is scored as harshly as a
     650-word essay with ten, because the same count over a third of the
     length triples the rate. The floor keeps short drafts — which is most
     of what students paste in mid-write — on the same footing. */
  const effectiveWords = Math.max(contentWords, 250);
  const per100 = (n: number) => (n / effectiveWords) * 100;
  const swaps = flags.filter((f) => f.kind === 'swap').reduce((n, f) => n + f.count, 0);
  const stumbles = flags.filter((f) => f.kind === 'stumble').reduce((n, f) => n + f.count, 0);

  /* Aggregate density is allowed to move the score because an average over
     hundreds of words absorbs individual misjudgements. Ordinary narrative
     prose sits near 1.4–1.6 syllables per word; sustained density above 1.8
     is what actually slows a reader down. */
  const densityPenalty = Math.min(20, Math.max(0, syllablesPerWord - 1.8) * 90);

  let score = 100
    - per100(swaps) * 20            // thesaurus reach: the real problem
    - per100(stumbles) * 10         // uncommon, but possibly the right word
    - Math.min(12, longSentences * 4)
    - densityPenalty;
  score = Math.max(5, Math.min(100, Math.round(score)));

  let hardestSentence: VocabReport['hardestSentence'] = null;
  for (const s of perSentence) {
    if (s.hits.length >= 2 && (!hardestSentence || s.hits.length > hardestSentence.hits.length)) {
      hardestSentence = { text: s.text, hits: s.hits };
    }
  }

  return {
    ready: true,
    score,
    contentWords,
    flags: shown,
    hardestSentence,
    longSentences,
    syllablesPerWord,
  };
}

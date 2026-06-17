/* ══════════════════════════════════════════════════════════════════════
   ESSAY INSIGHTS ENGINE
   Provides multi-dimensional analysis of college application essays:
   1. Tense consistency across paragraphs
   2. Unsupported claims detection
   3. Word repetition analysis
   4. Paragraph opening flow
   5. Prompt alignment scoring
   6. "Show don't tell" detection

   All analysis uses simple string matching and regex — no external
   dependencies required.
   ══════════════════════════════════════════════════════════════════════ */

export interface EssayInsights {
  tenseShifts: { paragraph: number; dominant: string; shifted: string; sentence: string }[];
  unsupportedClaims: { sentence: string; start: number; end: number; claimType: string }[];
  overusedWords: { word: string; count: number; positions: number[] }[];
  repetitiveOpenings: { paragraphs: number[]; opening: string }[];
  promptAlignment: { score: number; found: string[]; missing: string[] } | null;
  showDontTell: { sentence: string; start: number; end: number; emotion: string }[];
}

/* ─── Stop words ───
   Comprehensive list used by repetition analysis and prompt alignment.
   These are filtered out before counting word frequency. */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'must', 'of', 'in', 'to',
  'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because',
  'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these', 'those',
  'my', 'me', 'i', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'his', 'her', 'its', 'their', 'what', 'which', 'who',
  'whom', 'also', 'like', 'even', 'really', 'actually', 'basically',
  'thing', 'things', 'many', 'much', 'well', 'still', 'back', 'going',
  'went', 'come', 'came', 'said', 'make', 'made', 'know', 'knew',
  'think', 'thought', 'take', 'took', 'get', 'got', 'want', 'wanted',
  'see', 'saw', 'time', 'way', 'people', 'good', 'new', 'first', 'one',
  'two',
]);

/* ─── Shared helpers ─── */

/** Split text into paragraphs on double newlines. */
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

/** Split text into sentences using common punctuation boundaries. */
function splitSentences(text: string): string[] {
  // Split on period, question mark, or exclamation mark followed by a space
  // or end of string, keeping the delimiter with the sentence.
  const raw = text.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!raw) return [text.trim()].filter(Boolean);
  return raw.map((s) => s.trim()).filter(Boolean);
}

/** Strip punctuation from a word for tokenization. */
function stripPunctuation(word: string): string {
  return word.replace(/[^a-zA-Z0-9'-]/g, '').replace(/^'+|'+$/g, '');
}

/* ══════════════════════════════════════════════════════════════════════
   1. TENSE CONSISTENCY
   Detects paragraphs whose dominant tense differs from the essay's
   overall dominant tense.
   ══════════════════════════════════════════════════════════════════════ */

/** Irregular past tense verbs to detect via whole-word matching. */
const PAST_TENSE_WORDS = new Set([
  'was', 'were', 'had', 'did', 'went', 'came', 'saw', 'felt', 'thought',
  'knew', 'took', 'made', 'ran', 'said', 'told', 'gave', 'found', 'got',
  'left', 'heard', 'began', 'kept', 'stood', 'became', 'brought', 'wrote',
  'lost', 'spent', 'built', 'caught', 'sat',
]);

/** Present tense indicators detected via whole-word matching. */
const PRESENT_TENSE_WORDS = new Set([
  'is', 'are', 'am', 'do', 'does', 'has',
]);

/**
 * Classify a single sentence as 'past', 'present', or 'unknown'.
 * Counts past vs present indicators and picks the majority.
 */
function classifySentenceTense(sentence: string): 'past' | 'present' | 'unknown' {
  const words = sentence.toLowerCase().split(/\s+/);
  let pastCount = 0;
  let presentCount = 0;

  for (let i = 0; i < words.length; i++) {
    const w = stripPunctuation(words[i]);

    // Past tense irregular verbs
    if (PAST_TENSE_WORDS.has(w)) {
      pastCount++;
      continue;
    }

    // Regular past tense: words ending in -ed (but not common non-verb -ed words)
    if (w.length > 3 && w.endsWith('ed') && !['need', 'seed', 'feed', 'speed'].includes(w)) {
      pastCount++;
      continue;
    }

    // Present tense words
    if (PRESENT_TENSE_WORDS.has(w)) {
      // "have" is present unless followed by "been" (which makes it past/perfect)
      if (w === 'has' || w === 'have') {
        const next = i + 1 < words.length ? stripPunctuation(words[i + 1]) : '';
        if (next === 'been') {
          pastCount++;
          continue;
        }
      }
      presentCount++;
      continue;
    }

    // "have" as standalone present tense (not "have been")
    if (w === 'have') {
      const next = i + 1 < words.length ? stripPunctuation(words[i + 1]) : '';
      if (next === 'been') {
        pastCount++;
      } else {
        presentCount++;
      }
      continue;
    }

    // Third-person present tense: verbs ending in -s (heuristic — not all
    // -s words are verbs, but this is a reasonable approximation)
    if (
      w.length > 3 &&
      w.endsWith('s') &&
      !w.endsWith('ss') &&
      !w.endsWith('us') &&
      !w.endsWith('is') &&
      !w.endsWith("'s")
    ) {
      // Very rough heuristic: only count common verb-like -s endings
      // Skip obvious nouns by checking against common noun suffixes
      if (!w.endsWith('ness') && !w.endsWith('ments') && !w.endsWith('ions')) {
        presentCount++;
      }
    }
  }

  if (pastCount === 0 && presentCount === 0) return 'unknown';
  if (pastCount > presentCount) return 'past';
  if (presentCount > pastCount) return 'present';
  return 'unknown';
}

/** Determine the dominant tense from an array of tense classifications. */
function dominantTense(tenses: ('past' | 'present' | 'unknown')[]): 'past' | 'present' {
  let past = 0;
  let present = 0;
  for (const t of tenses) {
    if (t === 'past') past++;
    else if (t === 'present') present++;
  }
  return past >= present ? 'past' : 'present';
}

function analyzeTenseShifts(
  text: string,
): EssayInsights['tenseShifts'] {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length < 2) return [];

  // Classify every sentence in the essay to find the overall dominant tense.
  const allTenses: ('past' | 'present' | 'unknown')[] = [];
  const paraData: { sentences: string[]; tenses: ('past' | 'present' | 'unknown')[] }[] = [];

  for (const para of paragraphs) {
    const sentences = splitSentences(para);
    const tenses = sentences.map(classifySentenceTense);
    paraData.push({ sentences, tenses });
    allTenses.push(...tenses);
  }

  const essayDominant = dominantTense(allTenses);
  const results: EssayInsights['tenseShifts'] = [];

  for (let i = 0; i < paraData.length; i++) {
    const { sentences, tenses } = paraData[i];
    const paraDominant = dominantTense(tenses);

    if (paraDominant !== essayDominant) {
      // Find the first sentence in this paragraph that has the shifted tense.
      const shiftedSentence =
        sentences.find((_, idx) => tenses[idx] === paraDominant) || sentences[0];

      results.push({
        paragraph: i,
        dominant: essayDominant,
        shifted: paraDominant,
        sentence: shiftedSentence,
      });
    }
  }

  return results;
}

/* ══════════════════════════════════════════════════════════════════════
   2. CLAIM WITHOUT EVIDENCE
   Flags sentences that make strong claims about character traits or
   passions without supporting them with concrete specifics.
   ══════════════════════════════════════════════════════════════════════ */

/** Claim keywords that signal a potentially unsupported assertion. */
const CLAIM_KEYWORDS = [
  'love', 'passionate', 'dedicated', 'committed', 'fascinated', 'driven',
  'inspired', 'deeply care', 'always been', 'always wanted', 'truly believe',
  'strongly feel', 'my passion', 'my dedication', 'my commitment',
];

/**
 * Check whether a sentence contains concrete specifics:
 * proper nouns, numbers/dates, quotes, or specific time references.
 */
function hasSpecifics(sentence: string): boolean {
  // Numbers or dates
  if (/\d+/.test(sentence)) return true;

  // Quoted text
  if (/"/.test(sentence)) return true;

  // Proper nouns: capitalized words (3+ chars) that are not at the start of a sentence.
  // We look for capitalized words after the first word.
  const words = sentence.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const cleaned = stripPunctuation(words[i]);
    if (cleaned.length >= 3 && /^[A-Z]/.test(cleaned)) {
      return true;
    }
  }

  return false;
}

function analyzeUnsupportedClaims(
  text: string,
): EssayInsights['unsupportedClaims'] {
  const sentences = splitSentences(text);
  const results: EssayInsights['unsupportedClaims'] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const lowerSentence = sentence.toLowerCase();

    // Check for each claim keyword.
    for (const keyword of CLAIM_KEYWORDS) {
      if (lowerSentence.includes(keyword)) {
        // Check if the sentence AND the next sentence (if any) lack specifics.
        const currentHasSpecifics = hasSpecifics(sentence);
        const nextHasSpecifics =
          i + 1 < sentences.length ? hasSpecifics(sentences[i + 1]) : false;

        if (!currentHasSpecifics && !nextHasSpecifics) {
          const start = text.indexOf(sentence);
          const end = start + sentence.length;

          results.push({
            sentence,
            start,
            end,
            claimType: keyword,
          });
          // Only report the first matching keyword per sentence.
          break;
        }
      }
    }
  }

  return results;
}

/* ══════════════════════════════════════════════════════════════════════
   3. REPETITION ANALYSIS
   Finds overused content words (excluding stop words and short words).
   Returns the top 5 words used 3+ times with their character positions.
   ══════════════════════════════════════════════════════════════════════ */

function analyzeOverusedWords(
  text: string,
): EssayInsights['overusedWords'] {
  const words = text.split(/\s+/);
  const counts = new Map<string, { count: number; positions: number[] }>();

  // Track our position in the original text to record character offsets.
  let searchFrom = 0;

  for (const rawWord of words) {
    const cleaned = stripPunctuation(rawWord).toLowerCase();

    // Skip short words and stop words.
    if (cleaned.length < 4) continue;
    if (STOP_WORDS.has(cleaned)) continue;

    // Find the position of this word occurrence in the original text.
    const pos = text.toLowerCase().indexOf(cleaned, searchFrom);

    if (!counts.has(cleaned)) {
      counts.set(cleaned, { count: 0, positions: [] });
    }
    const entry = counts.get(cleaned)!;
    entry.count++;
    if (pos !== -1) {
      entry.positions.push(pos);
    }

    // Advance the search cursor past this word.
    if (pos !== -1) {
      searchFrom = pos + cleaned.length;
    }
  }

  // Filter to words used 3+ times and take the top 5 by count.
  const results: EssayInsights['overusedWords'] = [];
  for (const [word, data] of counts) {
    if (data.count >= 3) {
      results.push({ word, count: data.count, positions: data.positions });
    }
  }

  results.sort((a, b) => b.count - a.count);
  return results.slice(0, 5);
}

/* ══════════════════════════════════════════════════════════════════════
   4. PARAGRAPH FLOW ANALYSIS
   Detects paragraphs that begin with the same opening word, which can
   create monotonous flow.
   ══════════════════════════════════════════════════════════════════════ */

function analyzeRepetitiveOpenings(
  text: string,
): EssayInsights['repetitiveOpenings'] {
  const paragraphs = splitParagraphs(text);
  const openingGroups = new Map<string, number[]>();

  for (let i = 0; i < paragraphs.length; i++) {
    const trimmed = paragraphs[i].trim();
    if (!trimmed) continue;

    // Extract the first word.
    const firstWord = trimmed.split(/\s+/)[0];
    const key = stripPunctuation(firstWord).toLowerCase();
    if (!key) continue;

    if (!openingGroups.has(key)) {
      openingGroups.set(key, []);
    }
    openingGroups.get(key)!.push(i);
  }

  const results: EssayInsights['repetitiveOpenings'] = [];
  for (const [opening, paragraphIndices] of openingGroups) {
    if (paragraphIndices.length >= 2) {
      results.push({ paragraphs: paragraphIndices, opening });
    }
  }

  return results;
}

/* ══════════════════════════════════════════════════════════════════════
   5. PROMPT ALIGNMENT
   If a prompt is provided, checks how well the essay addresses the
   prompt's key topics by comparing keyword overlap.
   ══════════════════════════════════════════════════════════════════════ */

function analyzePromptAlignment(
  text: string,
  prompt?: string,
): EssayInsights['promptAlignment'] {
  // Return null if no prompt or prompt is too short.
  if (!prompt || prompt.trim().length < 10) return null;

  // Extract meaningful keywords from the prompt.
  const promptWords = prompt
    .toLowerCase()
    .split(/\s+/)
    .map((w) => stripPunctuation(w))
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  // Deduplicate prompt keywords.
  const uniqueKeywords = [...new Set(promptWords)];
  if (uniqueKeywords.length === 0) return null;

  const lowerText = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];

  for (const keyword of uniqueKeywords) {
    if (lowerText.includes(keyword)) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  // Score: percentage of prompt keywords found in the essay, 0–100.
  const rawScore = Math.round((found.length / uniqueKeywords.length) * 100);
  const score = Math.max(0, Math.min(100, rawScore));

  return { score, found, missing };
}

/* ══════════════════════════════════════════════════════════════════════
   6. SHOW DON'T TELL DETECTION
   Flags sentences that state emotions directly ("I felt happy") rather
   than showing them through action, imagery, or dialogue.
   ══════════════════════════════════════════════════════════════════════ */

/** Adjective list for "I felt/was/became/grew/was so <adj>" patterns. */
const EMOTION_ADJECTIVES = [
  'happy', 'sad', 'angry', 'proud', 'nervous', 'excited', 'grateful',
  'thankful', 'inspired', 'motivated', 'anxious', 'frustrated',
  'overwhelmed', 'disappointed', 'confused', 'scared', 'afraid', 'lonely',
  'embarrassed', 'ashamed', 'guilty', 'jealous', 'hopeful', 'relieved',
  'content', 'satisfied', 'joyful', 'devastated', 'heartbroken',
  'furious', 'terrified', 'elated', 'ecstatic', 'miserable', 'depressed',
  'worried', 'stressed', 'calm', 'peaceful', 'determined', 'confident',
  'insecure', 'uncomfortable', 'awkward',
].join('|');

/** Noun list for "I was filled with / overcome with/by <noun>" patterns. */
const EMOTION_NOUNS = [
  'joy', 'sadness', 'anger', 'pride', 'fear', 'excitement', 'gratitude',
  'anxiety', 'frustration', 'hope', 'relief', 'shame', 'guilt',
  'jealousy', 'confidence', 'determination', 'dread', 'sorrow', 'rage',
  'happiness', 'love', 'hatred', 'despair', 'terror', 'wonder', 'awe',
  'disgust', 'envy', 'contentment', 'loneliness', 'embarrassment',
  'regret', 'resentment',
].join('|');

/**
 * Build the "show don't tell" regex patterns.
 * Each pattern captures the emotion word in a named group.
 */
function buildShowDontTellPatterns(): RegExp[] {
  return [
    new RegExp(`\\bI felt (${EMOTION_ADJECTIVES})\\b`, 'gi'),
    new RegExp(`\\bI was (${EMOTION_ADJECTIVES})\\b`, 'gi'),
    new RegExp(`\\bI became (${EMOTION_ADJECTIVES})\\b`, 'gi'),
    new RegExp(`\\bI grew (${EMOTION_ADJECTIVES})\\b`, 'gi'),
    new RegExp(`\\bIt made me (${EMOTION_ADJECTIVES})\\b`, 'gi'),
    new RegExp(`\\bI was filled with (${EMOTION_NOUNS})\\b`, 'gi'),
    new RegExp(`\\bI was overcome (?:with|by) (${EMOTION_NOUNS})\\b`, 'gi'),
    new RegExp(`\\bI was so (${EMOTION_ADJECTIVES})\\b`, 'gi'),
  ];
}

/**
 * Find the sentence boundaries around a match position.
 * Returns the full sentence text and its start/end offsets.
 */
function findSentenceBounds(text: string, matchStart: number): { sentence: string; start: number; end: number } {
  // Walk backward to find sentence start.
  let start = matchStart;
  while (start > 0 && !/[.!?]/.test(text[start - 1])) {
    start--;
  }
  // Skip whitespace at the start.
  while (start < text.length && /\s/.test(text[start])) {
    start++;
  }

  // Walk forward to find sentence end.
  let end = matchStart;
  while (end < text.length && !/[.!?]/.test(text[end])) {
    end++;
  }
  // Include the terminating punctuation.
  if (end < text.length) end++;

  return {
    sentence: text.slice(start, end).trim(),
    start,
    end,
  };
}

function analyzeShowDontTell(
  text: string,
): EssayInsights['showDontTell'] {
  const patterns = buildShowDontTellPatterns();
  const results: EssayInsights['showDontTell'] = [];
  const seenStarts = new Set<number>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    // Reset the regex for each full scan.
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      const emotion = match[1].toLowerCase();
      const { sentence, start, end } = findSentenceBounds(text, match.index);

      // Avoid duplicate entries for the same sentence.
      if (!seenStarts.has(start)) {
        seenStarts.add(start);
        results.push({ sentence, start, end, emotion });
      }
    }
  }

  // Sort by position in the text.
  results.sort((a, b) => a.start - b.start);
  return results;
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Analyze an essay and return multi-dimensional insights including tense
 * consistency, unsupported claims, word repetition, paragraph flow,
 * prompt alignment, and show-don't-tell detection.
 *
 * @param text  - The full essay text to analyze.
 * @param prompt - Optional essay prompt to check alignment against.
 * @returns An EssayInsights object with all analysis results.
 */
export function analyzeEssayInsights(text: string, prompt?: string): EssayInsights {
  return {
    tenseShifts: analyzeTenseShifts(text),
    unsupportedClaims: analyzeUnsupportedClaims(text),
    overusedWords: analyzeOverusedWords(text),
    repetitiveOpenings: analyzeRepetitiveOpenings(text),
    promptAlignment: analyzePromptAlignment(text, prompt),
    showDontTell: analyzeShowDontTell(text),
  };
}

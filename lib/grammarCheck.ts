/* ══════════════════════════════════════════════════════════════════════
   GRAMMAR CHECK ENGINE
   Detects grammar errors and stylistic optimizations in essay content.
   Returns ranked suggestions with character offsets so the editor can
   render numbered highlights and a sidebar of one-click fixes.

   Priority order: 1) ERRORS first   2) OPTIMIZATIONS second
   ══════════════════════════════════════════════════════════════════════ */

export type IssueSeverity = 'error' | 'optimization';

export type IssueCategory =
  | 'spelling'
  | 'punctuation'
  | 'capitalization'
  | 'agreement'
  | 'spacing'
  | 'article'
  | 'wordiness'
  | 'cliche'
  | 'weak_word'
  | 'passive'
  | 'redundancy'
  | 'contraction'
  | 'repetition';

export interface GrammarIssue {
  id: string;
  start: number;          // char offset in original text
  end: number;            // exclusive
  original: string;       // original substring
  replacement: string;    // suggested replacement
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;          // short label
  message: string;        // explanation
}

/* ─── Common confused / misspelled words ─── */
const SPELLING_MAP: Array<[RegExp, string, string]> = [
  [/\bteh\b/gi, 'the', 'Common typo for "the".'],
  [/\brecieve(d|s|r)?\b/gi, 'receive$1', '"i" before "e" except after "c".'],
  [/\bdefinately\b/gi, 'definitely', 'Misspelling of "definitely".'],
  [/\boccured\b/gi, 'occurred', '"Occurred" is spelled with two r\u2019s.'],
  [/\bseperat(e|ed|ion)\b/gi, 'separat$1', '"Separate" is spelled with an "a" in the middle.'],
  [/\bbegining\b/gi, 'beginning', '"Beginning" has two n\u2019s.'],
  [/\bbelive(d|s)?\b/gi, 'believe$1', 'Misspelling of "believe".'],
  [/\balot\b/gi, 'a lot', '"A lot" is two words.'],
  [/\balright\b/gi, 'all right', '"All right" is preferred in formal writing.'],
  [/\bwich\b/gi, 'which', 'Did you mean "which"?'],
  [/\bthier\b/gi, 'their', 'Misspelling of "their".'],
  [/\boccassion(s|al|ally)?\b/gi, 'occasion$1', '"Occasion" has two c\u2019s and one s.'],
  [/\baccomodate\b/gi, 'accommodate', '"Accommodate" has two c\u2019s and two m\u2019s.'],
  [/\bembarass(ed|ing|ment)?\b/gi, 'embarrass$1', '"Embarrass" has two r\u2019s and two s\u2019s.'],
  [/\bnoticable\b/gi, 'noticeable', '"Noticeable" keeps the "e".'],
  [/\bgrammer\b/gi, 'grammar', 'Misspelling of "grammar".'],
  [/\bjudgement\b/gi, 'judgment', '"Judgment" is preferred in American English.'],
];

/* ─── Confused word pairs (context-sensitive) ─── */
const CONFUSED_PAIRS: Array<{ pattern: RegExp; replacement: string; title: string; message: string }> = [
  { pattern: /\bits\s+(been|going|getting|important|clear|the\s+\w+)/gi, replacement: "it\u2019s $1", title: 'its \u2192 it\u2019s', message: '"It\u2019s" is the contraction of "it is".' },
  { pattern: /\byour\s+(welcome|right|wrong|going|the\s+\w+)/gi, replacement: 'you\u2019re $1', title: 'your \u2192 you\u2019re', message: '"You\u2019re" is the contraction of "you are".' },
  { pattern: /\bthere\s+(going|coming|the\s+\w+)/gi, replacement: 'they\u2019re $1', title: 'there \u2192 they\u2019re', message: '"They\u2019re" is the contraction of "they are".' },
  { pattern: /\bwould\s+of\b/gi, replacement: 'would have', title: '"would of" \u2192 "would have"', message: 'The phrase is "would have", not "would of".' },
  { pattern: /\bcould\s+of\b/gi, replacement: 'could have', title: '"could of" \u2192 "could have"', message: 'The phrase is "could have", not "could of".' },
  { pattern: /\bshould\s+of\b/gi, replacement: 'should have', title: '"should of" \u2192 "should have"', message: 'The phrase is "should have", not "should of".' },
  { pattern: /\balot\s+of\b/gi, replacement: 'many', title: '"alot of" \u2192 "many"', message: 'Replace with a more precise quantifier.' },
];

/* ─── Wordy phrases (optimizations) ─── */
const WORDY_PHRASES: Array<[RegExp, string]> = [
  [/\bin\s+order\s+to\b/gi, 'to'],
  [/\bdue\s+to\s+the\s+fact\s+that\b/gi, 'because'],
  [/\bat\s+this\s+point\s+in\s+time\b/gi, 'now'],
  [/\bin\s+spite\s+of\s+the\s+fact\s+that\b/gi, 'although'],
  [/\bin\s+the\s+event\s+that\b/gi, 'if'],
  [/\bfor\s+the\s+purpose\s+of\b/gi, 'for'],
  [/\bwith\s+regard\s+to\b/gi, 'about'],
  [/\bin\s+terms\s+of\b/gi, 'in'],
  [/\ba\s+majority\s+of\b/gi, 'most'],
  [/\bthe\s+fact\s+that\b/gi, 'that'],
  [/\bis\s+able\s+to\b/gi, 'can'],
  [/\bare\s+able\s+to\b/gi, 'can'],
  [/\bhas\s+the\s+ability\s+to\b/gi, 'can'],
  [/\bin\s+my\s+opinion\b/gi, ''],
  [/\bit\s+is\s+important\s+to\s+note\s+that\b/gi, ''],
  [/\bvery\s+unique\b/gi, 'unique'],
  [/\bcompletely\s+eliminate\b/gi, 'eliminate'],
  [/\bend\s+result\b/gi, 'result'],
  [/\bfinal\s+outcome\b/gi, 'outcome'],
  [/\bpast\s+history\b/gi, 'history'],
  [/\bclose\s+proximity\b/gi, 'proximity'],
  [/\beach\s+and\s+every\b/gi, 'every'],
  [/\bfirst\s+and\s+foremost\b/gi, 'first'],
  [/\bnone\s+of\s+the\s+above\b/gi, 'none'],
];

/* ─── Cliché phrases ─── */
const CLICHES: RegExp[] = [
  /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bthink\s+outside\s+the\s+box\b/gi,
  /\bgive\s+\d*%\s*percent\b/gi,
  /\bgive\s+it\s+my\s+all\b/gi,
  /\bpassion\s+for\s+learning\b/gi,
  /\bever\s+since\s+I\s+was\s+(a\s+)?(little|young|small)\s+(kid|child|girl|boy)\b/gi,
  /\bchanged\s+my\s+life\b/gi,
  /\bmade\s+me\s+who\s+I\s+am\s+today\b/gi,
  /\bin\s+today\u2019?s\s+(society|world)\b/gi,
];

/* ─── Weak intensifiers ─── */
const WEAK_INTENSIFIERS = /\b(very|really|quite|pretty|actually|basically|literally|just|kind\s+of|sort\s+of)\s+(\w+)/gi;

/* ─── Helpers ─── */
function makeId(start: number, end: number, cat: string): string {
  return `${cat}_${start}_${end}`;
}

function ranges(text: string, regex: RegExp): Array<{ start: number; end: number; match: string }> {
  const out: Array<{ start: number; end: number; match: string }> = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, match: m[0] });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

function applyReplacement(original: string, replacement: string): string {
  // Preserve initial capitalization
  if (!original) return replacement;
  if (original[0] === original[0].toUpperCase() && replacement[0] && replacement[0] !== replacement[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/* ─── Main checker ─── */
export function checkGrammar(text: string): GrammarIssue[] {
  if (!text || text.length < 4) return [];
  const issues: GrammarIssue[] = [];

  /* ─── ERRORS ─── */

  // 1. Spelling
  for (const [pattern, replacement, message] of SPELLING_MAP) {
    for (const r of ranges(text, pattern)) {
      const fixed = r.match.replace(pattern, replacement);
      issues.push({
        id: makeId(r.start, r.end, 'sp'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: applyReplacement(r.match, fixed),
        severity: 'error',
        category: 'spelling',
        title: 'Spelling',
        message,
      });
    }
  }

  // 2. Confused words
  for (const cp of CONFUSED_PAIRS) {
    for (const r of ranges(text, cp.pattern)) {
      const fixed = r.match.replace(cp.pattern, cp.replacement);
      issues.push({
        id: makeId(r.start, r.end, 'cw'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: applyReplacement(r.match, fixed),
        severity: 'error',
        category: 'spelling',
        title: cp.title,
        message: cp.message,
      });
    }
  }

  // 3. Double space
  for (const r of ranges(text, /  +/g)) {
    issues.push({
      id: makeId(r.start, r.end, 'ds'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: ' ',
      severity: 'error',
      category: 'spacing',
      title: 'Extra spaces',
      message: 'Use a single space between words.',
    });
  }

  // 4. Space before punctuation
  for (const r of ranges(text, /\s+([,.!?;:])/g)) {
    issues.push({
      id: makeId(r.start, r.end, 'sbp'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match.trim(),
      severity: 'error',
      category: 'punctuation',
      title: 'Space before punctuation',
      message: 'Remove the space before punctuation.',
    });
  }

  // 5. Missing space after punctuation (lowercase next letter, not decimal)
  for (const r of ranges(text, /([,.!?;:])([A-Za-z])/g)) {
    // skip decimals like 3.14
    if (/\d/.test(text[r.start - 1] || '') && r.match[0] === '.' && /\d/.test(r.match[1])) continue;
    issues.push({
      id: makeId(r.start, r.end, 'msap'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match[0] + ' ' + r.match[1],
      severity: 'error',
      category: 'spacing',
      title: 'Missing space',
      message: 'Add a space after punctuation.',
    });
  }

  // 6. Lowercase "i" as a pronoun
  for (const r of ranges(text, /(^|[^A-Za-z'])i(\s|'|$)/g)) {
    // Find the "i" exactly
    const iPos = r.start + r.match.indexOf('i');
    issues.push({
      id: makeId(iPos, iPos + 1, 'capi'),
      start: iPos,
      end: iPos + 1,
      original: 'i',
      replacement: 'I',
      severity: 'error',
      category: 'capitalization',
      title: 'Capitalize "I"',
      message: 'The pronoun "I" is always capitalized.',
    });
  }

  // 7. Sentence start capitalization (after . ! ?)
  for (const r of ranges(text, /([.!?])\s+([a-z])/g)) {
    const letterPos = r.start + r.match.length - 1;
    issues.push({
      id: makeId(letterPos, letterPos + 1, 'capS'),
      start: letterPos,
      end: letterPos + 1,
      original: r.match[r.match.length - 1],
      replacement: r.match[r.match.length - 1].toUpperCase(),
      severity: 'error',
      category: 'capitalization',
      title: 'Capitalize sentence',
      message: 'Start each sentence with a capital letter.',
    });
  }

  // 8. Subject-verb agreement (basic)
  for (const r of ranges(text, /\b(he|she|it)\s+(have|do|go|say|make|know)\b/gi)) {
    const verbMap: Record<string, string> = { have: 'has', do: 'does', go: 'goes', say: 'says', make: 'makes', know: 'knows' };
    const parts = r.match.split(/\s+/);
    const verb = parts[1].toLowerCase();
    const fixed = parts[0] + ' ' + verbMap[verb];
    issues.push({
      id: makeId(r.start, r.end, 'sva'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: fixed,
      severity: 'error',
      category: 'agreement',
      title: 'Subject\u2013verb agreement',
      message: 'Singular subjects need a singular verb form.',
    });
  }

  /* ─── OPTIMIZATIONS ─── */

  // 9. Wordy phrases
  for (const [pattern, replacement] of WORDY_PHRASES) {
    for (const r of ranges(text, pattern)) {
      issues.push({
        id: makeId(r.start, r.end, 'wp'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: replacement || '',
        severity: 'optimization',
        category: 'wordiness',
        title: replacement ? 'Tighten phrasing' : 'Cut filler',
        message: replacement
          ? `Replace with "${replacement}" for clearer prose.`
          : 'This phrase adds words without adding meaning.',
      });
    }
  }

  // 10. Clichés
  for (const pat of CLICHES) {
    for (const r of ranges(text, pat)) {
      issues.push({
        id: makeId(r.start, r.end, 'cl'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: r.match,
        severity: 'optimization',
        category: 'cliche',
        title: 'Cliché phrase',
        message: 'Admissions readers see this phrase often. Consider a more original framing.',
      });
    }
  }

  // 11. Weak intensifiers
  for (const r of ranges(text, WEAK_INTENSIFIERS)) {
    const stronger = r.match.replace(WEAK_INTENSIFIERS, '$2');
    issues.push({
      id: makeId(r.start, r.end, 'wi'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: stronger,
      severity: 'optimization',
      category: 'weak_word',
      title: 'Weak intensifier',
      message: 'Cut the intensifier or choose a stronger verb/adjective.',
    });
  }

  // 12. Repeated word ("the the")
  for (const r of ranges(text, /\b(\w+)\s+\1\b/gi)) {
    issues.push({
      id: makeId(r.start, r.end, 'rep'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match.split(/\s+/)[0],
      severity: 'error',
      category: 'repetition',
      title: 'Repeated word',
      message: 'You repeated this word.',
    });
  }

  /* ─── Dedupe overlapping ranges (keep highest priority) ─── */
  const sorted = issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.start - b.start;
  });

  const accepted: GrammarIssue[] = [];
  const occupied: Array<[number, number]> = [];
  for (const issue of sorted) {
    const overlaps = occupied.some(([s, e]) => !(issue.end <= s || issue.start >= e));
    if (!overlaps) {
      accepted.push(issue);
      occupied.push([issue.start, issue.end]);
    }
  }

  // Final order: errors first (by position), then optimizations (by position)
  const errors = accepted.filter(i => i.severity === 'error').sort((a, b) => a.start - b.start);
  const opts = accepted.filter(i => i.severity === 'optimization').sort((a, b) => a.start - b.start);
  return [...errors, ...opts];
}

/* ─── Apply a fix to text and return new text + offset delta ─── */
export function applyFix(text: string, issue: GrammarIssue): string {
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}

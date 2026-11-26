/* ══════════════════════════════════════════════════════════════════════
   WHAT IS THIS ESSAY, AND DOES IT ANSWER THE QUESTION?

   Two jobs, shared by the score (lib/essayScore.ts) and the insights panel:

   1. CONTEXT   Work out the kind of essay and its word limit from the
                prompt: a UC Personal Insight Question is 350 words, a
                Common App personal statement 650, a Stanford short answer
                50. Everything else is judged against that, so a 350-word
                answer is never marked down for not being a 650-word story.
                Order of evidence: a limit written in the prompt, then the
                prompt's entry in lib/schoolData.ts, then known UC and
                Common App prompts, then a default for the kind.

   2. ASKS      Break the prompt into the things it actually asks for and
                check each one. The UC leadership question asks for an
                example, what you did, the effect on others, and that it
                happened over time; a "Why us?" essay asks for specifics of
                the school, why they fit you, and what you will do there.
                Each check is a plain, visible test, so the student sees
                exactly what is missing ("You haven't said what changed for
                the people you led").

   Heuristic by design: deterministic, instant, explainable, and private
   (the text never leaves the server). It was calibrated against the
   admitted-essay corpus with scripts/essay-calibration/run.ts.
   ══════════════════════════════════════════════════════════════════════ */

import { SCHOOLS, classifyPromptType, type PromptType } from './schoolData';

export type EssayKind =
  | 'personal_statement'
  | 'uc_piq'
  | 'why_school'
  | 'academic'
  | 'activity'
  | 'community'
  | 'challenge'
  | 'identity'
  | 'roommate'
  | 'creative'
  | 'short_answer'
  | 'other';

/** How much room the essay has, which decides what it can be expected to do. */
export type EssayFormat = 'micro' | 'short' | 'medium' | 'long';

export type UcQuestion =
  | 'leadership' | 'creativity' | 'talent' | 'opportunity' | 'challenge'
  | 'academic' | 'community' | 'standout' | 'major';

export interface EssayContext {
  kind: EssayKind;
  /** Student-facing name of the essay type. */
  label: string;
  uc?: UcQuestion;
  /** Word limit, or null when nothing tells us. */
  limit: number | null;
  limitSource: 'prompt' | 'school' | 'known' | 'type' | 'none';
  format: EssayFormat;
  /** A list prompt ("List five things…"): how many items it wants. */
  listItems?: number;
}

export interface PromptAsk {
  id: string;
  /** What the prompt asks for, in the student's terms. */
  label: string;
  met: boolean;
  /** Shown when not met: what to add. */
  hint: string;
}

export interface PromptCheck {
  score: number;          // 0-100
  asks: PromptAsk[];
  coverage: number;       // share of the prompt's key ideas the essay touches, 0-1
  earlyEngagement: boolean;
}

/* ─── text helpers (shared with lib/essayScore.ts) ─── */

export const wordsOf = (t: string): string[] => t.match(/[A-Za-z][A-Za-z'’-]*|\d[\d,.:%]*/g) || [];

export function sentencesOf(t: string): string[] {
  return (t.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["”’)\]]*\s*|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter((s) => wordsOf(s).length > 0);
}

export function stem(w: string): string {
  let s = w.toLowerCase().replace(/[’']s?$/, '');
  for (const suf of ['ational', 'ization', 'ations', 'ation', 'ments', 'ment', 'ness', 'ities', 'ity', 'ives', 'ive', 'ings', 'ing', 'edly', 'ed', 'ies', 'ers', 'er', 'ly', 'es', 's']) {
    if (s.length - suf.length >= 4 && s.endsWith(suf)) { s = s.slice(0, -suf.length); break; }
  }
  return s;
}

/* Words that appear in prompts but carry no topic: the scaffolding of the
   question itself. */
const PROMPT_STOP = new Set([
  'describe', 'explain', 'discuss', 'share', 'tell', 'essay', 'essays', 'word', 'words', 'response', 'respond', 'please', 'would',
  'could', 'should', 'your', 'yours', 'you', 'about', 'what', 'which', 'how', 'why', 'when', 'where', 'this', 'that', 'these',
  'those', 'have', 'has', 'been', 'example', 'university', 'college', 'application', 'applicant', 'question', 'questions',
  'answer', 'limit', 'include', 'including', 'beyond', 'already', 'believe', 'think', 'also', 'many', 'ways', 'some', 'more',
  'most', 'such', 'them', 'they', 'their', 'there', 'here', 'other', 'others', 'will', 'being', 'within', 'into', 'with', 'from',
  'were', 'want', 'like', 'make', 'made', 'does', 'each', 'than', 'then', 'just', 'well', 'very', 'over', 'time', 'times',
  'consider', 'reflect', 'note', 'brief', 'briefly', 'short', 'maximum', 'fewer', 'less', 'least', 'characters', 'optional',
  'personal', 'insight', 'prompt', 'statement', 'following', 'choose', 'select', 'given', 'help', 'feel', 'free',
]);

/* Each prompt idea, with the words an essay actually uses when it answers
   that idea. "Leadership" is rarely written as "leadership". */
const CONCEPTS: { keys: string[]; related: string[] }[] = [
  { keys: ['lead', 'leader', 'leadership'], related: ['led', 'lead', 'captain', 'president', 'organiz', 'coordinat', 'mentor', 'team', 'group', 'club', 'member', 'responsib', 'delegat', 'motivat', 'convinc', 'found', 'manag', 'direct', 'guid', 'teach', 'taught', 'coach', 'chair', 'officer'] },
  { keys: ['creativ', 'creat', 'innovat', 'original'], related: ['creat', 'design', 'build', 'built', 'make', 'made', 'art', 'draw', 'paint', 'writ', 'wrote', 'compos', 'invent', 'imagin', 'idea', 'solv', 'experiment', 'improvis', 'craft', 'code', 'film', 'music', 'song', 'sketch', 'prototyp'] },
  { keys: ['talent', 'skill'], related: ['practic', 'skill', 'talent', 'train', 'improv', 'master', 'hour', 'competi', 'perform', 'develop', 'techniqu', 'recital', 'tournament', 'coach'] },
  { keys: ['challeng', 'obstacl', 'barrier', 'adversit', 'setback', 'failur', 'difficult', 'hardship', 'overcom', 'plan'], related: ['hard', 'difficult', 'struggl', 'fail', 'obstacl', 'problem', 'setback', 'lost', 'loss', 'sick', 'injur', 'afford', 'pressur', 'alone', 'fear', 'scar', 'cope', 'overcom', 'barrier', 'mistak', 'wrong', 'disappoint', 'reject'] },
  { keys: ['communit', 'belong', 'better', 'place', 'contribut'], related: ['communit', 'school', 'neighbor', 'town', 'city', 'church', 'club', 'team', 'volunteer', 'help', 'member', 'people', 'famil', 'local', 'student', 'campus', 'group', 'organiz', 'serv'] },
  { keys: ['academ', 'subject', 'classroom', 'intellectual', 'learn', 'curio', 'idea', 'concept', 'topic'], related: ['class', 'subject', 'course', 'math', 'physic', 'chemistr', 'biolog', 'histor', 'english', 'literatur', 'scienc', 'comput', 'econom', 'psycholog', 'research', 'read', 'book', 'project', 'learn', 'teacher', 'lab', 'experiment', 'theor', 'problem', 'question', 'stud'] },
  { keys: ['educational', 'opportunit'], related: ['program', 'course', 'opportunit', 'access', 'resourc', 'internship', 'summer', 'scholarship', 'camp', 'class', 'mentor', 'research', 'enroll', 'college', 'school'] },
  { keys: ['major', 'career', 'field', 'stud', 'interest', 'prepar', 'goal', 'future', 'graduat'], related: ['major', 'career', 'stud', 'field', 'profession', 'future', 'goal', 'degree', 'research', 'job', 'work', 'course', 'class', 'internship', 'project'] },
  { keys: ['divers', 'background', 'identit', 'cultur', 'heritag', 'perspect', 'world', 'shap'], related: ['cultur', 'famil', 'heritag', 'languag', 'immigr', 'tradition', 'identit', 'background', 'parent', 'mother', 'father', 'grandm', 'grandp', 'religio', 'commun', 'divers', 'perspect', 'different', 'home', 'town'] },
  { keys: ['roommat', 'roommate'], related: ['roommat', 'room', 'sleep', 'music', 'habit', 'morning', 'night', 'snack', 'clean', 'mess', 'share', 'dorm'] },
  { keys: ['meaning', 'matter', 'important', 'value'], related: ['mean', 'matter', 'important', 'care', 'value', 'love', 'believ'] },
  { keys: ['fun', 'enjoy', 'joy'], related: ['fun', 'enjoy', 'love', 'laugh', 'hobby', 'play', 'weekend'] },
];

/* ─── context ─── */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** "350 words", "(250-word limit)", "in 650 words or fewer" → the largest such number. */
export function statedLimit(prompt: string): number | null {
  const found = [...prompt.matchAll(/(\d{2,4})\s*(?:-|–)?\s*words?\b|word (?:limit|count|maximum)(?: of)?:?\s*(\d{2,4})/gi)]
    .map((m) => +(m[1] || m[2]))
    .filter((n) => n >= 25 && n <= 1000);
  return found.length ? Math.max(...found) : null;
}

const UC_PIQ: { q: UcQuestion; test: RegExp }[] = [
  { q: 'leadership', test: /leadership experience|positively influenced others/ },
  { q: 'creativity', test: /creative side|express(?:ed)? your creative/ },
  { q: 'talent', test: /greatest talent or skill/ },
  { q: 'opportunity', test: /significant educational opportunity|educational barrier/ },
  { q: 'challenge', test: /most significant challenge you have faced/ },
  { q: 'academic', test: /academic subject that inspires/ },
  { q: 'community', test: /make your school or your community a better place/ },
  { q: 'standout', test: /strong candidate for admissions? to the university of california|makes you a strong candidate/ },
  { q: 'major', test: /prepared for your intended major|preparation for (?:your )?intended major/ },
];

const COMMON_APP = /background, identity, interest, or talent|lessons we take from obstacles|questioned or challenged a belief|someone has done for you that has made you happy|accomplishment, event, or realization that sparked|so engaging that it makes you lose all track of time|essay on any topic of your choice|common app|common application|personal statement/;

const KIND_LABEL: Record<EssayKind, string> = {
  personal_statement: 'Personal statement',
  uc_piq: 'UC Personal Insight Question',
  why_school: '“Why this college?” essay',
  academic: 'Academic interest essay',
  activity: 'Activity essay',
  community: 'Community essay',
  challenge: 'Challenge essay',
  identity: 'Identity and background essay',
  roommate: 'Roommate letter',
  creative: 'Open-ended essay',
  short_answer: 'Short answer',
  other: 'Supplemental essay',
};

const DEFAULT_LIMIT: Partial<Record<EssayKind, number>> = {
  personal_statement: 650, uc_piq: 350, why_school: 250, academic: 250, activity: 200, community: 250,
  challenge: 300, identity: 300, roommate: 250, creative: 300, short_answer: 50,
};

function formatFor(limit: number | null, wordCount: number): EssayFormat {
  const n = limit ?? wordCount;
  if (n <= 120) return 'micro';
  if (n <= 300) return 'short';
  if (n <= 450) return 'medium';
  return 'long';
}

function kindFromType(t: PromptType): EssayKind {
  switch (t) {
    case 'why_us': return 'why_school';
    case 'intellectual': case 'future': return 'academic';
    case 'activity': return 'activity';
    case 'community': return 'community';
    case 'challenge': return 'challenge';
    case 'identity': case 'diversity': return 'identity';
    case 'roommate': return 'roommate';
    case 'creative': return 'creative';
    default: return 'other';
  }
}

let SCHOOL_PROMPTS: { key: string; type: PromptType; wordLimit: number }[] | null = null;
function schoolPrompt(prompt: string) {
  if (!SCHOOL_PROMPTS) SCHOOL_PROMPTS = SCHOOLS.flatMap((s) => s.prompts.map((p) => ({ key: norm(p.text).slice(0, 70), type: p.type, wordLimit: p.wordLimit })));
  const k = norm(prompt).slice(0, 70);
  if (k.length < 25) return null;
  return SCHOOL_PROMPTS.find((p) => p.key === k || (p.key.length >= 40 && (k.startsWith(p.key.slice(0, 45)) || p.key.startsWith(k.slice(0, 45))))) || null;
}

export function resolveContext(prompt: string, wordCount: number, opts: { wordLimit?: number | null } = {}): EssayContext {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();
  let kind: EssayKind = 'other';
  let uc: UcQuestion | undefined;
  let limit: number | null = null;
  let limitSource: EssayContext['limitSource'] = 'none';

  const stated = statedLimit(p);
  const known = schoolPrompt(p);
  const piq = UC_PIQ.find((x) => x.test.test(lower));

  if (piq) { kind = 'uc_piq'; uc = piq.q; }
  else if (COMMON_APP.test(lower) && !/\b(?:why|supplement)\b/.test(lower)) kind = 'personal_statement';
  else if (/^(?:please )?list\b|list (?:five|three|ten|\d+) |list a selection|top (?:three|five|ten) /.test(lower)) kind = 'short_answer';
  else if (/\bwhy (?:do you want to|are you interested in|have you chosen|did you choose|us\b|this (?:college|university|school))|what (?:attracts|draws|excites) you (?:to|about)|why [A-Z][a-zA-Z]+\b|how will you (?:take advantage|make use) of|satisfy your desire|particular kind of learning/i.test(p)) kind = 'why_school';
  else if (/roommate/.test(lower)) kind = 'roommate';
  else if (known) kind = kindFromType(known.type);
  else if (p) kind = kindFromType(classifyPromptType(p));

  if (opts.wordLimit && opts.wordLimit > 0) { limit = opts.wordLimit; limitSource = 'prompt'; }
  else if (stated) { limit = stated; limitSource = 'prompt'; }
  else if (known && known.wordLimit > 0) { limit = known.wordLimit; limitSource = 'school'; }
  else if (kind === 'uc_piq' || kind === 'personal_statement') { limit = DEFAULT_LIMIT[kind]!; limitSource = 'known'; }
  else if (p && DEFAULT_LIMIT[kind]) {
    // A default only when the essay's own length agrees with it; a 600-word
    // draft for an unknown prompt is not a 250-word essay running long.
    const d = DEFAULT_LIMIT[kind]!;
    if (wordCount <= d * 1.15) { limit = d; limitSource = 'type'; }
  }

  // A 50- or 100-word answer is a short answer whatever it is about.
  if (limit != null && limit <= 120 && kind !== 'uc_piq') kind = kind === 'other' || kind === 'creative' ? 'short_answer' : kind;

  const listMatch = lower.match(/list (five|three|four|ten|\d+)/);
  const listItems = listMatch ? ({ three: 3, four: 4, five: 5, ten: 10 } as Record<string, number>)[listMatch[1]] ?? +listMatch[1] : undefined;

  return { kind, label: KIND_LABEL[kind], uc, limit, limitSource, format: formatFor(limit, wordCount), listItems };
}

/* ─── asks ─── */

export const RX = {
  // "I" or "we" + a past-tense verb that is an action, not a thought or a feeling.
  firstPersonAction: /\b(?:I|we)\s+(?:\w+ly\s+|also\s+|then\s+|finally\s+|even\s+)?(?!(?:realized|learned|thought|felt|knew|wondered|noticed|believed|wanted|loved|hoped|liked|needed|seemed|used|was|were|had|did|could|would|should|might)\b)(?:\w{2,}ed|built|made|took|ran|wrote|taught|led|began|spent|kept|found|chose|went|got|gave|brought|bought|sold|sent|told|met|held|left|won|read|grew|drew|sang|swam|spoke|stood|became|came|tried|fought|caught|sought|set up|signed up|reached out|stepped up|took on|put together)\b/gi,
  othersImpact: /\b(?:they|members|team(?:mates)?|students|kids|children|people|everyone|others|group|class(?:mates)?|community|club|peers|volunteers|residents|customers|families|teammates)\b[^.!?]{0,90}\b(?:began|started|learned|improved|grew|joined|felt|became|could|now|won|raised|increased|doubled|tripled|returned|stayed|came back|thanked|smiled|asked|understood|showed up|passed|graduated|succeeded|benefited|gained|received|got|felt|said|told me|wrote)\b|\b(?:raised|increased|grew|doubled|tripled|reduced|recruited|reached|served|tutored|helped|trained|taught|mentored)\b[^.!?]{0,40}\b\d+|\b\d+\s+(?:students|members|people|kids|volunteers|families|meals|books|dollars|hours)\b/i,
  overTime: /\b(?:over (?:the )?(?:next |past |following )?(?:\w+ )?(?:years?|months?|weeks?|semesters?|summers?|seasons?)|for (?:\w+ )?(?:years?|months?|semesters?|seasons?)|each (?:week|day|month|year|summer|semester)|every (?:week|day|month|year|summer|semester|morning|saturday|sunday|monday|tuesday|wednesday|thursday|friday)|since (?:\w+ )?(?:grade|year|freshman|sophomore|middle school|elementary|\d{4})|by (?:the end of|junior|senior|sophomore)|(?:freshman|sophomore|junior|senior) year|(?:\d+(?:st|nd|rd|th)|\w+th) grade|(?:two|three|four|five|several) (?:years|months|seasons|summers)|months later|years later|a year later|eventually|gradually|over time|now,? (?:I|we)|today,? (?:I|we|the))\b/i,
  reflect: /\b(?:I (?:\w+ )?(?:realized|realize|learned|learn|understand|understood|discovered|recognized|noticed|believe|value|appreciate|wonder|wondered|questioned|question|came to|have come to|began to (?:see|understand|realize|appreciate|question))|I (?:now )?(?:see|know) (?:now|that)|taught me|showed me|helped me (?:see|understand|realize)|made me (?:realize|see|understand|question|rethink)|changed (?:how|the way) I|means to me|matters to me|meant (?:to me|that)|why I|I used to (?:think|believe)|at first,? I|it wasn'?t until|that'?s when I|this is why|which is why|I want(?:ed)? to (?:understand|know)|for me,|to me,|(?:fascinat|intrigu|excit|inspir|captivat)(?:es|ed|ing) me|(?:draws?|drew|pulls?|pulled) me|what (?:draws|drew|excites|fascinates) me|I(?:'m| am) (?:drawn|fascinated|inspired|curious|excited)|I (?:love|loved|care|cared) (?:about|that|how|the way)|I (?:began|started) to (?:see|understand|realize|appreciate|question|wonder|love)|I (?:finally )?(?:understood|saw) (?:that|how|why|what)|I knew (?:that|then|I)|made me (?:want|wonder|curious)|I (?:find|found) (?:myself|it|that)|I(?:'ve| have) (?:learned|realized|discovered|grown|come)|this (?:is|was) (?:what|when|why|how) I|I see (?:myself|now|that)|I hope)\b/i,
  future: /\b(?:I (?:will|want to|hope to|plan to|intend to|aim to|would love to|look forward to|can'?t wait to|am excited to|'ll)|I'd (?:like|love) to|I'll|in college,? I|at [A-Z][a-z]+,? I(?:'d| would| will| want| hope| plan)|my goal is|someday|one day|in the future|next (?:year|fall))\b/i,
  why: /\bbecause\b|\bwhy\b|\bso that\b|\bwhich (?:is|means)\b|\bmeans\b|\bmatters?\b|\blove\b|\bcare\b|\breminds? me\b|\btaught me\b|\bshowed me\b|\bto me\b/i,
  schoolSpecific: /\b(?:professor|prof\.|dr\.|course|class(?:es)?|seminar|lab(?:oratory)?|center|centre|institute|program(?:me)?|curriculum|core|initiative|major|minor|concentration|club|society|team|orchestra|journal|research|fellowship|studio|school of|college of|department)\b/gi,
  genericPraise: /\b(?:prestigious|world[- ]renowned|world[- ]class|top[- ]ranked|renowned|esteemed|beautiful campus|diverse student body|rich history|vibrant community|great reputation|excellent (?:academics|programs?|faculty)|one of the best|top \d+|best (?:school|university))\b/gi,
  tell: /\bI (?:am|was|have always been|'ve always been) (?:\w+ )?(?:passionate|hardworking|hard-working|dedicated|determined|motivated|curious|driven|ambitious|resilient|a leader|a hard worker)\b|\bI have always (?:loved|wanted|been)\b|\bever since I was (?:young|little|a (?:kid|child))\b|\b(?:since I was (?:a kid|little|young|a child)|since childhood)\b|\b(?:my|a|this|her|his) passion for\b|\bpursue my passion\b|\bmy dream school\b|\bI feel compelled\b/gi,
  specific: /\b\d[\d,.:%]*\b|"[^"]{3,}"|“[^”]{3,}”|(?<=[a-z,;:] )[A-Z][a-z]+(?: [A-Z][a-z]+)*/g,
  subjectName: /\b(?:math(?:ematics)?|calculus|algebra|geometry|statistics|physics|chemistry|biology|history|english|literature|writing|computer science|programming|coding|economics|psychology|philosophy|art|music|spanish|french|chinese|latin|engineering|robotics|neuroscience|government|politics|sociology|environmental science|anatomy|astronomy|linguistics|journalism|debate)\b/i,
  inside: /\b(?:class|classroom|teacher|course|AP|honors|IB|lecture|homework|textbook|exam|test|unit|curriculum|lab)\b/,
  outside: /\b(?:outside (?:of )?(?:the )?class(?:room)?|on my own|at home|online|summer|internship|research|club|competition|olympiad|project|book|podcast|youtube|library|camp|program|volunteer|tutor|job|startup|app|website|museum)\b/i,
  dialogue: /"[^"]{3,}"|“[^”]{3,}”/g,
  /* Lessons any applicant could claim. They read like reflection but say
     nothing about this writer, so they never count as reflection. */
  stock: /\b(?:taught me the (?:importance|value) of|hard work (?:pays off|and dedication)|never give up|anything is possible|made me (?:the person|who) I am(?: today)?|step(?:ped)? out(?:side)? of my comfort zone|grow as a person|follow (?:my|your) dreams|put (?:my|your) mind to|learned (?:a lot|so much)|helped me grow|changed my life|opened my eyes|the sky is the limit|everything happens for a reason|I learned that I (?:can|could) do anything|make a (?:real )?difference|giving back|shaped who I am|who I am today|(?:a|the) better person)\b/gi,
  sensory: /\b(?:saw|heard|smelled|tasted|watched|stared|listened|whispered|shouted|yelled|grabbed|ran|walked|sat|stood|held|pressed|typed|opened|closed|slammed|dropped|picked|reached|shook|laughed|cried|froze|glanced|scribbled|clicked|poured|lifted|pulled|pushed|knocked|squinted|wiped|tapped)\b/gi,
};

const count = (t: string, rx: RegExp) => (t.match(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g')) || []).length;
const has = (t: string, rx: RegExp, n = 1) => count(t, rx) >= n;

/** Words in the essay that touch one of the prompt's ideas, by stem. */
function promptIdeas(prompt: string): { stems: Set<string>; related: Set<string>; terms: string[] } {
  const terms = [...new Set(wordsOf(prompt).map((w) => w.toLowerCase()).filter((w) => w.length >= 4 && !PROMPT_STOP.has(w) && !/^\d/.test(w)))];
  const stems = new Set(terms.map(stem));
  const related = new Set<string>();
  for (const c of CONCEPTS) {
    if (c.keys.some((k) => [...stems].some((s) => s.startsWith(k) || k.startsWith(s)))) c.related.forEach((r) => related.add(r));
  }
  return { stems, related, terms };
}

function touches(sentenceStems: string[], ideas: { stems: Set<string>; related: Set<string> }): number {
  let n = 0;
  for (const s of sentenceStems) {
    if (ideas.stems.has(s)) { n++; continue; }
    for (const r of ideas.related) { if (s.startsWith(r)) { n++; break; } }
  }
  return n;
}

interface Doc { text: string; prompt: string; sentences: string[]; wordCount: number; lastPart: string; firstPart: string }
type AskDef = { id: string; label: string; hint: string; weight: number; test: () => boolean };

function asksFor(ctx: EssayContext, d: Doc, school?: string): AskDef[] {
  const t = d.text;
  const specifics = count(t, RX.specific);
  const perHundred = (n: number) => n / Math.max(1, d.wordCount / 100);
  const actions = count(t, RX.firstPersonAction);
  const isReflection = (s: string) => RX.reflect.test(s) && !new RegExp(RX.stock.source, 'i').test(s);
  const reflection = d.sentences.filter(isReflection).length;
  const lateReflection = sentencesOf(d.lastPart).some(isReflection);
  const a = (id: string, label: string, hint: string, weight: number, test: () => boolean): AskDef => ({ id, label, hint, weight, test });

  const example = a('example', 'A specific example', 'Ground it in one real moment: where you were, what happened, who was there.', 1, () => perHundred(specifics + count(t, RX.sensory)) >= 1.5 || has(t, RX.dialogue));
  const yourActions = a('actions', 'What you did', 'Say what you did, in your own actions: "I organized…", "I rewrote…".', 1, () => actions >= (ctx.format === 'micro' ? 1 : 2));
  const growth = a('meaning', 'What it shows about you', 'Add a line or two on what this changed in you or how you see things now.', 1, () => reflection >= (ctx.format === 'long' ? 2 : 1) && (ctx.format === 'micro' || lateReflection));

  if (ctx.kind === 'short_answer' || ctx.format === 'micro') {
    if (ctx.listItems) {
      const items = t.split(/\n|;|,|•|\d+[.)]\s/).map((x) => x.trim()).filter((x) => wordsOf(x).length >= 1).length;
      return [
        a('items', `${ctx.listItems} items`, `The prompt asks for ${ctx.listItems}; make each one easy to tell apart.`, 2, () => items >= ctx.listItems!),
        a('specific', 'Specific items', 'Name real things (titles, places, people) rather than categories.', 1, () => perHundred(specifics) >= 4),
      ];
    }
    return [
      a('direct', 'Answers right away', 'Make your first sentence the answer itself; there is no room to warm up.', 1.5, () => true),
      a('specific', 'One concrete detail', 'Add one detail only you could write: a name, a number, a place.', 1, () => specifics >= 1 || has(t, RX.dialogue)),
      a('why', 'Why it matters to you', 'A few words on why: that is what makes a short answer memorable.', 0.7, () => RX.why.test(t) || RX.reflect.test(t)),
    ];
  }

  if (ctx.kind === 'uc_piq') {
    switch (ctx.uc) {
      case 'leadership': return [
        a('lead', 'You leading', 'Make it clear this is about you leading: a role you took on or a group you moved.', 1.3, () => has(t, /\b(?:led|lead(?:ing|er|ership)?|captain|president|organiz|coordinat|mentor|in charge|responsib|founded|started (?:a|the|our)|ran (?:a|the|our)|chair|delegat|convinc|rallied)\w*/i)),
        example, yourActions,
        a('impact', 'The effect on others', 'Show what changed for the people you led: what they did, learned or achieved.', 1, () => RX.othersImpact.test(t)),
        a('time', 'Over time', 'UC asks for leadership "over time": show how it developed across weeks, seasons or years.', 0.7, () => RX.overTime.test(t)),
        a('meaning', 'What you learned about leading', 'Close with what this taught you about leading people.', 0.8, () => growth.test()),
      ];
      case 'creativity': return [
        a('how', 'How you are creative', 'Name the way you create: art, problem solving, building, writing.', 1, () => has(t, /\b(?:creat|design|build|built|made|make|draw|paint|writ|wrote|compos|invent|imagin|solv|experiment|improvis|code|coded|film|sketch|prototyp|cook|craft)\w*/i)),
        example, yourActions,
        a('meaning', 'Why it matters to you', 'Say what creating gives you, or what it shows about how you think.', 1, () => growth.test()),
      ];
      case 'talent': return [
        a('name', 'The talent named', 'Name the talent or skill plainly near the start.', 0.7, () => touches(wordsOf(d.firstPart).map(stem), { stems: new Set(['talent', 'skill']), related: new Set(['practic', 'skill', 'talent', 'play', 'writ', 'cod', 'speak', 'danc', 'sing', 'paint', 'draw', 'cook', 'debat', 'swim', 'run']) }) > 0),
        a('develop', 'How you developed it', 'Show the practice: hours, setbacks, teachers, how you got better.', 1, () => RX.overTime.test(t) && has(t, /\b(?:practic|train|improv|learn|taught myself|lesson|coach|hours|drill|rehears|mistake|fail)\w*/i)),
        a('demonstrate', 'How you have shown it', 'Point to where it showed: a performance, a result, a time you used it to help someone.', 1, () => has(t, /\b(?:perform|compet|won|award|placed|recital|tournament|showcase|published|present|taught|helped|used it|result)\w*/i) || specifics >= 3),
        growth,
      ];
      case 'opportunity': return [
        a('what', 'The opportunity or barrier', 'Name the program, class or barrier clearly.', 1, () => has(t, /\b(?:program|course|class|opportunit|internship|summer|scholarship|camp|research|barrier|access|afford|resource|dual enrollment|community college)\w*/i)),
        yourActions,
        a('result', 'What it led to', 'Show what came of it: what you learned, built, or could do next.', 1, () => growth.test() || RX.future.test(t)),
      ];
      case 'challenge': return [
        a('challenge', 'The challenge', 'Describe the challenge plainly and early.', 1, () => has(d.firstPart, /\b(?:hard|difficult|struggl|fail|obstacl|problem|setback|lost|loss|sick|ill|injur|afford|pressure|alone|fear|scared|cope|barrier|mistake|diagnos|divorce|moved|evict|work(?:ed)? to support)\w*/i)),
        a('steps', 'The steps you took', 'UC asks for the steps you took: list what you actually did, in order.', 1.2, () => actions >= 2),
        a('academics', 'Effect on your schoolwork', 'UC asks how it affected your academics: grades, classes, how you study.', 0.8, () => has(t, /\b(?:grade|class(?:es)?|school(?:work)?|academic|study|studied|homework|GPA|teacher|course|test|exam)\w*/i)),
        growth,
      ];
      case 'academic': return [
        a('subject', 'The subject named', 'Name the subject and what about it pulls you in.', 1, () => RX.subjectName.test(t)),
        a('inside', 'Inside the classroom', 'Show one moment in class that deepened it.', 0.7, () => RX.inside.test(t)),
        a('outside', 'Outside the classroom', 'UC asks what you did beyond class: projects, reading, research, competitions.', 1, () => RX.outside.test(t)),
        a('why', 'Why it inspires you', 'Say why it matters to you, not just that it does.', 1, () => growth.test() || RX.why.test(d.lastPart)),
      ];
      case 'community': return [
        a('community', 'The community', 'Name the community: your school, a team, a neighborhood, a group.', 0.8, () => has(t, /\b(?:communit|school|neighborhood|town|city|church|club|team|organization|group|campus|class)\w*/i)),
        yourActions,
        a('impact', 'What changed because of you', 'Show the difference you made, with a number or a person if you can.', 1, () => RX.othersImpact.test(t) || specifics >= 4),
        growth,
      ];
      case 'standout': return [
        a('quality', 'The quality that sets you apart', 'Name the one thing about you the rest of your application does not show.', 1, () => d.sentences.slice(0, 3).some((s) => /\bI\b/.test(s))),
        example,
        a('contribute', 'What you would bring', 'Say what that quality means for what you would do at UC.', 0.8, () => RX.future.test(t) || /\b(?:UC|university|campus|college)\b/i.test(d.lastPart)),
        growth,
      ];
      case 'major': return [
        a('major', 'The major', 'Name your intended major early.', 0.8, () => /\bmajor\b|\bstud(?:y|ying)\b/i.test(t) || RX.subjectName.test(t)),
        a('preparation', 'How you prepared', 'List the courses, projects, jobs or research that prepared you.', 1.2, () => actions >= 2 && (RX.outside.test(t) || RX.inside.test(t))),
        a('future', 'Where you are headed', 'Say what you want to do with it next.', 0.8, () => RX.future.test(t)),
      ];
    }
  }

  if (ctx.kind === 'why_school') {
    const schoolWords = (school || '').split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !/^(?:University|College|Of|The|Institute|State)$/.test(w));
    const specificsAboutSchool = count(t, RX.schoolSpecific) + count(t, /(?<=[a-z,;:] )[A-Z][a-z]+(?: [A-Z][a-z]+)+/g);
    return [
      a('specifics', 'Specifics about the school', 'Name real things: a course, a professor, a lab, a program, a tradition. Two or three is plenty.', 1.4, () => specificsAboutSchool >= (ctx.format === 'micro' ? 1 : 3) || (schoolWords.length > 0 && schoolWords.some((w) => t.includes(w)) && specificsAboutSchool >= 2)),
      a('fit', 'Why they fit you', 'Tie each detail to something you have done or care about ("…because in my robotics club I…").', 1.2, () => RX.why.test(t) && /\b(?:I|my)\b/.test(t)),
      a('future', 'What you will do there', 'Say what you would actually do there: take, join, build, research.', 1, () => RX.future.test(t)),
      a('notGeneric', 'Not generic praise', 'Cut praise any school could get ("prestigious", "diverse student body"); it uses words without telling them anything.', 0.6, () => count(t, RX.genericPraise) === 0),
    ];
  }

  if (ctx.kind === 'academic') return [
    a('interest', 'The interest named', 'Name the field or idea and what about it you cannot stop thinking about.', 1, () => RX.subjectName.test(t) || perHundred(specifics) >= 1.5),
    a('pursued', 'How you have pursued it', 'Show what you have done with it: read, built, researched, argued, taught.', 1, () => actions >= 2),
    a('why', 'Why it excites you', 'Say why it matters to you.', 1, () => growth.test() || RX.why.test(t)),
    a('next', 'Where you want to take it', 'Add what you want to explore next.', 0.6, () => RX.future.test(t)),
  ];

  if (ctx.kind === 'activity') return [
    a('activity', 'The activity', 'Name the activity and your role in it early.', 0.8, () => d.sentences.slice(0, 3).some((s) => /\bI\b|\bmy\b/i.test(s))),
    yourActions,
    a('impact', 'What changed because of you', 'Show a result: what you built, fixed, or changed for others.', 1, () => RX.othersImpact.test(t) || specifics >= 3),
    a('why', 'Why it matters to you', 'Say what it gives you.', 0.8, () => growth.test() || RX.why.test(t)),
  ];

  if (ctx.kind === 'roommate') return [
    a('details', 'Real habits and quirks', 'Share the specifics a roommate would notice: routines, music, snacks, mess.', 1, () => perHundred(specifics) >= 1.5 || has(t, /\b(?:morning|night|alarm|playlist|snack|desk|bed|clean|messy|music|coffee|tea|sleep)\w*/i, 2)),
    a('voice', 'Written to them', 'Talk to your roommate directly; it is a letter.', 0.8, () => count(t, /\byou(?:r|'ll|'re)?\b/gi) >= 2),
    a('who', 'Who you are', 'Let a value or a passion come through, not only habits.', 1, () => growth.test() || RX.why.test(t)),
  ];

  if (ctx.kind === 'community' || ctx.kind === 'identity') return [
    a('community', ctx.kind === 'identity' ? 'Your background or identity' : 'The community', 'Name it concretely: who, where, what it looks like.', 1, () => perHundred(specifics) >= 1 || has(t, /\b(?:famil|communit|cultur|heritag|languag|immigr|tradition|neighborhood|town|church|team|club)\w*/i)),
    a('role', 'Your part in it', 'Show what you do or did within it, in action.', 1, () => actions >= 1),
    growth,
    a('contribute', 'What you would bring', 'If the prompt asks, say what you would contribute on campus.', /contribut|bring|add to|enrich/i.test(d.prompt) ? 1 : 0.5, () => RX.future.test(t)),
  ];

  if (ctx.kind === 'challenge') return [
    a('challenge', 'The challenge', 'Describe it plainly and early.', 1, () => has(d.firstPart, /\b(?:hard|difficult|struggl|fail|obstacl|problem|setback|lost|loss|sick|injur|pressure|alone|fear|scared|mistake|wrong|plan)\w*/i)),
    a('response', 'How you responded', 'Show what you did about it, step by step.', 1.2, () => actions >= 2),
    growth,
  ];

  if (ctx.kind === 'personal_statement') return [
    a('story', 'A real moment', 'Build around one or two specific moments, told as scenes.', 1, () => perHundred(specifics) >= 1 || count(t, RX.dialogue) >= 1),
    yourActions,
    a('change', 'Change over time', 'Show who you were before and who you are after.', 1, () => RX.overTime.test(t) || /\b(?:at first|used to|back then|before|now)\b/i.test(t)),
    a('meaning', 'What it reveals about you', 'The reader should finish knowing what you value and how you think.', 1.3, () => reflection >= 2 && lateReflection),
  ];

  // Open-ended or unknown prompts: engage its ideas, be specific, be personal.
  return [
    a('engage', 'Takes on the question directly', 'Answer the question in your first few sentences.', 1, () => true),
    example,
    growth,
  ];
}

export function checkPrompt(text: string, prompt: string, ctx: EssayContext, school?: string): PromptCheck {
  const sentences = sentencesOf(text);
  const words = wordsOf(text);
  const n = sentences.length;
  const cut = Math.max(1, Math.round(n * 0.35));
  const firstPart = sentences.slice(0, cut).join(' ');
  const lastPart = sentences.slice(Math.floor(n * 0.6)).join(' ');
  const doc: Doc = { text, prompt: prompt || '', sentences, wordCount: words.length, firstPart, lastPart };

  const ideas = promptIdeas(prompt || '');
  const essayStems = words.map(stem);
  // A prompt idea the essay names outright counts fully; one it only
  // touches through a related word ("captain" for "leadership") counts half.
  let hits = 0;
  for (const term of ideas.terms) {
    const s = stem(term);
    if (essayStems.includes(s)) { hits += 1; continue; }
    const concept = CONCEPTS.find((c) => c.keys.some((k) => s.startsWith(k) || k.startsWith(s)));
    if (concept && essayStems.some((e) => concept.related.some((r) => e.startsWith(r)))) hits += 0.5;
  }
  const coverage = ideas.terms.length ? hits / ideas.terms.length : 1;
  const earlyEngagement = !prompt || touches(wordsOf(firstPart).map(stem), ideas) > 0;

  const list = asksFor(ctx, doc, school);
  const asks: PromptAsk[] = list.map((x) => ({ id: x.id, label: x.label, hint: x.hint, met: x.test() }));
  // "Answers right away" for a short answer is decided by early engagement.
  const direct = asks.find((x) => x.id === 'direct');
  if (direct) direct.met = earlyEngagement || (sentences[0] ? count(sentences[0], RX.specific) > 0 : false);
  const engage = asks.find((x) => x.id === 'engage');
  if (engage) engage.met = earlyEngagement && coverage >= 0.25;

  const totalW = list.reduce((s, x) => s + x.weight, 0) || 1;
  const metW = list.reduce((s, x, i) => s + (asks[i].met ? x.weight : 0), 0);
  const askScore = (metW / totalW) * 100;
  const coverageScore = Math.min(1, coverage / 0.5) * 100;
  // Naming the school in a "Why us?" essay is trivial, so its words count for
  // less there; what the essay does with them is what the asks check.
  const cw = ctx.kind === 'why_school' ? 0.2 : 0.38;
  let score = prompt ? (1 - cw) * askScore + cw * coverageScore : askScore;
  if (prompt && !earlyEngagement) score -= ctx.format === 'micro' || ctx.format === 'short' ? 12 : 6;
  return { score: Math.max(0, Math.min(100, Math.round(score))), asks, coverage, earlyEngagement };
}

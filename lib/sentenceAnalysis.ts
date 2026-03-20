/* ══════════════════════════════════════════════════════════════════════
   SENTENCE ANALYSIS ENGINE
   Classifies sentences as Internalized (reflective/cognitive) vs
   Externalized (action-based) and detects Passive Voice.

   Based on linguistic research from:
   - Purdue OWL (passive voice: be + past participle)
   - Cognitive/mental state verbs (linguistics classification)
   - Dynamic/action verbs (stative vs dynamic verb research)
   - Personal statement writing best practices
   ══════════════════════════════════════════════════════════════════════ */

export type SentenceType = 'internalized' | 'externalized' | 'neutral';

export interface AnalyzedSentence {
  text: string;
  type: SentenceType;
  isPassive: boolean;
  confidence: number; // 0-1 how confident the classification is
}

export interface AnalysisStats {
  total: number;
  internalized: number;
  externalized: number;
  neutral: number;
  passive: number;
  balanceRatio: number; // 0-1, 0.5 = perfectly balanced
}

/* ─── Cognitive / Mental State Verbs ───
   Verbs that signal internal thought, reflection, feelings, reasoning.
   Sources: Purdue OWL, linguistics research on stative/cognitive verbs,
   Bloom's Taxonomy cognitive domain, mental state verb classifications. */

const COGNITIVE_VERBS = new Set([
  // Thinking & reasoning
  'think', 'thought', 'believe', 'believed', 'consider', 'considered',
  'contemplate', 'contemplated', 'ponder', 'pondered', 'reflect', 'reflected',
  'reason', 'reasoned', 'analyze', 'analyzed', 'evaluate', 'evaluated',
  'assess', 'assessed', 'conclude', 'concluded', 'deduce', 'deduced',
  'infer', 'inferred', 'speculate', 'speculated', 'hypothesize', 'hypothesized',
  'theorize', 'theorized', 'deliberate', 'deliberated', 'muse', 'mused',
  'ruminate', 'ruminated', 'meditate', 'meditated', 'brood', 'brooded',

  // Knowledge & understanding
  'know', 'knew', 'understand', 'understood', 'realize', 'realized',
  'recognize', 'recognized', 'comprehend', 'comprehended', 'grasp', 'grasped',
  'perceive', 'perceived', 'appreciate', 'appreciated', 'fathom', 'fathomed',
  'discern', 'discerned', 'intuit', 'intuited',

  // Memory
  'remember', 'remembered', 'recall', 'recalled', 'recollect', 'recollected',
  'forget', 'forgot', 'forgotten', 'reminisce', 'reminisced',

  // Imagination & supposition
  'imagine', 'imagined', 'envision', 'envisioned', 'suppose', 'supposed',
  'assume', 'assumed', 'presume', 'presumed', 'suspect', 'suspected',
  'guess', 'guessed', 'wonder', 'wondered', 'dream', 'dreamed', 'dreamt',
  'fantasize', 'fantasized', 'visualize', 'visualized',

  // Doubt & uncertainty
  'doubt', 'doubted', 'question', 'questioned', 'hesitate', 'hesitated',
  'waver', 'wavered', 'struggle', 'struggled',

  // Decision & judgment
  'decide', 'decided', 'determine', 'determined', 'resolve', 'resolved',
  'judge', 'judged', 'weigh', 'weighed',

  // Emotion verbs (internal states)
  'feel', 'felt', 'love', 'loved', 'hate', 'hated', 'fear', 'feared',
  'hope', 'hoped', 'wish', 'wished', 'want', 'wanted', 'desire', 'desired',
  'need', 'needed', 'prefer', 'preferred', 'enjoy', 'enjoyed',
  'dread', 'dreaded', 'regret', 'regretted', 'resent', 'resented',
  'admire', 'admired', 'respect', 'respected', 'envy', 'envied',
  'cherish', 'cherished', 'treasure', 'treasured', 'value', 'valued',
  'miss', 'missed', 'yearn', 'yearned', 'long', 'longed', 'crave', 'craved',
  'worry', 'worried', 'agonize', 'agonized', 'fret', 'fretted',
  'suffer', 'suffered', 'grieve', 'grieved', 'mourn', 'mourned',

  // Belief & opinion
  'trust', 'trusted', 'accept', 'accepted', 'reject', 'rejected',
  'deny', 'denied', 'identify', 'identified', 'distinguish', 'distinguished',
  'differentiate', 'differentiated', 'puzzle', 'puzzled',

  // Learning & discovery
  'learn', 'learned', 'learnt', 'discover', 'discovered', 'uncover', 'uncovered',
  'notice', 'noticed', 'observe', 'observed', 'sense', 'sensed',
]);

/* ─── Internalized phrase patterns ───
   First-person reflection patterns and emotional expressions. */

const INTERNALIZED_PATTERNS: RegExp[] = [
  // First-person cognitive patterns
  /\bI\s+(?:think|thought|believe|believed|feel|felt|realize|realized|understand|understood|know|knew|wonder|wondered|imagine|imagined|hope|hoped|wish|wished|fear|feared|doubt|doubted|suspect|suspected|remember|remembered|recall|recalled|notice|noticed|sense|sensed|consider|considered)\b/i,

  // "It struck/hit/dawned on me" patterns
  /\b(?:it|something)\s+(?:struck|hit|dawned\s+on|occurred\s+to)\s+me\b/i,

  // "I came to realize/understand/see" patterns
  /\bI\s+(?:came\s+to|began\s+to|started\s+to)\s+(?:realize|understand|see|appreciate|believe|feel|grasp|notice)\b/i,

  // "I couldn't help but think/feel/wonder"
  /\bI\s+couldn'?t\s+(?:help\s+but\s+)?(?:think|feel|wonder|believe|imagine|stop\s+thinking)\b/i,

  // "In that moment, I..."
  /\bin\s+that\s+moment\b/i,

  // "I found myself" (internal discovery)
  /\bI\s+found\s+myself\s+(?:thinking|wondering|feeling|questioning|doubting|hoping|wishing|believing|realizing)\b/i,

  // "what I didn't know/realize/understand"
  /\bwhat\s+I\s+(?:didn'?t|never|hadn'?t)\s+(?:know|realize|understand|expect|anticipate|see|notice|imagine)\b/i,

  // "my heart/mind/soul/gut"
  /\bmy\s+(?:heart|mind|soul|gut|conscience|spirit|inner)\b/i,

  // "deep down" / "inside me" / "within me"
  /\b(?:deep\s+down|inside\s+(?:me|myself)|within\s+(?:me|myself))\b/i,

  // Emotional state descriptions
  /\b(?:a\s+(?:wave|surge|pang|rush|flood|sense|feeling)\s+of)\b/i,

  // "the thought of" / "the idea of" / "the realization that" / "the importance of"
  /\b(?:the\s+(?:thought|idea|notion|realization|understanding|feeling|sense|fear|hope|belief|knowledge|importance|significance|meaning|value|beauty|power|truth|reality|lesson|impact|weight|depth|essence|purpose)\s+(?:of|that))\b/i,

  // "I was overwhelmed/moved/touched/struck/torn" + "I became/grew [emotion]"
  /\bI\s+(?:was|am|felt|feel|became|grew)\s+(?:overwhelm|moved|touch|struck|torn|conflicted|confused|certain|unsure|grateful|ashamed|proud|humbled|inspired|motivated|discouraged|encouraged|determined|afraid|anxious|nervous|excited|thrilled|devastated|heartbroken|relieved|content|satisfied|dissatisfied|frustrated|fulfilled|empty|alive|numb|lost|found|confident|comfortable|uncomfortable|curious|passionate|aware|conscious)/i,

  // Questions to self
  /\b(?:I\s+asked\s+myself|I\s+questioned\s+(?:whether|if|why|how))\b/i,

  // Inner monologue markers
  /\b(?:perhaps|maybe)\s+(?:I|it|this|that)\b/i,

  // "looking back" / "in hindsight" / "in retrospect"
  /\b(?:looking\s+back|in\s+hindsight|in\s+retrospect|upon\s+reflection|reflecting\s+on)\b/i,

  // "I have since learned/come to appreciate"
  /\bI\s+have\s+since\s+(?:learned|come\s+to|realized|understood|grown|changed|become)\b/i,

  // "to this day" (ongoing internal state)
  /\bto\s+this\s+day\b/i,
];

/* ─── Action / Dynamic Verbs ───
   Verbs that signal external action, physical activity, concrete events.
   Sources: dynamic verbs research, action verb lists. */

const ACTION_VERBS = new Set([
  // Physical movement
  'run', 'ran', 'walk', 'walked', 'jump', 'jumped', 'climb', 'climbed',
  'swim', 'swam', 'fly', 'flew', 'drive', 'drove', 'ride', 'rode',
  'sprint', 'sprinted', 'rush', 'rushed', 'dash', 'dashed', 'march', 'marched',
  'stride', 'strode', 'crawl', 'crawled', 'leap', 'leapt', 'leaped',
  'race', 'raced', 'chase', 'chased', 'flee', 'fled', 'hurry', 'hurried',
  'travel', 'traveled', 'travelled', 'arrive', 'arrived', 'depart', 'departed',
  'enter', 'entered', 'exit', 'exited', 'leave', 'left', 'return', 'returned',
  'move', 'moved', 'step', 'stepped', 'stand', 'stood', 'sit', 'sat',

  // Physical actions
  'grab', 'grabbed', 'push', 'pushed', 'pull', 'pulled', 'lift', 'lifted',
  'carry', 'carried', 'throw', 'threw', 'catch', 'caught', 'kick', 'kicked',
  'hit', 'hold', 'held', 'drop', 'dropped', 'pick', 'picked', 'place', 'placed',
  'put', 'pour', 'poured', 'cut', 'build', 'built', 'break', 'broke',
  'fix', 'fixed', 'repair', 'repaired', 'assemble', 'assembled',
  'dig', 'dug', 'plant', 'planted', 'paint', 'painted', 'draw', 'drew',
  'write', 'wrote', 'type', 'typed', 'sign', 'signed', 'pack', 'packed',
  'open', 'opened', 'close', 'closed', 'shut', 'lock', 'locked',
  'turn', 'turned', 'twist', 'twisted', 'fold', 'folded', 'tear', 'tore',

  // Gesture & body language
  'nod', 'nodded', 'shrug', 'shrugged', 'wave', 'waved', 'gesture', 'gestured',
  'point', 'pointed', 'duck', 'ducked', 'dodge', 'dodged', 'crouch', 'crouched',
  'kneel', 'knelt', 'kneeled', 'seize', 'seized', 'snatch', 'snatched',

  // Manner of walking
  'stumble', 'stumbled', 'stagger', 'staggered', 'stroll', 'strolled',
  'trudge', 'trudged', 'limp', 'limped', 'dive', 'dived', 'dove',
  'soar', 'soared', 'glide', 'glided', 'slip', 'slipped',
  'tumble', 'tumbled', 'roll', 'rolled', 'spin', 'spun',

  // Manipulation & craft
  'craft', 'crafted', 'carve', 'carved', 'sculpt', 'sculpted',
  'mold', 'molded', 'shape', 'shaped', 'slice', 'sliced',
  'chop', 'chopped', 'smash', 'smashed', 'crush', 'crushed',
  'mix', 'mixed', 'stir', 'stirred', 'hammer', 'hammered',

  // Communication actions (external)
  'say', 'said', 'tell', 'told', 'ask', 'asked', 'answer', 'answered',
  'speak', 'spoke', 'shout', 'shouted', 'whisper', 'whispered',
  'call', 'called', 'announce', 'announced', 'declare', 'declared',
  'explain', 'explained', 'describe', 'described', 'argue', 'argued',
  'discuss', 'discussed', 'debate', 'debated', 'present', 'presented',
  'teach', 'taught', 'instruct', 'instructed', 'lecture', 'lectured',
  'yell', 'yelled', 'scream', 'screamed', 'cry', 'cried', 'laugh', 'laughed',
  'sing', 'sang', 'read', 'recite', 'recited',
  'murmur', 'murmured', 'mutter', 'muttered', 'mumble', 'mumbled',
  'stammer', 'stammered', 'stutter', 'stuttered', 'plead', 'pleaded',
  'beg', 'begged', 'demand', 'demanded', 'convince', 'convinced',
  'persuade', 'persuaded', 'negotiate', 'negotiated', 'warn', 'warned',

  // Work & creation
  'work', 'worked', 'create', 'created', 'make', 'made', 'produce', 'produced',
  'design', 'designed', 'develop', 'developed', 'construct', 'constructed',
  'establish', 'established', 'found', 'founded', 'launch', 'launched',
  'organize', 'organized', 'manage', 'managed', 'lead', 'led',
  'direct', 'directed', 'coordinate', 'coordinated', 'implement', 'implemented',
  'execute', 'executed', 'perform', 'performed', 'complete', 'completed',
  'finish', 'finished', 'accomplish', 'accomplished', 'achieve', 'achieved',
  'earn', 'earned', 'win', 'won', 'score', 'scored', 'succeed', 'succeeded',

  // Social actions
  'meet', 'met', 'greet', 'greeted', 'visit', 'visited', 'join', 'joined',
  'help', 'helped', 'assist', 'assisted', 'support', 'supported',
  'volunteer', 'volunteered', 'serve', 'served', 'donate', 'donated',
  'share', 'shared', 'give', 'gave', 'send', 'sent', 'receive', 'received',
  'invite', 'invited', 'introduce', 'introduced', 'welcome', 'welcomed',
  'gather', 'gathered', 'recruit', 'recruited', 'mentor', 'mentored',

  // Competitive / athletic
  'compete', 'competed', 'train', 'trained', 'practice', 'practiced',
  'play', 'played', 'fight', 'fought', 'defend', 'defended',
  'tackle', 'tackled', 'shoot', 'shot', 'pass', 'passed',

  // Daily actions
  'eat', 'ate', 'cook', 'cooked', 'drink', 'drank', 'sleep', 'slept',
  'wake', 'woke', 'dress', 'dressed', 'wash', 'washed', 'clean', 'cleaned',
  'buy', 'bought', 'sell', 'sold', 'pay', 'paid', 'spend', 'spent',
  'wear', 'wore', 'change', 'changed',
]);

/* ─── Externalized phrase patterns ───
   Patterns that signal description of events, actions, concrete happenings. */

const EXTERNALIZED_PATTERNS: RegExp[] = [
  // Temporal action markers
  /\b(?:I|we|he|she|they)\s+(?:went|came|took|got|made|gave|saw|heard|ran|walked|drove|flew|built|created|started|began|finished|completed)\b/i,

  // "Every day/week/morning" habitual action
  /\b(?:every\s+(?:day|week|morning|evening|night|summer|winter|year)|each\s+(?:day|week|morning))\b/i,

  // Time-anchored events
  /\b(?:one\s+(?:day|morning|evening|night|summer|winter)|last\s+(?:year|summer|week|month)|the\s+(?:next|following)\s+(?:day|week|month|year))\b/i,

  // Dialogue markers
  /[""][^""]+[""](?:\s*(?:I|he|she|they|we)\s+(?:said|asked|replied|whispered|shouted|exclaimed|muttered))?/i,

  // Concrete location markers
  /\b(?:at\s+the|in\s+the|on\s+the|inside\s+the|outside\s+the|across\s+the|through\s+the|behind\s+the)\s+\w+/i,

  // Lists of actions (X, Y, and Z-ed)
  /\b(?:and\s+then|after\s+that|next|afterward|subsequently|meanwhile|finally|eventually|immediately|suddenly|quickly)\b/i,

  // Sensory detail patterns (strong external signal)
  /\b(?:the\s+(?:sound|smell|taste|sight|feel|touch|warmth|cold|chill|heat|light|darkness|noise|silence|aroma|stench|fragrance|texture|weight)\s+of)\b/i,

  // Specific temporal anchors
  /\b(?:at\s+(?:dawn|dusk|noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))|on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/i,
];

/* ─── Passive Voice Detection ───
   Based on Purdue OWL: form of "to be" + past participle = passive voice.
   "be" forms: am, is, are, was, were, been, being, be
   Past participle: typically ends in -ed, -en, -t, -n, or irregular forms. */

const BE_FORMS = /\b(?:am|is|are|was|were|been|being|be|get|got|gets|getting)\b/i;

// Common irregular past participles for passive detection
const IRREGULAR_PARTICIPLES = 'given|taken|made|done|seen|shown|known|gone|written|broken|chosen|driven|eaten|fallen|forgotten|frozen|hidden|ridden|risen|spoken|stolen|sworn|torn|woken|worn|born|built|bought|brought|caught|felt|found|held|kept|left|lost|meant|met|paid|put|read|said|sent|set|shot|shut|sold|spent|stood|struck|taught|thought|told|understood|won|hurt|stuck|fed|shaken|swept|hung|lit|grown|dealt|begun|spread|gotten|bent|blown|fought|bitten|bled|led|lent|let|quit|slid|spun|stung|swum|swung|sunk|sung|rung';

// More specific passive patterns
const PASSIVE_PATTERNS: RegExp[] = [
  // "was/were + past participle"
  new RegExp(`\\b(?:was|were)\\s+(?:\\w+ed|${IRREGULAR_PARTICIPLES})\\b`, 'i'),

  // "is/are/am + being + past participle"
  /\b(?:is|are|am)\s+being\s+\w+(?:ed|en|t|n)\b/i,

  // "has/have/had + been + past participle"
  /\b(?:has|have|had)\s+been\s+\w+(?:ed|en|t|n)\b/i,

  // "will be / can be / should be / must be + past participle"
  /\b(?:will|can|could|should|would|must|may|might|shall)\s+be\s+\w+(?:ed|en|t|n)\b/i,

  // "get/got + past participle" (informal passive)
  new RegExp(`\\b(?:get|got|gets|getting)\\s+(?:\\w+ed|${IRREGULAR_PARTICIPLES})\\b`, 'i'),
];

// Exceptions: "was/were + adjective" (not truly passive)
// e.g., "was happy", "was tired", "was excited" (state, not passive action)
const STATE_ADJECTIVES = new Set([
  'happy', 'sad', 'tired', 'excited', 'scared', 'afraid', 'angry', 'upset',
  'glad', 'sorry', 'ready', 'able', 'unable', 'aware', 'unaware', 'alive',
  'dead', 'asleep', 'awake', 'alone', 'sure', 'unsure', 'certain', 'uncertain',
  'right', 'wrong', 'busy', 'free', 'late', 'early', 'old', 'young', 'new',
  'full', 'empty', 'open', 'closed', 'hot', 'cold', 'warm', 'cool', 'tall',
  'short', 'big', 'small', 'fast', 'slow', 'loud', 'quiet', 'dark', 'bright',
  'clean', 'dirty', 'dry', 'wet', 'hard', 'soft', 'rough', 'smooth',
  'sick', 'well', 'healthy', 'hungry', 'thirsty', 'different', 'similar',
  'important', 'necessary', 'possible', 'impossible', 'available', 'comfortable',
]);

/* ─── Sentence Splitting ─── */

function splitSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // Split on sentence-ending punctuation followed by space or end, but be
  // careful with abbreviations (Mr., Mrs., Dr., etc.) and decimal numbers.
  const raw = text
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/([.!?])$/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return raw;
}

/* ─── Classification Logic ─── */

function getWords(sentence: string): string[] {
  return sentence.toLowerCase().replace(/[^a-z'\s-]/g, ' ').split(/\s+/).filter(w => w.length > 0);
}

function detectPassive(sentence: string): boolean {
  // Check against specific passive patterns
  for (const pattern of PASSIVE_PATTERNS) {
    if (pattern.test(sentence)) {
      // Check it's not just "was + state adjective"
      const wasMatch = sentence.match(/\b(?:was|were|is|are|am)\s+(\w+)/i);
      if (wasMatch && STATE_ADJECTIVES.has(wasMatch[1].toLowerCase())) {
        continue; // Not passive, just a state description
      }
      return true;
    }
  }
  return false;
}

function classifySentence(sentence: string): AnalyzedSentence {
  const words = getWords(sentence);
  const isPassive = detectPassive(sentence);

  let internalScore = 0;
  let externalScore = 0;

  // Check for cognitive/mental state verbs
  for (const word of words) {
    if (COGNITIVE_VERBS.has(word)) {
      internalScore += 2;
    }
    if (ACTION_VERBS.has(word)) {
      externalScore += 2;
    }
  }

  // Check internalized patterns
  for (const pattern of INTERNALIZED_PATTERNS) {
    if (pattern.test(sentence)) {
      internalScore += 3;
    }
  }

  // Check externalized patterns
  for (const pattern of EXTERNALIZED_PATTERNS) {
    if (pattern.test(sentence)) {
      externalScore += 3;
    }
  }

  // Determine type
  let type: SentenceType = 'neutral';
  const totalScore = internalScore + externalScore;

  if (totalScore === 0 || words.length < 3) {
    type = 'neutral';
  } else if (internalScore > externalScore) {
    type = 'internalized';
  } else if (externalScore > internalScore) {
    type = 'externalized';
  } else {
    // Equal scores — look at subtle cues
    // Sentences with "I" + cognitive verb lean internal
    if (/\bI\b/.test(sentence) && internalScore > 0) {
      type = 'internalized';
    } else {
      type = 'neutral'; // Truly ambiguous
    }
  }

  // Confidence: how decisive the classification is
  const confidence = totalScore > 0
    ? Math.abs(internalScore - externalScore) / totalScore
    : 0;

  return {
    text: sentence,
    type,
    isPassive,
    confidence: Math.min(confidence, 1),
  };
}

/* ─── Public API ─── */

export function analyzeSentences(text: string): AnalyzedSentence[] {
  const sentences = splitSentences(text);
  return sentences.map(classifySentence);
}

export function computeStats(analyzed: AnalyzedSentence[]): AnalysisStats {
  const total = analyzed.length;
  if (total === 0) {
    return { total: 0, internalized: 0, externalized: 0, neutral: 0, passive: 0, balanceRatio: 0.5 };
  }

  const internalized = analyzed.filter(s => s.type === 'internalized').length;
  const externalized = analyzed.filter(s => s.type === 'externalized').length;
  const neutral = analyzed.filter(s => s.type === 'neutral').length;
  const passive = analyzed.filter(s => s.isPassive).length;

  // Balance ratio: 0.5 means perfect balance, 0 means all external, 1 means all internal
  const classified = internalized + externalized;
  const balanceRatio = classified > 0 ? internalized / classified : 0.5;

  return { total, internalized, externalized, neutral, passive, balanceRatio };
}

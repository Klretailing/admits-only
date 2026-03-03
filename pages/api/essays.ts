import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

/* ══════════════════════════════════════════════════════════════════════
   ADMISSIONS-GRADE ESSAY SCORING ENGINE
   ──────────────────────────────────────────────────────────────────────
   5 dimensions stored in DB:
     1. aiScore      → "Voice & Authenticity"  (AI detection + genuine voice)
     2. vocabScore    → "Language & Precision"  (vocabulary + register)
     3. grammarScore  → "Structure & Coherence" (grammar + paragraph flow + topic drift)
     4. originalityScore → "Storytelling"       (show-vs-tell + vivid details + narrative arc)
     5. overallScore  → "Admissions Impact"     (prompt alignment + personal insight + overall)
   ══════════════════════════════════════════════════════════════════════ */

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','shall',
  'must','of','in','to','for','with','on','at','from','by','about','as','into',
  'through','during','before','after','above','below','between','out','off','over',
  'under','again','further','then','once','here','there','when','where','why','how',
  'all','both','each','few','more','most','other','some','such','no','nor','not',
  'only','own','same','so','than','too','very','just','because','but','and','or',
  'if','while','that','this','these','those','my','me','i','we','our','you','your',
  'he','she','it','they','them','his','her','its','their','what','which','who',
  'whom','also','like','even','really','actually','basically','just','thing','things',
  'many','much','well','still','also','back','been','going','went','come','came',
  'said','make','made','know','knew','think','thought','take','took','get','got',
  'want','wanted','see','saw','time','way','people','know','good','new','first',
]);

function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z']/g, ''));
  return new Set(words.filter(w => w.length > 3 && !STOP_WORDS.has(w)));
}

/* ──── 1. VOICE & AUTHENTICITY ──── */

const AI_PATTERNS = [
  /\bin conclusion\b/gi, /\bfurthermore\b/gi, /\bmoreover\b/gi,
  /\bit is worth noting\b/gi, /\bit is important to note\b/gi,
  /\bin today'?s (?:world|society|day and age)\b/gi, /\bas a matter of fact\b/gi,
  /\bdelve\b/gi, /\btapestry\b/gi, /\bundeniably\b/gi, /\bleverage\b/gi,
  /\bparadigm\b/gi, /\bsynergy\b/gi, /\bplethora\b/gi, /\bmyriad of\b/gi,
  /\bseamless(?:ly)?\b/gi, /\bembark on (?:a|this) journey\b/gi,
  /\bthis essay (?:will|aims to)\b/gi, /\boverall[,]? (?:it can be|we can)\b/gi,
  /\bfacilitate\b/gi, /\butilize\b/gi, /\boptimize\b/gi,
  /\bin (?:essence|summary)\b/gi, /\bwithout a doubt\b/gi,
];

const AI_STRUCTURAL = [
  /^(?:In |The |This |It is |One of |There (?:is|are) )/m,
  /\b(?:firstly|secondly|thirdly|lastly)\b/gi,
  /\b(?:on the other hand|that being said|having said that)\b/gi,
];

// Markers of authentic personal voice
const PERSONAL_VOICE_MARKERS = [
  /\bI remember\b/gi, /\bI noticed\b/gi, /\bI couldn'?t\b/gi,
  /\bmy (?:mom|dad|mother|father|sister|brother|friend|coach|teacher)\b/gi,
  /\bI (?:looked|stared|watched|listened|heard|felt|smelled|tasted)\b/gi,
  /\bI whispered\b/gi, /\bI laughed\b/gi, /\bI froze\b/gi,
  /"[^"]{5,}"/g, // dialogue
  /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, // specific times
];

function analyzeVoice(text: string, sentences: string[], wordCount: number): number {
  let score = 85; // start with high baseline

  // AI pattern penalties
  let aiFlags = 0;
  for (const pat of AI_PATTERNS) { const m = text.match(pat); if (m) aiFlags += m.length; }
  for (const pat of AI_STRUCTURAL) { const m = text.match(pat); if (m) aiFlags += m.length * 0.5; }
  const flagDensity = aiFlags / Math.max(wordCount / 100, 1);
  score -= Math.min(flagDensity * 15, 50);

  // Sentence length uniformity (AI → uniform)
  if (sentences.length >= 4) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
    const cv = Math.sqrt(variance) / Math.max(mean, 1);
    if (cv < 0.2) score -= 15; // very uniform → likely AI
    else if (cv < 0.3) score -= 5;
    else if (cv > 0.5) score += 5; // varied → likely human
  }

  // Personal voice bonuses
  let personalMarkers = 0;
  for (const pat of PERSONAL_VOICE_MARKERS) {
    const m = text.match(pat);
    if (m) personalMarkers += m.length;
  }
  score += Math.min(personalMarkers * 3, 15);

  // Paragraph uniformity check
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const pLengths = paragraphs.map(p => p.trim().split(/\s+/).length);
    const pMean = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
    const pVar = pLengths.reduce((sum, l) => sum + Math.pow(l - pMean, 2), 0) / pLengths.length;
    if (Math.sqrt(pVar) / Math.max(pMean, 1) < 0.12) score -= 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ──── 2. LANGUAGE & PRECISION ──── */

const ADVANCED_VOCAB = [
  'ambivalent','ephemeral','juxtapose','nuance','quintessential','ubiquitous',
  'vicarious','anomaly','dichotomy','eloquent','fervent','gregarious',
  'idiosyncratic','meticulous','nonchalant','pragmatic','resilient','tenacious',
  'vivacious','zealous','ameliorate','benevolent','cacophony','diligent',
  'ebullient','fortuitous','galvanize','harbinger','impervious','lucid',
  'magnanimous','nascent','penchant','sanguine','tangential','venerate',
  'whimsical','acumen','brevity','candor','equanimity','fastidious',
  'hubris','innate','judicious','lament','opaque','pervasive','succinct',
  'trepidation','unequivocal','melancholy','catharsis','sublime','visceral',
  'evocative','poignant','compelling','nuanced','profound','intricate',
];

// Overused weak words that should be replaced
const WEAK_WORDS = [
  /\bvery\b/gi, /\breally\b/gi, /\ba lot\b/gi, /\bnice\b/gi,
  /\bgood\b/gi, /\bbad\b/gi, /\bbig\b/gi, /\bsmall\b/gi,
  /\bthing(?:s)?\b/gi, /\bstuff\b/gi, /\bgot\b/gi,
];

function analyzeLanguage(words: string[], wordCount: number, text: string): number {
  let score = 50;

  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z']/g, ''));
  const uniqueWords = new Set(lowerWords);
  const lexicalDiversity = uniqueWords.size / Math.max(wordCount, 1);

  // Advanced vocabulary
  let advancedCount = 0;
  for (const w of lowerWords) { if (ADVANCED_VOCAB.includes(w)) advancedCount++; }
  score += Math.min(advancedCount * 6, 25);

  // Lexical diversity
  if (lexicalDiversity > 0.6) score += 12;
  else if (lexicalDiversity > 0.5) score += 8;
  else if (lexicalDiversity > 0.4) score += 4;
  else score -= 5;

  // Weak word penalty
  let weakCount = 0;
  for (const pat of WEAK_WORDS) { const m = text.match(pat); if (m) weakCount += m.length; }
  const weakDensity = weakCount / Math.max(wordCount / 100, 1);
  score -= Math.min(weakDensity * 4, 15);

  // Length bonus
  if (wordCount >= 400 && wordCount <= 800) score += 8;
  else if (wordCount >= 250) score += 4;

  return Math.max(10, Math.min(100, Math.round(score)));
}

/* ──── 3. STRUCTURE & COHERENCE ──── */

const GRAMMAR_ISSUES = [
  { pattern: /\bi\b/g, weight: 0.5 },
  { pattern: /\s{2,}/g, weight: 0.3 },
  { pattern: /[.!?]\s*[a-z]/g, weight: 0.8 },
  { pattern: /\balot\b/gi, weight: 1 },
  { pattern: /\bcould of\b/gi, weight: 1 },
  { pattern: /\bshould of\b/gi, weight: 1 },
  { pattern: /\bwould of\b/gi, weight: 1 },
  { pattern: /([.!?])\1{2,}/g, weight: 0.5 },
  { pattern: /\bvery\s+very\b/gi, weight: 0.5 },
  { pattern: /\bthere\b.*\btheir\b/gi, weight: 0.3 },
  { pattern: /\byour\b.*\byou're\b/gi, weight: 0.3 },
];

const TRANSITION_WORDS = new Set([
  'however','therefore','meanwhile','consequently','furthermore','additionally',
  'similarly','conversely','nonetheless','instead','likewise','accordingly',
  'specifically','notably','although','despite','yet','still','but','so',
  'then','next','later','finally','afterward','subsequently',
]);

// Semantic topic clusters for detecting real topic changes
const TOPIC_CLUSTERS: Record<string, Set<string>> = {
  cooking: new Set(['cook','cooking','kitchen','recipe','bake','baking','food','chef','meal','ingredient','oven','dish','stove','flour','taste','dinner','lunch','breakfast','restaurant','culinary','spice','flavor','plate','serve','dough','pan','pot']),
  sports: new Set(['sport','team','game','play','score','win','lose','coach','practice','athlete','field','court','ball','race','swim','train','tournament','championship','compete','match','season','captain']),
  leadership: new Set(['lead','leader','leadership','manage','direct','organize','president','captain','guide','mentor','initiative','responsibility','delegate','decision','authority','influence','inspire','motivate','vision','strategic']),
  science: new Set(['research','experiment','hypothesis','data','lab','laboratory','science','scientific','biology','chemistry','physics','study','analysis','theory','discovery','molecule','cell','gene','equation','variable']),
  music: new Set(['music','instrument','play','song','band','orchestra','choir','sing','concert','perform','piano','guitar','violin','drum','melody','harmony','rhythm','compose','note','practice']),
  writing: new Set(['write','writing','essay','story','poem','author','book','read','literature','novel','journal','publish','edit','draft','word','chapter','paragraph','narrative','creative','fiction']),
  volunteer: new Set(['volunteer','community','service','help','donate','charity','nonprofit','fundraise','shelter','tutor','mentor','serve','impact','support','advocate','outreach','humanitarian']),
  technology: new Set(['code','program','software','computer','tech','technology','app','website','develop','algorithm','digital','data','cyber','hack','build','design','engineer','system','network','database']),
};

function detectTopicCluster(keywords: Set<string>): { cluster: string; strength: number }[] {
  const results: { cluster: string; strength: number }[] = [];
  for (const [cluster, words] of Object.entries(TOPIC_CLUSTERS)) {
    let matches = 0;
    for (const w of keywords) { if (words.has(w)) matches++; }
    if (matches >= 2) results.push({ cluster, strength: matches });
  }
  return results.sort((a, b) => b.strength - a.strength);
}

function analyzeStructure(text: string, sentences: string[], wordCount: number, prompt: string = ''): number {
  let score = 80;

  // Grammar issues
  let grammarPenalty = 0;
  for (const rule of GRAMMAR_ISSUES) {
    const m = text.match(rule.pattern);
    if (m) grammarPenalty += m.length * rule.weight;
  }
  score -= Math.min(grammarPenalty * 3, 25);

  // Fragments
  const fragments = sentences.filter(s => s.trim().split(/\s+/).length < 3 && s.trim().length > 0);
  score -= Math.max(0, (fragments.length - 1) * 3);

  // ─── Coherence: multi-layer topic drift detection ───
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  if (paragraphs.length >= 2) {
    const paraKeywords = paragraphs.map(p => extractKeywords(p));

    // Layer 1: Build essay-wide topic profile
    const allKeywords = extractKeywords(text);
    const essayTopics = detectTopicCluster(allKeywords);
    const dominantTopic = essayTopics[0]?.cluster || '';

    // Layer 2: Prompt-anchored coherence
    const promptKeywords = prompt ? extractKeywords(prompt) : new Set<string>();
    const promptTopics = prompt ? detectTopicCluster(promptKeywords) : [];
    const promptTopic = promptTopics[0]?.cluster || '';

    // Layer 3: Per-paragraph topic analysis
    const paraTopics = paragraphs.map(p => detectTopicCluster(extractKeywords(p)));

    // Check consecutive paragraph coherence (keyword overlap)
    for (let i = 1; i < paraKeywords.length; i++) {
      const prev = paraKeywords[i - 1];
      const curr = paraKeywords[i];
      if (prev.size < 3 || curr.size < 3) continue;

      let overlap = 0;
      for (const w of curr) { if (prev.has(w)) overlap++; }
      const overlapRatio = overlap / Math.min(prev.size, curr.size);

      if (overlapRatio < 0.03) score -= 18; // severe topic drift
      else if (overlapRatio < 0.08) score -= 10; // weak transition
    }

    // Check semantic topic shifts between paragraphs
    for (let i = 1; i < paraTopics.length; i++) {
      const prevClusters = new Set(paraTopics[i - 1].map(t => t.cluster));
      const currClusters = paraTopics[i].map(t => t.cluster);

      if (prevClusters.size > 0 && currClusters.length > 0) {
        const hasCommonTopic = currClusters.some(c => prevClusters.has(c));
        if (!hasCommonTopic) {
          // Different semantic topics in consecutive paragraphs
          score -= 15;
        }
      }
    }

    // Check for orphan paragraphs (no overlap with ANY other paragraph)
    for (let i = 0; i < paraKeywords.length; i++) {
      if (paraKeywords[i].size < 3) continue;
      let hasConnectionToAny = false;
      for (let j = 0; j < paraKeywords.length; j++) {
        if (i === j || paraKeywords[j].size < 3) continue;
        let overlap = 0;
        for (const w of paraKeywords[i]) { if (paraKeywords[j].has(w)) overlap++; }
        if (overlap / Math.min(paraKeywords[i].size, paraKeywords[j].size) >= 0.05) {
          hasConnectionToAny = true;
          break;
        }
      }
      if (!hasConnectionToAny) score -= 15; // orphan paragraph — completely disconnected
    }

    // Check if paragraphs match the dominant essay topic
    if (dominantTopic && paraTopics.length >= 3) {
      for (let i = 0; i < paraTopics.length; i++) {
        const paraClusters = paraTopics[i].map(t => t.cluster);
        if (paraClusters.length > 0 && !paraClusters.includes(dominantTopic)) {
          // This paragraph is about a different topic than the essay's main theme
          score -= 8;
        }
      }
    }

    // Prompt-anchored: penalize paragraphs that don't relate to prompt topic
    if (promptTopic && paraTopics.length >= 2) {
      let offTopicCount = 0;
      for (let i = 0; i < paraTopics.length; i++) {
        const paraClusters = paraTopics[i].map(t => t.cluster);
        // Only check paragraphs that have detectable topics
        if (paraClusters.length > 0 && !paraClusters.includes(promptTopic)) {
          // Check keyword overlap with prompt as fallback
          let promptOverlap = 0;
          for (const w of paraKeywords[i]) { if (promptKeywords.has(w)) promptOverlap++; }
          if (promptOverlap === 0) offTopicCount++;
        }
      }
      if (offTopicCount >= 2) score -= 12;
      else if (offTopicCount === 1) score -= 5;
    }

    // Check if later paragraphs relate to intro
    if (paraKeywords.length >= 3) {
      const introKeys = paraKeywords[0];
      for (let i = 2; i < paraKeywords.length; i++) {
        if (introKeys.size < 3 || paraKeywords[i].size < 3) continue;
        let introOverlap = 0;
        for (const w of paraKeywords[i]) { if (introKeys.has(w)) introOverlap++; }
        // Last paragraph should circle back
        if (i === paraKeywords.length - 1 && introOverlap === 0) score -= 10;
      }
    }
  }

  // Transition word usage (reward natural flow)
  const lowerWords = text.toLowerCase().split(/\s+/);
  const transitionCount = lowerWords.filter(w => TRANSITION_WORDS.has(w.replace(/[^a-z]/g, ''))).length;
  if (paragraphs.length >= 3 && transitionCount >= paragraphs.length - 1) score += 5;
  else if (paragraphs.length >= 3 && transitionCount < 1) score -= 5;

  return Math.max(5, Math.min(100, Math.round(score)));
}

/* ──── 4. STORYTELLING (Show-vs-Tell + Narrative Arc + Originality) ──── */

const SENSORY_WORDS = new Set([
  'saw','heard','felt','smelled','tasted','touched','warm','cold','bright',
  'dark','loud','soft','rough','smooth','bitter','sweet','sharp','heavy',
  'light','trembling','glowing','whispering','crackling','humming','buzzing',
  'shimmering','blazing','gleaming','flickering','murmuring','roaring',
  'tingling','throbbing','aching','burning','freezing','damp','crisp',
  'silky','grainy','sour','pungent','fragrant','stale','vivid','pale',
]);

// "Tell" patterns: abstract declarations instead of showing
const TELL_PATTERNS = [
  /\bI (?:learned|realized|understood|discovered) (?:that |how )/gi,
  /\b(?:it|this) (?:was|is) (?:important|significant|meaningful|valuable|special)\b/gi,
  /\bthis (?:experience|event|moment|activity) (?:taught|showed|proved|demonstrated)\b/gi,
  /\bI felt (?:happy|sad|proud|nervous|excited|grateful|thankful|inspired)\b/gi,
  /\bI (?:am|was) (?:grateful|thankful|appreciative|passionate|dedicated)\b/gi,
  /\bI (?:have|had) always (?:been|wanted)\b/gi,
  /\bever since I (?:was|can remember)\b/gi,
];

// "Show" indicators: vivid, scene-based writing
const SHOW_PATTERNS = [
  /"[^"]{5,}"/g, // dialogue
  /\b\d+(?::\d+)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, // specific times
  /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
  /\bI (?:remember|recall)\b/gi,
  /\b(?:walked|ran|sat|stood|leaned|reached|grabbed|dropped|spilled|stumbled|whispered|shouted|laughed|cried|gasped|froze|paused|hesitated)\b/gi,
];

const CLICHE_PHRASES = [
  'changed my life','eye-opening experience','made me who i am today',
  'since i was a child','ever since i can remember','throughout my life',
  'passion for helping others','diverse background','global citizen',
  'giving back to the community','step outside my comfort zone',
  'learn from my mistakes','the world around me','opened my eyes',
  'broaden my horizons','follow my dreams','make a difference',
  'hard work and dedication','never give up','once in a lifetime',
  'be the change','a rewarding experience','shaped who i am',
  'at the end of the day','in the grand scheme of things',
  'i have always been passionate','sparked my interest',
  'taught me the importance of','opened doors','defining moment',
  'played a pivotal role','left an indelible mark',
];

// Weak opening patterns that AOs flag
const WEAK_OPENINGS = [
  /^I have always /i, /^Since I was /i, /^Growing up,? /i,
  /^Throughout my life/i, /^Ever since /i, /^From a young age/i,
  /^When I was (?:young|little|a child)/i, /^My name is /i,
  /^In this essay/i, /^Webster'?s dictionary defines/i,
];

function analyzeStorytelling(text: string, sentences: string[], wordCount: number): number {
  let score = 55;
  const lowerText = text.toLowerCase();

  // Show vs Tell ratio
  let showCount = 0;
  for (const pat of SHOW_PATTERNS) { const m = text.match(pat); if (m) showCount += m.length; }
  let tellCount = 0;
  for (const pat of TELL_PATTERNS) { const m = text.match(pat); if (m) tellCount += m.length; }

  if (showCount > tellCount * 2) score += 15;
  else if (showCount > tellCount) score += 8;
  else if (tellCount > showCount * 2) score -= 12;
  else if (tellCount > showCount) score -= 5;

  // Sensory language density
  const words = text.toLowerCase().split(/\s+/);
  const sensoryCount = words.filter(w => SENSORY_WORDS.has(w.replace(/[^a-z]/g, ''))).length;
  const sensoryDensity = sensoryCount / Math.max(wordCount / 100, 1);
  if (sensoryDensity > 3) score += 12;
  else if (sensoryDensity > 1.5) score += 6;
  else if (sensoryDensity < 0.5 && wordCount > 100) score -= 8;

  // Specific details (proper nouns, numbers)
  const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  const numbersInText = text.match(/\b\d+\b/g) || [];
  if (properNouns.length >= 3) score += 6;
  if (numbersInText.length >= 2) score += 4;

  // Cliche penalty
  let clicheCount = 0;
  for (const phrase of CLICHE_PHRASES) { if (lowerText.includes(phrase)) clicheCount++; }
  score -= clicheCount * 6;

  // Opening strength
  const firstLine = text.split(/[.!?\n]/)[0] || '';
  const hasWeakOpening = WEAK_OPENINGS.some(p => p.test(firstLine));
  if (hasWeakOpening) score -= 10;
  // Bonus for action/scene opening
  const ACTION_OPENING = /^(?:(?:The |A |My )?(?:\w+ing |")|I (?:stood|sat|walked|ran|stared|grabbed|remember))/;
  if (ACTION_OPENING.test(firstLine)) score += 8;

  // Narrative arc (temporal progression)
  const temporalMarkers = (text.match(/\b(?:first|then|next|later|after|before|finally|eventually|suddenly|meanwhile|now|today)\b/gi) || []).length;
  if (temporalMarkers >= 3 && wordCount > 200) score += 6;

  // Reflection depth (going beyond surface)
  const reflectionMarkers = (text.match(/\b(?:I (?:wonder|question|began to see|now understand|never expected|didn'?t realize)|looking back|in that moment|what I didn'?t know|it struck me|for the first time)\b/gi) || []).length;
  if (reflectionMarkers >= 2) score += 8;
  else if (reflectionMarkers === 0 && wordCount > 200) score -= 5;

  // Conclusion quality
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const lastPara = paragraphs[paragraphs.length - 1].toLowerCase();
    // Weak conclusions
    if (/\b(?:in conclusion|to summarize|overall|in the end)\b/.test(lastPara)) score -= 5;
    // Strong conclusions: forward-looking or new insight
    if (/\b(?:now I|today I|I will|I plan|I carry|I still|looking ahead|going forward)\b/.test(lastPara)) score += 5;
  }

  // Lexical diversity bonus
  const uniqueWords = new Set(words.map(w => w.replace(/[^a-z']/g, '')));
  const lexDiv = uniqueWords.size / Math.max(wordCount, 1);
  if (lexDiv > 0.55) score += 6;
  else if (lexDiv > 0.45) score += 3;

  return Math.max(5, Math.min(100, Math.round(score)));
}

/* ──── 5. ADMISSIONS IMPACT (prompt alignment + overall quality) ──── */

function analyzeImpact(
  text: string,
  prompt: string,
  wordCount: number,
  voiceScore: number,
  languageScore: number,
  structureScore: number,
  storytellingScore: number,
): number {
  let score = 0;

  // ─── Prompt Alignment ───
  let promptAlignment = 75; // default if no prompt
  if (prompt && prompt.trim().length > 10) {
    const promptKeywords = extractKeywords(prompt);
    const essayKeywords = extractKeywords(text);

    let matched = 0;
    for (const w of promptKeywords) { if (essayKeywords.has(w)) matched++; }
    const matchRatio = promptKeywords.size > 0 ? matched / promptKeywords.size : 0.5;

    promptAlignment = 30 + Math.round(matchRatio * 50);

    // Check if essay directly addresses the prompt's question type
    const promptLower = prompt.toLowerCase();
    const textLower = text.toLowerCase();

    // Detect prompt question type and check for response
    if (/(?:describe|tell us about|share)/.test(promptLower)) {
      // Narrative expected: does essay have scene-setting and specific events?
      const hasNarrative = SHOW_PATTERNS.some(p => p.test(text));
      if (hasNarrative) promptAlignment += 10;
    }
    if (/(?:why|what attracts|what excites)/.test(promptLower)) {
      // Reasoning expected: does essay explain motivations?
      if (/\bbecause\b|\bthe reason\b|\bwhat drew me\b|\bI chose\b/i.test(textLower)) promptAlignment += 8;
    }
    if (/(?:challenge|obstacle|failure|difficult)/.test(promptLower)) {
      if (/\bstruggl|\bfail|\bovercom|\bdifficult|\bsetback/i.test(textLower)) promptAlignment += 10;
      else promptAlignment -= 10;
    }
    if (/(?:creativ|innovat|original|unique|imagin)/.test(promptLower)) {
      if (/\bcreativ|\binnovat|\bdesign|\binvent|\bimagin|\bexperiment|\bunconventional/i.test(textLower)) promptAlignment += 10;
      else promptAlignment -= 10;
    }
    if (/(?:leader|leadership|lead)/.test(promptLower)) {
      if (/\bled\b|\blead|\bdirect|\bmanag|\borganiz|\bguide|\bmentor/i.test(textLower)) promptAlignment += 10;
      else promptAlignment -= 8;
    }
    if (/(?:community|service|volunteer|impact)/.test(promptLower)) {
      if (/\bcommunit|\bvolunteer|\bserv|\bimpact|\bhelp|\badvocate/i.test(textLower)) promptAlignment += 10;
      else promptAlignment -= 8;
    }

    promptAlignment = Math.max(10, Math.min(100, promptAlignment));
  }

  // ─── Personal insight depth ───
  let insightScore = 50;
  const insightPatterns = [
    /\bI (?:never (?:expected|knew|realized)|didn'?t (?:know|realize|expect))\b/gi,
    /\bfor the first time\b/gi,
    /\bI (?:began|started) to (?:see|understand|question|wonder)\b/gi,
    /\blooking back\b/gi,
    /\bI now (?:see|understand|know)\b/gi,
    /\bwhat I (?:thought|assumed|believed)\b/gi,
    /\bI was wrong\b/gi,
    /\bit (?:changed|shifted|transformed) (?:how I|the way I)\b/gi,
  ];
  let insightCount = 0;
  for (const p of insightPatterns) { const m = text.match(p); if (m) insightCount += m.length; }
  insightScore += Math.min(insightCount * 8, 30);
  if (insightCount === 0 && wordCount > 200) insightScore -= 10;

  // ─── Length appropriateness ───
  let lengthScore = 60;
  if (wordCount >= 500 && wordCount <= 700) lengthScore = 100;
  else if (wordCount >= 400 && wordCount <= 800) lengthScore = 85;
  else if (wordCount >= 250 && wordCount <= 1000) lengthScore = 65;
  else if (wordCount >= 100) lengthScore = 40;
  else lengthScore = 20;

  // ─── Weighted final impact score ───
  score = Math.round(
    promptAlignment * 0.20 +
    insightScore * 0.15 +
    voiceScore * 0.15 +
    structureScore * 0.15 +
    storytellingScore * 0.15 +
    languageScore * 0.10 +
    lengthScore * 0.10
  );

  return Math.max(5, Math.min(100, score));
}

/* ──── MAIN SCORING FUNCTION ──── */

function scoreEssay(content: string, prompt: string = '') {
  if (!content || content.trim().length < 50) {
    return { aiScore: null, vocabScore: null, grammarScore: null, originalityScore: null, overallScore: null };
  }

  const text = content.trim();
  const words = text.split(/\s+/);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const voiceScore = analyzeVoice(text, sentences, wordCount);
  const languageScore = analyzeLanguage(words, wordCount, text);
  const structureScore = analyzeStructure(text, sentences, wordCount, prompt);
  const storytellingScore = analyzeStorytelling(text, sentences, wordCount);
  const impactScore = analyzeImpact(text, prompt, wordCount, voiceScore, languageScore, structureScore, storytellingScore);

  return {
    aiScore: Math.round(100 - voiceScore),    // stored as "AI %" (low = good) for backward compat
    vocabScore: Math.round(languageScore),
    grammarScore: Math.round(structureScore),
    originalityScore: Math.round(storytellingScore),
    overallScore: Math.round(impactScore),
  };
}

/* ──── API HANDLER ──── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  if (req.method === 'GET') {
    const essays = await prisma.essay.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ essays });
  }

  if (req.method === 'POST') {
    const { title, prompt, content } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const scores = scoreEssay(content || '', prompt || '');

    const essay = await prisma.essay.create({
      data: {
        userId,
        title: title.trim(),
        prompt: (prompt || '').trim(),
        content: (content || '').trim(),
        status: content && content.trim().length > 50 ? 'Draft' : 'Not Started',
        ...scores,
      },
    });
    return res.status(201).json({ essay });
  }

  if (req.method === 'PUT') {
    const { id, title, prompt, content, status } = req.body;
    if (!id) return res.status(400).json({ error: 'Essay ID is required' });

    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    const essayPrompt = prompt != null ? prompt.trim() : (existing.prompt || '');
    const essayContent = content != null ? content.trim() : (existing.content || '');
    const scores = scoreEssay(essayContent, essayPrompt);

    const essay = await prisma.essay.update({
      where: { id },
      data: {
        ...(title != null ? { title: title.trim() } : {}),
        ...(prompt != null ? { prompt: prompt.trim() } : {}),
        ...(content != null ? { content: content.trim() } : {}),
        ...(status != null ? { status } : {}),
        ...scores,
      },
    });
    return res.json({ essay });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Essay ID is required' });

    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    await prisma.essay.delete({ where: { id } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

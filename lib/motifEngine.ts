/**
 * motifEngine.ts — Motif / activity connection engine
 * =====================================================
 *
 * PURPOSE
 * Given a student's list of short free-text extracurricular/activity
 * descriptions, discover BOTH obvious and non-obvious ("hidden") connections
 * between them and group them into natural clusters.
 *
 * ALGORITHM (high level)
 *   1. Normalize each activity: lowercase, tokenize, drop stopwords, and apply a
 *      conservative Porter-ish stemmer so morphological variants collapse
 *      (e.g. "coding" -> "code", "runners" -> "run").
 *   2. Extract CONCEPTS from a hand-built lexicon. First we scan the raw text for
 *      multi-word phrases ("model un", "cross country", "food bank"), then we look
 *      up single stemmed tokens in a reverse index (stemmed term -> concept tags).
 *      Concepts are either "domain" concepts (music, athletics, programming, ...)
 *      or cross-cutting "non-domain" concepts (leadership, service, resilience...).
 *   3. Vectorize: TF-IDF vectors over stemmed tokens + concept-count vectors.
 *   4. Similarity(a,b) blends concept cosine, tf-idf cosine, and a semantic bonus
 *      that rewards sharing DISTINCTIVE (rare/high-IDF) tokens and multiple
 *      concepts. Rare shared signals are the meaningful "bridges".
 *   5. Pair connections above CONNECTION_FLOOR are recorded, classified as
 *      'obvious' (share a primary domain) or 'hidden' (bridged only by a
 *      non-domain concept or a distinctive term across differing domains), with a
 *      templated human explanation.
 *   6. Agglomerative average-linkage clustering over the similarity matrix merges
 *      the closest clusters while linkage >= MERGE_FLOOR. Clusters of size >= 2
 *      are returned (with dominant concepts, cohesion, and a human label);
 *      singletons become orphans.
 *
 * DETERMINISM
 *   Pure & deterministic — no Math.random, no Date. Every tie is broken by lowest
 *   index so the same input always yields identical output.
 *
 * INDEXING NOTE
 *   Empty/whitespace-only raw activities are skipped. The returned
 *   `activities` array is the FILTERED list, and `activity.index` is the position
 *   WITHIN that returned array (0-based). All connection/cluster/orphan indices
 *   refer to these same filtered positions, NOT the caller's original array.
 */

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Minimum pair strength to be recorded as a connection. */
export const CONNECTION_FLOOR = 0.12;
/** Minimum average-linkage similarity required to merge two clusters. */
export const MERGE_FLOOR = 0.2;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ActivityAnalysis {
  index: number;
  text: string;
  tokens: string[]; // normalized + stemmed content tokens (stopwords removed)
  concepts: string[]; // concept tags evoked by this activity (deduped)
  primaryDomains: string[]; // subset of concepts that are "domain" concepts
}

export interface PairConnection {
  a: number;
  b: number; // activity indices, a < b
  strength: number; // 0..1
  sharedConcepts: string[]; // concept tags both evoke
  sharedTerms: string[]; // distinctive stemmed tokens both share (TF-IDF ranked)
  kind: 'obvious' | 'hidden';
  explanation: string; // one human sentence explaining WHY they connect
}

export interface MotifCluster {
  memberIndices: number[]; // >= 2 members
  dominantConcepts: string[]; // ranked by frequency across members
  cohesion: number; // 0..1 average pairwise similarity within the cluster
  label: string; // short human label, e.g. "Music & Making"
}

export interface MotifEngineResult {
  activities: ActivityAnalysis[];
  connections: PairConnection[]; // strength >= CONNECTION_FLOOR, strongest first
  clusters: MotifCluster[]; // natural groups (each size >= 2), strongest first
  orphans: number[]; // indices not placed in any cluster
}

// ---------------------------------------------------------------------------
// Stopwords
// ---------------------------------------------------------------------------

const STOPWORD_LIST = [
  // grammatical
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at',
  'for', 'with', 'as', 'by', 'from', 'into', 'about', 'over', 'under', 'is',
  'am', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
  'have', 'has', 'had', 'i', 'me', 'my', 'we', 'our', 'us', 'you', 'your',
  'he', 'she', 'it', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
  'so', 'not', 'no', 'yes', 'up', 'down', 'out', 'off', 'than', 'then', 'too',
  'very', 'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'also', 'more', 'most', 'some', 'any', 'each', 'both', 'other', 'all',
  'which', 'who', 'whom', 'what', 'when', 'where', 'how', 'while', 'during',
  'after', 'before', 'through', 'per', 'via', 'get', 'got', 'many', 'much',
  'own', 'via', 'help', 'helped', 'using', 'used', 'use', 'make', 'made',
  'work', 'worked', 'working', 'part', 'well', 'new', 'every', 'day', 'days',
  // filler common in activity descriptions
  'club', 'team', 'member', 'members', 'school', 'high', 'student', 'students',
  'year', 'years', 'hour', 'hours', 'week', 'weeks', 'month', 'months',
  'time', 'times', 'group', 'activity', 'activities', 'program', 'participate',
  'participated', 'involved', 'various', 'different', 'local', 'annual',
];

const STOPWORDS: { [k: string]: boolean } = {};
for (let si = 0; si < STOPWORD_LIST.length; si++) {
  STOPWORDS[STOPWORD_LIST[si]] = true;
}

// ---------------------------------------------------------------------------
// Stemmer
// ---------------------------------------------------------------------------

/**
 * Conservative Porter-ish stemmer. Collapses common morphological variants
 * WITHOUT aggressively merging unrelated words. Never returns an empty string.
 *
 * example: "running"  -> "run"
 * example: "coding"   -> "code"
 * example: "studies"  -> "studi"  (via ies->y then... kept short, still consistent)
 * example: "kindness" -> "kind"
 */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return word.toLowerCase();
  if (w.length <= 3) return w; // too short to safely strip

  const original = w;

  // -ational / -tional handled loosely; general -tion -> -t
  if (/ational$/.test(w)) {
    w = w.replace(/ational$/, 'ate');
  } else if (/tion$/.test(w) && w.length > 5) {
    w = w.replace(/tion$/, 't');
  }

  // derivational suffixes (order matters, longest first)
  if (/iveness$/.test(w)) w = w.replace(/iveness$/, 'ive');
  else if (/fulness$/.test(w)) w = w.replace(/fulness$/, 'ful');
  else if (/ousness$/.test(w)) w = w.replace(/ousness$/, 'ous');
  else if (/ness$/.test(w) && w.length > 5) w = w.replace(/ness$/, '');
  if (/ement$/.test(w) && w.length > 6) w = w.replace(/ement$/, '');
  else if (/ment$/.test(w) && w.length > 5) w = w.replace(/ment$/, '');
  if (/ности$/.test(w)) { /* no-op guard for non-latin, already stripped */ }

  // adverbs / adjectives
  if (/ly$/.test(w) && w.length > 4) w = w.replace(/ly$/, '');

  // plurals
  if (/sses$/.test(w)) {
    w = w.replace(/sses$/, 'ss'); // classes -> class
  } else if (/ies$/.test(w)) {
    w = w.replace(/ies$/, w.length > 4 ? 'y' : 'ie'); // studies -> study; ties -> tie
  } else if (/ss$/.test(w)) {
    // keep (class, chess)
  } else if (/s$/.test(w) && !/us$/.test(w) && w.length > 3) {
    w = w.replace(/s$/, ''); // runs -> run  (but keep "us"/"ss")
  }

  // -ing / -ed with minimal e-restoration
  if (/ing$/.test(w) && w.length > 5) {
    const base = w.replace(/ing$/, '');
    w = maybeRestoreE(base);
  } else if (/edly$/.test(w)) {
    w = maybeRestoreE(w.replace(/edly$/, ''));
  } else if (/ed$/.test(w) && w.length > 4) {
    const base = w.replace(/ed$/, '');
    w = maybeRestoreE(base);
  }

  // -er / -or / -est trimming (conservative)
  if (/er$/.test(w) && w.length > 5) w = maybeRestoreE(w.replace(/er$/, ''));
  else if (/est$/.test(w) && w.length > 5) w = maybeRestoreE(w.replace(/est$/, ''));

  if (w.length === 0) return original;
  return w;
}

/**
 * Restore a trailing 'e' where the base looks like a "-Ce" word.
 * example: "cod" (from "coding") -> "code"; "run" (from "running") -> "run".
 */
function maybeRestoreE(base: string): string {
  if (base.length < 2) return base;
  // If it ends in a doubled consonant (e.g. "runn"), collapse: runn -> run.
  const last = base.charAt(base.length - 1);
  const prev = base.charAt(base.length - 2);
  if (last === prev && isConsonant(last) && last !== 'l' && last !== 's') {
    return base.substring(0, base.length - 1);
  }
  // consonant + (v|d|t|s|c|g|z|k|p) + ... heuristics for e-restoration
  // Common cases: cod->code, writ->write, tim->time, danc->dance, mak->make
  if (/[bcdfgklmnprstvz]$/.test(base) && isVowel(prev) && !isVowel(last)) {
    // pattern V + C ending: likely dropped an 'e' (cod-e, tim-e, dan[c]-e)
    if (/(od|it|im|nc|at|ac|us|iz|is|in|ov|iv|ur|ol|ak|ap|ad|op|ip)$/.test(base)) {
      return base + 'e';
    }
  }
  return base;
}

function isVowel(c: string): boolean {
  return c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u' || c === 'y';
}
function isConsonant(c: string): boolean {
  return /[a-z]/.test(c) && !isVowel(c);
}

// ---------------------------------------------------------------------------
// Concept lexicon
// ---------------------------------------------------------------------------

/** Domain concept tags (sharing one of these => an "obvious" connection). */
const DOMAIN_CONCEPTS: { [k: string]: boolean } = {
  music: true, visual_art: true, theater: true, dance: true,
  creative_writing: true, athletics: true, programming: true, engineering: true,
  robotics: true, science: true, mathematics: true, medicine: true,
  business: true, finance: true, debate: true, government_politics: true,
  journalism: true, film_photo: true, culinary: true, environment: true,
  technology: true, data_ai: true, gaming: true, chess: true, literature: true,
  history: true, psychology: true, law: true, design: true, languages: true,
};

/**
 * Concept -> list of surface trigger terms. Single words are matched on their
 * STEMMED form; multi-word phrases (containing a space) are matched against the
 * raw lowercased text before tokenization.
 */
const CONCEPT_TERMS: { [concept: string]: string[] } = {
  // ------- DOMAIN CONCEPTS -------
  music: [
    'violin', 'piano', 'guitar', 'cello', 'orchestra', 'band', 'choir', 'chorus',
    'jazz', 'composer', 'composing', 'composition', 'singing', 'singer', 'sing',
    'drums', 'drum', 'percussion', 'saxophone', 'flute', 'clarinet', 'trumpet',
    'trombone', 'ensemble', 'recital', 'symphony', 'melody', 'harmony', 'music',
    'musical', 'musician', 'vocal', 'vocalist', 'a cappella', 'acappella',
    'conductor', 'sonata', 'concerto', 'viola', 'bass', 'ukulele', 'songwriting',
    'song', 'rapper', 'dj', 'producer', 'instrument', 'instrumental',
  ],
  visual_art: [
    'painting', 'paint', 'drawing', 'draw', 'sketch', 'sculpture', 'ceramics',
    'pottery', 'illustration', 'illustrator', 'mural', 'canvas', 'acrylic',
    'watercolor', 'charcoal', 'portrait', 'gallery', 'exhibit', 'exhibition',
    'artwork', 'artist', 'visual art', 'fine art', 'printmaking', 'collage',
  ],
  theater: [
    'theater', 'theatre', 'drama', 'acting', 'actor', 'actress', 'play',
    'musical theater', 'stage', 'monologue', 'improv', 'broadway', 'audition',
    'rehearsal', 'cast', 'scene', 'thespian', 'playwright', 'one act',
    'stage crew', 'set design',
  ],
  dance: [
    'dance', 'dancer', 'ballet', 'choreography', 'choreographer', 'jazz dance',
    'tap', 'hip hop', 'hiphop', 'contemporary dance', 'ballroom', 'salsa',
    'bharatanatyam', 'kathak', 'folk dance', 'dance team',
  ],
  creative_writing: [
    'poetry', 'poem', 'poet', 'fiction', 'novel', 'short story', 'creative writing',
    'screenwriting', 'screenplay', 'spoken word', 'slam poetry', 'writer',
    'writing', 'prose', 'manuscript', 'anthology', 'literary magazine',
  ],
  athletics: [
    'soccer', 'basketball', 'tennis', 'swimming', 'swim', 'swimmer', 'track',
    'cross country', 'football', 'volleyball', 'wrestling', 'wrestler',
    'lacrosse', 'rowing', 'crew', 'varsity', 'coach', 'tournament', 'marathon',
    'fencing', 'gymnastics', 'gymnast', 'baseball', 'softball', 'hockey', 'golf',
    'rugby', 'sprint', 'sprinter', 'athlete', 'athletic', 'athletics', 'sport',
    'sports', 'runner', 'running', 'cycling', 'skiing', 'skateboarding',
    'martial arts', 'karate', 'taekwondo', 'judo', 'boxing', 'diving', 'sailing',
    'water polo', 'field hockey', 'ultimate frisbee', 'badminton', 'squash',
    'triathlon', 'weightlifting', 'powerlifting', 'cheerleading', 'cheer',
  ],
  programming: [
    'programming', 'coding', 'code', 'python', 'java', 'javascript', 'app',
    'software', 'website', 'web development', 'algorithm', 'github', 'hackathon',
    'developer', 'develop', 'c++', 'html', 'css', 'react', 'backend', 'frontend',
    'full stack', 'debugging', 'programmer', 'script', 'coder', 'open source',
    'api', 'database', 'sql',
  ],
  engineering: [
    'engineering', 'engineer', 'mechanical', 'electrical', 'civil', 'aerospace',
    'circuit', 'prototype', 'design build', '3d printing', 'welding', 'machining',
    'blueprint', 'structural', 'bridge building', 'rocketry', 'rocket',
  ],
  robotics: [
    'robotics', 'robot', 'arduino', 'raspberry pi', 'cad', 'first robotics',
    'firstrobotics', 'frc', 'ftc', 'vex', 'mechanism', 'sensor', 'motor',
    'servo', 'actuator', 'autonomous', 'microcontroller',
  ],
  science: [
    'science', 'biology', 'chemistry', 'physics', 'lab', 'laboratory',
    'experiment', 'genetics', 'astronomy', 'geology', 'ecology', 'microbiology',
    'biochemistry', 'neuroscience', 'scientific', 'science fair', 'science olympiad',
    'molecular', 'organism', 'hypothesis', 'specimen', 'dissection',
  ],
  mathematics: [
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'statistics',
    'number theory', 'math olympiad', 'mathletes', 'amc', 'aime', 'proof',
    'theorem', 'equation', 'mathematical', 'combinatorics',
  ],
  medicine: [
    'medicine', 'medical', 'hospital', 'clinic', 'nursing', 'nurse', 'doctor',
    'physician', 'patient', 'health', 'healthcare', 'emt', 'first aid', 'cpr',
    'pre med', 'premed', 'surgery', 'anatomy', 'pharmacy', 'dental', 'therapy',
    'caregiving', 'shadowing', 'red cross', 'public health', 'wellness',
  ],
  business: [
    'business', 'deca', 'fbla', 'marketing', 'management', 'commerce',
    'enterprise', 'corporate', 'company', 'sales', 'advertising', 'brand',
  ],
  finance: [
    'finance', 'financial', 'investing', 'investment', 'stocks', 'stock market',
    'economics', 'economic', 'accounting', 'budget', 'trading', 'portfolio',
    'cryptocurrency', 'crypto', 'wall street', 'banking',
  ],
  debate: [
    'debate', 'model un', 'mun', 'mock trial', 'speech', 'forensics', 'argument',
    'rhetoric', 'parliamentary', 'lincoln douglas', 'public forum', 'congress',
    'debater', 'cross examination', 'resolution', 'oratory',
  ],
  government_politics: [
    'government', 'politics', 'political', 'student council', 'student government',
    'senate', 'campaign', 'election', 'legislation', 'policy', 'civic',
    'voter', 'voting', 'congressional', 'city council', 'youth in government',
    'diplomacy', 'governance',
  ],
  journalism: [
    'journalism', 'journalist', 'newspaper', 'reporter', 'reporting', 'editor',
    'press', 'news', 'article', 'column', 'yearbook', 'broadcast', 'media',
    'interview', 'byline', 'headline',
  ],
  film_photo: [
    'film', 'filmmaking', 'filmmaker', 'video', 'videography', 'photography',
    'photographer', 'photo', 'camera', 'cinematography', 'documentary',
    'editing', 'youtube', 'directing', 'director', 'cinema', 'lens', 'shoot',
  ],
  culinary: [
    'cooking', 'cook', 'baking', 'bake', 'chef', 'culinary', 'recipe', 'kitchen',
    'pastry', 'restaurant', 'food', 'cuisine', 'catering', 'barista',
  ],
  environment: [
    'environment', 'environmental', 'sustainability', 'sustainable', 'climate',
    'recycling', 'conservation', 'ecology', 'green', 'garden', 'gardening',
    'compost', 'wildlife', 'nature', 'clean up', 'cleanup', 'pollution',
    'renewable', 'solar', 'earth', 'planting', 'trees',
  ],
  technology: [
    'technology', 'tech', 'computer', 'it', 'cybersecurity', 'network',
    'hardware', 'gadget', 'electronics', 'digital', 'automation', 'startup tech',
  ],
  data_ai: [
    'data', 'data science', 'machine learning', 'artificial intelligence', 'ai',
    'neural network', 'deep learning', 'analytics', 'dataset', 'statistics model',
    'ml', 'nlp', 'computer vision', 'big data', 'data analysis',
  ],
  gaming: [
    'gaming', 'gamer', 'video game', 'esports', 'game design', 'minecraft',
    'game development', 'twitch', 'console', 'tabletop', 'dungeons',
  ],
  chess: [
    'chess', 'chessboard', 'checkmate', 'chess club', 'grandmaster', 'chess team',
  ],
  literature: [
    'literature', 'book club', 'reading', 'reader', 'literary', 'classics',
    'shakespeare', 'author study', 'bookworm', 'novel study',
  ],
  history: [
    'history', 'historical', 'historian', 'history bowl', 'history day',
    'archaeology', 'archive', 'heritage history', 'ancient', 'civilization',
    'genealogy', 'museum',
  ],
  psychology: [
    'psychology', 'psychological', 'mental health', 'counseling', 'behavior',
    'cognitive', 'mindfulness', 'wellbeing', 'peer counseling', 'psych',
  ],
  law: [
    'law', 'legal', 'attorney', 'lawyer', 'court', 'justice', 'constitution',
    'rights', 'paralegal', 'litigation', 'pre law', 'prelaw',
  ],
  design: [
    'design', 'graphic design', 'ux', 'ui', 'user experience', 'branding',
    'typography', 'fashion design', 'interior design', 'architecture',
    'architectural', 'designer', 'logo', 'layout',
  ],
  languages: [
    'spanish', 'french', 'mandarin', 'chinese language', 'german', 'latin',
    'japanese', 'korean language', 'arabic', 'bilingual', 'multilingual',
    'linguistics', 'language', 'translation', 'translator', 'esl',
  ],

  // ------- CROSS-CUTTING (NON-DOMAIN) CONCEPTS -------
  leadership: [
    'captain', 'president', 'founder', 'founded', 'led', 'leader', 'leadership',
    'organized', 'coordinated', 'directed', 'chair', 'chairman', 'chairperson',
    'head', 'spearheaded', 'initiative', 'manage', 'managed', 'manager',
    'vice president', 'officer', 'lead', 'oversaw', 'supervised', 'commander',
  ],
  teaching: [
    'tutor', 'tutoring', 'taught', 'teaching', 'teacher', 'instructed',
    'instructor', 'explained', 'lesson', 'lecture', 'workshop', 'educate',
    'educator', 'education', 'class', 'teach',
  ],
  mentorship: [
    'mentor', 'mentoring', 'mentee', 'coached', 'guide', 'guidance', 'big brother',
    'big sister', 'role model', 'advise', 'advisor', 'peer support',
  ],
  service: [
    'volunteer', 'volunteering', 'food bank', 'soup kitchen', 'shelter',
    'fundraiser', 'fundraising', 'nonprofit', 'non profit', 'charity',
    'charitable', 'donate', 'donation', 'serve', 'service', 'outreach',
    'habitat', 'giving back', 'philanthropy', 'relief', 'helping',
  ],
  community: [
    'community', 'neighborhood', 'local community', 'grassroots', 'residents',
    'civic engagement', 'town', 'community center', 'together', 'collective',
  ],
  activism: [
    'activism', 'activist', 'protest', 'advocacy', 'advocate', 'awareness',
    'equity', 'social justice', 'human rights', 'march', 'petition', 'reform',
    'movement', 'lgbtq', 'feminism', 'anti racism', 'climate strike',
  ],
  identity_heritage: [
    'immigrant', 'immigration', 'bilingual', 'first generation',
    'first-generation', 'heritage', 'culture', 'cultural', 'tradition',
    'traditional', 'diaspora', 'refugee', 'hispanic', 'latino', 'latina',
    'chinese', 'indian', 'korean', 'muslim', 'jewish', 'asian', 'african',
    'black', 'ethnic', 'ancestry', 'roots', 'native', 'indigenous',
    'multicultural', 'identity',
  ],
  family_caregiving: [
    'family', 'sibling', 'grandmother', 'grandfather', 'grandparent', 'parents',
    'caregiver', 'caregiving', 'caring for', 'household', 'younger brother',
    'younger sister', 'raised', 'single mother', 'single parent', 'babysitting',
  ],
  entrepreneurship: [
    'startup', 'start up', 'entrepreneur', 'entrepreneurship', 'sold', 'selling',
    'profit', 'customer', 'customers', 'market', 'launched', 'launch', 'product',
    'etsy', 'small business', 'venture', 'founder', 'bootstrapped', 'revenue',
    'monetize',
  ],
  research: [
    'research', 'researcher', 'study', 'studied', 'investigation', 'thesis',
    'published', 'publication', 'peer reviewed', 'data collection', 'survey',
    'analysis', 'findings', 'literature review', 'internship research', 'lab research',
  ],
  competition: [
    'competition', 'competed', 'competitive', 'championship', 'tournament',
    'contest', 'award', 'medal', 'trophy', 'placed', 'finalist', 'qualified',
    'nationals', 'regionals', 'ranked', 'won', 'winner', 'first place',
  ],
  performance: [
    'performance', 'performed', 'performing', 'stage', 'audience', 'show',
    'concert', 'recital', 'exhibition', 'showcase', 'live', 'debut',
  ],
  making_building: [
    'built', 'building', 'build', 'made', 'making', 'created', 'construct',
    'constructed', 'designed', 'assembled', 'fabricate', 'crafted', 'craft',
    'diy', 'hands on', 'prototype', 'invented', 'invention', 'tinker',
  ],
  faith_religion: [
    'church', 'temple', 'mosque', 'synagogue', 'faith', 'religion', 'religious',
    'youth group', 'bible', 'quran', 'worship', 'ministry', 'spiritual',
    'sunday school', 'missionary', 'congregation',
  ],
  resilience: [
    'overcame', 'overcoming', 'perseverance', 'persevered', 'resilience',
    'resilient', 'struggle', 'struggled', 'hardship', 'adversity', 'challenge',
    'obstacle', 'grit', 'determination', 'recovery', 'diagnosed', 'illness',
  ],
  creativity: [
    'creative', 'creativity', 'imagination', 'imaginative', 'original',
    'innovative', 'innovation', 'inventive', 'expressive', 'artistic',
  ],
  collaboration: [
    'collaboration', 'collaborated', 'collaborative', 'teamwork', 'partnership',
    'partnered', 'cooperation', 'joint', 'together with', 'group project',
  ],
  communication: [
    'communication', 'public speaking', 'presentation', 'presented', 'spoke',
    'outreach communication', 'articulate', 'persuasive', 'storyteller',
  ],
  precision_craft: [
    'precision', 'meticulous', 'detail oriented', 'attention to detail',
    'craftsmanship', 'refined', 'discipline', 'disciplined', 'technique',
    'accuracy', 'accurate', 'careful',
  ],
  problem_solving: [
    'problem solving', 'problem', 'solve', 'solved', 'solution', 'troubleshoot',
    'analytical', 'logic', 'logical', 'critical thinking', 'debugged', 'optimize',
    'optimized', 'efficiency',
  ],
  storytelling: [
    'storytelling', 'story', 'narrative', 'stories', 'chronicle', 'memoir',
    'blog', 'blogging', 'podcast', 'vlog',
  ],
};

// ---------------------------------------------------------------------------
// Build reverse indexes (single-token stemmed -> concepts, and phrase -> concepts)
// ---------------------------------------------------------------------------

interface PhraseEntry {
  phrase: string; // raw multi-word phrase (lowercased)
  concepts: string[];
}

const STEM_TO_CONCEPTS: { [stemmed: string]: string[] } = {};
const PHRASE_ENTRIES: PhraseEntry[] = [];

(function buildIndexes() {
  const concepts = Object.keys(CONCEPT_TERMS);
  for (let ci = 0; ci < concepts.length; ci++) {
    const concept = concepts[ci];
    const terms = CONCEPT_TERMS[concept];
    for (let ti = 0; ti < terms.length; ti++) {
      const term = terms[ti];
      if (term.indexOf(' ') >= 0 || term.indexOf('-') >= 0) {
        // multi-word / hyphenated phrase: match raw (normalize hyphens to spaces)
        const norm = term.replace(/-/g, ' ').toLowerCase();
        addPhrase(norm, concept);
        // also add a hyphen-free compacted variant for matching text like "firstgeneration"
      } else {
        const s = stem(term);
        addStemConcept(s, concept);
      }
    }
  }
  // Sort phrases longest-first so more specific phrases win when scanning.
  PHRASE_ENTRIES.sort(function (x, y) {
    if (y.phrase.length !== x.phrase.length) return y.phrase.length - x.phrase.length;
    return x.phrase < y.phrase ? -1 : x.phrase > y.phrase ? 1 : 0;
  });
})();

function addStemConcept(s: string, concept: string) {
  if (!s) return;
  const existing = STEM_TO_CONCEPTS[s];
  if (!existing) {
    STEM_TO_CONCEPTS[s] = [concept];
  } else if (existing.indexOf(concept) < 0) {
    existing.push(concept);
  }
}

function addPhrase(phrase: string, concept: string) {
  for (let i = 0; i < PHRASE_ENTRIES.length; i++) {
    if (PHRASE_ENTRIES[i].phrase === phrase) {
      if (PHRASE_ENTRIES[i].concepts.indexOf(concept) < 0) {
        PHRASE_ENTRIES[i].concepts.push(concept);
      }
      return;
    }
  }
  PHRASE_ENTRIES.push({ phrase: phrase, concepts: concept ? [concept] : [] });
}

// ---------------------------------------------------------------------------
// Tokenization + concept extraction
// ---------------------------------------------------------------------------

function tokenizeRaw(text: string): string[] {
  const lowered = text.toLowerCase();
  const parts = lowered.split(/[^a-z0-9+]+/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) out.push(parts[i]);
  }
  return out;
}

/**
 * Extract normalized stemmed content tokens and concept tags for a piece of text.
 * example: "Taught violin to refugee kids at the community center"
 *   -> concepts: [music, teaching, identity_heritage, community, service]
 */
export function extractConcepts(text: string): { tokens: string[]; concepts: string[] } {
  let lowered = ' ' + text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const conceptSet: { [c: string]: boolean } = {};

  // 1) Phrase scan (multi-word), longest-first. When a phrase matches we record
  //    its concepts AND blank out its span so its component words are not double
  //    counted in the token pass ("food bank" -> service, not culinary+finance).
  for (let i = 0; i < PHRASE_ENTRIES.length; i++) {
    const entry = PHRASE_ENTRIES[i];
    if (entry.phrase.indexOf(' ') < 0) continue; // single tokens handled below
    const needle = ' ' + entry.phrase + ' ';
    if (lowered.indexOf(needle) >= 0) {
      for (let c = 0; c < entry.concepts.length; c++) conceptSet[entry.concepts[c]] = true;
      // replace all (overlapping-safe) occurrences with padded spaces
      let idx = lowered.indexOf(needle);
      while (idx >= 0) {
        lowered = lowered.substring(0, idx + 1) +
          entry.phrase.replace(/[^\s]/g, ' ') +
          lowered.substring(idx + 1 + entry.phrase.length);
        idx = lowered.indexOf(needle);
      }
    }
  }

  // 2) Token + stem pass over the phrase-consumed text.
  const rawTokens = tokenizeRaw(lowered);
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const rt = rawTokens[i];
    if (STOPWORDS[rt]) continue;
    if (rt.length < 2) continue;
    const s = stem(rt);
    if (!s || STOPWORDS[s]) continue;
    tokens.push(s);
    const cs = STEM_TO_CONCEPTS[s];
    if (cs) {
      for (let c = 0; c < cs.length; c++) conceptSet[cs[c]] = true;
    }
  }

  return { tokens: tokens, concepts: Object.keys(conceptSet) };
}

// ---------------------------------------------------------------------------
// Vector math helpers
// ---------------------------------------------------------------------------

type Vec = { [key: string]: number };

function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const aKeys = Object.keys(a);
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i];
    const av = a[k];
    na += av * av;
    const bv = b[k];
    if (bv) dot += av * bv;
  }
  const bKeys = Object.keys(b);
  for (let i = 0; i < bKeys.length; i++) {
    const bv = b[bKeys[i]];
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------------------------------------------------------------------------
// Labels for concepts (human-readable)
// ---------------------------------------------------------------------------

const CONCEPT_LABELS: { [c: string]: string } = {
  music: 'Music', visual_art: 'Visual Art', theater: 'Theater', dance: 'Dance',
  creative_writing: 'Creative Writing', athletics: 'Athletics',
  programming: 'Programming', engineering: 'Engineering', robotics: 'Robotics',
  science: 'Science', mathematics: 'Mathematics', medicine: 'Medicine',
  business: 'Business', finance: 'Finance', debate: 'Debate',
  government_politics: 'Government & Politics', journalism: 'Journalism',
  film_photo: 'Film & Photography', culinary: 'Culinary',
  environment: 'Environment', technology: 'Technology', data_ai: 'Data & AI',
  gaming: 'Gaming', chess: 'Chess', literature: 'Literature', history: 'History',
  psychology: 'Psychology', law: 'Law', design: 'Design', languages: 'Languages',
  leadership: 'Leadership', teaching: 'Teaching', mentorship: 'Mentorship',
  service: 'Service', community: 'Community', activism: 'Activism',
  identity_heritage: 'Identity & Heritage', family_caregiving: 'Family & Caregiving',
  entrepreneurship: 'Entrepreneurship', research: 'Research',
  competition: 'Competition', performance: 'Performance',
  making_building: 'Making', mentoring: 'Mentoring', faith_religion: 'Faith',
  resilience: 'Resilience', creativity: 'Creativity',
  collaboration: 'Collaboration', communication: 'Communication',
  precision_craft: 'Precision Craft', problem_solving: 'Problem-Solving',
  storytelling: 'Storytelling',
};

function conceptLabel(c: string): string {
  if (CONCEPT_LABELS[c]) return CONCEPT_LABELS[c];
  // fallback: title-case the tag
  const words = c.split('_');
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 0) words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1);
  }
  return words.join(' ');
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

interface Internal {
  tfidf: Vec;
  conceptVec: Vec;
  conceptSet: { [c: string]: boolean };
  domainSet: { [c: string]: boolean };
  tokenSet: { [t: string]: boolean };
}

export function analyzeActivities(rawActivities: string[]): MotifEngineResult {
  // ---- Filter empties, keep aligned indices in the returned (filtered) list ----
  const activities: ActivityAnalysis[] = [];
  const filteredTexts: string[] = [];
  if (rawActivities && rawActivities.length > 0) {
    for (let i = 0; i < rawActivities.length; i++) {
      const raw = rawActivities[i];
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      filteredTexts.push(trimmed);
    }
  }

  const n = filteredTexts.length;

  // ---- Analyze each activity ----
  const internals: Internal[] = [];
  const dfCount: { [t: string]: number } = {}; // document frequency per stemmed token

  for (let i = 0; i < n; i++) {
    const text = filteredTexts[i];
    const ec = extractConcepts(text);
    const tokens = ec.tokens;
    const concepts = ec.concepts;

    const domainSet: { [c: string]: boolean } = {};
    const conceptSet: { [c: string]: boolean } = {};
    const primaryDomains: string[] = [];
    for (let c = 0; c < concepts.length; c++) {
      conceptSet[concepts[c]] = true;
      if (DOMAIN_CONCEPTS[concepts[c]]) {
        domainSet[concepts[c]] = true;
        primaryDomains.push(concepts[c]);
      }
    }

    activities.push({
      index: i,
      text: text,
      tokens: tokens,
      concepts: concepts,
      primaryDomains: primaryDomains,
    });

    // term frequency
    const tf: Vec = {};
    const tokenSet: { [t: string]: boolean } = {};
    for (let t = 0; t < tokens.length; t++) {
      const tk = tokens[t];
      tf[tk] = (tf[tk] || 0) + 1;
      tokenSet[tk] = true;
    }
    // document frequency
    const uniq = Object.keys(tokenSet);
    for (let u = 0; u < uniq.length; u++) {
      dfCount[uniq[u]] = (dfCount[uniq[u]] || 0) + 1;
    }

    // concept vector (count)
    const cvec: Vec = {};
    for (let c = 0; c < concepts.length; c++) cvec[concepts[c]] = 1;

    internals.push({
      tfidf: tf, // temporary: raw tf, converted to tf-idf below
      conceptVec: cvec,
      conceptSet: conceptSet,
      domainSet: domainSet,
      tokenSet: tokenSet,
    });
  }

  // ---- IDF and tf-idf ----
  const idf: { [t: string]: number } = {};
  const dfKeys = Object.keys(dfCount);
  for (let i = 0; i < dfKeys.length; i++) {
    const t = dfKeys[i];
    // smoothed idf; +1 so a term in all docs still has small positive weight
    idf[t] = Math.log((n + 1) / (dfCount[t] + 1)) + 1;
  }
  for (let i = 0; i < n; i++) {
    const tf = internals[i].tfidf;
    const tfKeys = Object.keys(tf);
    const tfidf: Vec = {};
    for (let k = 0; k < tfKeys.length; k++) {
      const t = tfKeys[k];
      tfidf[t] = tf[t] * (idf[t] || 1);
    }
    internals[i].tfidf = tfidf;
  }

  // Concept rarity weight (rarer concept => bigger bridge bonus).
  const conceptDf: { [c: string]: number } = {};
  for (let i = 0; i < n; i++) {
    const cs = Object.keys(internals[i].conceptSet);
    for (let c = 0; c < cs.length; c++) conceptDf[cs[c]] = (conceptDf[cs[c]] || 0) + 1;
  }

  // ---- Pairwise similarity matrix ----
  const sim: number[][] = [];
  for (let i = 0; i < n; i++) {
    sim.push([]);
    for (let j = 0; j < n; j++) sim[i].push(0);
  }

  const connections: PairConnection[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const A = internals[i];
      const B = internals[j];

      const conceptCos = cosine(A.conceptVec, B.conceptVec);
      const tfidfCos = cosine(A.tfidf, B.tfidf);

      // shared concepts
      const sharedConcepts: string[] = [];
      const aConcepts = Object.keys(A.conceptSet);
      for (let c = 0; c < aConcepts.length; c++) {
        if (B.conceptSet[aConcepts[c]]) sharedConcepts.push(aConcepts[c]);
      }

      // shared distinctive terms (ranked by idf desc)
      const sharedTermsAll: string[] = [];
      const aTokens = Object.keys(A.tokenSet);
      for (let t = 0; t < aTokens.length; t++) {
        if (B.tokenSet[aTokens[t]]) sharedTermsAll.push(aTokens[t]);
      }
      sharedTermsAll.sort(function (x, y) {
        const dx = idf[x] || 0;
        const dy = idf[y] || 0;
        if (dy !== dx) return dy - dx;
        return x < y ? -1 : x > y ? 1 : 0;
      });
      const sharedTerms = sharedTermsAll.slice(0, 5);

      // semantic bonus: reward multiple shared concepts + distinctive shared tokens,
      // with an extra bump when a RARE concept or RARE token bridges the two.
      let semanticBonus = 0;
      if (sharedConcepts.length > 0) {
        semanticBonus += Math.min(0.5, 0.18 * sharedConcepts.length);
        // rare concept bridge bonus
        let rarestBoost = 0;
        for (let c = 0; c < sharedConcepts.length; c++) {
          const df = conceptDf[sharedConcepts[c]] || n;
          const rarity = (n - df + 1) / n; // rarer => closer to 1
          if (rarity > rarestBoost) rarestBoost = rarity;
        }
        semanticBonus += 0.15 * rarestBoost;
      }
      if (sharedTerms.length > 0) {
        // normalize idf contribution
        let idfSum = 0;
        for (let t = 0; t < sharedTerms.length; t++) idfSum += idf[sharedTerms[t]] || 0;
        const idfNorm = Math.min(1, idfSum / (3 * (Math.log(n + 1) + 1)));
        semanticBonus += 0.3 * idfNorm;
      }
      if (semanticBonus > 1) semanticBonus = 1;

      let strength = 0.45 * conceptCos + 0.35 * tfidfCos + 0.2 * semanticBonus;
      if (strength < 0) strength = 0;
      if (strength > 1) strength = 1;

      sim[i][j] = strength;
      sim[j][i] = strength;

      if (strength >= CONNECTION_FLOOR) {
        // kind: obvious if share a primary domain
        let sharedDomain: string | null = null;
        for (let c = 0; c < sharedConcepts.length; c++) {
          if (DOMAIN_CONCEPTS[sharedConcepts[c]]) { sharedDomain = sharedConcepts[c]; break; }
        }
        const kind: 'obvious' | 'hidden' = sharedDomain ? 'obvious' : 'hidden';
        const explanation = buildExplanation(
          activities[i], activities[j], sharedConcepts, sharedTerms, sharedDomain, kind
        );

        connections.push({
          a: i,
          b: j,
          strength: round3(strength),
          sharedConcepts: sharedConcepts,
          sharedTerms: sharedTerms,
          kind: kind,
          explanation: explanation,
        });
      }
    }
  }

  // sort connections strongest first (deterministic tie-break by a,b)
  connections.sort(function (x, y) {
    if (y.strength !== x.strength) return y.strength - x.strength;
    if (x.a !== y.a) return x.a - y.a;
    return x.b - y.b;
  });

  // ---- Agglomerative average-linkage clustering ----
  const clusters = agglomerate(n, sim);

  // Build cluster outputs (size >= 2) and orphans (singletons).
  const inCluster: { [idx: number]: boolean } = {};
  const motifClusters: MotifCluster[] = [];

  for (let ci = 0; ci < clusters.length; ci++) {
    const members = clusters[ci].slice();
    if (members.length < 2) continue;
    members.sort(function (a, b) { return a - b; });
    for (let m = 0; m < members.length; m++) inCluster[members[m]] = true;

    // dominant concepts by frequency across members
    const freq: { [c: string]: number } = {};
    for (let m = 0; m < members.length; m++) {
      const cs = activities[members[m]].concepts;
      for (let c = 0; c < cs.length; c++) freq[cs[c]] = (freq[cs[c]] || 0) + 1;
    }
    const dominantConcepts = Object.keys(freq).sort(function (x, y) {
      if (freq[y] !== freq[x]) return freq[y] - freq[x];
      // tie-break: domain concepts first, then rarity, then name
      const dx = DOMAIN_CONCEPTS[x] ? 1 : 0;
      const dy = DOMAIN_CONCEPTS[y] ? 1 : 0;
      if (dy !== dx) return dy - dx;
      return x < y ? -1 : x > y ? 1 : 0;
    });

    // cohesion = avg intra-cluster pairwise similarity
    let sumSim = 0;
    let pairCount = 0;
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        sumSim += sim[members[a]][members[b]];
        pairCount++;
      }
    }
    const cohesion = pairCount > 0 ? sumSim / pairCount : 0;

    motifClusters.push({
      memberIndices: members,
      dominantConcepts: dominantConcepts,
      cohesion: round3(cohesion),
      label: buildLabel(dominantConcepts),
    });
  }

  // sort clusters by cohesion*size (strongest & broadest first), deterministic tie-break
  motifClusters.sort(function (x, y) {
    const sx = x.cohesion * x.memberIndices.length;
    const sy = y.cohesion * y.memberIndices.length;
    if (sy !== sx) return sy - sx;
    if (y.memberIndices.length !== x.memberIndices.length) {
      return y.memberIndices.length - x.memberIndices.length;
    }
    return x.memberIndices[0] - y.memberIndices[0];
  });

  const orphans: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!inCluster[i]) orphans.push(i);
  }

  return {
    activities: activities,
    connections: connections,
    clusters: motifClusters,
    orphans: orphans,
  };
}

// ---------------------------------------------------------------------------
// Clustering: agglomerative average-linkage
// ---------------------------------------------------------------------------

function agglomerate(n: number, sim: number[][]): number[][] {
  const clusters: number[][] = [];
  for (let i = 0; i < n; i++) clusters.push([i]);
  if (n <= 1) return clusters;

  // Repeatedly find the best mergeable pair.
  while (clusters.length > 1) {
    let bestVal = -1;
    let bestA = -1;
    let bestB = -1;

    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const link = averageLinkage(clusters[a], clusters[b], sim);
        if (link > bestVal) {
          bestVal = link;
          bestA = a;
          bestB = b;
        } else if (link === bestVal && bestA >= 0) {
          // deterministic tie-break: prefer clusters with the lowest member indices
          const curMin = Math.min(minIndex(clusters[a]), minIndex(clusters[b]));
          const bestMin = Math.min(minIndex(clusters[bestA]), minIndex(clusters[bestB]));
          if (curMin < bestMin) {
            bestA = a;
            bestB = b;
          }
        }
      }
    }

    if (bestVal < MERGE_FLOOR || bestA < 0) break;

    // merge bestB into bestA, remove bestB
    const merged = clusters[bestA].concat(clusters[bestB]);
    clusters[bestA] = merged;
    clusters.splice(bestB, 1);
  }

  return clusters;
}

function averageLinkage(a: number[], b: number[], sim: number[][]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      sum += sim[a[i]][b[j]];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function minIndex(arr: number[]): number {
  let m = arr[0];
  for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i];
  return m;
}

// ---------------------------------------------------------------------------
// Explanation + label templating
// ---------------------------------------------------------------------------

function buildLabel(dominantConcepts: string[]): string {
  if (dominantConcepts.length === 0) return 'Mixed Interests';
  // prefer up to 2 domain-ish concepts, else the top two overall
  const picked: string[] = [];
  // first pass: domain concepts
  for (let i = 0; i < dominantConcepts.length && picked.length < 2; i++) {
    if (DOMAIN_CONCEPTS[dominantConcepts[i]]) picked.push(dominantConcepts[i]);
  }
  // fill from the top of the list
  for (let i = 0; i < dominantConcepts.length && picked.length < 2; i++) {
    if (picked.indexOf(dominantConcepts[i]) < 0) picked.push(dominantConcepts[i]);
  }
  const labels: string[] = [];
  for (let i = 0; i < picked.length; i++) labels.push(conceptLabel(picked[i]));
  return labels.join(' & ');
}

function buildExplanation(
  a: ActivityAnalysis,
  b: ActivityAnalysis,
  sharedConcepts: string[],
  sharedTerms: string[],
  sharedDomain: string | null,
  kind: 'obvious' | 'hidden'
): string {
  if (kind === 'obvious' && sharedDomain) {
    const dl = conceptLabel(sharedDomain).toLowerCase();
    // find a distinguishing non-domain angle if the two feel different
    const nonDomainShared: string[] = [];
    for (let i = 0; i < sharedConcepts.length; i++) {
      if (!DOMAIN_CONCEPTS[sharedConcepts[i]]) nonDomainShared.push(sharedConcepts[i]);
    }
    if (nonDomainShared.length > 0) {
      return 'Both center on ' + dl + ', and share a thread of ' +
        conceptLabel(nonDomainShared[0]).toLowerCase() + '.';
    }
    // contrast the differing domains, if any
    const aOther = firstDomainNotEqual(a.primaryDomains, sharedDomain);
    const bOther = firstDomainNotEqual(b.primaryDomains, sharedDomain);
    if (aOther && bOther && aOther !== bOther) {
      return 'Both center on ' + dl + ', though one leans toward ' +
        conceptLabel(aOther).toLowerCase() + ' and the other toward ' +
        conceptLabel(bOther).toLowerCase() + '.';
    }
    return 'Both are rooted in ' + dl + '.';
  }

  // hidden connection
  if (sharedConcepts.length > 0) {
    const bridge = pickBridgeConcept(sharedConcepts);
    const aDom = a.primaryDomains.length > 0 ? conceptLabel(a.primaryDomains[0]).toLowerCase() : null;
    const bDom = b.primaryDomains.length > 0 ? conceptLabel(b.primaryDomains[0]).toLowerCase() : null;
    if (aDom && bDom && aDom !== bDom) {
      return 'A hidden thread: ' + aDom + ' and ' + bDom +
        ' meet through a shared emphasis on ' + conceptLabel(bridge).toLowerCase() + '.';
    }
    return 'A hidden thread: both hinge on ' + conceptLabel(bridge).toLowerCase() + '.';
  }
  if (sharedTerms.length > 0) {
    return 'A subtle link: both keep returning to "' + sharedTerms[0] + '".';
  }
  return 'These share an underlying resemblance in how they are described.';
}

function firstDomainNotEqual(domains: string[], notThis: string): string | null {
  for (let i = 0; i < domains.length; i++) {
    if (domains[i] !== notThis) return domains[i];
  }
  return null;
}

function pickBridgeConcept(sharedConcepts: string[]): string {
  // prefer a meaningful cross-cutting concept over generic ones
  const preferredOrder = [
    'teaching', 'mentorship', 'service', 'leadership', 'activism', 'research',
    'entrepreneurship', 'storytelling', 'making_building', 'problem_solving',
    'performance', 'creativity', 'identity_heritage', 'resilience', 'competition',
  ];
  for (let p = 0; p < preferredOrder.length; p++) {
    if (sharedConcepts.indexOf(preferredOrder[p]) >= 0) return preferredOrder[p];
  }
  return sharedConcepts[0];
}

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

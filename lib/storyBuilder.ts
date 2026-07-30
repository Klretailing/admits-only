/* ══════════════════════════════════════════════════════════════════════
   STORY BUILDER — narrative brainstorming engine (rule-based, no API)

   Students who freeze on "what do I even write about" get:
     1. a set of personality traits + a few raw experiences,
     2. matched to the story ANGLES (archetypes) that fit them best,
     3. a beat-by-beat timeline with guiding questions, and
     4. a browsable spark library for pure inspiration.

   Everything here is pure/deterministic — no network, no LLM — so it works
   regardless of whether Adam's API key is configured.
   ══════════════════════════════════════════════════════════════════════ */

export interface Trait {
  key: string;
  label: string;
}

/** Personality words students can pick from (plus their own free text). */
export const TRAITS: Trait[] = [
  { key: 'curious', label: 'Curious' },
  { key: 'resilient', label: 'Resilient' },
  { key: 'funny', label: 'Funny' },
  { key: 'quiet', label: 'Quiet / introverted' },
  { key: 'driven', label: 'Driven' },
  { key: 'creative', label: 'Creative' },
  { key: 'analytical', label: 'Analytical' },
  { key: 'empathetic', label: 'Empathetic' },
  { key: 'stubborn', label: 'Stubborn' },
  { key: 'adventurous', label: 'Adventurous' },
  { key: 'organized', label: 'Organized' },
  { key: 'competitive', label: 'Competitive' },
  { key: 'caretaker', label: 'A caretaker' },
  { key: 'outsider', label: 'An outsider' },
  { key: 'builder', label: 'A builder / maker' },
  { key: 'leader', label: 'A leader' },
];

export interface Beat {
  label: string;
  /** A plain-language question to help the student fill this beat in. */
  guide: string;
}

export interface Archetype {
  id: string;
  name: string;
  tagline: string;
  /** One-line "use this if…". */
  bestFor: string;
  color: string; // tailwind gradient stops, e.g. 'from-sky-500 to-indigo-600'
  traitAffinity: string[];
  experienceSignals: string[];
  beats: Beat[]; // always 5, Scene → Spark → Struggle → Shift → So What
  hook: string; // example opening-line idea
  insight: string; // how to land the "so what"
  example: string;
}

/* The "mega database" of storyline angles. Each is a proven personal-essay shape. */
export const ARCHETYPES: Archetype[] = [
  {
    id: 'turning-point',
    name: 'The Turning Point',
    tagline: 'One moment split your life into before and after.',
    bestFor: 'You have a single vivid moment that changed how you see things.',
    color: 'from-rose-500 to-pink-600',
    traitAffinity: ['resilient', 'driven', 'adventurous'],
    experienceSignals: ['moved', 'accident', 'lost', 'won', 'first time', 'moment', 'day', 'changed', 'realized'],
    beats: [
      { label: 'Scene', guide: 'Drop us into the exact moment right before everything changed. What did you see, hear, feel?' },
      { label: 'Spark', guide: 'What happened? Name the single event — keep it small and specific.' },
      { label: 'Struggle', guide: 'What got harder or more confusing right after? What did you have to wrestle with?' },
      { label: 'Shift', guide: 'What did you start doing or thinking differently because of it?' },
      { label: 'So What', guide: 'Who are you now that you weren’t before? Why does this still matter to you?' },
    ],
    hook: 'Start in the middle of the moment — “The email loaded at 4:57 p.m., and I read it twice.”',
    insight: 'The point isn’t the event; it’s the version of you the event created.',
    example: 'A missed free throw becomes a story about learning to be seen failing — and choosing to keep shooting.',
  },
  {
    id: 'small-thing',
    name: 'The Small Thing That Meant Everything',
    tagline: 'An ordinary object or habit carries a huge amount of you.',
    bestFor: 'You don’t have one dramatic event — but there’s a small ritual, object, or habit you love.',
    color: 'from-amber-500 to-orange-600',
    traitAffinity: ['creative', 'quiet', 'organized', 'curious'],
    experienceSignals: ['every', 'collect', 'ritual', 'grandma', 'kitchen', 'notebook', 'route', 'habit', 'small'],
    beats: [
      { label: 'Scene', guide: 'Show the small thing in action — the object, the habit, the repeated moment.' },
      { label: 'Spark', guide: 'When did this become “yours”? How did it start?' },
      { label: 'Struggle', guide: 'What does keeping this up cost you, or what does it protect you from?' },
      { label: 'Shift', guide: 'What did this small thing teach you that shows up everywhere else in your life?' },
      { label: 'So What', guide: 'What does this reveal about how you move through the world?' },
    ],
    hook: 'Open on the object itself — “There are forty-three ticket stubs in the shoebox under my bed.”',
    insight: 'Zoom out slowly: the small thing is a lens for a big trait.',
    example: 'A messy recipe box becomes a story about inheriting patience and improvisation from a grandmother.',
  },
  {
    id: 'failure-growth',
    name: 'Failure → Growth',
    tagline: 'You messed up, sat with it, and became better for it.',
    bestFor: 'You have a real setback you can be honest about.',
    color: 'from-red-500 to-rose-600',
    traitAffinity: ['resilient', 'driven', 'competitive', 'stubborn'],
    experienceSignals: ['failed', 'lost', 'cut', 'rejected', 'mistake', 'wrong', 'quit', 'benched', 'flunked'],
    beats: [
      { label: 'Scene', guide: 'Put us in the moment it went wrong. Don’t soften it.' },
      { label: 'Spark', guide: 'What exactly failed, and what did you tell yourself right after?' },
      { label: 'Struggle', guide: 'What was the honest low point? What did you avoid or get wrong for a while?' },
      { label: 'Shift', guide: 'What did you finally try differently — and what did it take to get there?' },
      { label: 'So What', guide: 'How do you handle failure now? What would past-you not believe about current-you?' },
    ],
    hook: 'Name the failure plainly in line one — admissions readers trust honesty.',
    insight: 'Growth stories work only if the failure is real. Show the work, not just the lesson.',
    example: 'Getting cut from a team becomes a story about learning to coach the players who made it.',
  },
  {
    id: 'two-worlds',
    name: 'Two Worlds / Identity',
    tagline: 'You live between two cultures, languages, or expectations.',
    bestFor: 'You often translate between two parts of your life.',
    color: 'from-violet-500 to-purple-600',
    traitAffinity: ['empathetic', 'outsider', 'quiet', 'adventurous'],
    experienceSignals: ['language', 'immigrant', 'moved', 'culture', 'translate', 'between', 'family', 'home', 'religion'],
    beats: [
      { label: 'Scene', guide: 'Show a moment where the two worlds touched — a dinner, a phone call, a classroom.' },
      { label: 'Spark', guide: 'When did you first notice you were standing between two things?' },
      { label: 'Struggle', guide: 'Where did the two worlds pull against each other? What was hard to hold at once?' },
      { label: 'Shift', guide: 'How did you stop choosing sides and start building something of your own?' },
      { label: 'So What', guide: 'What can you do because you live in between that others can’t?' },
    ],
    hook: 'Open in one world speaking the language of the other.',
    insight: 'Don’t resolve the tension too neatly — the value is in being a bridge.',
    example: 'Translating for a parent at appointments becomes a story about carrying responsibility and finding voice.',
  },
  {
    id: 'unexpected-passion',
    name: 'The Unexpected Passion',
    tagline: 'A niche, weird, or uncool interest reveals exactly who you are.',
    bestFor: 'You have an interest people are surprised you love.',
    color: 'from-emerald-500 to-teal-600',
    traitAffinity: ['curious', 'creative', 'builder', 'quiet'],
    experienceSignals: ['collect', 'obsessed', 'weird', 'hobby', 'game', 'build', 'fix', 'bird', 'map', 'niche'],
    beats: [
      { label: 'Scene', guide: 'Show yourself deep in the thing you love — let the weird specifics shine.' },
      { label: 'Spark', guide: 'How did you fall into this? What hooked you?' },
      { label: 'Struggle', guide: 'What’s hard or misunderstood about it? What have you pushed through to keep at it?' },
      { label: 'Shift', guide: 'What has this passion taught you that surprised you?' },
      { label: 'So What', guide: 'What does loving this say about how your mind works?' },
    ],
    hook: 'Lead with a detail so specific it could only be you.',
    insight: 'The subject barely matters — the way you think about it is the essay.',
    example: 'Restoring old bikes becomes a story about patience, systems thinking, and quiet pride.',
  },
  {
    id: 'quiet-leader',
    name: 'The Quiet Leader',
    tagline: 'You made things better without ever holding a title.',
    bestFor: 'You lead by doing, not by being in charge.',
    color: 'from-sky-500 to-blue-600',
    traitAffinity: ['quiet', 'empathetic', 'organized', 'leader'],
    experienceSignals: ['helped', 'organized', 'team', 'behind', 'quietly', 'noticed', 'fixed', 'group', 'volunteer'],
    beats: [
      { label: 'Scene', guide: 'Show a moment where you quietly held something together.' },
      { label: 'Spark', guide: 'What did you notice that no one else did?' },
      { label: 'Struggle', guide: 'What was hard about helping without recognition or authority?' },
      { label: 'Shift', guide: 'How did your quiet kind of leadership actually change the outcome?' },
      { label: 'So What', guide: 'What kind of leader are you, and why does that matter more than a title?' },
    ],
    hook: 'Open on the problem no one else was watching.',
    insight: 'Redefine “leadership” on your own terms — that reframing is the whole point.',
    example: 'Being the one who texts every member before a meeting becomes a story about invisible glue work.',
  },
  {
    id: 'the-question',
    name: 'The Question That Won’t Let Go',
    tagline: 'One question has quietly driven a lot of what you do.',
    bestFor: 'You’re curious to a fault and chase questions down rabbit holes.',
    color: 'from-indigo-500 to-blue-700',
    traitAffinity: ['curious', 'analytical', 'driven', 'creative'],
    experienceSignals: ['why', 'question', 'wonder', 'research', 'figure out', 'how does', 'experiment', 'read'],
    beats: [
      { label: 'Scene', guide: 'Show the moment the question first grabbed you.' },
      { label: 'Spark', guide: 'What exactly did you want to know — and why did it stick?' },
      { label: 'Struggle', guide: 'Where did chasing it get hard, messy, or lonely?' },
      { label: 'Shift', guide: 'What did the chase teach you (even if you never got a clean answer)?' },
      { label: 'So What', guide: 'What does the way you chase questions say about the mind you’ll bring to college?' },
    ],
    hook: 'Ask the question out loud in the first line.',
    insight: 'The unanswered question is a feature — show the hunger, not a tidy conclusion.',
    example: '“Why do people leave?” becomes a story that connects psychology, a move, and a research project.',
  },
  {
    id: 'caretaker',
    name: 'The Weight You Carry',
    tagline: 'You’ve carried responsibility for family or others beyond your years.',
    bestFor: 'You’ve had grown-up responsibilities early.',
    color: 'from-teal-500 to-cyan-600',
    traitAffinity: ['caretaker', 'resilient', 'empathetic', 'organized'],
    experienceSignals: ['sibling', 'parent', 'job', 'care', 'cook', 'bills', 'work', 'family', 'watch', 'responsible'],
    beats: [
      { label: 'Scene', guide: 'Show an ordinary day where you carried more than a kid usually does.' },
      { label: 'Spark', guide: 'When did this responsibility land on you?' },
      { label: 'Struggle', guide: 'What did it cost — and what did you give up quietly?' },
      { label: 'Shift', guide: 'What strength did carrying it build in you?' },
      { label: 'So What', guide: 'How does this shape what you want, and what you can handle?' },
    ],
    hook: 'Open mid-task, not mid-explanation — let the routine speak.',
    insight: 'Avoid a pity story; center your competence and what it grew in you.',
    example: 'Getting siblings ready every morning becomes a story about steadiness under pressure.',
  },
  {
    id: 'the-rebuild',
    name: 'The Rebuild',
    tagline: 'Something broke — a team, a project, a plan — and you rebuilt it.',
    bestFor: 'You’ve turned something around from a low point.',
    color: 'from-orange-500 to-red-600',
    traitAffinity: ['builder', 'driven', 'stubborn', 'leader'],
    experienceSignals: ['broke', 'restart', 'rebuilt', 'fixed', 'turned around', 'saved', 'revived', 'started over'],
    beats: [
      { label: 'Scene', guide: 'Show the wreckage — the moment it was clearly broken.' },
      { label: 'Spark', guide: 'What made you decide to rebuild instead of walk away?' },
      { label: 'Struggle', guide: 'What was the hardest part of putting it back together?' },
      { label: 'Shift', guide: 'What did you learn about building things (and people) along the way?' },
      { label: 'So What', guide: 'What kind of problems do you now run toward instead of away from?' },
    ],
    hook: 'Open on the broken thing, then quietly pick up the first piece.',
    insight: 'Focus on the messy middle of rebuilding, not the trophy at the end.',
    example: 'A club down to three members becomes a story about rebuilding belonging from scratch.',
  },
  {
    id: 'bridge-builder',
    name: 'The Bridge Builder',
    tagline: 'You connect people, groups, or ideas that don’t usually meet.',
    bestFor: 'You’re the one who brings different worlds together.',
    color: 'from-fuchsia-500 to-purple-600',
    traitAffinity: ['empathetic', 'leader', 'creative', 'adventurous'],
    experienceSignals: ['connect', 'introduced', 'both', 'club', 'community', 'together', 'mediate', 'combine', 'mix'],
    beats: [
      { label: 'Scene', guide: 'Show two things that didn’t fit — until you put them in the same room.' },
      { label: 'Spark', guide: 'What made you want to connect them?' },
      { label: 'Struggle', guide: 'What resisted? Why was bridging them harder than it looked?' },
      { label: 'Shift', guide: 'What clicked when the connection finally worked?' },
      { label: 'So What', guide: 'What do you see that lets you build bridges others miss?' },
    ],
    hook: 'Open on the gap before you show yourself closing it.',
    insight: 'Name what only you could see that made the connection possible.',
    example: 'Pairing a coding club with the art club becomes a story about finding overlap where others see none.',
  },
];

export interface StorySeed {
  id: string;
  theme: string;
  title: string;
  spark: string; // a question to get them writing
}

/** Browsable spark library — pure inspiration, grouped loosely by theme. */
export const STORY_SEEDS: StorySeed[] = [
  { id: 's1', theme: 'Identity', title: 'A word people always mispronounce', spark: 'What does your name carry that a roll-call never captures?' },
  { id: 's2', theme: 'Identity', title: 'The two versions of you', spark: 'Where do you act differently, and what does the gap reveal?' },
  { id: 's3', theme: 'Small moments', title: 'A five-minute ritual', spark: 'What tiny thing do you do daily — and what does it protect?' },
  { id: 's4', theme: 'Small moments', title: 'An object you’d save from a fire', spark: 'Why that one? What story is folded into it?' },
  { id: 's5', theme: 'Failure', title: 'The time you were sure and wrong', spark: 'What did being wrong crack open for you?' },
  { id: 's6', theme: 'Failure', title: 'A quit you don’t regret', spark: 'What did walking away teach you about what you value?' },
  { id: 's7', theme: 'Curiosity', title: 'A rabbit hole you fell down', spark: 'What question ate a whole weekend — and why?' },
  { id: 's8', theme: 'Curiosity', title: 'Something you taught yourself', spark: 'What did the self-teaching reveal about how you learn?' },
  { id: 's9', theme: 'People', title: 'A person who rewired you', spark: 'What did they say or do that you still carry?' },
  { id: 's10', theme: 'People', title: 'A stranger who mattered', spark: 'A brief encounter that shifted something — what changed?' },
  { id: 's11', theme: 'Passion', title: 'The uncool thing you love', spark: 'What do you defend that others tease you about?' },
  { id: 's12', theme: 'Passion', title: 'A skill that looks useless', spark: 'What “pointless” talent actually shows how you think?' },
  { id: 's13', theme: 'Responsibility', title: 'A job that wasn’t yours', spark: 'What did you carry that no one handed you?' },
  { id: 's14', theme: 'Responsibility', title: 'A morning that repeats', spark: 'Walk us through a routine that shaped you.' },
  { id: 's15', theme: 'Community', title: 'A place that feels like yours', spark: 'What happens there, and who are you inside it?' },
  { id: 's16', theme: 'Community', title: 'A tradition you keep', spark: 'What do you refuse to let fade — and why you?' },
  { id: 's17', theme: 'Change', title: 'A move that split your life', spark: 'What did you leave, and who did you become?' },
  { id: 's18', theme: 'Change', title: 'The moment you changed your mind', spark: 'What belief did you outgrow, and how?' },
  { id: 's19', theme: 'Making', title: 'Something you built that broke', spark: 'What did the breaking teach you about building?' },
  { id: 's20', theme: 'Making', title: 'A fix nobody noticed', spark: 'What quiet repair are you secretly proud of?' },
  { id: 's21', theme: 'Humor', title: 'A running joke that says something true', spark: 'What does your sense of humor protect or reveal?' },
  { id: 's22', theme: 'Humor', title: 'A spectacular embarrassment', spark: 'What did surviving it teach you about yourself?' },
  { id: 's23', theme: 'Values', title: 'A line you won’t cross', spark: 'When was that line tested, and what did you do?' },
  { id: 's24', theme: 'Values', title: 'Something you changed your stance on', spark: 'What made you brave enough to update your view?' },
];

export interface ScoredArchetype {
  archetype: Archetype;
  score: number;
  reasons: string[];
}

/** Rank archetypes against the student's traits + free-text experiences. */
export function recommendArchetypes(traits: string[], experiencesText: string): ScoredArchetype[] {
  const text = (experiencesText || '').toLowerCase();
  const scored: ScoredArchetype[] = ARCHETYPES.map((a) => {
    let score = 0;
    const reasons: string[] = [];
    for (const t of traits) {
      if (a.traitAffinity.includes(t)) {
        score += 2;
        const label = TRAITS.find((x) => x.key === t)?.label || t;
        reasons.push(`fits “${label}”`);
      }
    }
    for (const kw of a.experienceSignals) {
      if (text.includes(kw)) {
        score += 3;
        reasons.push(`you mentioned “${kw}”`);
      }
    }
    return { archetype: a, score, reasons: reasons.slice(0, 3) };
  });

  scored.sort((x, y) => y.score - x.score);

  // If the student gave us almost nothing, fall back to versatile starters.
  if (scored[0].score === 0) {
    const defaults = ['turning-point', 'small-thing', 'unexpected-passion'];
    return scored
      .map((s) => (defaults.includes(s.archetype.id) ? { ...s, reasons: ['a great place to start'] } : s))
      .sort((a, b) => defaults.indexOf(b.archetype.id) - defaults.indexOf(a.archetype.id))
      .slice(0, 3);
  }

  return scored.slice(0, 3);
}

const STRUGGLE_WORDS = ['fail', 'lost', 'hard', 'struggle', 'cut', 'quit', 'broke', 'wrong', 'rejected', 'alone', 'cried'];
const SPARK_WORDS = ['start', 'first', 'joined', 'discovered', 'began', 'found', 'met', 'moved', 'signed up'];
const SHIFT_WORDS = ['realized', 'learned', 'changed', 'now', 'became', 'understood', 'decided', 'grew'];

/**
 * Suggest which beat (0-4) a raw experience most likely anchors, from keywords.
 * Returns an index into the 5-beat spine (Scene, Spark, Struggle, Shift, So What).
 */
export function suggestBeatIndex(experience: string): number {
  const t = (experience || '').toLowerCase();
  if (STRUGGLE_WORDS.some((w) => t.includes(w))) return 2; // Struggle
  if (SHIFT_WORDS.some((w) => t.includes(w))) return 3; // Shift
  if (SPARK_WORDS.some((w) => t.includes(w))) return 1; // Spark
  return 0; // Scene
}

/** Build a plain-text outline the student can copy into their draft. */
export function buildOutline(a: Archetype, experiences: string[]): string {
  const lines: string[] = [];
  lines.push(`STORY ANGLE: ${a.name} — ${a.tagline}`);
  lines.push('');
  lines.push(`Opening idea: ${a.hook}`);
  lines.push('');
  a.beats.forEach((beat, i) => {
    lines.push(`${i + 1}. ${beat.label.toUpperCase()}`);
    lines.push(`   Q: ${beat.guide}`);
    const mapped = experiences.filter((e) => e.trim() && suggestBeatIndex(e) === i);
    mapped.forEach((m) => lines.push(`   • Your material: ${m.trim()}`));
    lines.push('');
  });
  lines.push(`Landing the point: ${a.insight}`);
  return lines.join('\n');
}

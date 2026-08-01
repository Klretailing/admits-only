/* ══════════════════════════════════════════════════════════════════════
   LESSON NOTE TEMPLATES — the gallery a tutor picks from when logging.

   Free templates are short and frictionless. Premium templates are richer,
   parent- and data-ready formats built for specific K-12 tutoring jobs —
   previewable by everyone (to sell the value), usable once unlocked.
   ══════════════════════════════════════════════════════════════════════ */

export type TemplateTier = 'free' | 'premium';

export interface LessonTemplate {
  id: string;
  name: string;
  tagline: string;
  tier: TemplateTier;
  emoji: string;
  accent: string;   // tailwind gradient stops
  color: string;    // note color key applied on create
  subject?: string; // auto-fills the note's subject when it maps cleanly
  sections: string[]; // short labels shown as a mini preview on the card
  body: string;     // the content skeleton inserted into the note
}

/* ── FREE ──────────────────────────────────────────────────────────── */

const QUICK_LESSON = `🎯 Today's focus
-

✏️ What we worked on
-

👍 Went well
-

🔧 Needs more practice
-

📚 Homework assigned
-

➡️ For next session
-

👪 Note for parent
- `;

const HOMEWORK_CHECKIN = `✅ Last session's homework
- Assigned:
- Completed?

🔁 Quick review
-

📝 Today's practice
-

📌 New homework
- Due: `;

/* ── PREMIUM ───────────────────────────────────────────────────────── */

const PROGRESS_REPORT = `📊 PROGRESS REPORT
Reporting period:
Sessions this period:

🌟 Wins & breakthroughs
-

📈 Skills & where they stand   (Emerging / Developing / Secure)
- Skill:                        Level:
- Skill:                        Level:
- Skill:                        Level:

🎯 Current goal
- Goal:
- Progress toward it:

🔧 Focus areas next
-

🏠 Recommended practice at home
-

💬 Tutor's note to the family
- `;

const READING_FLUENCY = `📖 READING SESSION
Book / passage:
Reading level:

⏱️ Fluency
- Words correct per minute (WCPM):
- Accuracy %:
- Expression / phrasing (1–5):

🔤 Decoding & word work
- Tricky words:
- Patterns to reteach:
- Sight words practiced:

💡 Comprehension
- Retell / main idea:
- Questions asked:
- Inference check:

🎯 Next level target
- `;

const MATH_MASTERY = `➗ MATH SESSION
Concept:
Grade-level standard:

🔎 Prerequisite check
- Ready? Gaps found:

👣 I do → We do → You do
- Modeled:
- Guided:
- Independent:

⚠️ Error patterns spotted
-

📶 Mastery level   (Emerging / Developing / Secure)
-

🔁 Reteach / stretch plan
-

📌 Homework
- `;

const LEARNING_SUPPORT = `🧩 LEARNING-SUPPORT SESSION
Goal(s) targeted:

♿ Accommodations used
-

🎯 Evidence toward goal (data point)
- Target:
- Today's result:

🧠 Strategies that worked
-

🔄 Strategies to adjust
-

🙂 Engagement & regulation
-

📋 For the team / next session
- `;

const TEST_PREP = `🎯 TEST PREP — GAME PLAN
Test (SAT / ACT / AP / State):        Test date:
Baseline score:

📚 Focus this session
- Section:
- Skills drilled:

⏱️ Timing & accuracy
- Pace:
- Accuracy %:

📈 Score trajectory
- Last:      Now (est.):      Goal:

📝 Assignments before next session
- `;

const FAMILY_DIGEST = `👪 WEEKLY FAMILY DIGEST
Week of:

🌟 Highlight of the week
-

📈 Growth I noticed
-

🎉 Celebrate at home
-

🔧 One thing to practice this week
-

📅 Coming up next week
- `;

export const LESSON_TEMPLATES: LessonTemplate[] = [
  // Free
  {
    id: 'quick-lesson',
    name: 'Quick Lesson Log',
    tagline: 'The fast everyday note — focus, wins, homework, next time.',
    tier: 'free',
    emoji: '📋',
    accent: 'from-emerald-500 to-teal-600',
    color: 'green',
    sections: ['Focus', 'Went well', 'Needs work', 'Homework', 'Next time', 'Parent note'],
    body: QUICK_LESSON,
  },
  {
    id: 'homework-checkin',
    name: 'Homework Check-in',
    tagline: 'Track what was assigned, what got done, and what’s next.',
    tier: 'free',
    emoji: '✅',
    accent: 'from-sky-500 to-blue-600',
    color: 'blue',
    sections: ['Last homework', 'Quick review', 'Today’s practice', 'New homework'],
    body: HOMEWORK_CHECKIN,
  },
  {
    id: 'blank',
    name: 'Blank Note',
    tagline: 'A clean page. Write it your own way.',
    tier: 'free',
    emoji: '📝',
    accent: 'from-slate-400 to-slate-600',
    color: 'default',
    sections: ['Freeform'],
    body: '',
  },
  // Premium
  {
    id: 'progress-report',
    name: 'Parent Progress Report',
    tagline: 'A polished, share-ready summary parents actually read. Perfect for monthly updates.',
    tier: 'premium',
    emoji: '📊',
    accent: 'from-violet-500 to-purple-600',
    color: 'purple',
    sections: ['Wins', 'Skills + levels', 'Goal progress', 'Home practice', 'Tutor note'],
    body: PROGRESS_REPORT,
  },
  {
    id: 'reading-fluency',
    name: 'Reading Fluency Tracker',
    tagline: 'Structured literacy: WCPM, accuracy, decoding, comprehension, next level.',
    tier: 'premium',
    emoji: '📖',
    accent: 'from-rose-500 to-pink-600',
    color: 'rose',
    subject: 'Reading',
    sections: ['Fluency (WCPM)', 'Decoding', 'Sight words', 'Comprehension', 'Next level'],
    body: READING_FLUENCY,
  },
  {
    id: 'math-mastery',
    name: 'Math Concept Mastery Map',
    tagline: 'Diagnose gaps, track I-do/we-do/you-do, log error patterns and mastery.',
    tier: 'premium',
    emoji: '➗',
    accent: 'from-emerald-500 to-green-600',
    color: 'green',
    subject: 'Math',
    sections: ['Prereq check', 'I/we/you do', 'Error patterns', 'Mastery level', 'Reteach plan'],
    body: MATH_MASTERY,
  },
  {
    id: 'learning-support',
    name: 'Learning-Support / IEP Session',
    tagline: 'Document accommodations, goal evidence, and data points for the support team.',
    tier: 'premium',
    emoji: '🧩',
    accent: 'from-indigo-500 to-blue-700',
    color: 'blue',
    sections: ['Accommodations', 'Goal evidence', 'Strategies', 'Engagement', 'For the team'],
    body: LEARNING_SUPPORT,
  },
  {
    id: 'test-prep',
    name: 'Test Prep Game Plan',
    tagline: 'SAT/ACT/AP/State: baseline, section focus, timing, and score trajectory.',
    tier: 'premium',
    emoji: '🎯',
    accent: 'from-amber-500 to-orange-600',
    color: 'amber',
    subject: 'Test Prep',
    sections: ['Baseline', 'Section focus', 'Timing', 'Score trajectory', 'Assignments'],
    body: TEST_PREP,
  },
  {
    id: 'family-digest',
    name: 'Weekly Family Digest',
    tagline: 'A warm weekly recap that keeps families engaged — great for retention.',
    tier: 'premium',
    emoji: '👪',
    accent: 'from-teal-500 to-cyan-600',
    color: 'teal',
    sections: ['Highlight', 'Growth', 'Celebrate', 'Practice', 'Coming up'],
    body: FAMILY_DIGEST,
  },
];

export const FREE_TEMPLATES = LESSON_TEMPLATES.filter((t) => t.tier === 'free');
export const PREMIUM_TEMPLATES = LESSON_TEMPLATES.filter((t) => t.tier === 'premium');

export function getTemplate(id: string): LessonTemplate | undefined {
  return LESSON_TEMPLATES.find((t) => t.id === id);
}

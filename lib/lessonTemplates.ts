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
  highlights?: string[];      // premium: short "what it is / captures" bullets
  features?: string[];        // premium: built-in premium features (shown as coming-soon)
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

/* ── PREMIUM · in-class note-taking ────────────────────────────────── */

const CORNELL_NOTES = `📝 CORNELL NOTES
Topic:                     Date:

🔑 Cue questions & key terms
- (question or term)
- (question or term)

🗒️ Notes
-
-

✅ Summary   (2–3 sentences, in my own words)
-

🔁 Review check
- [ ] Re-read within 24 hours
- [ ] Can explain it out loud
- [ ] Made a flashcard / practice question`;

const LIVE_TRACKER = `⏱️ LIVE SESSION TRACKER
Started:            Ended:

🟢 Understanding checks   (1 = lost · 5 = got it)
- [time]   topic:                     /5
- [time]   topic:                     /5
- [time]   topic:                     /5

⚡ Quick wins
-

🚧 Stuck points → follow up next time
- [ ]
- [ ]

🎟️ Exit ticket   (one thing they can do now that they couldn't before)
- `;

const ENGAGEMENT_LOG = `🙂 ENGAGEMENT & BEHAVIOR LOG
Focus level (1–5):        Mood:

🌟 Positive moments & reinforcement used
-

🎯 On-task / off-task
- On task:
- Redirects needed:

🧘 Breaks & regulation strategies that worked
-

💬 For parent / next session
- `;

const GROUP_ROSTER = `👥 GROUP SESSION NOTES
Class / group:            Date:
Topic:

🙋 Present
-

🗂️ Per-student quick notes
- (name):   participation:        note:
- (name):   participation:        note:
- (name):   participation:        note:
- (name):   participation:        note:

📌 Whole-group homework
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
    highlights: [
      'A monthly, parent-facing recap of where a student stands',
      'Turns weeks of session notes into one clear story of growth',
    ],
    features: [
      'Skill-by-skill mastery levels (Emerging → Secure)',
      'One-tap “share with parent” as a clean PDF',
      'Auto-pulls wins from your session notes this period',
    ],
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
    highlights: [
      'Built for early-literacy and reading tutors',
      'Captures fluency and comprehension in one clean sheet',
    ],
    features: [
      'Words-per-minute logged over time into a growth chart',
      'Running sight-word bank that carries across sessions',
      'Reading-level ladder with a suggested next target',
    ],
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
    highlights: [
      'A diagnostic map of exactly where math clicks and where it breaks',
      'Keeps the gradual-release lesson flow organized in the moment',
    ],
    features: [
      'Error-pattern log that flags recurring misconceptions',
      'Mastery meter per concept with an auto reteach reminder',
      'Standards tags so you can filter by skill later',
    ],
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
    highlights: [
      'For tutors supporting students with IEPs or 504 plans',
      'Produces the data points a support team actually needs',
    ],
    features: [
      'Goal-evidence tracker that graphs progress toward each target',
      'Accommodation checklist carried over from the last session',
      'Export a clean data summary for the school team',
    ],
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
    highlights: [
      'A game plan for high-school standardized-test prep',
      'Keeps every session pointed at the target score and date',
    ],
    features: [
      'Score-trajectory chart from baseline to goal',
      'Section-by-section timing and accuracy tracking',
      'Countdown to test day with a weekly assignment planner',
    ],
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
    highlights: [
      'A short, warm weekly note home that keeps families invested',
      'Turns “what did we do this week?” into a two-minute send',
    ],
    features: [
      'One-tap send to the parent by email',
      'Auto-drafts from the week’s session notes',
      'Keeps a family-communication history per student',
    ],
  },
  // Premium · in-class note-taking
  {
    id: 'cornell-notes',
    name: 'Cornell Notes',
    tagline: 'The classic cue / notes / summary layout — the gold standard for in-class capture.',
    tier: 'premium',
    emoji: '📝',
    accent: 'from-blue-500 to-indigo-600',
    color: 'blue',
    subject: 'Study Skills',
    sections: ['Cue column', 'Notes', 'Summary', 'Review check'],
    body: CORNELL_NOTES,
    highlights: [
      'A neatly organized note-taking system students can reuse for life',
      'Great for teaching study skills while you capture the lesson',
    ],
    features: [
      'Built-in cue-question column for active recall',
      'Review checklist with a 24-hour re-read reminder',
      'One-click convert to a set of flashcards',
    ],
  },
  {
    id: 'live-tracker',
    name: 'Live Session Tracker',
    tagline: 'Capture understanding in real time — timestamped checks, wins, and follow-ups.',
    tier: 'premium',
    emoji: '⏱️',
    accent: 'from-fuchsia-500 to-pink-600',
    color: 'rose',
    sections: ['Understanding checks', 'Quick wins', 'Stuck points', 'Exit ticket'],
    body: LIVE_TRACKER,
    highlights: [
      'Made for taking notes live, during the session, without slowing down',
      'A running pulse of what’s landing and what isn’t',
    ],
    features: [
      'One-tap timestamp on every understanding check',
      '1–5 “got it” ratings that trend over the session',
      'Stuck points auto-roll into next session’s follow-ups',
    ],
  },
  {
    id: 'engagement-log',
    name: 'Engagement & Behavior Log',
    tagline: 'For younger learners: focus, participation, reinforcement, and regulation.',
    tier: 'premium',
    emoji: '🙂',
    accent: 'from-orange-500 to-amber-600',
    color: 'amber',
    sections: ['Focus level', 'Positive moments', 'On/off task', 'Breaks', 'Parent note'],
    body: ENGAGEMENT_LOG,
    highlights: [
      'Built for elementary tutors managing focus and behavior',
      'Logs the whole child, not just the academics',
    ],
    features: [
      'Engagement meter tracked session to session',
      'Positive-reinforcement log to spot what motivates them',
      'Regulation-strategy library that remembers what works',
    ],
  },
  {
    id: 'group-roster',
    name: 'Group Session Notes',
    tagline: 'Teaching a small group? Per-student notes, attendance, and participation in one place.',
    tier: 'premium',
    emoji: '👥',
    accent: 'from-cyan-500 to-teal-600',
    color: 'teal',
    sections: ['Attendance', 'Per-student notes', 'Participation', 'Group homework'],
    body: GROUP_ROSTER,
    highlights: [
      'For tutors running small-group or class-style sessions',
      'One note captures the whole group cleanly',
    ],
    features: [
      'Per-student rows with participation flags',
      'Attendance tracked across the group over time',
      'Split a group note into each student’s file in one tap',
    ],
  },
];

export const FREE_TEMPLATES = LESSON_TEMPLATES.filter((t) => t.tier === 'free');
export const PREMIUM_TEMPLATES = LESSON_TEMPLATES.filter((t) => t.tier === 'premium');

export function getTemplate(id: string): LessonTemplate | undefined {
  return LESSON_TEMPLATES.find((t) => t.id === id);
}

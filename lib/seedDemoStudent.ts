import { prisma } from './db';

/* ══════════════════════════════════════════════════════════════════════
   FULLY-POPULATED DEMO STUDENT — "Ethan Nakamura"
   A strong Bay Area computer-science applicant. Every student feature is
   pre-filled with realistic content: profile + stats, an interactive
   19-campus application tracker, essays, a believable Study Pod
   conversation, and an Adam thread. Idempotent — runs once, then no-ops.

   Login: demo.student@admitsonly.com / Student@2026
   ════════════════════════════════════════════════════════════════════ */

const STUDENT = 'demo.student@admitsonly.com';
const PODMATES = ['maya@beta.admitsonly.com', 'priya@demo.admitsonly.com', 'daniel@demo.admitsonly.com', 'sofia@demo.admitsonly.com'];

const EXTRACURRICULARS = [
  { id: 'ec1', name: 'Computer Science Club', role: 'President', description: 'Grew the club from ~20 to 90 members; replaced lectures with weekly "build nights" and organized HackFremont, a 150-student hackathon with $5,000 in sponsorships.', years: 4, hoursPerWeek: 6, category: 'Leadership / Government' },
  { id: 'ec2', name: 'FIRST Robotics Team 4159', role: 'Software Lead', description: 'Led an 8-person software subteam; programmed autonomous routines and computer-vision targeting in Java; team reached the San Francisco Regional finals.', years: 3, hoursPerWeek: 12, category: 'STEM / Research' },
  { id: 'ec3', name: 'Bright Loop Analytics (seed-stage startup)', role: 'Software Engineering Intern', description: 'Summer intern in Palo Alto; built React/Node dashboards and shipped an alerting feature now used by 2,000+ users.', years: 1, hoursPerWeek: 20, category: 'Work / Internship' },
  { id: 'ec4', name: 'The Coder School — Community Program', role: 'Volunteer Instructor', description: 'Taught free intro-to-Python to 30+ middle schoolers from Title I schools and wrote the beginner curriculum the program still uses.', years: 2, hoursPerWeek: 4, category: 'Community Service' },
  { id: 'ec5', name: 'USA Computing Olympiad (USACO)', role: 'Gold Division', description: 'Advanced to the USACO Gold division through self-study; placed in the top 10% at the regional ACSL contest.', years: 3, hoursPerWeek: 5, category: 'STEM / Research' },
  { id: 'ec6', name: 'Independent ML Research', role: 'Student Researcher', description: 'Built a convolutional model that detects early wildfire smoke from satellite imagery (91% accuracy); regional finalist at the Synopsys Science Fair.', years: 1, hoursPerWeek: 8, category: 'STEM / Research' },
  { id: 'ec7', name: 'Varsity Cross Country', role: 'Team Captain', description: 'Three-year varsity runner and senior-year captain; trained 30 miles a week while carrying a full AP/IB course load.', years: 3, hoursPerWeek: 8, category: 'Athletics' },
  { id: 'ec8', name: 'Jazz Ensemble', role: 'Pianist', description: 'Section pianist for four years; performed at the Santa Cruz Jazz Festival and arranged two pieces for the group.', years: 4, hoursPerWeek: 3, category: 'Arts & Music' },
];

// Application tracker — 19 campuses (7 UCs share one application).
const T_SUBMITTED = (extra: string[] = []) => [
  { id: 't1', label: 'Personal statement / essays', done: true, category: 'essays' },
  ...extra.map((label, i) => ({ id: `tx${i}`, label, done: true, category: 'essays' })),
  { id: 't2', label: '2 teacher recommendations', done: true, category: 'recommendations' },
  { id: 't3', label: 'Send SAT scores', done: true, category: 'testing' },
  { id: 't4', label: 'Submit application', done: true, category: 'misc' },
];
const T_UC = [
  { id: 't1', label: '4 Personal Insight Questions', done: true, category: 'essays' },
  { id: 't3', label: 'Self-report SAT (1480)', done: true, category: 'testing' },
  { id: 't4', label: 'Submit UC application', done: true, category: 'misc' },
];
const T_INPROGRESS = (essays: string[]) => [
  ...essays.map((label, i) => ({ id: `te${i}`, label, done: i === 0, category: 'essays' })),
  { id: 't2', label: 'Request recommendations', done: true, category: 'recommendations' },
  { id: 't3', label: 'Send SAT scores', done: true, category: 'testing' },
  { id: 't4', label: 'Submit application', done: false, category: 'misc' },
];
const T_ROLLING_ACCEPTED = [
  { id: 't1', label: 'Application essays', done: true, category: 'essays' },
  { id: 't3', label: 'Send SAT scores', done: true, category: 'testing' },
  { id: 't4', label: 'Submit application', done: true, category: 'misc' },
  { id: 't5', label: 'Review admission offer', done: false, category: 'misc' },
];
const T_STATS_ONLY = [
  { id: 't3', label: 'Send SAT scores', done: true, category: 'testing' },
  { id: 't4', label: 'Submit application', done: true, category: 'misc' },
];

const COLLEGES = [
  { id: 'c1', name: 'Stanford University', type: 'REA', deadline: '2025-11-01', status: 'submitted', priority: 'reach', notes: 'Dream school. Submitted restrictive early action.', tasks: T_SUBMITTED(['3 short-answer questions']) },
  { id: 'c2', name: 'Massachusetts Institute of Technology', type: 'EA', deadline: '2025-11-01', status: 'submitted', priority: 'reach', notes: 'EA submitted. Maker portfolio attached.', tasks: T_SUBMITTED(['Maker portfolio', '5 short essays']) },
  { id: 'c3', name: 'California Institute of Technology', type: 'EA', deadline: '2025-11-01', status: 'submitted', priority: 'reach', notes: 'STEM-heavy supplements done.', tasks: T_SUBMITTED(['STEM supplements']) },
  { id: 'c4', name: 'Carnegie Mellon University', type: 'RD', deadline: '2026-01-03', status: 'in_progress', priority: 'reach', notes: 'SCS. "Why this program" (300 words) still in progress.', tasks: T_INPROGRESS(['Common App essay', '"Why this program" supplement']) },
  { id: 'c5', name: 'Cornell University', type: 'RD', deadline: '2026-01-02', status: 'in_progress', priority: 'reach', notes: 'College of Engineering — 2 supplements left.', tasks: T_INPROGRESS(['Common App essay', 'Engineering supplement', 'Community essay']) },
  { id: 'c6', name: 'University of California, Berkeley', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'reach', notes: 'EECS. UC app submitted with 4 PIQs.', tasks: T_UC },
  { id: 'c7', name: 'University of California, Los Angeles', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'reach', notes: 'CS, Samueli. Same UC app.', tasks: T_UC },
  { id: 'c8', name: 'University of California, San Diego', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'target', notes: 'CS — capped major. Ranked colleges.', tasks: T_UC },
  { id: 'c9', name: 'University of California, Davis', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'target', notes: 'Computer Science.', tasks: T_UC },
  { id: 'c10', name: 'University of California, Irvine', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'target', notes: 'ICS — strong CS.', tasks: T_UC },
  { id: 'c11', name: 'University of California, Santa Barbara', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'target', notes: 'CCS pipeline.', tasks: T_UC },
  { id: 'c12', name: 'University of California, Santa Cruz', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'safety', notes: 'Likely admit for CS.', tasks: T_UC },
  { id: 'c13', name: 'Georgia Institute of Technology', type: 'EA', deadline: '2025-10-15', status: 'submitted', priority: 'target', notes: 'CS. EA deadline was Oct 15 — in on time.', tasks: T_SUBMITTED(['2 short essays']) },
  { id: 'c14', name: 'University of Illinois Urbana-Champaign', type: 'EA', deadline: '2025-11-01', status: 'submitted', priority: 'target', notes: 'Grainger CS — very competitive, applied early.', tasks: T_SUBMITTED(['Major-specific essay']) },
  { id: 'c15', name: 'University of Washington', type: 'Rolling', deadline: '2025-11-15', status: 'submitted', priority: 'target', notes: 'Paul Allen School — direct-to-major.', tasks: T_SUBMITTED(['CS essay']) },
  { id: 'c16', name: 'University of Texas at Austin', type: 'RD', deadline: '2025-12-01', status: 'in_progress', priority: 'target', notes: 'CS is impacted; honors + "why major" essays in progress.', tasks: T_INPROGRESS(['Apply Texas essay A', 'Why Computer Science', 'Honors essay']) },
  { id: 'c17', name: 'California Polytechnic State University, San Luis Obispo', type: 'RD', deadline: '2025-11-30', status: 'submitted', priority: 'safety', notes: 'No essays — stats-based. Strong fit.', tasks: T_STATS_ONLY },
  { id: 'c18', name: 'San José State University', type: 'Rolling', deadline: '2025-12-01', status: 'accepted', priority: 'safety', notes: 'Accepted! Local safety in the heart of Silicon Valley.', tasks: T_ROLLING_ACCEPTED },
  { id: 'c19', name: 'Arizona State University', type: 'Rolling', deadline: '2025-11-01', status: 'accepted', priority: 'safety', notes: 'Accepted with a merit scholarship.', tasks: T_ROLLING_ACCEPTED },
];

const ESSAYS = [
  {
    title: "The Bug That Wouldn't Die",
    prompt: 'Common App: Some students have a background, identity, interest, or talent so meaningful they believe their application would be incomplete without it.',
    status: 'Complete', aiScore: 88, vocabScore: 91, grammarScore: 95, originalityScore: 86, overallScore: 89,
    content: `For three weeks, my robot drove in circles.

Not literal circles — worse. Every time our FIRST Robotics team ran the autonomous routine I had written, the robot lurched toward the game piece, hesitated, and spun off course like a confused Roomba. My teammates started calling it "the drunk driver." I called it something less printable.

I had checked everything. The wiring was clean. The sensors reported sane values. The logic, on paper, was flawless: see the target, turn toward it, drive forward. But paper isn't a gym floor at 11 p.m. under humming fluorescent lights, and my code kept failing in ways my logic couldn't explain.

I come from a family of fixers. My grandfather rebuilt carburetors in our garage in Fremont; my mother debugs supply chains for a living. "You don't fix what you don't understand," she likes to say. So instead of rewriting the whole routine — the tempting nuclear option — I started logging. Every sensor reading, every decision, every millisecond. I dumped it to a file and read it like a detective reads a timeline.

The answer was humiliatingly small. My vision code averaged the target's position over several frames to reduce noise — a clever trick I had copied from a paper. But when the target briefly left the camera's view, that average silently swallowed a stale, garbage reading. One bad number, buried in an average, dragged the robot a few degrees off every cycle. Those degrees compounded into circles.

The fix was four lines: ignore frames where the target wasn't actually visible. The robot drove straight on the first try. My team cheered. I sat down on the cold floor and laughed, equal parts relief and disbelief that three weeks of misery had lived inside four lines.

I have thought a lot about those four lines since. The bug wasn't in the flashy part — the neural net, the motors, the strategy. It hid in an assumption I never questioned: that my data was clean. In every project since, I've become the person who asks the annoying question — but what if this input is wrong? When I taught Python to middle schoolers, I didn't start with syntax; I started with how to read an error message without panicking, because I remembered how alone that gym floor felt at 11 p.m.

Computer science, I've learned, is less about writing clever code than about being honest with yourself when the world disagrees with your logic. The robot didn't care how elegant my routine was. It only cared about the truth in the data, and it forced me to care too.

My grandfather's carburetors are long gone, but his rule survived the jump from steel to software: don't fix what you don't understand. These days I chase understanding for a living — one stubborn bug, one bad assumption, one honest log file at a time. And when something spins in circles, I no longer reach for the nuclear option. I reach for the timeline, and I start reading.`,
  },
  {
    title: 'Rebuilding the CS Club',
    prompt: 'UC PIQ #1: Describe an example of your leadership experience in which you have positively influenced others.',
    status: 'Complete', aiScore: 85, vocabScore: 88, grammarScore: 96, originalityScore: 84, overallScore: 86,
    content: `When I inherited our high school's Computer Science Club as a junior, it had twelve members, a broken projector, and a reputation as "the place you put on your college app." I wanted it to be the place you actually learned something.

My first instinct — schedule harder lectures — flopped. Attendance dropped to eight. So I stopped talking and started asking. In one-on-one conversations, I learned that members didn't want lectures; they wanted to build things with people who wouldn't judge them for googling basic syntax.

I rebuilt the club around that. We replaced lectures with "build nights," where beginners and USACO competitors sat at the same table on the same projects. I paired newcomers with mentors and made one rule: no question is too small. To give us a shared goal, I pitched HackFremont, a hackathon for local students. I cold-emailed forty companies; two said yes, and their $5,000 kept the lights on.

By senior year the club had ninety members, a working projector, and a waitlist. But the number I'm proudest of isn't ninety — it's the sophomore who joined not knowing what a variable was and, eight months later, won "most creative" at HackFremont for an app that reminds elderly relatives to take their medication.

I used to think leadership meant having the answers. Running this club taught me it means building a room where other people find theirs. I didn't make our members better programmers. I built a place where they could become better programmers together — and that turned out to be the harder, and more important, thing to build.`,
  },
  {
    title: 'Why Computer Science (draft)',
    prompt: 'Supplemental: Why are you interested in studying computer science?',
    status: 'In Review', aiScore: null, vocabScore: null, grammarScore: null, originalityScore: null, overallScore: null,
    content: `I like computer science for the same reason I like running long distances: both reward patience over flash. A fast first mile means nothing if you fall apart at mile three, and clever code means nothing if it breaks the moment a real user touches it.

What pulls me toward CS specifically is leverage. When I taught Python to thirty middle schoolers, I could only reach the students in front of me. But the curriculum I wrote reached the next class, and the one after that. Code is the rare tool where a single careful idea can quietly help thousands of people you'll never meet — the alerting feature I built as an intern still pings engineers I've never spoken to.

I want to spend four years learning to build that leverage responsibly. My wildfire-detection project taught me that a model is only as trustworthy as the questions you ask of its data, and I want mentors who will push me on exactly those questions. I'm not looking for a major that teaches me to write code — I already do that at 11 p.m. in a robotics lab. I'm looking for one that teaches me to write code that deserves to be trusted.`,
  },
];

const POD_MESSAGES: { email: string; text: string }[] = [
  { email: STUDENT, text: 'Okay UC apps are officially submitted 😮‍💨 all 4 PIQs done. Never want to see the word "leadership" again.' },
  { email: 'maya@beta.admitsonly.com', text: 'CONGRATS 🎉 I\'m still stuck on PIQ #3. How did you keep the leadership one under 350??' },
  { email: STUDENT, text: 'Cut every "in order to" → "to" lol. Saved me like 15 words. Happy to swap and read yours.' },
  { email: 'priya@demo.admitsonly.com', text: 'Can someone read my #2 (creative side)? I feel like it\'s trying way too hard.' },
  { email: 'daniel@demo.admitsonly.com', text: 'Send it. I\'ll trade you for my Berkeley EECS one.' },
  { email: 'sofia@demo.admitsonly.com', text: 'Deadline check — Georgia Tech EA was Oct 15 right? I submitted but I\'m paranoid I missed a supplement.' },
  { email: STUDENT, text: 'You\'re good, GT EA had no extra essay this year, just the activities + short answers.' },
  { email: 'maya@beta.admitsonly.com', text: 'Wait Purdue is rolling — should I send it now or wait to polish?' },
  { email: STUDENT, text: 'Send now imo. Rolling = earlier is better, and Purdue reads pretty stats-forward.' },
  { email: 'priya@demo.admitsonly.com', text: 'Ethan how are you doing 19 schools without losing your mind 💀' },
  { email: STUDENT, text: 'I\'m not, ask my cross country splits lol. But honestly the 7 UCs are one app so it\'s not as bad as it sounds.' },
  { email: 'daniel@demo.admitsonly.com', text: 'That\'s the cheat code. Applied to all 7 UCs and it felt like 1.5 apps.' },
  { email: 'sofia@demo.admitsonly.com', text: 'Anyone doing CMU? Their supplement is killing me.' },
  { email: STUDENT, text: 'Yeah CMU + Cornell RD, both still in progress. The CMU "why this program" one is brutal — 300 words and they can smell fluff.' },
  { email: 'maya@beta.admitsonly.com', text: 'SJSU came back — I GOT IN!! First acceptance 🎉🎉' },
  { email: STUDENT, text: 'LETS GOOO 🎉 that\'s a great safety, congrats Maya. Officially one of us with an acceptance now.' },
  { email: 'priya@demo.admitsonly.com', text: 'Ok that\'s motivating. Back to the essay mines ⛏️' },
  { email: 'daniel@demo.admitsonly.com', text: 'Build night Thursday? Knock out supplements together, misery loves company.' },
  { email: STUDENT, text: 'I\'m in, bringing snacks. Whoever\'s free can peer-review my "Why CS" draft too, it\'s rough.' },
  { email: 'sofia@demo.admitsonly.com', text: 'Deal. See everyone Thursday 👋' },
];

const ADAM_SYNTHESIS = `Ethan is a Bay Area senior (Fremont) aiming for a top computer-science program. Strong stats — 1480 SAT (780 M / 700 RW), 4.15 weighted GPA — and a deep, coherent CS resume: CS club president who ran a 150-person hackathon, robotics software lead, a seed-stage startup internship, USACO Gold, and independent ML research on wildfire detection. He's applying to 19 schools with a reach-heavy top (Stanford, MIT, Caltech, Berkeley/UCLA EECS) balanced by realistic targets (UCSD/Davis/Irvine, UIUC, UW, Georgia Tech) and safeties (Cal Poly, SJSU, ASU — SJSU and ASU already admitted him). His UCs and early apps are in; his open work is the CMU, Cornell, and UT Austin supplements. He's slightly anxious about the reach-heavy list and wants his supplements to match the polish of his Stanford essays.`;

const ADAM_MESSAGES: { role: 'user' | 'assistant'; content: string }[] = [
  { role: 'user', content: 'Is my college list too reach-heavy? I feel like I have a lot of reaches.' },
  { role: 'assistant', content: "It's ambitious but not reckless. With a 1480 and that CS resume, UCSD, UC Davis, UC Irvine, UIUC, and UW are genuine targets, and Cal Poly, SJSU, and ASU are real safeties — SJSU and ASU already came back positive, so your floor is solid. Reaches are reaches for everyone, so having several is fine as long as your targets and safeties are places you'd actually be happy to attend. They are, so I wouldn't cut them. I'd focus your energy on making the CMU and Cornell supplements as sharp as your Stanford essays." },
  { role: 'user', content: "Yeah, CMU's \"why this program\" one is stumping me." },
  { role: 'assistant', content: "Start from the specific, not the school. You have the wildfire-detection ML project and the robotics vision work — CMU's real strength is exactly that intersection of machine learning and physical systems. Name one lab or professor whose work connects to your smoke-detection project, then say what you'd want to ask or build with them. Admissions can tell the difference between \"CMU is prestigious\" and \"here's the precise problem I want to work on here.\" Want me to look at your draft once you have a paragraph?" },
];

export async function seedDemoStudent() {
  try {
    const ids: Record<string, string> = {};
    for (const email of [STUDENT, ...PODMATES]) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (u) ids[email] = u.id;
    }
    const uid = ids[STUDENT];
    if (!uid) return;

    // Idempotency: if the profile already exists, the demo is seeded.
    const existing = await prisma.studentProfile.findUnique({ where: { userId: uid } });
    if (existing) return;

    // 1. Profile + stats
    await prisma.studentProfile.create({
      data: {
        userId: uid, gpa: 3.98, gpaScale: '4.0', gpaWeighted: 4.15, satMath: 780, satRW: 700,
        extracurriculars: EXTRACURRICULARS as any,
        holisticScore: 96, percentile: 95, gpaScore: 99, satScore: 90, ecScore: 100,
      },
    });

    // 2. Application tracker
    await prisma.$executeRaw`
      INSERT INTO "saved_applications" ("id", "userId", "data", "updatedAt")
      VALUES (${'sa_demo_ethan'}, ${uid}, ${JSON.stringify(COLLEGES)}::jsonb, NOW())
      ON CONFLICT ("userId") DO NOTHING`;

    // 3. Essays
    for (let i = 0; i < ESSAYS.length; i++) {
      const e = ESSAYS[i];
      await prisma.$executeRaw`
        INSERT INTO "essays" ("id", "userId", "title", "prompt", "content", "status", "aiScore", "vocabScore", "grammarScore", "originalityScore", "overallScore")
        VALUES (${'es_demo_' + i}, ${uid}, ${e.title}, ${e.prompt}, ${e.content}, ${e.status}, ${e.aiScore}, ${e.vocabScore}, ${e.grammarScore}, ${e.originalityScore}, ${e.overallScore})
        ON CONFLICT ("id") DO NOTHING`;
    }

    // 4. Study Pod + members + conversation
    await prisma.$executeRaw`
      INSERT INTO "study_pods" ("id", "name", "description", "inviteCode")
      VALUES (${'pod_demo_cs'}, ${"Bay Area CS Applicants '26"}, ${'Seniors grinding through CS apps — essay swaps, deadline reminders, and moral support.'}, ${'CS26BAY'})
      ON CONFLICT ("id") DO NOTHING`;
    const memberEmails = [STUDENT, ...PODMATES];
    for (let i = 0; i < memberEmails.length; i++) {
      const em = memberEmails[i];
      if (!ids[em]) continue;
      await prisma.$executeRaw`
        INSERT INTO "pod_members" ("id", "podId", "userId", "role")
        VALUES (${'pmem_demo_' + i}, ${'pod_demo_cs'}, ${ids[em]}, ${em === STUDENT ? 'owner' : 'member'})
        ON CONFLICT ("podId", "userId") DO NOTHING`;
    }
    const base = Date.now();
    for (let i = 0; i < POD_MESSAGES.length; i++) {
      const m = POD_MESSAGES[i];
      const mid = ids[m.email];
      if (!mid) continue;
      // Spread across ~4.5 days, last message ~2h ago.
      const ts = new Date(base - 2 * 3600e3 - (POD_MESSAGES.length - 1 - i) * 5.5 * 3600e3);
      await prisma.$executeRaw`
        INSERT INTO "pod_messages" ("id", "podId", "userId", "content", "type", "createdAt")
        VALUES (${'pmsg_demo_' + i}, ${'pod_demo_cs'}, ${mid}, ${m.text}, ${'discussion'}, ${ts})
        ON CONFLICT ("id") DO NOTHING`;
    }

    // 5. Adam thread + memory
    await prisma.$executeRaw`
      INSERT INTO "adam_memory" ("userId", "synthesis", "totalTurns", "turnsSinceSynthesis")
      VALUES (${uid}, ${ADAM_SYNTHESIS}, 2, 0)
      ON CONFLICT ("userId") DO NOTHING`;
    for (let i = 0; i < ADAM_MESSAGES.length; i++) {
      const a = ADAM_MESSAGES[i];
      const ts = new Date(base - (ADAM_MESSAGES.length - i) * 20 * 60e3);
      await prisma.$executeRaw`
        INSERT INTO "adam_messages" ("id", "userId", "role", "content", "createdAt")
        VALUES (${'amsg_demo_' + i}, ${uid}, ${a.role}, ${a.content}, ${ts})
        ON CONFLICT ("id") DO NOTHING`;
    }
  } catch (e) {
    console.error('Demo student seed (non-fatal):', (e as Error).message);
  }
}

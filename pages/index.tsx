import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════════════════
   HOME — "the notebook for all four years of high school"

   Positioning: AdmitsOnly is not a college-admissions tool that happens to
   have extras; it is where a student keeps high school organized, and
   college is the senior-year chapter. The page is organized the same way a
   student lives it — by grade — and the tools are grouped by four plain
   verbs (Write, Plan, Explore, Together) instead of a feature grid.

   Claims are product facts that can be checked in the code (170+ colleges
   in lib/colleges.ts, 55 majors in lib/majors.ts, 7 Common App prompts on
   the essay checker). Unverifiable outcome claims were deliberately not
   carried over from the previous page.
   ══════════════════════════════════════════════════════════════════════ */

const SITE = 'https://www.admitsonly.com';

const GRADES: { grade: string; title: string; body: string; tools: string[] }[] = [
  {
    grade: '9th',
    title: 'Find your footing',
    body: 'Start good habits early. Log activities as they happen, keep an eye on your grades, and find a study group that keeps you going.',
    tools: ['Activity tracker', 'GPA & grades', 'Study pods'],
  },
  {
    grade: '10th',
    title: 'Find your thing',
    body: 'Try things on. Explore careers by major, go deeper in the activities you love, and practice the kind of writing colleges ask for later.',
    tools: ['Career roadmap', 'Essay coach', 'Activity tracker'],
  },
  {
    grade: '11th',
    title: 'Get strategic',
    body: 'Turn interests into a plan. Track test scores, build a college list that fits your major, and find the story you want to tell.',
    tools: ['Test scores', 'College map', 'Story builder'],
  },
  {
    grade: '12th',
    title: 'Apply with a clear head',
    body: 'Every deadline, essay and decision in one place, with honest feedback on your writing before you press submit.',
    tools: ['Application tracker', 'Essay coach', 'Decisions channel'],
  },
];

type Tool = { name: string; body: string; href: string; tag?: string };
const SECTIONS: { verb: string; line: string; icon: ReactNode; tools: Tool[] }[] = [
  {
    verb: 'Write',
    line: 'Feedback that makes the next draft easier.',
    icon: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
    tools: [
      { name: 'Essay coach', body: 'Live notes on structure, rhythm, tone and word choice while you write.', href: '/dashboard/essays' },
      { name: 'Essay checker', body: 'Paste a draft, get feedback in seconds. No account needed.', href: '/essay-checker', tag: 'free' },
      { name: 'Essay samples', body: 'Real essays, organized by the school and prompt they answered.', href: '/dashboard/essay-library' },
      { name: 'Story builder', body: 'Stuck on a topic? Find the stories only you can tell.', href: '/dashboard/story-builder' },
    ],
  },
  {
    verb: 'Plan',
    line: 'Know what is due, and what comes next.',
    icon: <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 13l2.5 2.5L16 11" />,
    tools: [
      { name: 'Profile & activities', body: 'GPA, test scores (optional) and every activity, with a read on breadth and depth.', href: '/dashboard/profile' },
      { name: 'Application tracker', body: 'Deadlines for 170+ colleges, with a checklist for each school.', href: '/dashboard/progress' },
      { name: 'Reminders', body: 'A short email before a deadline. Never twice, never nagging.', href: '/dashboard/settings' },
    ],
  },
  {
    verb: 'Explore',
    line: 'See what is out there before you have to choose.',
    icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5 5-2z" />,
    tools: [
      { name: 'Career roadmap', body: 'Pick a major, see the careers it leads to and the path to get there.', href: '/dashboard/career-roadmap' },
      { name: 'College map', body: 'Reach, match and safety schools from your grades and your major, across 55 fields.', href: '/dashboard/college-heatmap' },
    ],
  },
  {
    verb: 'Together',
    line: 'Nobody should do high school alone.',
    icon: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0" />,
    tools: [
      { name: 'Study pods', body: 'Small groups with chat, shared files and a focus timer.', href: '/dashboard/pods' },
      { name: 'Community channels', body: '#CollegeEssays and #CollegeDecisions, open to every student.', href: '/dashboard/pods' },
      { name: 'Parents & tutors', body: 'Share progress with the people helping you, without screenshots.', href: '/services' },
    ],
  },
];

/* ─── small drawn pieces ─── */

function Icon({ children, className = 'w-5 h-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/** A pencil arrow. Hand-drawn curves, not a geometric chevron. */
function Arrow({ className = '', d = 'M4 30C22 8 52 4 74 12' }: { className?: string; d?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
      <path d="M66 6l8 6-9 4" />
    </svg>
  );
}

function Check({ done }: { done?: boolean }) {
  return (
    <span className={`mt-0.5 w-4 h-4 rounded-[4px] border-[1.5px] border-ink flex items-center justify-center flex-shrink-0 ${done ? 'bg-ink' : ''}`} aria-hidden>
      {done && <svg className="w-3 h-3 text-paper" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </span>
  );
}

/** The hero's notebook spread: three real pieces of the product, pinned to
    the page. Content mirrors actual features, not invented screens. */
function NotebookSpread() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:mt-10" aria-hidden>
      {/* This week */}
      <div className="relative z-10 rounded-2xl border bg-white p-5 lg:-rotate-[1.5deg]">
        <p className="font-display text-lg font-semibold">This week</p>
        <ul className="mt-3 space-y-2.5 text-[15px]">
          <li className="flex gap-2.5"><Check done /><span className="line-through decoration-[1.5px] text-slate-500">Log robotics hours</span></li>
          <li className="flex gap-2.5"><Check /><span>Draft UCLA insight question #2</span></li>
          <li className="flex gap-2.5"><Check /><span>Chem study pod · Thu 7pm</span></li>
          <li className="flex gap-2.5"><Check /><span>Read 2 sample essays</span></li>
        </ul>
      </div>

      <div className="relative mt-5 grid grid-cols-[1fr_1.15fr] gap-5">
        {/* GPA */}
        <div className="rounded-2xl border bg-white p-4 lg:rotate-[1.2deg]">
          <p className="text-sm text-slate-600">GPA</p>
          <p className="font-display text-3xl font-bold leading-none mt-1">3.91</p>
          <svg viewBox="0 0 120 40" className="mt-2 w-full h-10 text-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 33 C 20 30, 26 26, 40 27 S 62 18, 76 16 S 100 9, 117 6" />
            <circle cx="117" cy="6" r="3" fill="currentColor" />
          </svg>
          <p className="text-xs text-slate-600 mt-1">up from 3.82 in fall</p>
        </div>
        {/* Essay note */}
        <div className="rounded-2xl border bg-white p-4 lg:-rotate-[0.8deg]">
          <p className="text-sm text-slate-600">Essay coach</p>
          <p className="mt-1.5 text-[14px] leading-snug">
            &ldquo;I would be remiss not to <span className="underline decoration-wavy decoration-red-pencil underline-offset-4">elucidate</span>&hellip;&rdquo;
          </p>
          <p className="mt-2 text-[13px] text-slate-700">Try <b>explain</b>. Plain words read as more confident.</p>
        </div>
      </div>

      <span className="note hidden lg:block absolute -top-11 right-24 text-[26px] text-slate-700 leading-none">
        all of it, one place
      </span>
      <Arrow className="hidden lg:block absolute -top-8 right-6 w-16 h-8 text-slate-600 rotate-[35deg]" />
    </div>
  );
}

export default function Home() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AdmitsOnly',
      url: SITE,
      description: 'The all-in-one notebook for high school students, grades 9 to 12.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AdmitsOnly',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: SITE,
      description: 'Plan classes and activities, track your GPA, get instant essay feedback, find study partners and build a college list, in one notebook for all four years of high school.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    },
  ];

  return (
    <>
      <Head>
        <title>AdmitsOnly | The All-in-One Notebook for High School (Grades 9–12)</title>
        <meta
          name="description"
          content="Plan classes and activities, track your GPA, get instant feedback on your writing, find study partners and build your college list. One free notebook for all four years of high school."
        />
        <meta property="og:title" key="og:title" content="AdmitsOnly | All four years of high school, in one notebook" />
        <meta name="twitter:title" key="twitter:title" content="AdmitsOnly | All four years of high school, in one notebook" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      {/* ─── HERO ─── */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24 grid gap-14 lg:grid-cols-[1.05fr_1fr] items-center">
        <div className="min-w-0">
          <span className="note text-[24px] text-slate-700">for grades 9 through 12</span>
          <h1 className="mt-3 text-[2.6rem] sm:text-6xl font-bold leading-[1.02] text-primary">
            All four years of high school, in <span className="gradient-text">one notebook</span>.
          </h1>
          <p className="mt-6 text-lg text-slate-700 leading-relaxed max-w-xl">
            Track your classes and activities, get honest feedback on your writing, study with friends, and map out what
            comes after graduation. Free to start, in any grade.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/auth/register" className="btn-primary text-base !px-6 !py-3">Start your notebook</Link>
            <Link href="/essay-checker" className="btn-secondary text-base !px-6 !py-3">Check an essay, no sign-up</Link>
          </div>
          <p className="mt-5 text-sm text-slate-600">For students, with a seat at the table for parents and tutors.</p>
        </div>
        <NotebookSpread />
      </section>

      {/* ─── FACTS ─── checkable product facts, not outcome claims */}
      <section className="border-y-[1.5px] border-dashed border-slate-300 bg-white/60">
        <dl className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {[
            ['170+', 'colleges, each with its deadlines'],
            ['55', 'majors to match colleges on'],
            ['4', 'years of tools, one login'],
            ['$0', 'to start, no card needed'],
          ].map(([n, label]) => (
            <div key={label}>
              <dt className="font-display text-3xl font-bold">{n}</dt>
              <dd className="mt-1 text-sm text-slate-600">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ─── BY GRADE ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl lg:text-4xl font-bold">Built for every year, not just the last one</h2>
          <p className="mt-3 text-lg text-slate-700">
            Most college tools show up in senior fall. By then the most useful years are behind you.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GRADES.map((g) => (
            <article key={g.grade} className="rounded-2xl border bg-white p-6 flex flex-col">
              <p className="font-display text-5xl font-bold leading-none">{g.grade}</p>
              <h3 className="mt-4 text-xl font-semibold">{g.title}</h3>
              <p className="mt-2 text-[15px] text-slate-700 leading-relaxed flex-1">{g.body}</p>
              <ul className="mt-5 pt-4 border-t-[1.5px] border-dashed border-slate-300 space-y-1.5 text-sm">
                {g.tools.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" aria-hidden />{t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ─── WHAT'S INSIDE ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-20 lg:pb-24">
        <h2 className="text-3xl lg:text-4xl font-bold">What&apos;s inside</h2>
        <p className="mt-3 text-lg text-slate-700 max-w-2xl">Four kinds of help, each one a page of the same notebook.</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.verb} className="rounded-2xl border bg-white p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl border-[1.5px] border-ink flex items-center justify-center"><Icon>{s.icon}</Icon></span>
                <div>
                  <h3 className="text-2xl font-bold leading-none">{s.verb}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.line}</p>
                </div>
              </div>
              <ul className="mt-5 divide-y-[1.5px] divide-dashed divide-slate-300">
                {s.tools.map((t) => (
                  <li key={t.name}>
                    <Link href={t.href} className="group flex items-start justify-between gap-4 py-3.5">
                      <span className="min-w-0">
                        <span className="font-semibold group-hover:underline underline-offset-4 decoration-[1.5px]">{t.name}</span>
                        {t.tag && <span className="ml-2 note text-[19px]">{t.tag}!</span>}
                        <span className="block mt-0.5 text-[15px] text-slate-700 leading-snug">{t.body}</span>
                      </span>
                      <span className="mt-0.5 text-slate-500 group-hover:text-ink group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {/* ─── TRY IT ─── the free checker, the one thing anyone can use right now */}
      <section className="max-w-6xl mx-auto px-6 pb-20 lg:pb-24">
        <div className="rounded-2xl border bg-white p-7 sm:p-10 grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
          <div>
            <span className="note text-[22px] text-slate-700">no account, no catch</span>
            <h2 className="mt-2 text-3xl lg:text-4xl font-bold">Try it on an essay you already have</h2>
            <p className="mt-3 text-lg text-slate-700">
              Paste any draft, a college essay or an English assignment, and see how it reads: rhythm, tone, and the
              words a busy reader might trip on. Your writing stays in your browser.
            </p>
            <Link href="/essay-checker" className="mt-6 btn-primary text-base !px-6 !py-3">Open the essay checker</Link>
          </div>
          <div className="rounded-xl border-[1.5px] border-dashed border-slate-400 p-5 bg-paper" aria-hidden>
            <p className="student-page text-[15px] leading-relaxed text-slate-800">
              Every Saturday my grandmother wakes at four to push her cart three miles to the market. I have been her
              helper since I was seven&hellip;
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[['Rhythm', '82'], ['Readability', '96'], ['Tone', '88'], ['Narrative', '74']].map(([k, v]) => (
                <div key={k} className="rounded-lg border-[1.5px] border-ink bg-white px-3 py-2 flex items-baseline justify-between">
                  <span className="text-slate-700">{k}</span><span className="font-display font-bold text-lg">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PARENTS & TUTORS ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-20 lg:pb-24 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-7">
          <h2 className="text-2xl font-bold">For parents</h2>
          <p className="mt-2 text-slate-700 leading-relaxed">
            See deadlines and progress at a glance, with your student&apos;s permission, so the dinner-table
            conversation can be about something else.
          </p>
          <Link href="/auth/register" className="mt-4 inline-block font-semibold underline underline-offset-4 decoration-[1.5px]">Create a parent account</Link>
        </div>
        <div className="rounded-2xl border bg-white p-7">
          <h2 className="text-2xl font-bold">For tutors and counselors</h2>
          <p className="mt-2 text-slate-700 leading-relaxed">
            Review essays inline, keep session notes, and follow each student&apos;s progress, in the same notebook
            they already use.
          </p>
          <Link href="/consulting" className="mt-4 inline-block font-semibold underline underline-offset-4 decoration-[1.5px]">See tutoring and consulting</Link>
        </div>
      </section>

      {/* ─── START + NEWSLETTER ─── */}
      <section className="border-t-[1.5px] border-dashed border-slate-300">
        <div className="max-w-3xl mx-auto px-6 py-20 lg:py-24 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold">Start where you are.</h2>
          <p className="mt-4 text-lg text-slate-700">
            The first week of ninth grade or the night before a deadline. Either way, there&apos;s a page for it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/auth/register" className="btn-primary text-base !px-6 !py-3">Start your notebook, free</Link>
            <Link href="/consulting" className="btn-secondary text-base !px-6 !py-3">Talk to a consultant</Link>
          </div>

          <div className="mt-16 rounded-2xl border bg-white p-7 text-left sm:text-center">
            <h3 className="text-xl font-bold">Learner&apos;s Edge Weekly</h3>
            <p className="mt-2 text-[15px] text-slate-700 max-w-lg sm:mx-auto">
              Internships, volunteer events, study tips and admissions news for families, once a week.
            </p>
            <form action="/newsletter" className="mt-5 flex flex-col sm:flex-row gap-3 max-w-md sm:mx-auto">
              <label htmlFor="home-newsletter" className="sr-only">Email address</label>
              <input
                id="home-newsletter"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white border-[1.5px] text-[15px] focus:outline-none"
              />
              <button type="submit" className="btn-primary text-sm !px-5 !py-3 whitespace-nowrap">Subscribe</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

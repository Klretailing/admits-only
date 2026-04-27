import Head from 'next/head';
import Link from 'next/link';
import { useInView, useCountUp } from '../hooks/useAnimations';
import EssayMockup from '../components/EssayMockup';
import BentoGrid from '../components/BentoGrid';
import TestimonialCarousel from '../components/TestimonialCarousel';
import ServiceShowcase from '../components/ServiceShowcase';

/* ──────────────────────── DATA ──────────────────────── */

const universities = [
  'Stanford', 'MIT', 'Harvard', 'Princeton', 'Yale', 'Columbia',
  'Duke', 'Northwestern', 'UChicago', 'Caltech', 'Georgetown',
  'UC Berkeley', 'UCLA', 'Georgia Tech', 'UMD', 'Boston University',
  'UC San Diego', 'UC Davis', 'UC Irvine', 'UC Santa Barbara',
  'Santa Clara', 'Case Western',
];

const platformFeatures = [
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    gradient: 'from-accent to-purple-600',
    shadow: 'shadow-accent/20',
    title: 'AI Essay Coach',
    description: 'Write stronger essays with AI-powered feedback on voice, structure, and originality. Track drafts and get scored against admissions standards.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
    title: 'SAT/ACT Score Tracker',
    description: 'Diagnostic-first prep with practice tests, score trending, and section breakdowns. See exactly where to focus for maximum improvement.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
    title: 'College Match Engine',
    description: 'Match your profile against 170+ universities. See acceptance probability, compare schools, and build your application list with data.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradient: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/20',
    title: 'Study Pods',
    description: 'Collaborate in private study groups with group chat, polls, XP streaks, leaderboards, and document sharing. The accountability engine students need.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    gradient: 'from-sky-500 to-cyan-600',
    shadow: 'shadow-sky-500/20',
    title: 'Career Roadmap',
    description: 'Explore career paths by major with salary timelines, milestone requirements, and college recommendations. Take a quiz if you\'re undecided.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: 'from-violet-500 to-indigo-600',
    shadow: 'shadow-violet-500/20',
    title: 'Holistic Profile Scoring',
    description: 'See where you stand with a percentile ranking across GPA, SAT, and extracurriculars. Get AI-powered recommendations to improve your profile.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Create Your Profile',
    description: 'Enter your GPA, test scores, and extracurriculars. Our AI instantly scores your profile and shows you where you stand among thousands of applicants.',
  },
  {
    step: '02',
    title: 'Use the Tools',
    description: 'Write essays with AI feedback, match against 170+ colleges, track your SAT improvement, explore career paths, and collaborate in Study Pods.',
  },
  {
    step: '03',
    title: 'Track & Improve',
    description: 'Watch your holistic score climb as you strengthen your profile. Data-driven dashboards show exactly what\'s working and where to focus next.',
  },
];

/* ──────────────────────── SCROLL SECTION ──────────────────────── */

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────── ANIMATED STAT ──────────────────────── */

function AnimatedStat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(end, 1800);
  return (
    <div ref={ref} className="glass-card-dark rounded-2xl p-5 text-center">
      <div className="stat-number gradient-text">{count}{suffix}</div>
      <p className="mt-1 text-sm text-slate-400 font-medium">{label}</p>
    </div>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function Home() {
  return (
    <>
      <Head>
        <title>AdmitsOnly | The College Admissions Platform — AI Essay Coach, College Matching &amp; More</title>
        <meta name="description" content="AdmitsOnly is the all-in-one college admissions platform for ambitious students. AI essay coaching, SAT/ACT score tracking, college match engine for 170+ universities, Study Pods, career roadmaps, and holistic profile scoring. Get started free." />
        <meta name="keywords" content="college admissions platform, AI essay coach, college match tool, SAT prep tracker, study groups for college, career roadmap tool, holistic admissions scoring, college application help" />
      </Head>

      <div className="bg-white">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="max-w-3xl">
              <div className="section-label">The College Admissions Platform</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Everything you need to get into your{' '}
                <span className="gradient-text">dream school</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                AI-powered essay coaching, SAT/ACT score tracking, a college match engine for 170+ universities,
                collaborative Study Pods, career roadmaps, and holistic profile scoring — all in one place.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/auth/register" className="btn-primary text-base">
                  Get Started Free
                </Link>
                <Link href="#platform" className="btn-ghost text-base">
                  See the Platform &darr;
                </Link>
              </div>
            </div>

            {/* Animated Stats */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatedStat end={170} suffix="+" label="Universities Matched" />
              <AnimatedStat end={500} suffix="+" label="Students on Platform" />
              <AnimatedStat end={6} suffix="" label="Built-In Tools" />
              <AnimatedStat end={98} suffix="%" label="Student Satisfaction" />
            </div>
          </div>
        </section>

        {/* ─── UNIVERSITY MARQUEE ─── */}
        <section className="py-14 bg-surface border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Students Using AdmitsOnly Have Been Admitted To
            </p>
          </div>
          <div className="marquee-container">
            <div className="marquee-track animate">
              {[...universities, ...universities].map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex-shrink-0 px-6 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="marquee-container mt-3">
            <div className="marquee-track animate-reverse">
              {[...universities.slice().reverse(), ...universities.slice().reverse()].map((name, i) => (
                <div
                  key={`rev-${name}-${i}`}
                  className="flex-shrink-0 px-6 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PLATFORM FEATURES GRID ─── */}
        <section id="platform" className="section-padding bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">What&apos;s Inside</div>
                <h2 className="section-title">Six powerful tools, one platform</h2>
                <p className="section-subtitle mx-auto">
                  Every tool a student needs to build a competitive application — from first practice test to acceptance letter.
                </p>
              </div>
            </RevealSection>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((feature, i) => (
                <RevealSection key={feature.title} delay={i * 80}>
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-7 hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 h-full">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg ${feature.shadow}`}>
                      {feature.icon}
                    </div>
                    <h3 className="mt-5 text-lg font-bold font-display text-primary">{feature.title}</h3>
                    <p className="mt-2 text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── ESSAY MOCKUP SECTION ─── */}
        <section className="section-padding bg-surface overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-center">
              <RevealSection>
                <div className="section-label">AI-Powered Essay Coaching</div>
                <h2 className="section-title">Write essays that admissions officers remember</h2>
                <p className="section-subtitle !max-w-none">
                  Our AI essay coach guides students through every draft — from brainstorming authentic stories
                  to polishing the final version. Get scored on voice, structure, and originality, with actionable
                  feedback that improves your writing in real time.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    { label: 'AI Feedback Engine', desc: 'Real-time scoring on narrative voice, grammar, vocabulary, and originality.' },
                    { label: 'Draft Tracking', desc: 'Save multiple drafts and watch your scores improve version over version.' },
                    { label: 'Supplemental Essay Strategy', desc: 'Tailored approach for each university\'s unique prompts and culture.' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4 items-start">
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/auth/register" className="mt-8 btn-primary inline-flex text-sm">
                  Start Writing Free &rarr;
                </Link>
              </RevealSection>

              <RevealSection delay={200}>
                <EssayMockup />
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ─── BENTO GRID CAPABILITIES ─── */}
        <section className="section-padding bg-white bg-grid">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">Platform Capabilities</div>
                <h2 className="section-title">Built for how students actually learn</h2>
                <p className="section-subtitle mx-auto">
                  Adaptive technology that meets students where they are — combining AI diagnostics, progress tracking, and live collaboration.
                </p>
              </div>
            </RevealSection>
            <div className="mt-14">
              <BentoGrid />
            </div>
          </div>
        </section>

        {/* ─── SERVICES SHOWCASE (animated blocks) ─── */}
        <ServiceShowcase />

        {/* ─── HOW IT WORKS ─── */}
        <section className="section-padding bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="badge bg-white/10 text-white border-white/20 mb-4">How It Works</div>
                <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                  From sign-up to acceptance letter
                </h2>
                <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  Create an account in 30 seconds. No credit card required. Start using every tool immediately.
                </p>
              </div>
            </RevealSection>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {howItWorks.map((step, i) => (
                <RevealSection key={step.step} delay={i * 150}>
                  <div className="glass-card-dark rounded-2xl p-7 h-full">
                    <div className="text-4xl font-extrabold font-display gradient-text">{step.step}</div>
                    <h3 className="mt-3 text-xl font-bold text-white">{step.title}</h3>
                    <p className="mt-3 text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF / TESTIMONIALS ─── */}
        <section className="section-padding bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">Student &amp; Parent Reviews</div>
                <h2 className="section-title">Trusted by students and families nationwide</h2>
                <p className="section-subtitle mx-auto">
                  Real stories from students and parents who used AdmitsOnly to strengthen their college applications.
                </p>
              </div>
            </RevealSection>
            <div className="mt-14">
              <TestimonialCarousel />
            </div>
          </div>
        </section>

        {/* ─── PLATFORM CTA ─── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent via-purple-600 to-violet-700 section-padding">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <RevealSection>
              <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                Your college admissions journey starts here
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
                Join thousands of students using AdmitsOnly to build stronger applications.
                Create your free account and start using every tool today.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link href="/auth/register" className="btn-secondary text-base !border-0">
                  Create Free Account
                </Link>
                <Link href="/consulting" className="btn-ghost text-base">
                  Work With a Consultant &rarr;
                </Link>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ─── NEWSLETTER ─── */}
        <section className="section-padding bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <RevealSection>
              <div className="badge bg-accent/10 text-accent border-accent/20 mb-4">Free Weekly Newsletter</div>
              <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                Learner&apos;s Edge Weekly
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                The Bay Area&apos;s most useful free education newsletter — internships, volunteer events,
                college admissions insights, and EdTech picks for K–12 families, delivered every week.
              </p>
              <form
                action="/newsletter"
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="px-7 py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 text-sm whitespace-nowrap"
                >
                  Subscribe Free &rarr;
                </button>
              </form>
            </RevealSection>
          </div>
        </section>
      </div>
    </>
  );
}

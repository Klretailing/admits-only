import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useInView, useCountUp } from '../hooks/useAnimations';
import EssayMockup from '../components/EssayMockup';

/* ──────────────────────── DATA ──────────────────────── */

const universities = [
  'Stanford', 'MIT', 'Harvard', 'Princeton', 'Yale', 'Columbia',
  'Duke', 'Northwestern', 'UChicago', 'Caltech', 'Georgetown',
  'UC Berkeley', 'UCLA', 'Georgia Tech', 'UMD', 'Boston University',
  'UC San Diego', 'UC Davis', 'UC Irvine', 'UC Santa Barbara',
  'Santa Clara', 'Case Western',
];

const painPoints = [
  {
    pain: 'Scattered across 10 different apps',
    solve: 'One platform for everything',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    detail: 'Essays, SAT prep, college lists, career planning, study groups — all in one place.',
  },
  {
    pain: 'No idea where you actually stand',
    solve: 'See your real percentile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    detail: 'Holistic scoring benchmarks your GPA, SAT, and ECs against real applicants.',
  },
  {
    pain: 'Applying to college alone is overwhelming',
    solve: 'Built-in accountability & community',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    detail: 'Study Pods with streaks, XP, leaderboards, and group chat keep you on track.',
  },
];

const tools = [
  { name: 'AI Essay Coach', href: '/dashboard/essays', gradient: 'from-accent to-purple-600' },
  { name: 'SAT/ACT Tracker', href: '/dashboard/profile', gradient: 'from-amber-500 to-orange-600' },
  { name: 'College Match', href: '/dashboard/college-match', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Study Pods', href: '/dashboard/pods', gradient: 'from-rose-500 to-pink-600' },
  { name: 'Career Roadmap', href: '/dashboard/career-roadmap', gradient: 'from-sky-500 to-cyan-600' },
  { name: 'Profile Scoring', href: '/dashboard/profile', gradient: 'from-violet-500 to-indigo-600' },
];

const features = [
  {
    id: 'study-pods',
    name: 'Study Pods',
    href: '/dashboard/pods',
    gradient: 'from-rose-500 to-pink-600',
    description: 'Collaborative study groups with real-time chat, document sharing, XP streaks, and leaderboards to keep everyone accountable.',
  },
  {
    id: 'essay-coach',
    name: 'AI Essay Coach',
    href: '/dashboard/essays',
    gradient: 'from-accent to-purple-600',
    description: 'AI-powered essay analysis with grammar checking, vocabulary scoring, structural feedback, and draft-over-draft improvement tracking.',
  },
  {
    id: 'sat-tracker',
    name: 'SAT/ACT Tracker',
    href: '/dashboard/profile',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Log practice and official scores, visualize trends over time, and see exactly where you stand against national percentiles.',
  },
  {
    id: 'college-match',
    name: 'College Match',
    href: '/dashboard/college-match',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Match against 170+ universities based on your GPA, test scores, extracurriculars, and preferences with reach, match, and safety tiers.',
  },
  {
    id: 'career-roadmap',
    name: 'Career Roadmap',
    href: '/dashboard/career-roadmap',
    gradient: 'from-sky-500 to-cyan-600',
    description: 'Explore career paths by major with salary timelines, milestone requirements, and college recommendations. Take a quiz if undecided.',
  },
  {
    id: 'progress-tracker',
    name: 'Progress Tracker',
    href: '/dashboard/profile',
    gradient: 'from-violet-500 to-indigo-600',
    description: 'Holistic profile scoring benchmarks your GPA, SAT, extracurriculars, and essays against real applicant data with percentile rankings.',
  },
];

/* ──────────────────────── HELPERS ──────────────────────── */

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

function AnimatedStat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(end, 1800);
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl font-extrabold font-display gradient-text">{count}{suffix}</div>
      <p className="mt-0.5 text-xs text-slate-400 font-medium">{label}</p>
    </div>
  );
}

/* ──────────────────────── FEATURE PREVIEWS ──────────────────────── */

function FeaturePreview({ id }: { id: string }) {
  switch (id) {
    case 'study-pods':
      return (
        <div className="h-[72px] flex flex-col justify-center gap-1.5 px-1">
          <div className="flex items-end gap-1.5">
            <div className="w-4 h-4 rounded-full bg-rose-300 flex-shrink-0" />
            <div className="bg-rose-100 rounded-lg rounded-bl-sm px-2.5 py-1.5">
              <div className="w-14 h-1 bg-rose-300/60 rounded-full" />
            </div>
          </div>
          <div className="flex items-end gap-1.5 self-end">
            <div className="bg-indigo-100 rounded-lg rounded-br-sm px-2.5 py-1.5">
              <div className="w-[72px] h-1 bg-accent/30 rounded-full" />
            </div>
            <div className="w-4 h-4 rounded-full bg-indigo-300 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-1 ml-5">
            <svg className="w-2.5 h-2.5 text-slate-300" fill="currentColor" viewBox="0 0 16 16">
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5z" />
            </svg>
            <div className="w-10 h-0.5 bg-slate-200 rounded-full" />
          </div>
        </div>
      );
    case 'essay-coach':
      return (
        <div className="h-[72px] flex flex-col justify-center gap-[5px] px-1">
          <div className="flex items-center gap-1">
            <div className="h-1.5 flex-1 bg-slate-200 rounded-full" />
            <div className="h-1.5 w-6 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-8 bg-slate-200 rounded-full" />
            <div className="h-1.5 w-12 bg-purple-200 rounded-full" />
            <div className="h-1.5 w-6 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-14 bg-slate-200 rounded-full" />
            <div className="h-1.5 w-8 bg-amber-200 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-5 bg-slate-200 rounded-full" />
            <div className="h-1.5 w-16 bg-emerald-200 rounded-full" />
            <div className="h-1.5 w-4 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-10 bg-slate-200 rounded-full" />
            <div className="h-1.5 w-6 bg-rose-200 rounded-full" />
            <div className="h-1.5 flex-1 bg-slate-200 rounded-full" />
          </div>
        </div>
      );
    case 'sat-tracker':
      return (
        <div className="h-[72px] flex items-end justify-center gap-2.5 px-3 pb-1">
          {[
            { h: 28, color: 'bg-amber-200' },
            { h: 36, color: 'bg-amber-300' },
            { h: 44, color: 'bg-amber-400' },
            { h: 54, color: 'bg-orange-400' },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full ${bar.color} rounded-t-sm`} style={{ height: `${bar.h}px` }} />
              <div className="w-4 h-0.5 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      );
    case 'college-match':
      return (
        <div className="h-[72px] flex flex-col justify-center gap-2 px-1">
          {[
            { w: '82%', color: 'bg-emerald-400', label: 'w-12' },
            { w: '68%', color: 'bg-teal-400', label: 'w-8' },
            { w: '45%', color: 'bg-cyan-400', label: 'w-10' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-slate-100 flex-shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-slate-200" />
              </div>
              <div className={`h-1 bg-slate-200 rounded-full ${row.label}`} />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${row.color} rounded-full`} style={{ width: row.w }} />
              </div>
            </div>
          ))}
        </div>
      );
    case 'career-roadmap':
      return (
        <div className="h-[72px] flex items-center px-2">
          <div className="flex items-center w-full">
            {[
              { color: 'bg-sky-400', ring: 'ring-sky-100' },
              { color: 'bg-cyan-400', ring: 'ring-cyan-100' },
              { color: 'bg-teal-400', ring: 'ring-teal-100' },
              { color: 'bg-emerald-400', ring: 'ring-emerald-100' },
            ].map((dot, i, arr) => (
              <div key={i} className={`flex items-center ${i < arr.length - 1 ? 'flex-1' : ''}`}>
                <div className={`w-3.5 h-3.5 rounded-full ${dot.color} flex-shrink-0 ring-3 ${dot.ring}`} />
                {i < arr.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-sky-200 to-teal-200 mx-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case 'progress-tracker':
      return (
        <div className="h-[72px] flex items-center justify-center gap-3">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="19" stroke="#e2e8f0" strokeWidth="4" fill="none" />
            <circle
              cx="24" cy="24" r="19"
              stroke="#8b5cf6" strokeWidth="4" fill="none"
              strokeDasharray={`${0.78 * 119.4} ${119.4}`}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
            <text x="24" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7c3aed">78</text>
          </svg>
          <div className="flex flex-col gap-1.5">
            <div className="w-12 h-1 bg-violet-200 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
            <div className="w-10 h-1 bg-violet-100 rounded-full" />
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function Home() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const selectedFeature = features.find((f) => f.id === activeFeature) ?? null;

  return (
    <>
      <Head>
        <title>AdmitsOnly | The College Admissions Platform — AI Essay Coach, College Matching &amp; More</title>
        <meta name="description" content="AdmitsOnly is the all-in-one college admissions platform. AI essay coaching, SAT/ACT tracking, college matching for 170+ universities, Study Pods, career roadmaps, and holistic profile scoring. Free to start." />
      </Head>

      <div className="bg-white">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-14 lg:pt-28 lg:pb-20">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                The all-in-one platform for{' '}
                <span className="gradient-text">college admissions</span>
              </h1>
              <p className="mt-5 text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Essays, test prep, college matching, study groups, career planning, and profile scoring — everything students need, in one place.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/auth/register" className="btn-primary text-base">
                  Get Started Free
                </Link>
                <Link href="/consulting" className="btn-ghost text-base">
                  Talk to a Consultant &rarr;
                </Link>
              </div>
            </div>

            {/* Tool pills */}
            <div className="mt-12 flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
              {tools.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 hover:border-accent/40 hover:bg-white/10 transition-all duration-200"
                >
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tool.gradient}`} />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{tool.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TRUST STRIP ─── */}
        <section className="py-6 bg-surface border-y border-slate-100">
          <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <AnimatedStat end={170} suffix="+" label="Universities" />
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <AnimatedStat end={500} suffix="+" label="Students" />
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <AnimatedStat end={6} suffix="" label="Built-In Tools" />
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <AnimatedStat end={98} suffix="%" label="Satisfaction" />
          </div>
        </section>

        {/* ─── UNIVERSITY MARQUEE ─── */}
        <section className="py-8 bg-white">
          <div className="max-w-7xl mx-auto px-6 mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Students Using AdmitsOnly Have Been Admitted To
            </p>
          </div>
          <div className="marquee-container">
            <div className="marquee-track animate">
              {[...universities, ...universities].map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex-shrink-0 px-5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PAIN → SOLUTION ─── */}
        <section className="section-padding bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center mb-12">
                <h2 className="section-title">College admissions is broken. We fixed it.</h2>
              </div>
            </RevealSection>

            <div className="grid gap-5 md:grid-cols-3">
              {painPoints.map((p, i) => (
                <RevealSection key={i} delay={i * 100}>
                  <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden h-full">
                    <div className="px-6 pt-5 pb-4 bg-slate-50/80 border-b border-slate-100">
                      <p className="text-sm text-slate-400 italic line-through decoration-slate-300/60 decoration-1">
                        &ldquo;{p.pain}&rdquo;
                      </p>
                    </div>
                    <div className="px-6 py-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                          {p.icon}
                        </div>
                        <p className="text-base font-bold text-primary">{p.solve}</p>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">{p.detail}</p>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURE GRID ─── */}
        <section className="section-padding bg-white bg-grid">
          <div className="max-w-5xl mx-auto px-6">
            <RevealSection>
              <div className="text-center mb-12">
                <div className="section-label">Platform Features</div>
                <h2 className="section-title">Everything you need, built in</h2>
              </div>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {features.map((f, i) => (
                <RevealSection key={f.id} delay={i * 80}>
                  <button
                    onClick={() => setActiveFeature(f.id)}
                    className="w-full text-left rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 hover:border-accent/20 hover:-translate-y-1 group cursor-pointer"
                  >
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 overflow-hidden">
                      <FeaturePreview id={f.id} />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <div className="w-2.5 h-2.5 bg-white/80 rounded-sm" />
                      </div>
                      <span className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">{f.name}</span>
                    </div>
                  </button>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURE MODAL ─── */}
        {selectedFeature && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveFeature(null)}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveFeature(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${selectedFeature.gradient} flex items-center justify-center shadow-lg`}>
                <div className="w-4 h-4 bg-white/80 rounded" />
              </div>
              <h3 className="mt-4 text-lg font-bold font-display text-primary">{selectedFeature.name}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{selectedFeature.description}</p>
              <Link
                href={selectedFeature.href}
                className="mt-5 btn-primary text-sm !py-2.5 !px-5 inline-flex"
              >
                Try It Free &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ─── ESSAY DEEP-DIVE ─── */}
        <section className="section-padding bg-surface overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-center">
              <RevealSection>
                <div className="section-label">AI-Powered Essay Coaching</div>
                <h2 className="section-title">Write essays that admissions officers remember</h2>
                <p className="mt-4 text-slate-500 leading-relaxed">
                  Get scored on voice, structure, and originality — with actionable feedback that improves your writing draft over draft.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { label: 'AI Feedback Engine', desc: 'Real-time scoring on narrative, grammar, vocabulary, and originality.' },
                    { label: 'Draft Tracking', desc: 'Watch your scores improve version over version.' },
                    { label: 'Prompt Strategy', desc: 'Tailored approach for each university\'s unique prompts.' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3 items-start">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary">{item.label}</span>
                        <span className="text-sm text-slate-500"> — {item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/auth/register" className="mt-6 btn-primary inline-flex text-sm">
                  Start Writing Free &rarr;
                </Link>
              </RevealSection>

              <RevealSection delay={200}>
                <EssayMockup />
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ─── CTA + NEWSLETTER ─── */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

          <div className="relative max-w-4xl mx-auto px-6 py-20 lg:py-24">
            {/* CTA */}
            <RevealSection>
              <div className="text-center">
                <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                  Your admissions journey starts here
                </h2>
                <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Free to start. No credit card required.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link href="/auth/register" className="btn-primary text-base !bg-white !text-primary hover:!bg-slate-100">
                    Create Free Account
                  </Link>
                  <Link href="/consulting" className="btn-ghost text-base">
                    Work With a Consultant &rarr;
                  </Link>
                </div>
              </div>
            </RevealSection>

            {/* Newsletter */}
            <RevealSection delay={100}>
              <div className="mt-16 pt-12 border-t border-white/10 text-center">
                <div className="badge bg-accent/10 text-accent border-accent/20 mb-3">Free Weekly Newsletter</div>
                <h3 className="text-xl font-bold font-display text-white">Learner&apos;s Edge Weekly</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
                  Internships, volunteer events, admissions insights, and EdTech picks for K–12 families — every week.
                </p>
                <form
                  action="/newsletter"
                  className="mt-5 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 text-sm whitespace-nowrap"
                  >
                    Subscribe &rarr;
                  </button>
                </form>
              </div>
            </RevealSection>
          </div>
        </section>
      </div>
    </>
  );
}

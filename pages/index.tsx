import Head from 'next/head';
import Link from 'next/link';
import { useInView, useCountUp } from '../hooks/useAnimations';
import EssayMockup from '../components/EssayMockup';
import BentoGrid from '../components/BentoGrid';
import TestimonialCarousel from '../components/TestimonialCarousel';

/* ──────────────────────── DATA ──────────────────────── */

const programs = [
  {
    title: 'Scholarship-Ready Academy',
    tag: 'Grades 9–12',
    description: 'Holistic admissions prep with narrative coaching, standardized test strategy, and portfolio development for top-tier universities.',
    color: 'from-accent to-purple-600',
  },
  {
    title: 'STEM Innovators Lab',
    tag: 'Grades 8–12',
    description: 'Hands-on research, coding sprints, and competition prep guided by published academics and industry professionals.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Humanities Leadership Studio',
    tag: 'Grades 9–12',
    description: 'Debate, advanced writing, and civic leadership training with curated reading circles and publication pathways.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Foundations for Growth',
    tag: 'Grades 5–8',
    description: 'Confidence-building and executive function coaching that sets the foundation for rigorous high school coursework.',
    color: 'from-rose-500 to-pink-600',
  },
];

const journey = [
  {
    step: '01',
    title: 'Discovery & Diagnostics',
    description: 'We assess skills, interests, and goals to build a custom academic roadmap with clear milestones and success metrics.',
  },
  {
    step: '02',
    title: 'Immersive Instruction',
    description: 'Students engage in live classes, studio projects, and interactive coaching tailored to their unique learning style.',
  },
  {
    step: '03',
    title: 'Portfolio & Outcomes',
    description: 'Growth translates into tangible results: certifications, competition wins, polished essays, and recommendation support.',
  },
];

const universities = [
  'Stanford', 'MIT', 'Harvard', 'Princeton', 'Yale', 'Columbia',
  'Duke', 'Northwestern', 'UChicago', 'Caltech', 'Georgetown',
  'UC Berkeley', 'UCLA', 'Georgia Tech', 'UMD', 'Boston University',
  'UC San Diego', 'UC Davis', 'UC Irvine', 'UC Santa Barbara',
  'Santa Clara', 'Case Western',
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
        <title>AdmitsOnly | College Admissions Consulting &amp; Academic Coaching (2025–2026)</title>
        <meta name="description" content="AdmitsOnly helps ambitious students gain admission to top universities like Stanford, MIT, Harvard, and more. Expert SAT/ACT prep, college essay coaching, STEM mentorship, and personalized academic programs." />
      </Head>

      <div className="bg-white">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="max-w-3xl">
              <div className="section-label">Premium College Admissions Consulting</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Your child&apos;s path to a{' '}
                <span className="gradient-text">top university</span>{' '}
                starts here
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Personalized academic coaching, expert admissions strategy, and immersive programs
                designed by educators who&apos;ve helped hundreds of students get into Stanford, MIT, Harvard, and 20+ elite institutions.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/contact" className="btn-primary text-base">
                  Book a Free Strategy Call
                </Link>
                <Link href="/services" className="btn-ghost text-base">
                  Explore Programs &rarr;
                </Link>
              </div>
            </div>

            {/* Animated Stats */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatedStat end={98} suffix="%" label="Family Retention" />
              <AnimatedStat end={500} suffix="+" label="Families Served" />
              <AnimatedStat end={12} suffix="+" label="Years of Excellence" />
              <AnimatedStat end={15} suffix="+" label="States Nationwide" />
            </div>
          </div>
        </section>

        {/* ─── UNIVERSITY MARQUEE ─── */}
        <section className="py-14 bg-surface border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Our Students Have Been Admitted To
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

        {/* ─── ESSAY MOCKUP SECTION ─── */}
        <section className="section-padding bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-center">
              <RevealSection>
                <div className="section-label">Essay Coaching That Gets Results</div>
                <h2 className="section-title">We help students craft essays that admissions officers remember</h2>
                <p className="section-subtitle !max-w-none">
                  Our expert essay strategists guide students through every draft — from brainstorming authentic stories
                  to polishing the final version. The result? Personal statements that bring applications to life and
                  stand out in a pool of 50,000+ applicants.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    { label: 'Story Mining Workshops', desc: 'Uncover the unique experiences that make your application unforgettable.' },
                    { label: 'Iterative Draft Reviews', desc: 'Multiple rounds of expert feedback from former admissions readers.' },
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
                <Link href="/services" className="mt-8 btn-primary inline-flex text-sm">
                  See How It Works &rarr;
                </Link>
              </RevealSection>

              <RevealSection delay={200}>
                <EssayMockup />
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ─── BENTO GRID CAPABILITIES ─── */}
        <section className="section-padding bg-surface bg-grid">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">Platform Capabilities</div>
                <h2 className="section-title">Everything you need for world-class academic coaching</h2>
                <p className="section-subtitle mx-auto">
                  Our integrated platform combines cutting-edge learning technology with proven pedagogical methods.
                </p>
              </div>
            </RevealSection>
            <div className="mt-14">
              <BentoGrid />
            </div>
          </div>
        </section>

        {/* ─── ECOSYSTEM ─── */}
        <section className="section-padding bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <RevealSection>
                <div className="section-label">Why AdmitsOnly</div>
                <h2 className="section-title">An end-to-end college admissions ecosystem built for results</h2>
                <p className="section-subtitle">
                  From initial diagnostic to acceptance letter, every touchpoint is designed to maximize your child&apos;s
                  potential. We blend data-driven assessments with human mentorship so families feel supported at every milestone.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {['White-Glove Onboarding', 'Outcome-Driven Dashboards', 'Accountability & Community'].map((pill) => (
                    <span key={pill} className="px-4 py-2 bg-accent/5 border border-accent/10 rounded-full text-sm font-medium text-accent">
                      {pill}
                    </span>
                  ))}
                </div>
              </RevealSection>

              <RevealSection delay={150}>
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-100 shadow-lg">
                  <h3 className="text-xl font-bold font-display text-primary">Experience Pillars</h3>
                  <ul className="mt-6 space-y-5">
                    {[
                      'Concierge scheduling, feedback loops, and premium client touchpoints at every step.',
                      'Flexible delivery: 1-on-1, small cohorts, immersive retreats, or hybrid combinations.',
                      'Measurement-driven growth plans with quarterly impact reports for full transparency.',
                    ].map((item, i) => (
                      <li key={i} className="flex gap-4 items-start">
                        <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                        </span>
                        <span className="text-slate-600 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ─── SIGNATURE PROGRAMS ─── */}
        <section className="section-padding bg-surface bg-grid">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">Signature Programs</div>
                <h2 className="section-title">Curated academic tracks for every stage of the student journey</h2>
                <p className="section-subtitle mx-auto">
                  From middle school foundations to Ivy League admissions strategy, our programs unlock potential at every level.
                </p>
              </div>
            </RevealSection>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {programs.map((program, i) => (
                <RevealSection key={program.title} delay={i * 100}>
                  <div className="group card !p-0 overflow-hidden h-full">
                    <div className={`h-1.5 bg-gradient-to-r ${program.color}`} />
                    <div className="p-7">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold font-display text-primary">{program.title}</h3>
                        <span className="badge-warm flex-shrink-0">{program.tag}</span>
                      </div>
                      <p className="mt-4 text-slate-500 leading-relaxed">{program.description}</p>
                      <Link href="/services" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all">
                        Learn more <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── LEARNING JOURNEY ─── */}
        <section className="section-padding bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="badge bg-white/10 text-white border-white/20 mb-4">How It Works</div>
                <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                  Your personalized college admissions journey
                </h2>
                <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  A structured three-phase approach that transforms academic potential into measurable outcomes and acceptance letters.
                </p>
              </div>
            </RevealSection>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {journey.map((step, i) => (
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

        {/* ─── TESTIMONIALS CAROUSEL ─── */}
        <section className="section-padding bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="section-label">What Families Are Saying</div>
                <h2 className="section-title">Trusted by 500+ families across the country</h2>
                <p className="section-subtitle mx-auto">
                  Real stories from parents and students who transformed their academic journey with AdmitsOnly.
                </p>
              </div>
            </RevealSection>
            <div className="mt-14">
              <TestimonialCarousel />
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent via-purple-600 to-violet-700 section-padding">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <RevealSection>
              <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                Ready to transform your child&apos;s academic future?
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
                Schedule a free strategy call to discuss your family&apos;s goals and discover how AdmitsOnly&apos;s
                personalized approach can help your student gain admission to their dream university.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link href="/contact" className="btn-secondary text-base !border-0">
                  Book a Free Strategy Call
                </Link>
                <Link href="/services" className="btn-ghost text-base">
                  View Programs &rarr;
                </Link>
              </div>
            </RevealSection>
          </div>
        </section>
      </div>
    </>
  );
}

import Head from 'next/head';
import Link from 'next/link';
import { useInView, useCountUp } from '../hooks/useAnimations';
import TestimonialCarousel from '../components/TestimonialCarousel';
import ServiceShowcase from '../components/ServiceShowcase';

/* ──────────────────────── DATA ──────────────────────── */

/* Schools a current AdmitsOnly student was actually admitted to, as
   confirmed by the owner (Nov 2026). This is a factual claim about real
   students: add a school only when an admit is confirmed, never as
   aspiration or example. */
const RECENT_ADMITS = ['Stanford', 'Northeastern', 'Georgia Tech', 'University of Michigan'];

const journey = [
  {
    step: '01',
    title: 'Initial Conversation',
    description: 'We start by listening. A free strategy call helps us understand your student\'s strengths, challenges, and goals so we can recommend the right path forward.',
  },
  {
    step: '02',
    title: 'Personalized Plan',
    description: 'Based on what we learn, we build a tailored plan — whether that\'s mentoring, admissions support, test prep, or a combination — with clear milestones and regular check-ins.',
  },
  {
    step: '03',
    title: 'Ongoing Support & Results',
    description: 'We walk alongside your family every step of the way. Progress is tracked, plans adapt as needed, and we celebrate every milestone together.',
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

function AnimatedStat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(end, 1800);
  return (
    <div ref={ref} className="p-5 text-center">
      <div className="stat-number text-primary">{count}{suffix}</div>
      <p className="mt-1 text-sm text-slate-400 font-medium">{label}</p>
    </div>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function Consulting() {
  return (
    <>
      <Head>
        <title>Tutoring &amp; Consulting | AdmitsOnly — One-on-One Mentors for High School</title>
        <meta name="description" content="Work one-on-one with an AdmitsOnly mentor: writing, SAT/ACT prep, career exploration and college admissions strategy, for students in grades 9 through 12." />
      </Head>

      <div className="bg-white">
        {/* ─── HERO ─── */}
        <section className="relative">

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="max-w-3xl">
              <div className="section-label">Premium College Admissions Consulting</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-primary leading-[1.1] tracking-tight">
                A mentor for{' '}
                <span className="gradient-text">every year</span>{' '}
                of high school
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-700 leading-relaxed max-w-2xl">
                Personalized academic coaching, expert admissions strategy, and immersive programs,
                from educators whose students have been admitted to some of the best universities
                in the world.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/contact" className="btn-primary text-base">
                  Book a Free Strategy Call
                </Link>
                <Link href="/services" className="btn-secondary text-base">
                  Explore Programs &rarr;
                </Link>
              </div>

              <div className="mt-10">
                <p className="note text-xl text-slate-600">recent admits</p>
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Schools our students were recently admitted to">
                  {RECENT_ADMITS.map((school) => (
                    <li key={school} className="px-3 py-1.5 rounded-lg border-[1.5px] border-ink bg-white text-sm font-semibold text-primary">
                      {school}
                    </li>
                  ))}
                </ul>
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

        {/* ─── WHY ADMITSONLY / ECOSYSTEM ─── */}
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

        {/* ─── SERVICES ─── */}
        <ServiceShowcase />

        {/* ─── LEARNING JOURNEY ─── */}
        <section className="section-padding relative">

          <div className="relative max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center">
                <div className="badge bg-white/10 text-primary border-white/20 mb-4">How It Works</div>
                <h2 className="text-3xl lg:text-4xl font-bold font-display text-primary tracking-tight">
                  Getting started is straightforward
                </h2>
                <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  No pressure, no commitment upfront. We start with a conversation and build from there.
                </p>
              </div>
            </RevealSection>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {journey.map((step, i) => (
                <RevealSection key={step.step} delay={i * 150}>
                  <div className="rounded-2xl border bg-white p-7 h-full">
                    <div className="text-4xl font-bold font-display text-primary">{step.step}</div>
                    <h3 className="mt-3 text-xl font-bold text-primary">{step.title}</h3>
                    <p className="mt-3 text-slate-600 leading-relaxed">{step.description}</p>
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

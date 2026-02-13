import Head from 'next/head';
import Link from 'next/link';

const values = [
  {
    icon: '🎓',
    title: 'Student-Centered Design',
    description: 'Every program, lesson, and interaction revolves around the individual learner. We listen first, then design pathways aligned with each student\'s strengths, interests, and ambitions.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Family Partnership',
    description: 'Parents are essential partners in the learning process. Our Family Progress Hub keeps families informed and involved with weekly insights and coaching recommendations.',
  },
  {
    icon: '⭐',
    title: 'Excellence Without Compromise',
    description: 'From our curated faculty network to proprietary curricula, every element of our programs is held to the highest standard. Quality is non-negotiable.',
  },
  {
    icon: '📈',
    title: 'Measurable Outcomes',
    description: 'Growth is only meaningful when it can be tracked. We use data-driven diagnostics and quarterly impact reports to ensure every student is on track.',
  },
];

const milestones = [
  { year: '2012', event: 'Founded as a boutique tutoring practice serving families in the San Francisco Bay Area.' },
  { year: '2015', event: 'Expanded to hybrid delivery, combining in-person intensives with online cohort-based learning.' },
  { year: '2018', event: 'Launched the Scholarship-Ready Academy and STEM Innovators Lab signature programs.' },
  { year: '2020', event: 'Transitioned to a fully hybrid model, reaching families in 15+ states nationwide.' },
  { year: '2023', event: 'Introduced the Adaptive Learning Studio with AI-supported diagnostic assessments.' },
  { year: '2025', event: 'Surpassed 98% family retention with 500+ families served annually across the country.' },
];

const stats = [
  { value: '98%', label: 'Family Retention Rate' },
  { value: '12+', label: 'Years of Elite Coaching' },
  { value: '15+', label: 'States Served' },
  { value: '500+', label: 'Families Annually' },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About AdmitsOnly | Our Story, Mission &amp; Values in College Admissions Consulting</title>
        <meta name="description" content="Learn about AdmitsOnly's mission to democratize premium college admissions consulting. Founded in 2012, we've helped 500+ families navigate admissions to top universities with personalized coaching." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-20 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Our Story</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Mentorship that makes the{' '}
                <span className="gradient-text">difference</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                College admissions is more complex than ever. AdmitsOnly was founded on a simple conviction:
                every student deserves a dedicated team that understands their potential and knows how to unlock it.
              </p>
            </div>
          </div>
        </section>

        {/* Mission + Stats */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="section-label">Our Mission</div>
                <h2 className="section-title">Democratizing access to premium college admissions coaching</h2>
                <p className="section-subtitle !max-w-none">
                  AdmitsOnly combines the personalized attention of private tutoring with the rigor of institutional
                  programs, creating a learning collective where ambitious students thrive regardless of background.
                </p>
                <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                  Our approach goes beyond test scores and GPAs. We develop the whole student — building confidence,
                  critical thinking, and leadership skills that serve them well beyond admissions season and into
                  successful college careers and professional lives.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="card-flat text-center">
                    <div className="stat-number gradient-text">{stat.value}</div>
                    <p className="mt-2 text-sm text-slate-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section-padding bg-surface bg-grid">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <div className="section-label">Core Values</div>
              <h2 className="section-title">What we stand for as education leaders</h2>
              <p className="section-subtitle mx-auto">
                Our values shape every interaction, program design, and student outcome we deliver.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {values.map((value) => (
                <div key={value.title} className="card">
                  <div className="text-3xl mb-4">{value.icon}</div>
                  <h3 className="text-lg font-bold font-display text-primary">{value.title}</h3>
                  <p className="mt-3 text-slate-500 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <div className="section-label">Our Journey</div>
              <h2 className="section-title">12+ years of transforming student outcomes</h2>
            </div>

            <div className="mt-14 max-w-3xl mx-auto">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-6 items-start group">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-accent/20">
                      {m.year.slice(2)}
                    </div>
                    {i < milestones.length - 1 && (
                      <div className="w-px h-full min-h-[2rem] bg-gradient-to-b from-accent/30 to-transparent my-2" />
                    )}
                  </div>
                  <div className="pb-8">
                    <span className="text-sm font-bold text-accent">{m.year}</span>
                    <p className="mt-1 text-slate-600 leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent via-purple-600 to-violet-700 section-padding">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
              Join the AdmitsOnly community
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Whether you&apos;re a parent exploring college admissions options or a student ready to level up,
              we&apos;d love to hear from you.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-secondary text-base !border-0">
                Get in Touch
              </Link>
              <Link href="/services" className="btn-ghost text-base">
                Explore Programs &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

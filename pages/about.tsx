import Link from 'next/link';

const teamValues = [
  {
    title: 'Student-Centered Design',
    description: 'Every program, lesson, and interaction is built around the individual learner. We listen first, then design pathways that align with each student\u2019s strengths, interests, and ambitions.',
  },
  {
    title: 'Family Partnership',
    description: 'We believe parents are essential partners in the learning process. Our Family Progress Hub keeps families informed and involved with weekly insights and coaching recommendations.',
  },
  {
    title: 'Excellence Without Compromise',
    description: 'From our curated faculty network to our proprietary curricula, we hold every element of our programs to the highest standard. Quality is non-negotiable.',
  },
  {
    title: 'Measurable Outcomes',
    description: 'Growth is only meaningful when it can be tracked. We use data-driven diagnostics and quarterly impact reports to ensure every student is progressing toward their goals.',
  },
];

const milestones = [
  { year: '2012', event: 'Founded as a boutique tutoring practice serving families in the Bay Area.' },
  { year: '2015', event: 'Expanded to hybrid delivery, combining in-person intensives with online cohorts.' },
  { year: '2018', event: 'Launched the Scholarship-Ready Academy and STEM Innovators Lab programs.' },
  { year: '2020', event: 'Transitioned to a fully hybrid model, reaching families across 15 states.' },
  { year: '2023', event: 'Introduced the Adaptive Learning Studio with AI-supported diagnostics.' },
  { year: '2025', event: 'Surpassed 98% family retention rate with over 500 families served annually.' },
];

export default function About() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="container mx-auto px-6 py-20 text-white">
          <p className="uppercase tracking-[0.3em] text-sm text-blue-100">Our Story</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight max-w-3xl">
            Mentorship that makes the difference.
          </h1>
          <p className="mt-6 text-lg max-w-2xl text-blue-100">
            College admissions is more complex than ever. AdmitsOnly was founded on a simple conviction: every student
            deserves a dedicated team that understands their potential and knows how to unlock it.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Our Mission</h2>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              AdmitsOnly exists to democratize access to premium academic coaching. We combine the personalized attention
              of private tutoring with the rigor of institutional programs, creating a learning collective where ambitious
              students thrive regardless of background.
            </p>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              Our approach goes beyond test scores and GPAs. We develop the whole student\u2014building confidence,
              critical thinking, and leadership skills that serve them well beyond admissions season.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-semibold text-primary">By the Numbers</h3>
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-gray-600">Family Retention Rate</span>
                <span className="text-2xl font-bold text-primary">98%</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-gray-600">Years of Elite Tutoring</span>
                <span className="text-2xl font-bold text-primary">12+</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-gray-600">States Served</span>
                <span className="text-2xl font-bold text-primary">15+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Families Served Annually</span>
                <span className="text-2xl font-bold text-primary">500+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center">What We Stand For</h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Our values shape every interaction, program, and outcome we deliver.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {teamValues.map((value) => (
              <div key={value.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-primary">{value.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-primary text-center">Our Journey</h2>
        <div className="mt-12 max-w-2xl mx-auto space-y-6">
          {milestones.map((m) => (
            <div key={m.year} className="flex gap-6 items-start">
              <div className="text-xl font-bold text-accent whitespace-nowrap">{m.year}</div>
              <div className="border-l-2 border-blue-200 pl-6 pb-2">
                <p className="text-gray-600 leading-relaxed">{m.event}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-950 py-16">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold">Join the AdmitsOnly Community</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Whether you&apos;re a parent exploring options or a student ready to level up, we&apos;d love to hear from you.
          </p>
          <div className="mt-8">
            <Link href="/contact" className="px-8 py-3 bg-accent rounded text-white font-semibold">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

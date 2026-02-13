import Head from 'next/head';
import Link from 'next/link';

const programs = [
  {
    title: 'Scholarship-Ready Academy',
    audience: 'Grades 9–12',
    duration: 'Full-year or half-year track',
    description: 'Comprehensive college admissions preparation with narrative coaching, SAT/ACT strategy, and project portfolio development. Students build compelling application narratives while earning the academic credentials elite universities seek.',
    features: [
      'Personalized admissions strategy and school list curation',
      'SAT/ACT diagnostic testing and targeted score improvement plans',
      'College essay brainstorming, drafting, and revision workshops',
      'Extracurricular portfolio development and strategic positioning',
      'Mock interviews and recommendation letter guidance',
    ],
    color: 'from-accent to-purple-600',
  },
  {
    title: 'STEM Innovators Lab',
    audience: 'Grades 8–12',
    duration: 'Quarterly cohorts',
    description: 'Hands-on research mentorship, coding sprints, and competition preparation guided by published academics and industry professionals. Students tackle real-world STEM problems through structured projects that build both technical skills and innovative thinking.',
    features: [
      'Research mentorship with published academics and industry professionals',
      'Coding bootcamps in Python, data science, and web development',
      'Science Olympiad and math competition preparation',
      'Capstone project development with presentation coaching',
      'Access to the Global Faculty Network for specialized STEM topics',
    ],
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Humanities Leadership Studio',
    audience: 'Grades 9–12',
    duration: 'Semester-based enrollment',
    description: 'Advanced debate training, writing workshops, and civic leadership development with curated reading circles and publication pathways. Students sharpen their analytical voice and build the communication skills that define future leaders.',
    features: [
      'Competitive debate training and national tournament preparation',
      'Advanced writing workshops with publication guidance',
      'Curated reading circles on philosophy, history, and political science',
      'Model UN and civic engagement project mentorship',
      'Public speaking and presentation skill development',
    ],
    color: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Foundations for Growth',
    audience: 'Grades 5–8',
    duration: 'Rolling enrollment',
    description: 'Executive function coaching and skill-building for middle school learners focused on confidence, organization, and academic curiosity. This program sets the foundation that prepares students for rigorous high school coursework and future college admissions.',
    features: [
      'Executive function coaching: organization, time management, and study strategies',
      'Math and reading enrichment aligned with advanced placement readiness',
      'Confidence-building through project-based and experiential learning',
      'Introduction to research methods and critical thinking frameworks',
      'Parent progress reports and family coaching sessions',
    ],
    color: 'from-rose-500 to-pink-600',
  },
];

const formats = [
  {
    icon: '👤',
    title: '1:1 Private Coaching',
    description: 'Fully personalized sessions with a dedicated coach who knows your student inside and out. Flexible scheduling tailored to individual goals.',
  },
  {
    icon: '👥',
    title: 'Small-Group Cohorts',
    description: 'Collaborative learning in groups of 4–8 students matched by level and interest for peer accountability and enriched discussion.',
  },
  {
    icon: '🏕️',
    title: 'Immersive Retreats',
    description: 'Intensive multi-day workshops for deep skill-building during school breaks. Limited to 12 participants per session for maximum impact.',
  },
  {
    icon: '🔄',
    title: 'Hybrid Delivery',
    description: 'Combine in-person and online sessions to fit your schedule. All materials and recordings accessible through the Family Progress Hub.',
  },
];

export default function Services() {
  return (
    <>
      <Head>
        <title>College Admissions Programs &amp; Services | AdmitsOnly Academic Coaching</title>
        <meta name="description" content="Explore AdmitsOnly's signature college admissions programs: SAT/ACT prep, essay coaching, STEM research mentorship, humanities leadership, and middle school foundations. Half-year and full-year tracks available." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute bottom-0 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-soft" />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Programs &amp; Services</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Expert-led programs for every stage of the{' '}
                <span className="gradient-text">academic journey</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                From middle school foundations to Ivy League admissions strategy, AdmitsOnly offers
                half-year and full-year programs designed to build skills, confidence, and credentials that open doors.
              </p>
            </div>
          </div>
        </section>

        {/* Programs */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <div className="section-label">Signature Programs</div>
              <h2 className="section-title">College admissions programs with clear outcomes and expert faculty</h2>
              <p className="section-subtitle mx-auto">
                Each program is designed around measurable learning outcomes, expert mentorship, and built-in accountability.
              </p>
            </div>

            <div className="mt-14 space-y-8">
              {programs.map((program) => (
                <div key={program.title} className="card !p-0 overflow-hidden">
                  <div className={`h-1.5 bg-gradient-to-r ${program.color}`} />
                  <div className="p-8 lg:p-10">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold font-display text-primary">{program.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="badge-warm">{program.audience}</span>
                          <span className="badge-accent">{program.duration}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-5 text-slate-500 leading-relaxed max-w-3xl">{program.description}</p>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {program.features.map((feature) => (
                        <li key={feature} className="flex gap-3 text-slate-600">
                          <svg className="mt-1 w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Delivery Formats */}
        <section className="section-padding bg-surface bg-grid">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <div className="section-label">Delivery Formats</div>
              <h2 className="section-title">Flexible learning formats for busy families</h2>
              <p className="section-subtitle mx-auto">
                Choose the format that fits your schedule and learning preferences. All formats include full access to our platform.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map((format) => (
                <div key={format.title} className="card text-center">
                  <div className="text-3xl mb-4">{format.icon}</div>
                  <h3 className="text-lg font-bold font-display text-primary">{format.title}</h3>
                  <p className="mt-3 text-slate-500 text-sm leading-relaxed">{format.description}</p>
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
              Find the right college admissions program for your student
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Not sure where to start? Schedule a free strategy call and we&apos;ll recommend the program
              that best fits your student&apos;s goals and timeline.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-secondary text-base !border-0">
                Book a Free Strategy Call
              </Link>
              <Link href="/faq" className="btn-ghost text-base">
                Read the FAQ &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

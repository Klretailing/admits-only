import Link from 'next/link';

const programs = [
  {
    title: 'Scholarship-Ready Academy',
    audience: 'Grades 9\u201312',
    duration: 'Full-year or half-year track',
    description: 'Holistic preparation for top-tier admissions with narrative coaching, SAT/ACT strategy, and project portfolios. Students develop compelling application narratives while building the academic credentials that elite universities look for.',
    features: [
      'Personalized admissions strategy and school list curation',
      'SAT/ACT diagnostic testing and targeted score improvement',
      'College essay brainstorming, drafting, and revision workshops',
      'Extracurricular portfolio development and positioning',
      'Mock interviews and recommendation letter guidance',
    ],
  },
  {
    title: 'STEM Innovators Lab',
    audience: 'Grades 8\u201312',
    duration: 'Quarterly cohorts',
    description: 'Hands-on research, coding sprints, and competition prep guided by industry mentors. Students tackle real-world problems through structured projects that build both technical skills and innovative thinking.',
    features: [
      'Research mentorship with published academics and industry professionals',
      'Coding bootcamps in Python, data science, and web development',
      'Science olympiad and math competition preparation',
      'Capstone project development with presentation coaching',
      'Access to the Global Faculty Network for specialized topics',
    ],
  },
  {
    title: 'Humanities Leadership Studio',
    audience: 'Grades 9\u201312',
    duration: 'Semester-based enrollment',
    description: 'Debate, writing, and civic leadership training with curated reading circles and publication pathways. Students sharpen their analytical voice and develop the communication skills that define future leaders.',
    features: [
      'Competitive debate training and tournament preparation',
      'Advanced writing workshops with publication guidance',
      'Curated reading circles on philosophy, history, and politics',
      'Model UN and civic engagement project mentorship',
      'Public speaking and presentation skill development',
    ],
  },
  {
    title: 'Foundations for Growth',
    audience: 'Grades 5\u20138',
    duration: 'Rolling enrollment',
    description: 'Skill-building for middle school learners focused on confidence, executive function, and curiosity. This program sets the academic and personal foundation that prepares students for rigorous high school coursework.',
    features: [
      'Executive function coaching: organization, time management, and study skills',
      'Math and reading enrichment aligned with advanced placement readiness',
      'Confidence-building through project-based learning',
      'Introduction to research methods and critical thinking',
      'Parent progress reports and family coaching sessions',
    ],
  },
];

const deliveryFormats = [
  {
    title: '1:1 Private Coaching',
    description: 'Fully personalized sessions with a dedicated coach who knows your student inside and out. Scheduling is flexible and sessions are tailored to individual goals.',
  },
  {
    title: 'Small-Group Cohorts',
    description: 'Collaborative learning in groups of 4\u20138 students. Cohorts are matched by level and interest for peer accountability and enriched discussion.',
  },
  {
    title: 'Immersive Retreats',
    description: 'Intensive multi-day workshops focused on deep skill-building, typically held during school breaks. Limited to 12 participants per session.',
  },
  {
    title: 'Hybrid Delivery',
    description: 'Combine in-person and online sessions to fit your family\u2019s schedule. All materials and recordings are accessible through the Family Progress Hub.',
  },
];

export default function Services() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="container mx-auto px-6 py-20 text-white">
          <p className="uppercase tracking-[0.3em] text-sm text-blue-100">Programs &amp; Services</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight max-w-3xl">
            End-to-end consulting for every stage of the academic journey.
          </h1>
          <p className="mt-6 text-lg max-w-2xl text-blue-100">
            AdmitsOnly offers half-year and full-year programs designed to build skills, confidence, and credentials
            that open doors to the world&apos;s best institutions.
          </p>
        </div>
      </section>

      {/* Programs */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-primary text-center">Signature Programs</h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Each program is designed with clear learning outcomes, expert faculty, and built-in accountability.
        </p>
        <div className="mt-12 space-y-10">
          {programs.map((program) => (
            <div key={program.title} className="border border-slate-200 rounded-xl p-8 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-primary">{program.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <span className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1 text-sm text-primary font-medium">
                      {program.audience}
                    </span>
                    <span className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1 text-sm text-primary font-medium">
                      {program.duration}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 leading-relaxed">{program.description}</p>
              <ul className="mt-6 space-y-2">
                {program.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-gray-600">
                    <span className="text-accent mt-1">&#10003;</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery Formats */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center">How We Deliver</h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Flexible formats designed to fit the schedules and preferences of busy families.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {deliveryFormats.map((format) => (
              <div key={format.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-primary">{format.title}</h3>
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{format.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-950 py-16">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold">Find the Right Program for Your Student</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Not sure where to start? Schedule a free strategy call and we&apos;ll help you choose the program
            that best fits your student&apos;s goals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="px-8 py-3 bg-accent rounded text-white font-semibold">
              Schedule a Strategy Call
            </Link>
            <Link href="/faq" className="px-8 py-3 bg-white rounded text-primary font-semibold">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

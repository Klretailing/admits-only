import Link from 'next/link';

const featureHighlights = [
  {
    title: 'Adaptive Learning Studio',
    description: 'AI-supported diagnostics personalize every lesson with mastery-based pathways and enrichment options.',
  },
  {
    title: 'Live & Hybrid Classrooms',
    description: 'Run premium online cohorts or in-person intensives with collaborative whiteboards and breakout pods.',
  },
  {
    title: 'Family Progress Hub',
    description: 'Parents receive actionable weekly insights, achievement dashboards, and coaching recommendations.',
  },
  {
    title: 'Global Faculty Network',
    description: 'Curate expert educators, guest professors, and mentors for specialized topics and masterclasses.',
  },
];

const signaturePrograms = [
  {
    title: 'Scholarship-Ready Academy',
    details: 'Holistic preparation for top-tier admissions with narrative coaching, SAT/ACT strategy, and project portfolios.',
  },
  {
    title: 'STEM Innovators Lab',
    details: 'Hands-on research, coding sprints, and competition prep guided by industry mentors.',
  },
  {
    title: 'Humanities Leadership Studio',
    details: 'Debate, writing, and civic leadership training with curated reading circles and publication pathways.',
  },
  {
    title: 'Foundations for Growth',
    details: 'Skill-building for middle school learners focused on confidence, executive function, and curiosity.',
  },
];

const learningJourney = [
  {
    title: 'Discovery & Diagnostics',
    summary: 'Assess skills, interests, and goals to build a custom roadmap with milestones and support metrics.',
  },
  {
    title: 'Immersive Instruction',
    summary: 'Engage in live classes, studio projects, and interactive coaching tailored to each learning style.',
  },
  {
    title: 'Portfolio & Outcomes',
    summary: 'Translate growth into tangible results: certifications, competition wins, essays, and recommendation support.',
  },
];

const testimonials = [
  {
    name: 'Jasmine R.',
    role: 'Parent, Bay Area',
    quote: 'The mentorship plan felt like a premium concierge service. My daughter gained confidence and a standout portfolio.',
  },
  {
    name: 'Dr. Malik S.',
    role: 'School Administrator',
    quote: 'Their hybrid model blends rigorous instruction with community. It is the future of supplemental education.',
  },
  {
    name: 'Elena T.',
    role: 'Student, Grade 11',
    quote: 'The research lab and storytelling workshops made me feel prepared for both college and leadership opportunities.',
  },
];

const logoMarquee = [
  {
    name: 'Georgia Tech',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Georgia_Tech_Yellow_Jackets_logo.svg',
  },
  {
    name: 'University of Maryland',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Maryland_Terrapins_logo.svg',
  },
  {
    name: 'Georgetown University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Georgetown_Hoyas_logo.svg',
  },
  {
    name: 'UC Berkeley',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/UC_Berkeley_Seal.svg',
  },
  {
    name: 'UCLA',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/UCLA_Athletics_logo.svg',
  },
  {
    name: 'UC San Diego',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/University_of_California%2C_San_Diego_Seal.svg',
  },
  {
    name: 'UC Davis',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/University_of_California%2C_Davis_seal.svg',
  },
  {
    name: 'UC Irvine',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/University_of_California%2C_Irvine_seal.svg',
  },
  {
    name: 'UC Santa Barbara',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/University_of_California%2C_Santa_Barbara_seal.svg',
  },
  {
    name: 'UC Santa Cruz',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/University_of_California%2C_Santa_Cruz_seal.svg',
  },
  {
    name: 'Santa Clara University',
    logo: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Santa_Clara_University_seal.svg',
  },
  {
    name: 'Case Western Reserve',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Case_Western_Reserve_University_seal.svg',
  },
  {
    name: 'Boston University',
    logo: 'https://upload.wikimedia.org/wikipedia/en/0/02/Boston_University_seal.svg',
  },
  {
    name: 'Stanford University',
    logo: 'https://upload.wikimedia.org/wikipedia/en/b/b7/Stanford_University_seal_2003.svg',
  },
  {
    name: 'MIT',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg',
  },
  {
    name: 'Harvard University',
    logo: 'https://upload.wikimedia.org/wikipedia/en/2/29/Harvard_shield_wreath.svg',
  },
  {
    name: 'Princeton University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Princeton_seal.svg',
  },
  {
    name: 'Yale University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Yale_University_Shield_1.svg',
  },
  {
    name: 'Columbia University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Columbia_University_shield.svg',
  },
  {
    name: 'Duke University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Duke_University_logo.svg',
  },
  {
    name: 'Northwestern University',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Northwestern_University_logo.svg',
  },
  {
    name: 'University of Chicago',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/University_of_Chicago_shield.svg',
  },
  {
    name: 'Caltech',
    logo: 'https://upload.wikimedia.org/wikipedia/en/e/e6/Seal_of_the_California_Institute_of_Technology.svg',
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="bg-blue-900 bg-opacity-60">
          <div className="container mx-auto px-6 py-28 text-white">
            <p className="uppercase tracking-[0.3em] text-sm text-blue-100">Premium Education Collective</p>
            <h1 className="mt-4 text-5xl font-bold leading-tight max-w-3xl">
              Build a complete learning experience that scales your online teaching and in-person excellence.
            </h1>
            <p className="mt-6 text-lg max-w-2xl text-blue-100">
              Deliver transformative education through personalized coaching, immersive classes, and innovative learning
              technology designed for ambitious families.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/contact" className="px-6 py-3 bg-accent rounded text-white font-semibold">
                Schedule a Strategy Call
              </Link>
              <Link href="/services" className="px-6 py-3 bg-white rounded text-primary font-semibold">
                Explore Programs
              </Link>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {['98% family retention rate', '12+ years of elite tutoring', 'Hybrid cohorts launching quarterly'].map((stat) => (
                <div key={stat} className="bg-white/10 border border-white/20 rounded-lg p-4">
                  <p className="text-lg font-semibold">{stat}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Design an end-to-end learning ecosystem.</h2>
            <p className="mt-4 text-lg text-gray-600">
              From onboarding to outcomes, every touchpoint reinforces premium value. Blend diagnostic assessments,
              signature curricula, and mentorship-driven accountability so students and families feel supported at every
              milestone.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-primary font-medium">White-glove onboarding</div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-primary font-medium">Outcome-centered dashboards</div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-primary font-medium">Community & accountability</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-semibold text-primary">Experience Pillars</h3>
            <ul className="mt-4 space-y-4 text-gray-600">
              <li className="flex gap-3">
                <span className="text-accent">●</span>
                Concierge scheduling, feedback loops, and premium client touchpoints.
              </li>
              <li className="flex gap-3">
                <span className="text-accent">●</span>
                Flexible delivery: 1:1, small cohorts, and immersive retreats.
              </li>
              <li className="flex gap-3">
                <span className="text-accent">●</span>
                Measurement-driven growth plans with quarterly impact reports.

const services = [
  {
    title: 'Half-Year Intensive',
    description: 'A focused 6-month program covering diagnostic assessment, personalized instruction, and milestone tracking.',
  },
  {
    title: 'Full-Year Partnership',
    description: 'Comprehensive 12-month engagement with quarterly reviews, portfolio development, and admissions strategy.',
  },
  {
    title: '1:1 Coaching',
    description: 'Tailored one-on-one sessions with expert tutors matched to your learning style and goals.',
  },
  {
    title: 'Small Group Cohorts',
    description: 'Collaborative learning in curated groups of 4-8 students, blending peer engagement with expert guidance.',
  },
];

export default function Services() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-6">Our Services</h1>
      <p className="mb-8 text-gray-600">
        AdmitsOnly offers end-to-end consulting in half-year and full-year programs designed to
        meet each family where they are and take students to where they want to be.
      </p>
      <div className="grid gap-8 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-primary">{s.title}</h3>
            <p className="mt-2 text-gray-600">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

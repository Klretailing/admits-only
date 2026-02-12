const faqs = [
  {
    question: 'What age groups do you serve?',
    answer: 'We work with students from middle school through college, with specialized programs for each stage.',
  },
  {
    question: 'How are tutors selected?',
    answer: 'Our faculty network is curated from top universities and industry professionals with proven teaching experience.',
  },
  {
    question: 'Do you offer online or in-person sessions?',
    answer: 'Both! Our hybrid model allows families to choose between live online cohorts, 1:1 sessions, and in-person intensives.',
  },
  {
    question: 'What makes AdmitsOnly different from other tutoring services?',
    answer: 'We combine personalized coaching, outcome-centered dashboards, and a concierge-level experience that goes beyond test prep.',
  },
];

export default function FAQ() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-6">Frequently Asked Questions</h1>
      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question} className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary">{faq.question}</h3>
            <p className="mt-2 text-gray-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

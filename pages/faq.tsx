import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  {
    question: 'What age groups and grade levels do you serve?',
    answer: 'Our Foundations for Growth program serves students in grades 5\u20138, while the Scholarship-Ready Academy, STEM Innovators Lab, and Humanities Leadership Studio are designed for students in grades 8\u201312. We tailor every program to the individual student\u2019s level and goals.',
  },
  {
    question: 'How does the enrollment process work?',
    answer: 'Enrollment begins with a free strategy call where we learn about your student\u2019s goals, strengths, and areas for growth. From there, we conduct a diagnostic assessment and recommend a personalized program track. Once you confirm enrollment, we match your student with the right coaches and begin onboarding.',
  },
  {
    question: 'What is the difference between half-year and full-year programs?',
    answer: 'Half-year programs typically run for one semester and focus on targeted skill-building or test preparation. Full-year programs provide comprehensive support across the entire academic cycle, including admissions strategy, ongoing coaching, and portfolio development. Full-year students benefit from deeper mentorship and more sustained growth.',
  },
  {
    question: 'Can sessions be conducted online, in-person, or both?',
    answer: 'Yes. We offer fully online, fully in-person, and hybrid delivery options. Our platform supports live video sessions with collaborative whiteboards, and all materials are accessible through the Family Progress Hub. Many families choose hybrid delivery for maximum flexibility.',
  },
  {
    question: 'How do you match students with coaches and mentors?',
    answer: 'We match students based on learning style, academic goals, personality, and subject area. Our Global Faculty Network includes expert educators, published researchers, and industry professionals. Every match is reviewed by our program team, and families can request adjustments at any time.',
  },
  {
    question: 'What does the Family Progress Hub include?',
    answer: 'The Family Progress Hub is a dedicated dashboard for parents and families. It includes weekly coaching summaries, achievement milestones, diagnostic results, upcoming session schedules, and direct messaging with your student\u2019s coaching team. Quarterly impact reports provide a comprehensive view of progress.',
  },
  {
    question: 'How do you measure student progress?',
    answer: 'We use a combination of diagnostic assessments, mastery-based milestone tracking, and qualitative feedback from coaches. Parents receive weekly insights and a detailed quarterly impact report that tracks academic growth, skill development, and goal attainment.',
  },
  {
    question: 'What is your cancellation and refund policy?',
    answer: 'We offer a satisfaction guarantee for the first two weeks of enrollment. After that, families can pause or cancel with 30 days\u2019 notice. Unused sessions in prepaid packages are credited toward future enrollment. Please contact us for specific details about your program.',
  },
  {
    question: 'Do you offer financial aid or scholarships?',
    answer: 'We are committed to making premium education accessible. A limited number of need-based scholarships are available each enrollment cycle. Contact us during your strategy call to learn more about eligibility and the application process.',
  },
  {
    question: 'How is AdmitsOnly different from other tutoring services?',
    answer: 'AdmitsOnly is not a traditional tutoring service. We are a learning collective that provides end-to-end academic coaching, admissions strategy, and mentorship. Our programs are designed around outcomes\u2014not just hours\u2014with dedicated teams, proprietary curricula, and a 98% family retention rate that speaks to the quality of our approach.',
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 hover:bg-slate-50 transition-colors"
      >
        <span className="text-lg font-semibold text-primary">{question}</span>
        <span className="text-2xl text-gray-400 shrink-0">{isOpen ? '\u2212' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-5">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="container mx-auto px-6 py-20 text-white">
          <p className="uppercase tracking-[0.3em] text-sm text-blue-100">Support</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight max-w-3xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-6 text-lg max-w-2xl text-blue-100">
            Everything you need to know about our programs, enrollment, and how we work with families.
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-950 py-16">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold">Still Have Questions?</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            We&apos;re happy to help. Schedule a free strategy call or send us a message and we&apos;ll get back to you promptly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="px-8 py-3 bg-accent rounded text-white font-semibold">
              Contact Us
            </Link>
            <Link href="/services" className="px-8 py-3 bg-white rounded text-primary font-semibold">
              View Programs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

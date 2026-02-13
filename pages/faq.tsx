import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const faqs = [
  {
    question: 'What age groups and grade levels do you serve?',
    answer: 'Our Foundations for Growth program serves students in grades 5–8, while the Scholarship-Ready Academy, STEM Innovators Lab, and Humanities Leadership Studio are designed for students in grades 8–12. Every program is tailored to the individual student\'s academic level and college admissions goals.',
  },
  {
    question: 'How does the college admissions consulting enrollment process work?',
    answer: 'Enrollment begins with a free strategy call where we learn about your student\'s goals, strengths, and areas for growth. From there, we conduct a diagnostic assessment and recommend a personalized program track. Once enrollment is confirmed, we match your student with expert coaches and begin onboarding into our learning platform.',
  },
  {
    question: 'What is the difference between half-year and full-year programs?',
    answer: 'Half-year programs typically run for one semester and focus on targeted skill-building or standardized test preparation. Full-year programs provide comprehensive college admissions support across the entire academic cycle, including admissions strategy, ongoing coaching, and portfolio development. Full-year students benefit from deeper mentorship and more sustained academic growth.',
  },
  {
    question: 'Can sessions be conducted online, in-person, or both?',
    answer: 'Yes — we offer fully online, fully in-person, and hybrid delivery options. Our platform supports live video sessions with collaborative whiteboards, and all materials are accessible through the Family Progress Hub. Many families choose hybrid delivery for maximum flexibility while maintaining the personal connection of in-person coaching.',
  },
  {
    question: 'How do you match students with coaches and mentors?',
    answer: 'We match students based on learning style, academic goals, personality, and subject area expertise. Our Global Faculty Network includes expert educators, published researchers, and industry professionals. Every match is reviewed by our program team to ensure the best fit, and families can request adjustments at any time.',
  },
  {
    question: 'What does the Family Progress Hub include?',
    answer: 'The Family Progress Hub is a dedicated dashboard for parents and families. It includes weekly coaching summaries, achievement milestones, diagnostic results, upcoming session schedules, and direct messaging with your student\'s coaching team. Quarterly impact reports provide a comprehensive view of academic progress and college readiness.',
  },
  {
    question: 'How do you measure student progress toward college admissions goals?',
    answer: 'We use a combination of diagnostic assessments, mastery-based milestone tracking, and qualitative feedback from coaches. Parents receive weekly insights and a detailed quarterly impact report that tracks academic growth, standardized test improvement, skill development, and overall goal attainment.',
  },
  {
    question: 'What is your cancellation and refund policy?',
    answer: 'We offer a satisfaction guarantee for the first two weeks of enrollment. After that, families can pause or cancel with 30 days\' notice. Unused sessions in prepaid packages are credited toward future enrollment. Please contact us during your strategy call for specific details about your program.',
  },
  {
    question: 'Do you offer financial aid or scholarships for your programs?',
    answer: 'We are committed to making premium college admissions coaching accessible to all families. A limited number of need-based scholarships are available each enrollment cycle. Contact us during your strategy call to learn more about eligibility requirements and the application process.',
  },
  {
    question: 'How is AdmitsOnly different from other college admissions consultants?',
    answer: 'AdmitsOnly is not a traditional tutoring service or college admissions consultant. We are a learning collective that provides end-to-end academic coaching, admissions strategy, and mentorship. Our programs are designed around outcomes — not just hours — with dedicated teams, proprietary curricula, AI-powered diagnostics, and a 98% family retention rate that speaks to the quality of our approach.',
  },
];

function AccordionItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${isOpen ? 'border-accent/20 bg-accent/[0.02] shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4"
      >
        <span className="text-base font-semibold text-primary leading-snug">{question}</span>
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isOpen ? 'bg-accent text-white rotate-45' : 'bg-slate-100 text-slate-400'}`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="7" y1="1" x2="7" y2="13" />
            <line x1="1" y1="7" x2="13" y2="7" />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-6 pb-5">
          <p className="text-slate-500 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <Head>
        <title>College Admissions Consulting FAQ | AdmitsOnly Programs &amp; Enrollment</title>
        <meta name="description" content="Frequently asked questions about AdmitsOnly's college admissions consulting programs, enrollment process, pricing, delivery formats, and how our academic coaching helps students get into top universities." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute bottom-0 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Support</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Frequently asked{' '}
                <span className="gradient-text">questions</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Everything you need to know about our college admissions programs, enrollment process, and how we work with families.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="section-padding">
          <div className="max-w-3xl mx-auto px-6 space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent via-purple-600 to-violet-700 section-padding">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
              Still have questions about college admissions?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              We&apos;re happy to help. Schedule a free strategy call or send us a message and
              we&apos;ll get back to you within one business day.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-secondary text-base !border-0">
                Contact Us
              </Link>
              <Link href="/services" className="btn-ghost text-base">
                View Programs &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

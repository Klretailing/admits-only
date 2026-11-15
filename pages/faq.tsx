import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

/* Answers describe what the product actually does. The previous list was
   consulting-template copy: programs for grades 5–8 that don't exist, a
   "Family Progress Hub" with messaging and quarterly reports, and policies
   (a satisfaction guarantee, scholarships) nobody had confirmed. Add a
   policy here only once it is real. */
const faqs = [
  {
    question: 'What is AdmitsOnly?',
    answer: 'A notebook for all four years of high school. Students keep their activities and grades, write essays with live feedback, study with friends in Study Pods, explore careers by major, build a college list on the College Map, and track every application and deadline, all in one place.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes, the notebook is free to start, with no card needed. A few extras are paid, such as the full library of sample essays, and one-on-one consulting with a mentor is a separate paid service.',
  },
  {
    question: 'Which grades is it for?',
    answer: 'Grades 9 through 12. Ninth graders build good habits and log activities as they happen; seniors manage applications, essays and decisions. Parents and tutors can join to follow along.',
  },
  {
    question: 'How does the essay feedback work?',
    answer: 'Paste or write a draft and, once it passes about 40 words, you see the few changes most worth making (each with an example), words a busy reader might trip on, and how the draft reads overall. It is guidance, not a grade. When you are ready, you can send the draft to a tutor for a human review.',
  },
  {
    question: 'Who can see my essays and progress?',
    answer: 'Only you, unless you connect a parent or tutor. You share a connection code from Settings, and you can remove a connection at any time. Study Pod messages are visible to that pod\u2019s members.',
  },
  {
    question: 'How do parents and tutors connect to a student?',
    answer: 'The student shares their connection code from Settings. A parent or tutor creates their own account, enters the code, and can then follow the progress the student shares. Tutors can also invite a student from their roster by email.',
  },
  {
    question: 'Are the college deadlines official?',
    answer: 'They are the dates each school has typically used in recent years, so you can plan ahead. Schools change dates from year to year, so always confirm on the school\u2019s own admissions website before you submit.',
  },
  {
    question: 'How does one-on-one consulting work?',
    answer: 'It starts with a free strategy call to understand the student\u2019s goals. From there a mentor builds a plan across writing, SAT/ACT preparation, career guidance or college admissions, with regular check-ins. Ask on the call about format, schedule and pricing.',
  },
  {
    question: 'How do I delete my account or my data?',
    answer: 'Email info@admitsonly.com from the address on your account and we will delete your account and everything in it, or send you a copy first if you would like one.',
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
        <title>FAQ | AdmitsOnly — The Notebook, Programs &amp; Enrollment</title>
        <meta name="description" content="Answers about AdmitsOnly: the free notebook for grades 9 to 12, our mentor-led programs, enrollment, formats and pricing." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative">

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Support</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-primary leading-[1.1] tracking-tight">
                Frequently asked{' '}
                <span className="gradient-text">questions</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-700 leading-relaxed max-w-2xl">
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

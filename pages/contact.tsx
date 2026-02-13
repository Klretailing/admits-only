import Head from 'next/head';
import Link from 'next/link';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact AdmitsOnly | Book a Free College Admissions Strategy Call</title>
        <meta name="description" content="Schedule a free strategy call with AdmitsOnly's college admissions consultants. Get personalized guidance on SAT/ACT prep, essay coaching, and university admissions strategy. Response within one business day." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-0 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Get in Touch</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Let&apos;s start the{' '}
                <span className="gradient-text">conversation</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Book your free college admissions strategy call or send us a message.
                We&apos;ll get back to you within one business day.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form + Info */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] items-start">
              {/* Form */}
              <div>
                <div className="section-label">Send a Message</div>
                <h2 className="section-title">Tell us about your student&apos;s goals</h2>
                <p className="section-subtitle !max-w-none mb-8">
                  Fill out the form below and a member of our team will reach out to discuss how we can help.
                </p>

                <form className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-primary">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-primary">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-primary">Phone (optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-primary">How can we help?</label>
                    <textarea
                      name="message"
                      rows={5}
                      className="w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
                      placeholder="Tell us about your student's grade level, goals, and any specific areas where you'd like support."
                    />
                  </div>
                  <button type="submit" className="btn-primary text-base w-full sm:w-auto">
                    Send Message
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-6 lg:mt-24">
                <div className="card-flat">
                  <h3 className="text-lg font-bold font-display text-primary">Contact Information</h3>
                  <div className="mt-5 space-y-5">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-sm">Email</p>
                        <a href="mailto:info@admitsonly.com" className="text-accent hover:underline text-sm">
                          info@admitsonly.com
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-sm">Office Hours</p>
                        <p className="text-slate-500 text-sm">Monday &ndash; Friday: 9:00 AM &ndash; 6:00 PM PT</p>
                        <p className="text-slate-500 text-sm">Saturday: 10:00 AM &ndash; 2:00 PM PT</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-sm">Response Time</p>
                        <p className="text-slate-500 text-sm">All inquiries answered within one business day.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-flat bg-gradient-to-br from-accent/5 to-purple-50 border-accent/10">
                  <h3 className="text-lg font-bold font-display text-primary">Schedule a Free Strategy Call</h3>
                  <p className="mt-3 text-slate-500 leading-relaxed text-sm">
                    Prefer to talk? Book a complimentary 30-minute strategy call where we&apos;ll discuss your
                    student&apos;s goals, assess program fit, and recommend a personalized college admissions track.
                  </p>
                  <Link href="/services" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all">
                    Explore our programs first <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

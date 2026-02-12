import Link from 'next/link';

export default function Contact() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="container mx-auto px-6 py-20 text-white">
          <p className="uppercase tracking-[0.3em] text-sm text-blue-100">Get in Touch</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight max-w-3xl">
            Let&apos;s start the conversation.
          </h1>
          <p className="mt-6 text-lg max-w-2xl text-blue-100">
            Book your free strategy call or send us a message. We&apos;ll get back to you within one business day.
          </p>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] items-start">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Send Us a Message</h2>
            <form className="space-y-5">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Phone (optional)</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Message</label>
                <textarea
                  name="message"
                  rows={5}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
                  placeholder="Tell us about your student's goals and how we can help."
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-accent rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <h3 className="text-xl font-semibold text-primary">Contact Information</h3>
              <div className="mt-6 space-y-4 text-gray-600">
                <div>
                  <p className="font-medium text-primary">Email</p>
                  <a href="mailto:info@admitsonly.com" className="text-accent hover:underline">
                    info@admitsonly.com
                  </a>
                </div>
                <div>
                  <p className="font-medium text-primary">Office Hours</p>
                  <p>Monday &ndash; Friday: 9:00 AM &ndash; 6:00 PM PT</p>
                  <p>Saturday: 10:00 AM &ndash; 2:00 PM PT</p>
                </div>
                <div>
                  <p className="font-medium text-primary">Response Time</p>
                  <p>We respond to all inquiries within one business day.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <h3 className="text-xl font-semibold text-primary">Schedule a Strategy Call</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Prefer to talk? Book a free 30-minute strategy call where we&apos;ll discuss your student&apos;s goals,
                assess fit, and recommend a personalized program track.
              </p>
              <div className="mt-4">
                <Link href="/services" className="text-accent font-semibold hover:underline">
                  Explore our programs first &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

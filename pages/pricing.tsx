import Head from 'next/head';
import Link from 'next/link';
import { plans } from '../lib/plans';

export default function Pricing() {
  return (
    <>
      <Head>
        <title>Pricing &amp; Plans | AdmitsOnly College Admissions Programs</title>
        <meta name="description" content="Choose the right AdmitsOnly program for your student. Monthly plans for college admissions coaching, SAT/ACT prep, essay coaching, and STEM mentorship." />
      </Head>

      <div className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <div className="section-label">Pricing</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Invest in your child&apos;s{' '}
                <span className="gradient-text">future</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Transparent pricing for premium college admissions coaching. Choose the program that fits your student&apos;s goals.
              </p>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-start">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-8 transition-all ${
                    plan.highlight
                      ? 'border-accent bg-white shadow-xl shadow-accent/10 ring-2 ring-accent/20 relative'
                      : 'border-slate-100 bg-white hover:shadow-lg hover:border-slate-200'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="badge-accent">Most Popular</span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold font-display text-primary">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.audience}</p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-4xl font-extrabold font-display text-primary">${plan.price}</span>
                    <span className="text-slate-400 text-sm mb-1">/{plan.interval}</span>
                  </div>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-3 text-sm text-slate-600">
                        <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/contact"
                    className={`mt-8 w-full text-base block text-center ${
                      plan.highlight ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>

            {/* FAQ-style note */}
            <div className="mt-16 max-w-2xl mx-auto text-center">
              <p className="text-sm text-slate-500 leading-relaxed">
                All plans include full access to the Family Progress Hub, quarterly impact reports, and dedicated coach matching.
                Need a custom plan or have questions? <Link href="/contact" className="text-accent font-semibold hover:underline">Contact us</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

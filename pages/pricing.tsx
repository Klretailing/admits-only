import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { plans } from '../lib/plans';

export default function Pricing() {
  const { data: session } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCheckout = async (planId: string) => {
    if (!session) {
      window.location.href = '/auth/register';
      return;
    }

    setLoadingPlan(planId);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, email: session.user?.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        setLoadingPlan(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing &amp; Plans | AdmitsOnly College Admissions Programs</title>
        <meta name="description" content="Choose the right AdmitsOnly program for your student. Monthly subscription plans for college admissions coaching, SAT/ACT prep, essay coaching, and STEM mentorship. Secure payments via Stripe." />
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
            {error && (
              <div className="mb-8 max-w-lg mx-auto p-4 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-700">
                {error}
              </div>
            )}

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

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`mt-8 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.highlight ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {loadingPlan === plan.id ? 'Loading...' : session ? 'Subscribe Now' : 'Get Started'}
                  </button>
                </div>
              ))}
            </div>

            {/* Payment methods + trust signals */}
            <div className="mt-16 text-center">
              <p className="text-sm text-slate-400 mb-4">Secure payments powered by</p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                  </svg>
                  <span className="text-xs font-semibold">Stripe</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <span className="text-xs font-semibold">SSL Encrypted</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="text-xs font-semibold">Cancel Anytime</span>
                </div>
              </div>
            </div>

            {/* FAQ-style note */}
            <div className="mt-12 max-w-2xl mx-auto text-center">
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

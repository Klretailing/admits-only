import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

const ComingSoonChip = () => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
    Coming soon
  </span>
);

interface PlanCard {
  name: string;
  tagline: string;
  features: string[];
  current?: boolean;
  note?: string;
}

const planCards: PlanCard[] = [
  {
    name: 'Free',
    tagline: 'Everything you need to get started',
    features: ['Up to 3 active students', 'Core CRM & student profiles', 'Essay reviews'],
    current: true,
  },
  {
    name: 'Pro',
    tagline: 'For growing tutoring practices',
    features: ['Unlimited students', 'Advanced analytics', 'Branded invites', 'Priority support'],
  },
  {
    name: 'Marketplace',
    tagline: 'Get discovered & paid in-app',
    features: ['Accept payments through AdmitsOnly', 'Automatic invoicing', 'Small per-transaction fee'],
    note: 'Optional add-on',
  },
];

export default function EducatorBilling() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>Billing &amp; Payouts | AdmitsOnly Educator</title></Head>

      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Billing &amp; Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your plan and payout preferences. Nothing to pay today.</p>
        </div>

        {/* Current plan card */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-primary">You&apos;re on the Free plan</h2>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  AdmitsOnly is free for tutors while we grow. Keep building your practice on us.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ComingSoonChip />
              <button
                disabled
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
              >
                Upgrade
              </button>
            </div>
          </div>
        </section>

        {/* Plan comparison */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Plans</h2>
            <p className="mt-1 text-xs text-slate-400">Pricing is still being finalized. Displayed for preview only.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planCards.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${
                  plan.current ? 'border-emerald-200' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-primary">{plan.name}</h3>
                  {plan.current ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Current
                    </span>
                  ) : (
                    <ComingSoonChip />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{plan.tagline}</p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  {plan.current ? 'Free' : 'Price TBD'}
                </p>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.note && (
                  <p className="mt-4 text-xs text-slate-400">{plan.note}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Payouts section */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-primary">Payouts</h2>
                <ComingSoonChip />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Connecting a payout method lets you accept student payments directly in-app. This is coming soon.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                For now, your earnings are tracked manually on the{' '}
                <Link href="/educator/earnings" className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Earnings page
                </Link>
                .
              </p>
              <button
                disabled
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 opacity-50 cursor-not-allowed"
              >
                Connect payout account
              </button>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-xs text-slate-400">
          No charges today. We&apos;ll email you before any billing goes live.
        </p>
      </div>
    </EducatorDashboardLayout>
  );
}

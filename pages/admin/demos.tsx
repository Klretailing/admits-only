import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ──────────────────────── DATA ──────────────────────── */

const demoProfiles = [
  {
    id: 'investor',
    label: 'Investor / Venture',
    description: 'Showcase business metrics, growth trajectory, and market positioning for potential investors.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'from-accent to-purple-600',
    sections: ['Revenue & Growth', 'Market Size', 'Unit Economics', 'Retention Metrics', 'Expansion Plans'],
  },
  {
    id: 'client',
    label: 'Prospective Client',
    description: 'Walk families through the student experience, outcomes, and program offerings.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-emerald-500 to-teal-600',
    sections: ['Student Dashboard', 'Program Overview', 'Success Stories', 'Coaching Experience', 'Pricing & Plans'],
  },
  {
    id: 'partner',
    label: 'School / Partner',
    description: 'Demonstrate platform capabilities and integration options for institutional partners.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: 'from-amber-500 to-orange-600',
    sections: ['Platform Tour', 'Analytics Dashboard', 'White-Label Options', 'API & Integrations', 'Case Studies'],
  },
];

const investorMetrics = {
  highlights: [
    { label: 'Annual Run Rate', value: '$514k', change: '+67% YoY' },
    { label: 'Total Families Served', value: '500+', change: 'since inception' },
    { label: 'Net Revenue Retention', value: '112%', change: 'expansion revenue' },
    { label: 'CAC Payback', value: '3.2 mo', change: '-1.1 mo vs prior year' },
  ],
  tam: '$12.8B U.S. college admissions consulting market',
  growth: [
    { quarter: 'Q1 2025', value: 24800 },
    { quarter: 'Q2 2025', value: 29400 },
    { quarter: 'Q3 2025', value: 35200 },
    { quarter: 'Q4 2025', value: 38600 },
    { quarter: 'Q1 2026', value: 42800 },
  ],
};

const clientShowcase = {
  outcomes: [
    { metric: '94%', label: 'Acceptance to top-50 university' },
    { metric: '+127', label: 'Average SAT score improvement' },
    { metric: '98%', label: 'Family satisfaction rating' },
    { metric: '12+', label: 'Years of proven results' },
  ],
  testimonials: [
    { name: 'The Chen Family', school: 'Stanford University', quote: 'AdmitsOnly transformed our daughter\'s application. The essay coaching alone was worth every penny.' },
    { name: 'The Williams Family', school: 'MIT', quote: 'The structured approach and expert coaches gave James the confidence and strategy he needed.' },
    { name: 'The Patel Family', school: 'Harvard University', quote: 'We couldn\'t have navigated the admissions process without their guidance. Truly life-changing.' },
  ],
};

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function AdminDemos() {
  const { loading } = useAdminGuard();
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  /* ─── Full-Screen Presentation Mode ─── */
  if (presenting && activeDemo) {
    const profile = demoProfiles.find((p) => p.id === activeDemo)!;

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        <Head><title>Demo: {profile.label} | AdmitsOnly</title></Head>

        {/* Presenter toolbar */}
        <div className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              PRESENTING
            </span>
            <span className="text-sm font-medium text-white/70">{profile.label} Demo</span>
          </div>
          <button
            onClick={() => setPresenting(false)}
            className="px-4 py-1.5 text-sm font-semibold text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          >
            Exit Presentation
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {activeDemo === 'investor' && (
            <div className="space-y-12">
              {/* Hero */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-6">
                  Investment Opportunity
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-display text-primary tracking-tight">
                  AdmitsOnly
                </h1>
                <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
                  The premium college admissions platform helping 500+ families gain acceptance to top universities.
                </p>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {investorMetrics.highlights.map((m) => (
                  <div key={m.label} className="bg-surface rounded-2xl border border-slate-100 p-6 text-center">
                    <p className="text-3xl font-extrabold font-display text-primary">{m.value}</p>
                    <p className="text-sm font-semibold text-slate-600 mt-1">{m.label}</p>
                    <p className="text-xs text-green-600 font-medium mt-2">{m.change}</p>
                  </div>
                ))}
              </div>

              {/* Growth chart */}
              <div className="bg-surface rounded-2xl border border-slate-100 p-8">
                <h2 className="text-2xl font-bold font-display text-primary mb-2">Revenue Growth</h2>
                <p className="text-slate-500 mb-8">{investorMetrics.tam}</p>
                <div className="flex items-end gap-3 h-48">
                  {investorMetrics.growth.map((q) => {
                    const max = Math.max(...investorMetrics.growth.map((g) => g.value));
                    return (
                      <div key={q.quarter} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-sm font-bold text-primary">${(q.value / 1000).toFixed(1)}k</span>
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-accent to-purple-500"
                          style={{ height: `${(q.value / max) * 100}%` }}
                        />
                        <span className="text-xs font-medium text-slate-500">{q.quarter}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Competitive advantages */}
              <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold font-display mb-6">Competitive Moat</h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { title: 'Expert Network', desc: 'Former admissions officers and published academics across 20+ elite universities.' },
                    { title: 'Proven Outcomes', desc: '94% acceptance rate to top-50 universities with documented, trackable results.' },
                    { title: 'Platform Lock-in', desc: 'Integrated dashboard, essay tools, and coaching create high switching costs.' },
                  ].map((item) => (
                    <div key={item.title} className="p-5 rounded-xl bg-white/5">
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'client' && (
            <div className="space-y-12">
              {/* Hero */}
              <div className="text-center">
                <h1 className="text-4xl lg:text-5xl font-extrabold font-display text-primary tracking-tight">
                  Your Child&apos;s Path to a <span className="gradient-text">Top University</span>
                </h1>
                <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
                  See how AdmitsOnly&apos;s personalized approach transforms academic potential into acceptance letters.
                </p>
              </div>

              {/* Outcomes */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {clientShowcase.outcomes.map((o) => (
                  <div key={o.label} className="bg-surface rounded-2xl border border-slate-100 p-6 text-center">
                    <p className="text-3xl font-extrabold font-display gradient-text">{o.metric}</p>
                    <p className="text-sm text-slate-600 mt-2">{o.label}</p>
                  </div>
                ))}
              </div>

              {/* Platform preview */}
              <div className="bg-surface rounded-2xl border border-slate-100 p-8">
                <h2 className="text-2xl font-bold font-display text-primary mb-6">The Student Experience</h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { title: 'Personalized Dashboard', desc: 'Track SAT scores, essay progress, sessions, and college list all in one place.', icon: '01' },
                    { title: 'Expert Coaching', desc: 'Live 1-on-1 sessions with former admissions officers and subject experts.', icon: '02' },
                    { title: 'Measurable Results', desc: 'Quarterly progress reports showing real academic and admissions growth.', icon: '03' },
                  ].map((item) => (
                    <div key={item.title} className="p-6 bg-white rounded-xl border border-slate-100">
                      <div className="text-2xl font-extrabold font-display gradient-text mb-3">{item.icon}</div>
                      <h3 className="text-lg font-bold text-primary mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonials */}
              <div>
                <h2 className="text-2xl font-bold font-display text-primary mb-6 text-center">Families Love AdmitsOnly</h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {clientShowcase.testimonials.map((t) => (
                    <div key={t.name} className="bg-white rounded-2xl border border-slate-100 p-6">
                      <p className="text-sm text-slate-600 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm font-semibold text-primary">{t.name}</p>
                        <p className="text-xs text-accent font-medium">{t.school}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'partner' && (
            <div className="space-y-12">
              {/* Hero */}
              <div className="text-center">
                <h1 className="text-4xl lg:text-5xl font-extrabold font-display text-primary tracking-tight">
                  Partner with <span className="gradient-text">AdmitsOnly</span>
                </h1>
                <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
                  Bring world-class college admissions consulting to your school or organization.
                </p>
              </div>

              {/* Capabilities */}
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { title: 'White-Label Platform', desc: 'Deploy AdmitsOnly under your brand with custom branding, domains, and student experiences.', color: 'from-accent to-purple-600' },
                  { title: 'Analytics & Reporting', desc: 'Comprehensive dashboards showing student outcomes, engagement, and program effectiveness.', color: 'from-emerald-500 to-teal-600' },
                  { title: 'Curriculum Integration', desc: 'Seamlessly integrate our coaching programs into your existing academic calendar and LMS.', color: 'from-amber-500 to-orange-600' },
                  { title: 'Dedicated Support', desc: 'Partnership managers, onboarding specialists, and ongoing training for your staff.', color: 'from-rose-500 to-pink-600' },
                ].map((cap) => (
                  <div key={cap.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className={`h-1.5 bg-gradient-to-r ${cap.color}`} />
                    <div className="p-6">
                      <h3 className="text-lg font-bold font-display text-primary mb-2">{cap.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-center text-white">
                <h2 className="text-2xl font-bold font-display mb-3">Ready to Get Started?</h2>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Let&apos;s discuss how AdmitsOnly can serve your institution&apos;s students and families.
                </p>
                <Link href="/contact" className="inline-flex px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors">
                  Schedule a Partnership Call
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Demo Selection Page ─── */
  return (
    <AdminLayout>
      <Head><title>Demo Mode | AdmitsOnly Admin</title></Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Demo Mode</h1>
          <p className="mt-1 text-slate-500">Launch polished presentations for clients, investors, and partners.</p>
        </div>

        {/* Demo profiles */}
        <div className="grid gap-6 sm:grid-cols-3">
          {demoProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setActiveDemo(profile.id)}
              className={`text-left bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg hover:-translate-y-1 ${
                activeDemo === profile.id ? 'border-accent shadow-lg' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white mb-4`}>
                {profile.icon}
              </div>
              <h3 className="text-lg font-bold font-display text-primary">{profile.label}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{profile.description}</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Includes</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.sections.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[11px] font-medium text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Launch controls */}
        {activeDemo && (
          <div className="bg-surface rounded-2xl border border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold font-display text-primary">
                  {demoProfiles.find((p) => p.id === activeDemo)?.label} Demo Ready
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  This will open a full-screen presentation with curated data and visuals.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setPresenting(true)}
                  className="btn-primary text-sm !py-2.5 !px-6 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Launch Presentation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-4">Presentation Tips</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'Before the Call', tips: ['Test screen sharing', 'Review latest metrics', 'Prepare for Q&A'] },
              { title: 'During the Demo', tips: ['Start with outcomes', 'Show the student experience', 'End with next steps'] },
              { title: 'Follow Up', tips: ['Send summary deck', 'Schedule next touchpoint', 'Share relevant case study'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-primary mb-2">{col.title}</p>
                <ul className="space-y-1.5">
                  {col.tips.map((tip) => (
                    <li key={tip} className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

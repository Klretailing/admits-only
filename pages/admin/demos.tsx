import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

/* ══════════════════════════════════════════════════════════════
   ANIMATION PRIMITIVES
   ══════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedNum({ value, suffix = '', prefix = '', duration = 2000 }: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const { ref, visible } = useReveal(0.3);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start: number;
    let raf: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const { ref, visible } = useReveal(0.2);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (!visible) return;
    setChars(0);
    const iv = setInterval(() => {
      setChars((p) => { if (p >= text.length) { clearInterval(iv); return p; } return p + 2; });
    }, speed);
    return () => clearInterval(iv);
  }, [visible, text, speed]);
  return (
    <span ref={ref}>
      {text.slice(0, chars)}
      {chars < text.length && visible && <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />}
    </span>
  );
}

function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const { ref, visible } = useReveal(0.3);
  return (
    <div ref={ref} className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: visible ? `${pct}%` : '0%',
          transition: `width 1.2s ease ${delay}s`,
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEMO PROFILE DEFINITIONS
   ══════════════════════════════════════════════════════════════ */

const profiles = [
  {
    id: 'investor',
    label: 'Investor / Venture',
    desc: 'Business metrics, growth trajectory, unit economics, and market positioning for potential investors and VCs.',
    color: 'from-accent to-purple-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    sections: ['Revenue & Growth', 'Unit Economics', 'Market Sizing', 'Competitive Moat', 'Product Walkthrough', 'Expansion Roadmap'],
  },
  {
    id: 'client',
    label: 'Prospective Client',
    desc: 'Walk families through proven outcomes, the student dashboard experience, essay coaching, and program offerings.',
    color: 'from-emerald-500 to-teal-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    sections: ['Proven Outcomes', 'Dashboard Tour', 'Essay Coaching', 'Profile Scorer', 'Coaching Experience', 'Programs & Pricing'],
  },
  {
    id: 'partner',
    label: 'School / Partner',
    desc: 'Platform architecture, white-label capabilities, analytics, API integrations, and partnership models for institutions.',
    color: 'from-amber-500 to-orange-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    sections: ['Platform Architecture', 'White-Label Demo', 'Analytics Suite', 'Integration APIs', 'Case Studies', 'Partnership Models'],
  },
];

/* ══════════════════════════════════════════════════════════════
   INVESTOR PRESENTATION SECTIONS
   ══════════════════════════════════════════════════════════════ */

function InvestorRevenueGrowth() {
  const quarters = [
    { q: 'Q1 \'25', v: 24800 }, { q: 'Q2 \'25', v: 29400 },
    { q: 'Q3 \'25', v: 35200 }, { q: 'Q4 \'25', v: 38600 },
    { q: 'Q1 \'26', v: 42800 }, { q: 'Q2 \'26 (proj)', v: 51000 },
  ];
  const max = Math.max(...quarters.map((q) => q.v));
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Financial Overview</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Revenue &amp; Growth Trajectory</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Consistent quarter-over-quarter growth driven by high retention and expanding program adoption.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Annual Run Rate', val: 514, pre: '$', suf: 'k', sub: '+67% YoY' },
            { label: 'Families Served', val: 500, suf: '+', sub: 'since inception' },
            { label: 'Net Revenue Retention', val: 112, suf: '%', sub: 'expansion revenue' },
            { label: 'CAC Payback', val: 3.2, suf: ' mo', sub: '-1.1 mo vs prior year' },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <p className="text-3xl font-extrabold font-display text-primary">
                <AnimatedNum value={m.val} prefix={m.pre || ''} suffix={m.suf || ''} />
              </p>
              <p className="text-sm font-semibold text-slate-600 mt-1">{m.label}</p>
              <p className="text-xs text-green-600 font-medium mt-2">{m.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <h3 className="text-xl font-bold font-display text-primary mb-1">Quarterly MRR</h3>
          <p className="text-sm text-slate-500 mb-8">Monthly recurring revenue by quarter (USD)</p>
          <div className="flex items-end gap-3 h-56">
            {quarters.map((q, i) => (
              <div key={q.q} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-primary">${(q.v / 1000).toFixed(1)}k</span>
                <div className="w-full rounded-t-xl overflow-hidden" style={{ height: `${(q.v / max) * 100}%` }}>
                  <div
                    className={`w-full h-full bg-gradient-to-t from-accent to-purple-500 ${i === quarters.length - 1 ? 'opacity-50 border-2 border-dashed border-accent' : ''}`}
                    style={{ animation: `growUp 0.8s ease ${i * 0.12}s both` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-500">{q.q}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Monthly Growth Rate', value: '8.2%', icon: '📈' },
            { label: 'Gross Margin', value: '78%', icon: '💰' },
            { label: 'Burn Multiple', value: '0.6x', icon: '🔥' },
          ].map((m) => (
            <div key={m.label} className="bg-surface rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-xl font-extrabold text-primary">{m.value}</p>
                <p className="text-xs text-slate-500">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function InvestorUnitEconomics() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Unit Economics</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Strong Per-Customer Economics</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Premium positioning drives industry-leading LTV:CAC ratios with efficient acquisition.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <h3 className="text-lg font-bold text-primary mb-6">Revenue Per Customer</h3>
            <div className="space-y-5">
              {[
                { label: 'Average Contract Value', value: '$4,800', bar: 85, color: 'bg-gradient-to-r from-accent to-purple-500' },
                { label: 'Lifetime Value (LTV)', value: '$12,400', bar: 100, color: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
                { label: 'Customer Acq. Cost (CAC)', value: '$1,650', bar: 30, color: 'bg-gradient-to-r from-amber-500 to-orange-500' },
              ].map((r, i) => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-600">{r.label}</span>
                    <span className="font-bold text-primary">{r.value}</span>
                  </div>
                  <AnimBar pct={r.bar} color={r.color} delay={i * 0.15} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-white flex flex-col justify-center">
            <p className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">LTV : CAC Ratio</p>
            <p className="text-6xl font-extrabold font-display">
              <AnimatedNum value={7} suffix=".5x" duration={1500} />
            </p>
            <p className="text-white/60 mt-3 leading-relaxed">Industry benchmark for EdTech is 3x. Our ratio is 2.5x above benchmark, driven by high retention and upsell.</p>
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold"><AnimatedNum value={92} suffix="%" /></p>
                <p className="text-xs text-white/50">12-Month Retention</p>
              </div>
              <div>
                <p className="text-2xl font-bold"><AnimatedNum value={34} suffix="%" /></p>
                <p className="text-xs text-white/50">Upsell Rate</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <h3 className="text-lg font-bold text-primary mb-4">Cohort Revenue Retention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 pr-4 font-semibold text-slate-500">Cohort</th>
                  {['M1', 'M3', 'M6', 'M9', 'M12', 'M18'].map((m) => (
                    <th key={m} className="text-center py-3 px-3 font-semibold text-slate-500">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { cohort: 'Q1 2025', vals: [100, 96, 93, 91, 89, 86] },
                  { cohort: 'Q2 2025', vals: [100, 97, 95, 93, 91, null] },
                  { cohort: 'Q3 2025', vals: [100, 98, 96, 94, null, null] },
                  { cohort: 'Q4 2025', vals: [100, 98, 97, null, null, null] },
                ].map((row) => (
                  <tr key={row.cohort} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-primary">{row.cohort}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="text-center py-3 px-3">
                        {v !== null ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${v >= 95 ? 'bg-green-50 text-green-700' : v >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {v}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function InvestorMarketSizing() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Market Opportunity</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">$12.8B Addressable Market</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">The U.S. college admissions consulting market is large, growing, and ripe for technology-driven disruption.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <div className="flex flex-col items-center">
            {/* Concentric circles visualization */}
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 rounded-full bg-accent/5 flex items-center justify-center">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                  <p className="text-xs font-semibold text-slate-400">TAM</p>
                  <p className="text-lg font-extrabold text-primary">$12.8B</p>
                </div>
                <div className="w-56 h-56 rounded-full bg-accent/10 flex items-center justify-center">
                  <div className="absolute top-20 text-center">
                    <p className="text-xs font-semibold text-slate-400">SAM</p>
                    <p className="text-lg font-extrabold text-primary">$3.2B</p>
                  </div>
                  <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white/70">SOM</p>
                      <p className="text-lg font-extrabold text-accent">$480M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-lg">
              {[
                { label: 'TAM', desc: 'Total U.S. admissions & test prep' },
                { label: 'SAM', desc: 'Premium consulting ($3k+ ACV)' },
                { label: 'SOM', desc: 'Digitally-native, platform-first' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-sm font-bold text-primary">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { stat: '3.7M', label: 'Students apply to college annually in the U.S.', trend: '+4% CAGR' },
            { stat: '26%', label: 'Families using private admissions consulting', trend: '+8% YoY' },
            { stat: '$6,000', label: 'Average family spend on admissions support', trend: 'Rising' },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-3xl font-extrabold font-display text-primary">{m.stat}</p>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{m.label}</p>
              <p className="text-xs text-green-600 font-semibold mt-2">{m.trend}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function InvestorCompetitiveMoat() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Why AdmitsOnly Wins</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Deep Competitive Moat</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Four reinforcing advantages that compound over time and create durable barriers to entry.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              title: 'AI-Powered Holistic Scoring',
              desc: 'Our proprietary Profile Scorer evaluates GPA, test scores, and extracurriculars holistically — not just numbers. The AI assesses leadership, impact, depth, and commitment in activities, giving students a true competitive read.',
              icon: '🧠',
              diff: 'Competitors rely on basic GPA/SAT calculators. We score the full picture.',
            },
            {
              title: 'Former Admissions Officer Network',
              desc: 'Our coaches include former admissions officers from Harvard, Stanford, MIT, and 20+ elite institutions. They know exactly what committees look for because they\'ve sat on them.',
              icon: '🎓',
              diff: 'Most competitors use tutors. We use insiders.',
            },
            {
              title: 'Integrated Platform Experience',
              desc: 'Dashboard, essay coaching, session booking, profile scoring, and progress tracking in one place. No spreadsheets, no scattered tools. Families get a single source of truth.',
              icon: '🔗',
              diff: 'Competitors cobble together Zoom + Google Docs + email. We\'re all-in-one.',
            },
            {
              title: 'Data-Driven Outcomes Tracking',
              desc: 'Every session, essay revision, and score improvement is tracked. Families see real-time progress. We can prove ROI with dashboards, not just testimonials.',
              icon: '📊',
              diff: 'Others promise results. We prove them with data.',
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={0.1 + i * 0.1}>
              <div className="bg-white rounded-2xl border border-slate-100 p-7 h-full">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="text-lg font-bold font-display text-primary mt-3 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{item.desc}</p>
                <div className="bg-accent/5 border border-accent/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-accent">{item.diff}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function InvestorProductWalkthrough() {
  const essaySnippet = `The fluorescent lights of the community center hummed overhead as I unpacked boxes of donated textbooks. At fifteen, I had started a free tutoring program for immigrant families in my neighborhood — families like mine, who had arrived speaking little English and knowing even less about the American education system...`;
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Product Demo</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Platform Walkthrough</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">See the product experience that drives our retention and NPS.</p>
        </div>
      </Reveal>

      {/* Simulated Student Dashboard */}
      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">Student Dashboard — admitsonly.com/dashboard</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'GPA', value: '3.92', color: 'text-emerald-600' },
                { label: 'SAT Composite', value: '1480', color: 'text-accent' },
                { label: 'Essays Completed', value: '4/8', color: 'text-amber-600' },
                { label: 'Sessions This Month', value: '6', color: 'text-purple-600' },
              ].map((s) => (
                <div key={s.label} className="bg-surface rounded-xl p-4 text-center">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-600">Profile Score: Competitive</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: '82%', transition: 'width 2s ease' }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">82nd percentile — Above average for target schools</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Essay Coaching Animation */}
      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-slate-400 ml-2">Essay Coach — Personal Statement</span>
            </div>
            <span className="badge-accent !text-[10px] !py-0.5">Draft 3</span>
          </div>
          <div className="p-6 min-h-[200px]">
            <p className="text-sm text-slate-700 leading-[1.9] font-serif">
              <TypingText text={essaySnippet} speed={20} />
            </p>
          </div>
          <div className="px-6 py-3 bg-accent/[0.03] border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-2 h-2 rounded-full bg-green-500" /> Strong narrative</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-2 h-2 rounded-full bg-green-500" /> Authentic detail</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tighten conclusion</span>
            </div>
            <span className="text-xs font-bold text-accent">Score: 9.2/10</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function InvestorExpansionRoadmap() {
  const phases = [
    { phase: 'Phase 1 — Now', period: '2025–2026', items: ['Scale to 1,000 active families', 'Launch SAT/ACT prep modules', 'Hire 15 additional coaches', 'Series A fundraise'], color: 'bg-accent' },
    { phase: 'Phase 2 — Growth', period: '2026–2027', items: ['Graduate school admissions (MBA, Law, Med)', 'White-label platform for schools', 'International expansion (UK, Canada)', 'AI essay feedback v2'], color: 'bg-purple-500' },
    { phase: 'Phase 3 — Scale', period: '2027–2028', items: ['Enterprise partnerships (school districts)', 'Marketplace for independent consultants', 'IPO / strategic exit readiness', 'Multi-language support'], color: 'bg-violet-500' },
  ];
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="badge-accent">Growth Plan</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Expansion Roadmap</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">A clear, phased plan to capture market share and expand our product offering.</p>
        </div>
      </Reveal>

      {phases.map((p, i) => (
        <Reveal key={p.phase} delay={0.1 + i * 0.15}>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.color}`} />
            <div className="ml-4">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold font-display text-primary">{p.phase}</h3>
                <span className="text-sm text-slate-400">{p.period}</span>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 mt-4">
                {p.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${p.color} flex-shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      ))}

      <Reveal delay={0.5}>
        <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold font-display mb-2">Target: $5M ARR by 2027</h3>
          <p className="text-white/60 max-w-lg mx-auto">With proven unit economics, high retention, and expanding TAM, AdmitsOnly is positioned to become the category-defining platform in premium admissions consulting.</p>
        </div>
      </Reveal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLIENT PRESENTATION SECTIONS
   ══════════════════════════════════════════════════════════════ */

function ClientProvenOutcomes() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">Results That Speak</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Proven Student Outcomes</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Our numbers aren&apos;t just impressive — they represent real families whose lives changed through the right guidance.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { val: 94, suf: '%', label: 'Accepted to a Top-50 University', color: 'text-emerald-600' },
            { val: 127, pre: '+', suf: ' pts', label: 'Average SAT Score Improvement', color: 'text-accent' },
            { val: 98, suf: '%', label: 'Family Satisfaction Rating', color: 'text-purple-600' },
            { val: 12, suf: '+', label: 'Years of Proven Results', color: 'text-amber-600' },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <p className={`text-4xl font-extrabold font-display ${m.color}`}>
                <AnimatedNum value={m.val} prefix={m.pre || ''} suffix={m.suf} />
              </p>
              <p className="text-sm text-slate-600 mt-2">{m.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <h3 className="text-xl font-bold font-display text-primary mb-6">Where Our Students Have Been Accepted</h3>
          <div className="flex flex-wrap gap-3">
            {['Harvard', 'Stanford', 'MIT', 'Yale', 'Princeton', 'Columbia', 'UPenn', 'Duke', 'Brown', 'Northwestern', 'Vanderbilt', 'Rice', 'Georgetown', 'UCLA', 'UC Berkeley', 'NYU', 'UMich', 'Georgia Tech', 'UVA', 'Emory'].map((s) => (
              <span key={s} className="px-3 py-1.5 bg-surface border border-slate-100 rounded-lg text-sm font-medium text-primary">{s}</span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <h3 className="text-xl font-bold font-display text-primary mb-4">Family Testimonials</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { family: 'The Chen Family', school: 'Stanford University', quote: 'AdmitsOnly transformed our daughter\'s application. The essay coaching alone was worth every penny. Her coach, a former Stanford admissions reader, provided insights no one else could.' },
            { family: 'The Williams Family', school: 'MIT', quote: 'The structured approach and expert coaches gave James the confidence and strategy he needed. His profile score went from "Developing" to "Competitive" in 4 months.' },
            { family: 'The Patel Family', school: 'Harvard University', quote: 'We couldn\'t have navigated this process alone. The real-time dashboard let us track progress, and the holistic profile scorer helped us identify exactly where to improve.' },
          ].map((t) => (
            <div key={t.family} className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-sm text-slate-600 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-bold text-primary">{t.family}</p>
                <p className="text-xs text-emerald-600 font-medium">{t.school}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function ClientDashboardTour() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">Live Preview</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Your Personal Dashboard</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Everything your family needs — GPA tracking, SAT scores, essay progress, upcoming sessions — in one beautiful interface.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">admitsonly.com/dashboard</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Welcome header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary">Welcome back, Sarah!</h3>
                <p className="text-sm text-slate-500">Here&apos;s your progress this week</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-accent !text-[10px]">Class of 2026</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'GPA', value: '3.92 / 4.0', icon: '📚', bg: 'bg-emerald-50' },
                { label: 'SAT Score', value: '1480', icon: '📝', bg: 'bg-accent/5' },
                { label: 'Essays Done', value: '5 / 8', icon: '✍️', bg: 'bg-amber-50' },
                { label: 'Next Session', value: 'Tomorrow', icon: '📅', bg: 'bg-purple-50' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <span className="text-lg">{s.icon}</span>
                  <p className="text-lg font-bold text-primary mt-1">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress section */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-surface rounded-xl p-5">
                <h4 className="text-sm font-bold text-primary mb-3">College List Progress</h4>
                {[
                  { school: 'Stanford (Reach)', pct: 75 },
                  { school: 'UCLA (Target)', pct: 90 },
                  { school: 'USC (Safety)', pct: 100 },
                ].map((s) => (
                  <div key={s.school} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{s.school}</span>
                      <span className="font-bold text-primary">{s.pct}%</span>
                    </div>
                    <AnimBar pct={s.pct} color={s.pct === 100 ? 'bg-emerald-500' : s.pct >= 75 ? 'bg-accent' : 'bg-amber-500'} />
                  </div>
                ))}
              </div>
              <div className="bg-surface rounded-xl p-5">
                <h4 className="text-sm font-bold text-primary mb-3">Upcoming Sessions</h4>
                {[
                  { title: 'Essay Review — Common App', time: 'Tomorrow, 4:00 PM', coach: 'Sarah M.' },
                  { title: 'SAT Math Strategy', time: 'Thursday, 3:30 PM', coach: 'Dr. Patel' },
                  { title: 'Activity List Workshop', time: 'Saturday, 10:00 AM', coach: 'James K.' },
                ].map((s) => (
                  <div key={s.title} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.time} &middot; {s.coach}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'Real-Time Updates', desc: 'See scores, feedback, and session notes instantly — no waiting for email summaries.' },
            { title: 'Parent & Student Views', desc: 'Parents see the same dashboard with optional weekly email digests.' },
            { title: 'Mobile Friendly', desc: 'Check progress from any device — phone, tablet, or desktop.' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="text-sm font-bold text-primary mb-2">{f.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function ClientEssayCoaching() {
  const sampleEssay = `The fluorescent lights of the community center hummed overhead as I unpacked boxes of donated textbooks. At fifteen, I had started a free tutoring program for immigrant families — families like mine, who had arrived speaking little English. What began as Saturday morning sessions with three students grew into something I never expected. By junior year, our program served forty-two students across three locations.`;
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">Essay Excellence</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Expert Essay Coaching</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Our coaches don&apos;t just edit — they help students find and tell their most compelling story.</p>
        </div>
      </Reveal>

      {/* Live essay demo with typing animation */}
      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-slate-400 ml-2">AdmitsOnly Essay Coach</span>
            </div>
            <span className="badge-accent !text-[10px] !py-0.5">Draft 3 &middot; Score 9.2/10</span>
          </div>
          <div className="px-8 py-6 min-h-[180px]">
            <p className="text-sm text-slate-700 leading-[1.9] font-serif">
              <TypingText text={sampleEssay} speed={18} />
            </p>
          </div>
          <div className="px-6 py-4 bg-emerald-50/50 border-t border-slate-100">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Strong narrative voice</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Authentic detail</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tighten conclusion</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Process */}
      <Reveal delay={0.2}>
        <h3 className="text-xl font-bold font-display text-primary mb-6 text-center">Our 5-Step Essay Process</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { step: '1', title: 'Brainstorm', desc: 'Discover your unique story angles' },
            { step: '2', title: 'Outline', desc: 'Structure for maximum impact' },
            { step: '3', title: 'Draft', desc: 'Write with authenticity and voice' },
            { step: '4', title: 'Refine', desc: 'Expert feedback and revision' },
            { step: '5', title: 'Polish', desc: 'Final review by admissions insider' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm font-bold mb-2">
                {s.step}
              </div>
              <p className="text-sm font-bold text-primary">{s.title}</p>
              <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-white">
          <h3 className="text-xl font-bold font-display mb-4">What Makes Our Essay Coaching Different</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Coaches who have read 10,000+ real applications',
              'AI-assisted feedback for grammar & structure',
              'Unlimited revisions until your essay is perfect',
              'School-specific strategy for supplementals',
              'Common App, Coalition, UC, and more',
              'Average essay score improvement: 3.4 → 9.1',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function ClientProfileScorer() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">AI-Powered</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Holistic Profile Scorer</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Our AI evaluates your full profile — not just numbers — to show exactly where you stand and how to improve.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">Profile Scorer — admitsonly.com/dashboard/profile</span>
          </div>
          <div className="p-8">
            <div className="grid sm:grid-cols-2 gap-8">
              {/* Score display */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGrad)" strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - 0.82)}`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold font-display text-primary"><AnimatedNum value={82} /></span>
                    <span className="text-sm text-slate-500">out of 100</span>
                  </div>
                </div>
                <div className="mt-4 px-4 py-2 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-bold text-emerald-700">Competitive — 82nd Percentile</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-5">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Score Breakdown</h4>
                {[
                  { label: 'Academic (GPA)', pct: 88, weight: '35%', color: 'bg-gradient-to-r from-emerald-500 to-green-400' },
                  { label: 'Test Scores (SAT)', pct: 78, weight: '30%', color: 'bg-gradient-to-r from-accent to-purple-500' },
                  { label: 'Extracurriculars', pct: 80, weight: '35%', color: 'bg-gradient-to-r from-amber-500 to-orange-400' },
                ].map((s, i) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-600">{s.label} <span className="text-slate-400">({s.weight})</span></span>
                      <span className="font-bold text-primary">{s.pct}/100</span>
                    </div>
                    <AnimBar pct={s.pct} color={s.color} delay={i * 0.15} />
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-primary mb-2">EC Analysis (AI-Powered)</h5>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Leadership', score: 'Strong' },
                      { label: 'Impact', score: 'High' },
                      { label: 'Depth', score: 'Good' },
                      { label: 'Breadth', score: 'Moderate' },
                    ].map((e) => (
                      <span key={e.label} className="px-2 py-1 bg-surface border border-slate-100 rounded text-xs">
                        <span className="font-medium text-slate-600">{e.label}:</span>{' '}
                        <span className="font-bold text-primary">{e.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mini scatterplot */}
            <div className="mt-8 bg-surface rounded-xl p-5">
              <h4 className="text-sm font-bold text-primary mb-3">Where You Stand (vs. Peer Applicants)</h4>
              <svg viewBox="0 0 500 200" className="w-full">
                <rect x="300" y="10" width="190" height="90" fill="#ecfdf5" rx="4" />
                <rect x="120" y="50" width="180" height="100" fill="#fffbeb" rx="4" />
                <rect x="10" y="100" width="110" height="90" fill="#fef2f2" rx="4" />
                <text x="395" y="30" textAnchor="middle" className="text-[9px] fill-emerald-600 font-semibold">Competitive</text>
                <text x="210" y="70" textAnchor="middle" className="text-[9px] fill-amber-600 font-semibold">Developing</text>
                <text x="65" y="120" textAnchor="middle" className="text-[9px] fill-red-500 font-semibold">Needs Work</text>
                {/* Peer dots */}
                {[[350,40],[380,55],[420,35],[340,65],[400,50],[200,80],[230,95],[180,110],[160,100],[60,140],[80,155],[250,75],[320,60],[370,45],[280,85]].map(([cx,cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#94a3b8" opacity="0.4" />
                ))}
                {/* User dot */}
                <circle cx="365" cy="48" r="7" fill="#6366f1" stroke="white" strokeWidth="2" />
                <text x="365" y="42" textAnchor="middle" className="text-[8px] fill-accent font-bold" dy="-4">You</text>
                <text x="250" y="195" textAnchor="middle" className="text-[10px] fill-slate-400">SAT Score →</text>
                <text x="12" y="100" className="text-[10px] fill-slate-400" transform="rotate(-90, 12, 100)">GPA →</text>
              </svg>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function ClientCoachingExperience() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">The Experience</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Personalized Coaching Journey</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">From the first strategy call to acceptance day — here&apos;s what the AdmitsOnly experience looks like.</p>
        </div>
      </Reveal>

      {[
        { step: '01', title: 'Strategy Session', desc: 'We start with a deep-dive into your academic profile, goals, and dream schools. Your coach builds a personalized roadmap with milestones and deadlines.', color: 'from-emerald-500 to-teal-600' },
        { step: '02', title: 'Weekly Coaching', desc: 'Regular 1-on-1 sessions with your dedicated coach. Focus areas rotate between essays, test prep strategy, extracurricular positioning, and college list refinement.', color: 'from-accent to-purple-600' },
        { step: '03', title: 'Application Sprint', desc: 'In the final months, we shift to application mode. Essay polishing, supplemental essays, activity descriptions, and interview prep — all coordinated through your dashboard.', color: 'from-amber-500 to-orange-600' },
      ].map((s, i) => (
        <Reveal key={s.step} delay={0.1 + i * 0.1}>
          <div className="flex gap-6 items-start">
            <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
              <span className="text-2xl font-extrabold text-white font-display">{s.step}</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex-1">
              <h3 className="text-lg font-bold font-display text-primary mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        </Reveal>
      ))}

      <Reveal delay={0.4}>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center">
          <p className="text-lg font-bold text-emerald-800 mb-1">Average time from enrollment to first acceptance letter</p>
          <p className="text-4xl font-extrabold font-display text-emerald-700"><AnimatedNum value={4} suffix=" months" /></p>
        </div>
      </Reveal>
    </div>
  );
}

function ClientProgramsPricing() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">Programs</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Programs &amp; Pricing</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Flexible programs designed to fit every family&apos;s needs and timeline.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              name: 'Essentials',
              price: '$2,400',
              period: 'per semester',
              features: ['8 coaching sessions', 'Essay review (2 essays)', 'Profile scoring', 'College list building', 'Dashboard access'],
              color: 'border-slate-200',
              highlight: false,
            },
            {
              name: 'Comprehensive',
              price: '$4,800',
              period: 'per semester',
              features: ['16 coaching sessions', 'Unlimited essay reviews', 'Profile scoring + strategy', 'Full college list curation', 'Interview prep', 'Parent progress reports', 'Priority scheduling'],
              color: 'border-accent',
              highlight: true,
            },
            {
              name: 'Elite',
              price: '$8,400',
              period: 'per semester',
              features: ['Unlimited coaching sessions', 'All essay types covered', 'Dedicated senior coach', 'Application management', 'Financial aid guidance', 'Decision day strategy', '24/7 messaging support'],
              color: 'border-emerald-500',
              highlight: false,
            },
          ].map((p) => (
            <div key={p.name} className={`bg-white rounded-2xl border-2 ${p.color} p-7 relative ${p.highlight ? 'shadow-xl shadow-accent/10' : ''}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-accent !text-[10px]">Most Popular</div>}
              <h3 className="text-xl font-bold font-display text-primary">{p.name}</h3>
              <div className="mt-3 mb-5">
                <span className="text-3xl font-extrabold text-primary">{p.price}</span>
                <span className="text-sm text-slate-500 ml-1">/{p.period}</span>
              </div>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PARTNER PRESENTATION SECTIONS
   ══════════════════════════════════════════════════════════════ */

function PartnerPlatformArchitecture() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Technical Overview</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Platform Architecture</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">A modern, scalable platform built for institutional deployment and white-label customization.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { module: 'Student Portal', features: ['Dashboard & progress tracking', 'Profile scorer', 'Essay workspace', 'Session booking'], icon: '👤' },
            { module: 'Coach Platform', features: ['Session management', 'Essay review tools', 'Student analytics', 'Scheduling calendar'], icon: '🎓' },
            { module: 'Admin Console', features: ['User management', 'Revenue analytics', 'Program configuration', 'Demo mode'], icon: '⚙️' },
            { module: 'Parent Access', features: ['Progress dashboards', 'Session summaries', 'Payment management', 'Weekly digests'], icon: '👨‍👩‍👧' },
          ].map((m) => (
            <div key={m.module} className="bg-white rounded-2xl border border-slate-100 p-6">
              <span className="text-2xl">{m.icon}</span>
              <h4 className="text-sm font-bold text-primary mt-2 mb-3">{m.module}</h4>
              <ul className="space-y-1.5">
                {m.features.map((f) => (
                  <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <h3 className="text-lg font-bold text-primary mb-4">Technology Stack</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Frontend', tech: 'Next.js / React / TypeScript' },
              { label: 'Styling', tech: 'Tailwind CSS' },
              { label: 'Auth', tech: 'NextAuth.js / OAuth 2.0' },
              { label: 'Hosting', tech: 'Vercel (Edge Network)' },
              { label: 'Database', tech: 'PostgreSQL / Prisma' },
              { label: 'Payments', tech: 'Stripe' },
              { label: 'Email', tech: 'SendGrid' },
              { label: 'Video', tech: 'Zoom SDK' },
            ].map((t) => (
              <div key={t.label} className="bg-surface rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.label}</p>
                <p className="text-sm font-medium text-primary mt-1">{t.tech}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function PartnerWhiteLabel() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Customization</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">White-Label Deployment</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Deploy AdmitsOnly under your school&apos;s brand with custom domains, colors, and student experiences.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">admissions.yourschool.edu</span>
          </div>
          <div className="p-8 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div>
                <p className="font-bold text-blue-900">Your School Academy</p>
                <p className="text-xs text-blue-600">College Admissions Portal</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active Students', val: '234' },
                { label: 'Acceptance Rate', val: '91%' },
                { label: 'Avg SAT Gain', val: '+142' },
              ].map((s) => (
                <div key={s.label} className="bg-white/80 rounded-xl p-4 text-center border border-blue-100">
                  <p className="text-2xl font-extrabold text-blue-900">{s.val}</p>
                  <p className="text-xs text-blue-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { title: 'Custom Branding', items: ['Your logo, colors, and fonts', 'Custom domain (admissions.yourschool.edu)', 'Branded email communications', 'Co-branded landing pages'] },
            { title: 'Student Management', items: ['Bulk student onboarding via CSV', 'SSO with your existing identity provider', 'Cohort-based program management', 'Custom role permissions'] },
            { title: 'Reporting', items: ['School-wide outcome dashboards', 'Per-student progress reports', 'Coach effectiveness metrics', 'Board-ready PDF exports'] },
            { title: 'Support', items: ['Dedicated partnership manager', 'Staff training & onboarding', 'Technical integration support', 'Quarterly business reviews'] },
          ].map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="text-sm font-bold text-primary mb-3">{s.title}</h4>
              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function PartnerAnalyticsSuite() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Data & Insights</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Analytics Suite</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Comprehensive dashboards showing student outcomes, engagement, and program effectiveness.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <h3 className="text-lg font-bold text-primary mb-6">Cohort Effectiveness Dashboard</h3>
          <div className="space-y-5">
            {[
              { label: 'Top-50 Acceptance Rate', pct: 94, benchmark: 'National avg: 42%', color: 'bg-gradient-to-r from-emerald-500 to-green-400' },
              { label: 'SAT Score Improvement', pct: 85, benchmark: 'Avg +127 points', color: 'bg-gradient-to-r from-accent to-purple-500' },
              { label: 'Essay Completion Rate', pct: 97, benchmark: 'Before deadline', color: 'bg-gradient-to-r from-amber-500 to-orange-400' },
              { label: 'Student Engagement', pct: 91, benchmark: 'Sessions attended', color: 'bg-gradient-to-r from-rose-500 to-pink-400' },
              { label: 'Parent Satisfaction', pct: 98, benchmark: 'NPS: 78', color: 'bg-gradient-to-r from-teal-500 to-cyan-400' },
            ].map((m, i) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-600">{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{m.benchmark}</span>
                    <span className="font-bold text-primary">{m.pct}%</span>
                  </div>
                </div>
                <AnimBar pct={m.pct} color={m.color} delay={i * 0.1} />
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'Real-Time Dashboards', desc: 'Live views into student progress, coach utilization, and program health.' },
            { title: 'Custom Reports', desc: 'Build custom reports for board meetings, parent nights, and grant applications.' },
            { title: 'Data Export', desc: 'Export any data as CSV, PDF, or via API for integration with your existing tools.' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="text-sm font-bold text-primary mb-2">{f.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function PartnerIntegrationAPIs() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Developer Ready</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Integration &amp; APIs</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Connect AdmitsOnly with your existing systems using our robust API and pre-built integrations.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'REST API', desc: 'Full CRUD access to students, sessions, essays, and scores', icon: '🔌' },
            { name: 'Webhooks', desc: 'Real-time events for enrollment, session completion, score changes', icon: '🔔' },
            { name: 'SSO / SAML', desc: 'Single sign-on with your school\'s identity provider', icon: '🔐' },
            { name: 'LMS Connect', desc: 'Integrate with Canvas, Blackboard, Google Classroom', icon: '📚' },
          ].map((api) => (
            <div key={api.name} className="bg-white rounded-2xl border border-slate-100 p-6">
              <span className="text-2xl">{api.icon}</span>
              <h4 className="text-sm font-bold text-primary mt-2 mb-1">{api.name}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{api.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-slate-900 rounded-2xl p-8 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">API Example — Get Student Profile</span>
          </div>
          <pre className="text-sm text-green-400 font-mono overflow-x-auto">
{`GET /api/v1/students/:id/profile

{
  "student": {
    "name": "Sarah Chen",
    "gpa": 3.92,
    "sat": { "math": 760, "reading_writing": 720 },
    "holistic_score": 82,
    "percentile": 82,
    "zone": "competitive",
    "extracurriculars": [
      {
        "name": "Community Tutoring Program",
        "role": "Founder & Lead Tutor",
        "category": "community_service",
        "years": 3,
        "hours_per_week": 12
      }
    ]
  }
}`}
          </pre>
        </div>
      </Reveal>
    </div>
  );
}

function PartnerCaseStudies() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Success Stories</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Partner Case Studies</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">See how institutions have transformed their college counseling with AdmitsOnly.</p>
        </div>
      </Reveal>

      {[
        {
          school: 'Westridge Preparatory Academy',
          location: 'Los Angeles, CA',
          students: 420,
          challenge: 'Overwhelmed college counselors serving a 180:1 student-to-counselor ratio. Students from diverse backgrounds needed personalized guidance that the school couldn\'t scale.',
          solution: 'Deployed AdmitsOnly as a white-label platform integrated with their SIS. Every junior and senior received access to the dashboard, profile scorer, and essay coaching.',
          results: [
            { metric: '94%', label: 'Top-50 acceptance rate (up from 71%)' },
            { metric: '+38%', label: 'Increase in students applying to reach schools' },
            { metric: '4.9/5', label: 'Parent satisfaction rating' },
          ],
        },
        {
          school: 'Summit College Advisors Network',
          location: 'Multi-State Franchise',
          students: 1200,
          challenge: 'A network of independent college advisors needed a unified platform to standardize their service quality and track outcomes across 15 locations.',
          solution: 'White-labeled AdmitsOnly with custom branding per location, centralized analytics, and shared best practices through the coach platform.',
          results: [
            { metric: '3x', label: 'Advisor productivity increase' },
            { metric: '$2.1M', label: 'Additional revenue from platform upsell' },
            { metric: '97%', label: 'Advisor retention rate' },
          ],
        },
      ].map((cs, i) => (
        <Reveal key={cs.school} delay={0.1 + i * 0.15}>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <h3 className="text-xl font-bold font-display">{cs.school}</h3>
              <p className="text-sm text-white/70">{cs.location} &middot; {cs.students} students</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-primary mb-1">Challenge</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{cs.challenge}</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary mb-1">Solution</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{cs.solution}</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary mb-2">Results</h4>
                <div className="grid grid-cols-3 gap-4">
                  {cs.results.map((r) => (
                    <div key={r.label} className="bg-surface rounded-xl p-4 text-center">
                      <p className="text-2xl font-extrabold font-display text-primary">{r.metric}</p>
                      <p className="text-xs text-slate-500 mt-1">{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function PartnerPartnershipModels() {
  return (
    <div className="space-y-10">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">Get Started</span>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-primary mt-4">Partnership Models</h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Flexible engagement options designed to fit your institution&apos;s needs and scale.</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              name: 'License',
              price: 'Per-Student',
              desc: 'Access AdmitsOnly as-is under our brand. Best for schools wanting a turnkey solution.',
              features: ['Full platform access', 'Standard branding', 'Email support', 'Quarterly reports', 'Coach marketplace access'],
              color: 'border-slate-200',
            },
            {
              name: 'White-Label',
              price: 'Annual Fee',
              desc: 'Deploy under your brand with custom domain, colors, and full control over the student experience.',
              features: ['Custom branding & domain', 'SSO integration', 'Dedicated success manager', 'Custom reporting', 'Staff training included', 'API access'],
              color: 'border-amber-500',
              highlight: true,
            },
            {
              name: 'Revenue Share',
              price: 'No Upfront Cost',
              desc: 'We handle everything — you refer families and earn a percentage of each enrollment.',
              features: ['Zero implementation cost', 'Co-branded experience', 'Revenue share on referrals', 'Marketing materials provided', 'Performance dashboard'],
              color: 'border-slate-200',
            },
          ].map((p) => (
            <div key={p.name} className={`bg-white rounded-2xl border-2 ${p.color} p-7 relative ${p.highlight ? 'shadow-xl shadow-amber-500/10' : ''}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">Recommended</div>}
              <h3 className="text-xl font-bold font-display text-primary">{p.name}</h3>
              <p className="text-sm font-semibold text-amber-600 mt-1">{p.price}</p>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">{p.desc}</p>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold font-display mb-3">Ready to Partner?</h3>
          <p className="text-white/60 mb-6 max-w-md mx-auto">Let&apos;s discuss how AdmitsOnly can serve your institution&apos;s students and families.</p>
          <button className="inline-flex px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors">
            Schedule a Partnership Call
          </button>
        </div>
      </Reveal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION RENDERERS (map section index → component)
   ══════════════════════════════════════════════════════════════ */

const sectionMap: Record<string, React.FC[]> = {
  investor: [InvestorRevenueGrowth, InvestorUnitEconomics, InvestorMarketSizing, InvestorCompetitiveMoat, InvestorProductWalkthrough, InvestorExpansionRoadmap],
  client: [ClientProvenOutcomes, ClientDashboardTour, ClientEssayCoaching, ClientProfileScorer, ClientCoachingExperience, ClientProgramsPricing],
  partner: [PartnerPlatformArchitecture, PartnerWhiteLabel, PartnerAnalyticsSuite, PartnerIntegrationAPIs, PartnerCaseStudies, PartnerPartnershipModels],
};

/* ══════════════════════════════════════════════════════════════
   GLOBAL CSS ANIMATION (inline <style>)
   ══════════════════════════════════════════════════════════════ */

const extraCSS = `
@keyframes growUp {
  from { transform: scaleY(0); transform-origin: bottom; }
  to   { transform: scaleY(1); transform-origin: bottom; }
}
`;

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function AdminDemos() {
  const { loading } = useAdminGuard();
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);

  const handleLaunch = useCallback((id: string) => {
    setActiveDemo(id);
    setSectionIdx(0);
    setPresenting(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  /* ─── Full-Screen Presentation Mode ─── */
  if (presenting && activeDemo) {
    const profile = profiles.find((p) => p.id === activeDemo)!;
    const sections = sectionMap[activeDemo];
    const SectionComponent = sections[sectionIdx];
    const isFirst = sectionIdx === 0;
    const isLast = sectionIdx === sections.length - 1;

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        <Head><title>Demo: {profile.label} | AdmitsOnly</title></Head>
        <style dangerouslySetInnerHTML={{ __html: extraCSS }} />

        {/* Presenter toolbar */}
        <div className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                PRESENTING
              </span>
              <span className="text-sm font-medium text-white/70">{profile.label} Demo</span>
              <span className="text-xs text-white/40">Section {sectionIdx + 1} of {sections.length}</span>
            </div>
            <button
              onClick={() => { setPresenting(false); setSectionIdx(0); }}
              className="px-4 py-1.5 text-sm font-semibold text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
            >
              Exit Presentation
            </button>
          </div>

          {/* Section nav tabs */}
          <div className="px-6 pb-3 flex items-center gap-2 overflow-x-auto">
            {profile.sections.map((s, i) => (
              <button
                key={s}
                onClick={() => setSectionIdx(i)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  i === sectionIdx
                    ? 'bg-white/20 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Section content */}
        <div className="max-w-6xl mx-auto px-6 py-12" key={`${activeDemo}-${sectionIdx}`}>
          <SectionComponent />
        </div>

        {/* Bottom navigation */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSectionIdx((p) => Math.max(0, p - 1))}
            disabled={isFirst}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isFirst ? 'text-slate-300 cursor-not-allowed' : 'text-primary border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setSectionIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === sectionIdx ? 'bg-accent' : 'bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>

          <button
            onClick={() => setSectionIdx((p) => Math.min(sections.length - 1, p + 1))}
            disabled={isLast}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isLast ? 'text-slate-300 cursor-not-allowed' : 'btn-primary !py-2.5'
            }`}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  /* ─── Demo Selection Page ─── */
  return (
    <AdminLayout>
      <Head><title>Demo Mode | AdmitsOnly Admin</title></Head>
      <style dangerouslySetInnerHTML={{ __html: extraCSS }} />

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Demo Mode</h1>
          <p className="mt-1 text-slate-500">Launch rich, interactive presentations tailored for investors, clients, and partners.</p>
        </div>

        {/* Demo profiles */}
        <div className="grid gap-6 sm:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-2xl border-2 border-slate-100 hover:border-accent/50 p-6 transition-all hover:shadow-lg hover:-translate-y-1 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white mb-4`}>
                {profile.icon}
              </div>
              <h3 className="text-lg font-bold font-display text-primary">{profile.label}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{profile.desc}</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{profile.sections.length} Sections</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.sections.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[11px] font-medium text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleLaunch(profile.id)}
                className="mt-5 w-full btn-primary text-sm !py-2.5 flex items-center justify-center gap-2 opacity-90 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Launch Presentation
              </button>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold font-display text-primary mb-4">Presentation Tips</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'Before the Call', tips: ['Test screen sharing', 'Review latest metrics', 'Know your audience persona'] },
              { title: 'During the Demo', tips: ['Use section navigation', 'Let animations play out', 'Engage with interactive elements'] },
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

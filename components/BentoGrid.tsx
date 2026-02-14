import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useInView } from '../hooks/useAnimations';

function BentoCard({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    glow.style.background = `radial-gradient(300px circle at ${x}px ${y}px, rgba(99, 102, 241, 0.08), transparent 60%)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (card) card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    if (glow) glow.style.background = 'transparent';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`bento-card relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-7 transition-transform duration-200 ease-out ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div ref={glowRef} className="absolute inset-0 pointer-events-none transition-all duration-300" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function BentoGrid() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <div ref={ref} className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isVisible ? 'bento-visible' : 'bento-hidden'}`}>
      {/* Large card - spans 2 cols */}
      <BentoCard className="md:col-span-2 md:row-span-1" delay={0}>
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-primary">Adaptive Learning Studio</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              AI-powered diagnostics analyze your student&apos;s unique learning patterns to create mastery-based pathways.
              Each lesson adapts in real-time, targeting growth areas while building on existing strengths.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['AI Diagnostics', 'Mastery Tracking', 'Personalized Paths'].map((tag) => (
                <span key={tag} className="px-3 py-1 bg-accent/5 border border-accent/10 rounded-full text-xs font-medium text-accent">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Tall card */}
      <BentoCard className="md:row-span-2" delay={100}>
        <div className="h-full flex flex-col">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-5 text-lg font-bold font-display text-primary">Family Progress Hub</h3>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed">
            Real-time dashboards keep parents informed with weekly insights, achievement milestones, and coaching recommendations.
          </p>

          {/* Mini dashboard preview */}
          <div className="mt-5 flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Weekly Progress</span>
              <span className="text-[11px] font-bold text-green-600">+12%</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Math', pct: 85, color: 'bg-accent' },
                { label: 'Writing', pct: 72, color: 'bg-purple-500' },
                { label: 'SAT Verbal', pct: 90, color: 'bg-emerald-500' },
                { label: 'Research', pct: 60, color: 'bg-amber-500' },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>{bar.label}</span>
                    <span className="font-semibold">{bar.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full transition-all duration-1000`} style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Two small cards side by side */}
      <BentoCard delay={200}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-bold font-display text-primary">Live &amp; Hybrid Classes</h3>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Premium online cohorts with collaborative whiteboards and breakout pods. In-person intensives available nationwide.
        </p>
      </BentoCard>

      <BentoCard delay={300}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-bold font-display text-primary">Global Faculty Network</h3>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Expert educators, guest professors, and industry mentors curated for specialized topics and masterclass instruction.
        </p>
      </BentoCard>
    </div>
  );
}

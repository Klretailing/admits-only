import Head from 'next/head';
import Link from 'next/link';
import { useInView } from '../hooks/useAnimations';

/* ──────────────────────── REVEAL WRAPPER ──────────────────────── */

function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────── MOTION 1 — WRITING ──────────────────────── */

function WritingMotion() {
  const chips = ['Narrative', 'Analytical', 'Informational', 'Personal Statement'];
  const lines = [92, 78, 86, 68, 88, 74];

  return (
    <div className="relative aspect-[5/4] w-full rounded-3xl bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/50 border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
      {/* ambient orbs */}
      <div className="absolute -top-20 -left-20 w-56 h-56 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-20 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl" />

      {/* floating essay-type chips */}
      <div className="absolute top-5 left-5 right-5 flex flex-wrap gap-2 z-10">
        {chips.map((chip, i) => (
          <span
            key={chip}
            className="px-3 py-1 text-[11px] font-semibold tracking-wide rounded-full bg-white/90 backdrop-blur text-accent border border-accent/20 shadow-sm"
            style={{ animation: `chipFloat 5s ease-in-out ${i * 0.35}s infinite` }}
          >
            {chip}
          </span>
        ))}
      </div>

      {/* essay paper */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[32%] w-[80%] bg-white rounded-2xl border border-slate-100 shadow-xl p-6 overflow-hidden">
        {/* title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-28 bg-primary/80 rounded-full" />
          <div className="h-2 w-10 bg-accent/60 rounded-full" />
        </div>
        {/* body lines */}
        <div className="space-y-2.5 relative">
          {lines.map((w, i) => (
            <div key={i} className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 h-full rounded-full bg-gradient-to-r from-slate-300 via-slate-400/70 to-slate-300 origin-left"
                style={{
                  width: `${w}%`,
                  animation: `lineFill 6s ease-in-out ${i * 0.45}s infinite`,
                }}
              />
            </div>
          ))}
          {/* caret */}
          <div
            className="absolute w-[2px] h-4 bg-accent"
            style={{
              left: '74%',
              top: 'calc(5 * (0.625rem + 8px) + 2px)',
              animation: 'caretBlink 1s steps(1) infinite',
            }}
          />
        </div>
      </div>

      {/* sparkle pencil */}
      <div
        className="absolute bottom-5 right-5 w-10 h-10 rounded-xl bg-white/90 backdrop-blur border border-accent/20 shadow-md flex items-center justify-center text-accent"
        style={{ animation: 'penTilt 3s ease-in-out infinite' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      </div>

      {/* sparkles */}
      {[
        { x: '18%', y: '70%', s: 8, d: '0s' },
        { x: '82%', y: '42%', s: 6, d: '1s' },
        { x: '30%', y: '88%', s: 5, d: '2s' },
      ].map((sp, i) => (
        <div
          key={i}
          className="absolute text-accent"
          style={{
            left: sp.x,
            top: sp.y,
            width: sp.s,
            height: sp.s,
            animation: `sparkleTwinkle 2.4s ease-in-out ${sp.d} infinite`,
          }}
        >
          <svg viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── MOTION 2 — SAT/ACT LOOP ──────────────────────── */

function ScoreLoopMotion() {
  // Circle radius 70, circumference ≈ 440
  return (
    <div className="relative aspect-[5/4] w-full rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
      {/* ambient orbs */}
      <div className="absolute -top-16 -right-20 w-56 h-56 bg-amber-400/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-orange-400/15 rounded-full blur-3xl" />

      {/* top label */}
      <div className="absolute top-5 left-0 right-0 text-center">
        <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-wide rounded-full bg-white/90 backdrop-blur text-amber-600 border border-amber-500/20 shadow-sm">
          Feedback Loop · Practice → Review → Refine
        </span>
      </div>

      {/* gauge */}
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-48 h-48">
          {/* rotating loop ring (outer) */}
          <svg
            className="absolute inset-0"
            width="192"
            height="192"
            viewBox="0 0 192 192"
            style={{ animation: 'loopSpin 14s linear infinite' }}
          >
            <defs>
              <linearGradient id="loopGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="url(#loopGrad)"
              strokeWidth="1.5"
              strokeDasharray="4 12"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>

          {/* gauge background ring */}
          <svg className="absolute inset-0" width="192" height="192" viewBox="0 0 192 192">
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            {/* base ring */}
            <circle cx="96" cy="96" r="70" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            {/* animated arc */}
            <circle
              cx="96"
              cy="96"
              r="70"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="440"
              strokeDashoffset="440"
              transform="rotate(-90 96 96)"
              style={{ animation: 'arcFill 5s ease-in-out infinite' }}
            />
          </svg>

          {/* score center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Composite</div>
            <div className="text-4xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
              1520
            </div>
            <div className="text-[11px] text-slate-500 font-medium">+440 pts gained</div>
          </div>
        </div>
      </div>

      {/* test history bars */}
      <div className="absolute bottom-6 left-0 right-0 flex items-end justify-center gap-1.5 h-10 px-10">
        {[30, 45, 55, 68, 80, 92].map((h, i) => (
          <div
            key={i}
            className="w-4 rounded-t bg-gradient-to-t from-amber-500 to-orange-400 origin-bottom"
            style={{
              height: `${h}%`,
              animation: `barRise 5s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── MOTION 3 — CAREER PATH ──────────────────────── */

function PathMotion() {
  const labels = [
    { text: 'Research', x: '10%', y: '14%', delay: '0s' },
    { text: 'Industry Network', x: '70%', y: '10%', delay: '1s' },
    { text: 'Portfolio', x: '5%', y: '68%', delay: '2s' },
    { text: 'Mentorship', x: '72%', y: '72%', delay: '1.5s' },
  ];

  return (
    <div className="relative aspect-[5/4] w-full rounded-3xl bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
      {/* ambient orbs */}
      <div className="absolute -top-20 -left-16 w-56 h-56 bg-emerald-400/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-16 w-60 h-60 bg-teal-400/15 rounded-full blur-3xl" />

      {/* floating discipline labels */}
      {labels.map((l) => (
        <div
          key={l.text}
          className="absolute px-3 py-1 text-[10px] font-semibold tracking-wide rounded-full bg-white/90 backdrop-blur text-emerald-600 border border-emerald-500/20 shadow-sm"
          style={{
            left: l.x,
            top: l.y,
            animation: `labelDrift 5s ease-in-out ${l.delay} infinite`,
          }}
        >
          {l.text}
        </div>
      ))}

      {/* SVG path with moving dot */}
      <svg
        viewBox="0 0 400 320"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* trail path */}
        <path
          id="careerPath"
          d="M 40 250 C 110 220, 120 120, 200 130 S 300 240, 360 100"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="4 6"
        />
        {/* animated gradient path overlay */}
        <path
          d="M 40 250 C 110 220, 120 120, 200 130 S 300 240, 360 100"
          fill="none"
          stroke="url(#pathGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="18 18"
          style={{ animation: 'dashFlow 1.6s linear infinite' }}
        />

        {/* waypoints */}
        {[
          { cx: 40, cy: 250 },
          { cx: 148, cy: 148 },
          { cx: 258, cy: 202 },
          { cx: 360, cy: 100 },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r="10" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
            <circle
              cx={p.cx}
              cy={p.cy}
              r="4"
              fill="#10b981"
              style={{ animation: `sparkleTwinkle 2.2s ease-in-out ${i * 0.4}s infinite` }}
            />
          </g>
        ))}

        {/* travelling comet */}
        <circle r="7" fill="#10b981" filter="url(#dotGlow)">
          <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
            <mpath href="#careerPath" />
          </animateMotion>
        </circle>
      </svg>

      {/* compass badge */}
      <div className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-white/90 backdrop-blur border border-emerald-500/20 shadow-md flex items-center justify-center">
        <div style={{ animation: 'compassSlowSpin 12s linear infinite' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#10b981" fillOpacity="0.25" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── MOTION 4 — CONVERGENCE ──────────────────────── */

function ConvergenceMotion() {
  const layers = [
    { label: 'Academic Excellence', color: 'from-indigo-500 to-violet-500', offset: 0, tilt: '-3deg' },
    { label: 'Leadership & Impact', color: 'from-violet-500 to-purple-500', offset: 18, tilt: '2deg' },
    { label: 'Authentic Narrative', color: 'from-purple-500 to-fuchsia-500', offset: 36, tilt: '-2deg' },
    { label: 'Community Character', color: 'from-fuchsia-500 to-rose-500', offset: 54, tilt: '3deg' },
  ];

  return (
    <div className="relative aspect-[5/4] w-full rounded-3xl bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/50 border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden">
      {/* ambient orbs */}
      <div className="absolute -top-20 -right-16 w-56 h-56 bg-violet-400/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-60 h-60 bg-fuchsia-400/15 rounded-full blur-3xl" />

      {/* stacked pillar layers */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <div className="relative w-[78%] max-w-sm">
          {layers.map((l, i) => (
            <div
              key={l.label}
              className="mb-2 rounded-xl bg-white/95 backdrop-blur border border-slate-100 shadow-md px-4 py-2.5 flex items-center justify-between"
              style={{
                ['--tilt' as string]: l.tilt,
                transform: `rotate(${l.tilt})`,
                animation: `layerFloat 6s ease-in-out ${i * 0.3}s infinite`,
                marginLeft: `${i % 2 === 0 ? '-6px' : '6px'}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${l.color} flex items-center justify-center`}>
                  <span className="text-[10px] font-bold text-white">0{i + 1}</span>
                </div>
                <span className="text-xs font-semibold text-primary">{l.label}</span>
              </div>
              <svg className="w-3.5 h-3.5 text-accent/70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* crest at top */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
        style={{ animation: 'crestGlow 3.2s ease-in-out infinite' }}
      >
        <div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl"
          style={{ animation: 'sealPulse 3.2s ease-in-out infinite' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 9l10 7 10-7-10-7z" fill="white" fillOpacity="0.25" />
            <path d="M4 11v6l8 5 8-5v-6" />
          </svg>
        </div>
      </div>

      {/* floating stars */}
      {[
        { x: '12%', y: '22%', d: '0s' },
        { x: '86%', y: '30%', d: '1.2s' },
        { x: '18%', y: '80%', d: '0.6s' },
        { x: '82%', y: '78%', d: '1.8s' },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 text-accent"
          style={{ left: s.x, top: s.y, animation: `starFloat 3.6s ease-in-out ${s.d} infinite` }}
        >
          <svg viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── PROGRAM SECTION ──────────────────────── */

interface ProgramSectionProps {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  accentClasses: string;
}

function ProgramSection({ badge, title, description, highlights, visual, reverse, accentClasses }: ProgramSectionProps) {
  return (
    <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1fr_1.15fr] items-center">
      <div className={reverse ? 'lg:order-2' : ''}>
        <RevealSection>
          <div className={`badge mb-4 ${accentClasses}`}>{badge}</div>
          <h3 className="text-2xl lg:text-3xl font-bold font-display text-primary tracking-tight">
            {title}
          </h3>
          <p className="mt-5 text-slate-500 leading-relaxed">{description}</p>
          <ul className="mt-6 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex gap-3 items-start">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
          <Link href="/contact" className="mt-8 btn-primary inline-flex text-sm">
            Schedule a Conversation &rarr;
          </Link>
        </RevealSection>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <RevealSection delay={150}>{visual}</RevealSection>
      </div>
    </div>
  );
}

/* ──────────────────────── PAGE ──────────────────────── */

export default function Services() {
  return (
    <>
      <Head>
        <title>Programs | AdmitsOnly — Writing, SAT/ACT, Career &amp; College Admissions</title>
        <meta
          name="description"
          content="Four focused programs from AdmitsOnly: Writing Curriculum, SAT/ACT Preparation, Career Guidance, and College Admissions. Expert-led, outcome-oriented, premium coaching."
        />
      </Head>

      <div className="bg-white">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="max-w-3xl">
              <div className="section-label">Our Programs</div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                Four programs.{' '}
                <span className="gradient-text">One quiet obsession</span>{' '}
                with the student in front of us.
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Each program is crafted around a single idea: give students the strategies,
                confidence, and mentorship to do their best work — and let outcomes follow.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/contact" className="btn-primary text-base">
                  Book a Free Strategy Call
                </Link>
                <Link href="#programs" className="btn-ghost text-base">
                  Explore Programs &darr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROGRAMS ─── */}
        <section id="programs" className="section-padding bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <RevealSection>
              <div className="text-center max-w-2xl mx-auto">
                <div className="section-label">What We Teach</div>
                <h2 className="section-title">A focused catalogue, built for depth over breadth</h2>
                <p className="section-subtitle mx-auto">
                  Every program is designed and delivered by experienced educators —
                  small, intentional, and measured by real student growth.
                </p>
              </div>
            </RevealSection>

            <div className="mt-20 space-y-28 lg:space-y-36">
              {/* 1. Writing Curriculum */}
              <ProgramSection
                badge="Writing Curriculum"
                title="Writing that moves beyond the five-paragraph essay"
                description="A strategy-first curriculum that teaches students how to think on the page. Rather than memorizing templates, students learn durable frameworks for navigating any essay type — informational, analytical, narrative, or persuasive — and master the craft of turning lived experience into unforgettable college admissions essays. Equally at home preparing students for AP exams, timed writing assessments, and the blank page."
                highlights={[
                  'High-level strategies that transfer across every essay format and prompt',
                  'A signature process for mining experience and shaping it into authentic narrative',
                  'Rigorous editing, feedback, and voice development from experienced writers',
                  'Direct preparation for AP Language, AP Literature, and timed writing exams',
                ]}
                visual={<WritingMotion />}
                accentClasses="bg-accent/10 text-accent border border-accent/20"
              />

              {/* 2. SAT / ACT */}
              <ProgramSection
                badge="SAT / ACT Preparation"
                title="A feedback-loop approach to score growth"
                description="We don't believe in grinding through endless question sets. Our SAT and ACT curriculum centers on test-taking strategy — pacing, pattern recognition, elimination, and disciplined review cycles — so students understand why answers are right, not just which ones are. Practice becomes deliberate, scores rise with intention, and test day feels familiar instead of intimidating."
                highlights={[
                  'Strategy-first instruction focused on how the test actually behaves',
                  'A structured feedback loop: diagnostic, practice, review, refine, repeat',
                  'Personalized study plans targeting the sections with the highest return',
                  'Realistic full-length simulations with transparent score tracking',
                ]}
                visual={<ScoreLoopMotion />}
                reverse
                accentClasses="bg-amber-500/10 text-amber-600 border border-amber-500/20"
              />

              {/* 3. Career Guidance */}
              <ProgramSection
                badge="Career Guidance"
                title="Discover, design, and enter the field you love"
                description="Whether a student already has a clear passion or is still searching, our career guidance program helps them immerse meaningfully in a discipline. Together we build a roadmap — research, projects, mentorship, internships, and professional connections — so students don't just dream about a field, they begin practicing it. The result is direction, confidence, and a genuine foothold in the world they want to join."
                highlights={[
                  'Guided exploration for students discovering their direction, with clarity exercises',
                  'Deep-dive immersion for students who already know the field they love',
                  'Custom roadmaps with research, projects, and skill-building milestones',
                  'Introductions and pathways into the professional world, mentors included',
                ]}
                visual={<PathMotion />}
                accentClasses="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              />

              {/* 4. College Admissions */}
              <ProgramSection
                badge="College Admissions"
                title="End-to-end admissions, from first spark to final decision"
                description="Our flagship program supports students through every stage of the journey — shaping their identity as an academic and community leader, helping them stand out in an extraordinarily competitive ecosystem, and guiding them through every layer of the application process. We build upon converging activities that reveal the qualities admissions officers consistently reward, and walk beside families all the way through post-acceptance decisions."
                highlights={[
                  'Identity and narrative development rooted in authentic student strengths',
                  'Layered activity planning that converges into a distinctive profile',
                  'Full application support: school lists, essays, supplements, interviews',
                  'Post-decision guidance: financial aid, comparisons, and the final choice',
                ]}
                visual={<ConvergenceMotion />}
                reverse
                accentClasses="bg-violet-500/10 text-violet-600 border border-violet-500/20"
              />
            </div>
          </div>
        </section>

        {/* ─── CLOSING CTA ─── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent via-purple-600 to-violet-700 section-padding">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <RevealSection>
              <h2 className="text-3xl lg:text-4xl font-bold font-display text-white tracking-tight">
                Not sure which program is the right fit?
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
                Every student is different. Start with a free strategy call and we&apos;ll listen
                first — then recommend a path that fits your family&apos;s goals, timeline, and style.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link href="/contact" className="btn-secondary text-base !border-0">
                  Book a Free Strategy Call
                </Link>
                <Link href="/faq" className="btn-ghost text-base">
                  Read the FAQ &rarr;
                </Link>
              </div>
            </RevealSection>
          </div>
        </section>
      </div>
    </>
  );
}

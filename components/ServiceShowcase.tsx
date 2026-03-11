import { useEffect, useState, useRef } from 'react';
import { useInView } from '../hooks/useAnimations';
import Link from 'next/link';

/* ─── Mentoring Roadmap Animation ─── */
function MentoringRoadmap() {
  const { ref, isVisible } = useInView(0.2);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isVisible) return;
    let step = 0;
    const interval = setInterval(() => {
      setActiveStep(step);
      step++;
      if (step >= 5) {
        step = 0;
        setActiveStep(-1);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [isVisible]);

  const milestones = [
    { label: 'Academic Assessment', icon: 'clipboard' },
    { label: 'Goal Setting', icon: 'target' },
    { label: 'Course Planning', icon: 'book' },
    { label: 'Progress Check-in', icon: 'chart' },
    { label: 'College Readiness', icon: 'cap' },
  ];

  return (
    <div ref={ref} className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-slate-400 font-medium">Student Roadmap — Academic Year 2025–26</span>
          <span className="badge-accent !text-[10px] !py-0.5">Active</span>
        </div>

        {/* Student header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider">AdmitsOnly Mentoring</p>
              <p className="text-[11px] text-slate-400">Personalized academic roadmap</p>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div className="px-6 py-5">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[18px] top-4 bottom-4 w-px bg-slate-200" />
            <div
              className="absolute left-[18px] top-4 w-px bg-gradient-to-b from-accent to-purple-500 transition-all duration-700 ease-out"
              style={{ height: activeStep >= 0 ? `${Math.min((activeStep + 1) * 20, 100)}%` : '0%' }}
            />

            <div className="space-y-4">
              {milestones.map((m, i) => {
                const done = i <= activeStep;
                const active = i === activeStep;
                return (
                  <div key={m.label} className="flex items-center gap-4 relative">
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10
                      transition-all duration-500
                      ${done
                        ? 'bg-accent shadow-lg shadow-accent/25 scale-110'
                        : 'bg-white border-2 border-slate-200'
                      }
                      ${active ? 'ring-4 ring-accent/20' : ''}
                    `}>
                      {done ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className={`flex-1 py-2 px-4 rounded-xl transition-all duration-500 ${active ? 'bg-accent/5 border border-accent/10' : ''}`}>
                      <span className={`text-sm font-medium transition-colors duration-300 ${done ? 'text-primary' : 'text-slate-400'}`}>
                        {m.label}
                      </span>
                    </div>
                    {active && (
                      <div className="flex-shrink-0">
                        <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-accent/[0.03] to-purple-50/50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-600">On Track</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-xs font-medium text-slate-600">Next session: Thursday</span>
              </div>
            </div>
            <span className="text-xs font-bold text-accent">{Math.min((activeStep + 1) * 20, 100)}% Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Application Tracker Animation ─── */
function ApplicationTracker() {
  const { ref, isVisible } = useInView(0.2);
  const [visibleRows, setVisibleRows] = useState(0);
  const [statusUpdates, setStatusUpdates] = useState<number[]>([]);

  const schools = [
    { name: 'Stanford University', deadline: 'Jan 2', status: 'Submitted', statusColor: 'bg-green-500' },
    { name: 'MIT', deadline: 'Jan 4', status: 'Submitted', statusColor: 'bg-green-500' },
    { name: 'UC Berkeley', deadline: 'Nov 30', status: 'Under Review', statusColor: 'bg-amber-500' },
    { name: 'Georgia Tech', deadline: 'Jan 6', status: 'In Progress', statusColor: 'bg-accent' },
    { name: 'Northwestern', deadline: 'Jan 3', status: 'Drafting', statusColor: 'bg-slate-400' },
  ];

  useEffect(() => {
    if (!isVisible) return;
    let row = 0;
    const showInterval = setInterval(() => {
      row++;
      setVisibleRows(row);
      if (row >= schools.length) clearInterval(showInterval);
    }, 300);

    const updateInterval = setInterval(() => {
      setStatusUpdates((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * schools.length);
        if (!next.includes(idx)) next.push(idx);
        if (next.length > 2) next.shift();
        return next;
      });
    }, 2000);

    return () => {
      clearInterval(showInterval);
      clearInterval(updateInterval);
    };
  }, [isVisible]);

  return (
    <div ref={ref} className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-slate-400 font-medium">Application Tracker — Class of 2026</span>
          <span className="badge-accent !text-[10px] !py-0.5">5 Schools</span>
        </div>

        {/* Tracker header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">AdmitsOnly Applications</p>
              <p className="text-[11px] text-slate-400">Real-time college application management</p>
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 grid grid-cols-3 gap-4">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">School</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Deadline</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Status</span>
        </div>

        {/* School rows */}
        <div className="divide-y divide-slate-50">
          {schools.map((school, i) => (
            <div
              key={school.name}
              className={`px-6 py-3 grid grid-cols-3 gap-4 items-center transition-all duration-500
                ${i < visibleRows ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
                ${statusUpdates.includes(i) ? 'bg-accent/[0.02]' : ''}
              `}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="text-sm font-medium text-primary truncate">{school.name}</span>
              <span className="text-xs text-slate-400 text-center">{school.deadline}</span>
              <div className="flex items-center justify-end gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${school.statusColor} ${statusUpdates.includes(i) ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium text-slate-600">{school.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-emerald-500/[0.03] to-teal-50/50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-600">2 Submitted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">1 Under Review</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600">Ahead of Schedule</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SAT Score Animation ─── */
function SATScoreTracker() {
  const { ref, isVisible } = useInView(0.2);
  const [currentScore, setCurrentScore] = useState(1080);
  const [animPhase, setAnimPhase] = useState(0);
  const targetScore = 1520;
  const phases = [1080, 1180, 1290, 1380, 1460, 1520];

  useEffect(() => {
    if (!isVisible) return;
    let phase = 0;
    const interval = setInterval(() => {
      phase++;
      if (phase >= phases.length) {
        phase = 0;
      }
      setAnimPhase(phase);
      setCurrentScore(phases[phase]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isVisible]);

  const pct = ((currentScore - 400) / 1200) * 100;

  return (
    <div ref={ref} className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-slate-400 font-medium">SAT Prep Dashboard — Practice Tests</span>
          <span className="badge-accent !text-[10px] !py-0.5">Live</span>
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">AdmitsOnly SAT/ACT Prep</p>
              <p className="text-[11px] text-slate-400">Score tracking &amp; improvement analytics</p>
            </div>
          </div>
        </div>

        {/* Score display */}
        <div className="px-6 py-5">
          <div className="text-center mb-5">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Current Composite Score</div>
            <div className="text-4xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500">
              {currentScore}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Target: {targetScore} &middot; +{currentScore - 1080} pts gained
            </div>
          </div>

          {/* Score bar */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
              <span>400</span>
              <span>1600</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow-md" />
              </div>
            </div>
          </div>

          {/* Section breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Reading & Writing', score: Math.round(currentScore * 0.52), max: 800, color: 'bg-accent' },
              { label: 'Math', score: Math.round(currentScore * 0.48), max: 800, color: 'bg-amber-500' },
            ].map((section) => (
              <div key={section.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">{section.label}</div>
                <div className="text-lg font-bold text-primary mt-0.5">{section.score}</div>
                <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${section.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(section.score / section.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Practice history mini chart */}
          <div className="mt-4 flex items-end gap-1.5 justify-center h-12">
            {phases.map((score, i) => {
              const h = ((score - 900) / 700) * 100;
              const isActive = i <= animPhase;
              return (
                <div
                  key={i}
                  className={`w-6 rounded-t transition-all duration-500 ${isActive ? 'bg-gradient-to-t from-amber-500 to-orange-400' : 'bg-slate-100'}`}
                  style={{ height: `${isActive ? h : 20}%` }}
                />
              );
            })}
          </div>
          <div className="text-center mt-1.5 text-[10px] text-slate-400">Practice Test History</div>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-amber-500/[0.03] to-orange-50/50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-600">Improving</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">6 tests completed</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600">+440 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Floating Blocks Background ─── */
function FloatingBlocks() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { size: 'w-16 h-16', pos: 'top-[10%] left-[5%]', delay: '0s', dur: '20s', color: 'bg-accent/[0.04]' },
        { size: 'w-12 h-12', pos: 'top-[60%] right-[8%]', delay: '3s', dur: '25s', color: 'bg-purple-500/[0.04]' },
        { size: 'w-20 h-20', pos: 'bottom-[15%] left-[12%]', delay: '6s', dur: '22s', color: 'bg-emerald-500/[0.03]' },
        { size: 'w-10 h-10', pos: 'top-[25%] right-[20%]', delay: '2s', dur: '18s', color: 'bg-amber-500/[0.04]' },
        { size: 'w-14 h-14', pos: 'bottom-[40%] right-[3%]', delay: '5s', dur: '23s', color: 'bg-accent/[0.03]' },
        { size: 'w-8 h-8', pos: 'top-[45%] left-[25%]', delay: '8s', dur: '15s', color: 'bg-violet-500/[0.05]' },
      ].map((block, i) => (
        <div
          key={i}
          className={`absolute ${block.size} ${block.pos} ${block.color} rounded-xl border border-slate-200/30 service-float`}
          style={{ animationDelay: block.delay, animationDuration: block.dur }}
        />
      ))}
    </div>
  );
}

/* ─── Main Service Showcase ─── */

interface ServiceSectionProps {
  badge: string;
  title: string;
  description: string;
  highlights: { label: string; desc: string }[];
  visual: React.ReactNode;
  reverse?: boolean;
  accentColor: string;
  delay?: number;
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ServiceSection({ badge, title, description, highlights, visual, reverse, accentColor, delay = 0 }: ServiceSectionProps) {
  return (
    <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1fr_1.2fr] items-center">
      <div className={reverse ? 'lg:order-2' : ''}>
        <RevealSection delay={delay}>
          <div className={`badge ${accentColor} mb-4`}>{badge}</div>
          <h3 className="text-2xl lg:text-3xl font-bold font-display text-primary tracking-tight">
            {title}
          </h3>
          <p className="mt-4 text-slate-500 leading-relaxed">
            {description}
          </p>
          <div className="mt-6 space-y-3">
            {highlights.map((item) => (
              <div key={item.label} className="flex gap-3 items-start">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-primary">{item.label}</span>
                  <span className="text-sm text-slate-500"> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/contact" className="mt-8 btn-primary inline-flex text-sm">
            Schedule a Conversation &rarr;
          </Link>
        </RevealSection>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <RevealSection delay={delay + 200}>
          {visual}
        </RevealSection>
      </div>
    </div>
  );
}

export default function ServiceShowcase() {
  return (
    <section className="section-padding bg-surface relative overflow-hidden" id="services">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <FloatingBlocks />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <RevealSection>
          <div className="text-center mb-20">
            <div className="section-label">Our Services</div>
            <h2 className="section-title">Three ways we support students and families</h2>
            <p className="section-subtitle mx-auto">
              Every family&apos;s journey is different. We offer focused, expert-led services
              that meet students where they are and help them get where they want to go.
            </p>
          </div>
        </RevealSection>

        <div className="space-y-24 lg:space-y-32">
          {/* Service 1: High School Mentoring */}
          <ServiceSection
            badge="Grades 8–12"
            title="High School Mentoring"
            description="Navigating high school is about more than grades. We pair students with mentors who help them build strong academic habits, explore meaningful extracurriculars, and develop the confidence to take on challenging coursework — all while keeping the bigger picture in focus."
            highlights={[
              { label: 'One-on-one mentorship', desc: 'Consistent guidance from someone who knows the landscape.' },
              { label: 'Academic planning', desc: 'Course selection, GPA strategy, and timeline mapping.' },
              { label: 'Extracurricular development', desc: 'Finding and committing to activities that genuinely matter.' },
              { label: 'Executive function coaching', desc: 'Time management, organization, and self-advocacy skills.' },
            ]}
            visual={<MentoringRoadmap />}
            accentColor="bg-accent/10 text-accent border border-accent/20"
          />

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="w-2 h-2 rounded-full bg-accent/20" />
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Service 2: College Admissions Consulting */}
          <ServiceSection
            badge="Grades 9–12"
            title="College Admissions Consulting"
            description="The admissions process is complex and high-stakes. We work alongside families to build compelling, authentic applications — from school list research and essay strategy to interview preparation and financial aid guidance. No gimmicks, just thoughtful, experienced support."
            highlights={[
              { label: 'School list development', desc: 'Data-informed recommendations tailored to each student.' },
              { label: 'Essay coaching', desc: 'Helping students find and tell their most authentic stories.' },
              { label: 'Application management', desc: 'Deadlines, supplements, and submissions handled with care.' },
              { label: 'Interview preparation', desc: 'Practice sessions that build poise and genuine self-expression.' },
            ]}
            visual={<ApplicationTracker />}
            reverse
            accentColor="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            delay={100}
          />

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="w-2 h-2 rounded-full bg-accent/20" />
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Service 3: SAT/ACT Prep */}
          <ServiceSection
            badge="Grades 9–12"
            title="SAT & ACT Preparation"
            description="Standardized tests are one piece of the puzzle, but they matter. Our approach combines diagnostic assessment with targeted practice to help students improve efficiently — not by drilling endlessly, but by understanding the test and building genuine skills."
            highlights={[
              { label: 'Diagnostic-first approach', desc: 'We identify strengths and gaps before building a plan.' },
              { label: 'Personalized study plans', desc: 'Focused practice on the areas that will move the needle most.' },
              { label: 'Timed practice tests', desc: 'Realistic conditions so test day feels familiar, not stressful.' },
              { label: 'Score improvement tracking', desc: 'Transparent progress monitoring with regular check-ins.' },
            ]}
            visual={<SATScoreTracker />}
            accentColor="bg-amber-500/10 text-amber-600 border border-amber-500/20"
            delay={100}
          />
        </div>
      </div>
    </section>
  );
}

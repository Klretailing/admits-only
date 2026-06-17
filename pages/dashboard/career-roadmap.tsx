import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import { useStaggerReveal } from '../../hooks/useAnimations';
import {
  MAJORS, QUIZ_QUESTIONS, categoryConfig, milestoneColor,
  getRecommendedColleges, scoreQuiz,
  type Major, type CareerPath, type Milestone, type QuizResult,
} from '../../lib/careerRoadmaps';

/* ──────────────────────── HELPERS ──────────────────────── */

function formatSalary(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

const colorMap: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#8b5cf6',
  orange: '#f97316',
  yellow: '#eab308',
  brown: '#92400e',
};

/* ──────────────────────── STATE MACHINE ──────────────────────── */

type View =
  | { type: 'picker' }
  | { type: 'quiz'; step: number; answers: number[] }
  | { type: 'quiz-results'; results: QuizResult[] }
  | { type: 'roadmap'; majorId: string; pathIndex: number; expandedId: string | null }
  | { type: 'compare'; majorIdA: string; majorIdB: string | null };

/* ──────────────────────── BACK BUTTON ──────────────────────── */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-slate-500 hover:text-primary flex items-center gap-1 mb-4">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

/* ──────────────────────── MAJOR PICKER ──────────────────────── */

function MajorPicker({
  onSelectMajor,
  onStartQuiz,
}: {
  onSelectMajor: (majorId: string) => void;
  onStartQuiz: () => void;
}) {
  const { ref, visibleCount } = useStaggerReveal(MAJORS.length);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Career Roadmap</h1>
            <p className="text-sm text-slate-500 mt-0.5">Explore career paths from any major</p>
          </div>
        </div>
        <button
          onClick={onStartQuiz}
          className="bg-accent text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-all hover:-translate-y-0.5"
        >
          Help Me Explore
        </button>
      </div>

      {/* Major grid */}
      <div ref={ref} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MAJORS.map((major, i) => {
          const cat = categoryConfig[major.category];
          return (
            <button
              key={major.id}
              onClick={() => onSelectMajor(major.id)}
              className={`bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 dash-card-hover cursor-pointer text-left transition-all ${
                i < visibleCount ? 'animate-fade-up' : 'opacity-0'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center mb-3 text-lg`}>
                {major.icon}
              </div>
              <p className="text-sm font-bold font-display text-primary">{major.name}</p>
              <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-lg mt-2 ${cat.text} ${cat.bg} ${cat.border}`}>
                {major.category}
              </span>
              <p className="text-xs text-slate-500 line-clamp-2 mt-2">{major.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────── EXPLORATION QUIZ ──────────────────────── */

function ExplorationQuiz({
  step,
  answers,
  onAnswer,
  onBack,
}: {
  step: number;
  answers: number[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
  onBack: () => void;
}) {
  const question = QUIZ_QUESTIONS[step];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const progressPct = ((step) / totalQuestions) * 100;
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setSelected(null);
    return () => clearTimeout(timerRef.current);
  }, [step]);

  const handleSelect = useCallback((optionIndex: number) => {
    setSelected(optionIndex);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onAnswer(step, optionIndex);
    }, 300);
  }, [step, onAnswer]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <BackButton onClick={onBack} />

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">Question {step + 1} of {totalQuestions}</p>
      </div>

      {/* Question */}
      <h2 className="text-lg font-bold font-display text-primary">{question.text}</h2>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full bg-white rounded-xl border p-4 cursor-pointer transition-all text-left ${
                isSelected
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className={`text-sm ${isSelected ? 'font-semibold text-accent' : 'text-slate-600'}`}>
                {option.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────── QUIZ RESULTS ──────────────────────── */

function QuizResults({
  results,
  onViewRoadmap,
  onRetake,
  onBack,
}: {
  results: QuizResult[];
  onViewRoadmap: (majorId: string) => void;
  onRetake: () => void;
  onBack: () => void;
}) {
  const rankColors = ['bg-amber-400', 'bg-slate-400', 'bg-amber-700'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <BackButton onClick={onBack} />

      <h2 className="text-2xl font-bold font-display text-primary">Your Top Matches</h2>

      <div className="space-y-4">
        {results.slice(0, 3).map((result, i) => {
          const major = MAJORS.find(m => m.id === result.majorId);
          if (!major) return null;
          const cat = categoryConfig[major.category];
          return (
            <div
              key={result.majorId}
              className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 dash-card-hover animate-fade-up"
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full ${rankColors[i]} flex items-center justify-center shrink-0`}>
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-primary">{major.name}</h3>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${cat.text} ${cat.bg} ${cat.border}`}>
                      {major.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{result.reasoning}</p>
                  <button
                    onClick={() => onViewRoadmap(result.majorId)}
                    className="mt-3 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    View Roadmap &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button onClick={onRetake} className="text-sm text-slate-500 hover:text-primary">
          Retake Quiz
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── ROADMAP VIEW ──────────────────────── */

function RoadmapView({
  majorId,
  pathIndex,
  expandedId,
  onChangePathIndex,
  onToggleExpand,
  onBack,
  onCompare,
}: {
  majorId: string;
  pathIndex: number;
  expandedId: string | null;
  onChangePathIndex: (i: number) => void;
  onToggleExpand: (id: string) => void;
  onBack: () => void;
  onCompare: () => void;
}) {
  const major = MAJORS.find(m => m.id === majorId);
  if (!major) return null;

  const path = major.paths[pathIndex];
  const milestones = path.milestones;
  const expandedMilestone = expandedId ? milestones.find(m => m.id === expandedId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton onClick={onBack} />

      {/* Major header */}
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${categoryConfig[major.category].bg} flex items-center justify-center shadow-sm text-xl`}>
          {major.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">{major.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{major.description}</p>
        </div>
      </div>

      {/* Path tabs + Compare */}
      <div className="flex flex-wrap items-center gap-2">
        {major.paths.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onChangePathIndex(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              i === pathIndex
                ? 'bg-accent/10 text-accent border border-accent/10'
                : 'bg-white border border-slate-100 text-slate-600 hover:border-slate-200'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={onCompare}
          className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-100 text-slate-600 hover:border-slate-200 transition-all flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          Compare
        </button>
      </div>

      {/* Peak salary badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Peak salary for this path:</span>
        <span className="text-sm font-bold font-display text-primary">${formatSalary(path.peakSalary)}</span>
      </div>

      {/* Desktop horizontal timeline */}
      <div className="hidden sm:flex items-end gap-0 w-full">
        {milestones.map((m, i) => (
          <button
            key={m.id}
            onClick={() => onToggleExpand(m.id)}
            style={{ flexGrow: m.durationYears }}
            className={`relative group min-w-[80px] text-center px-2 py-3 transition-all ${
              expandedId === m.id ? 'scale-[1.02]' : ''
            }`}
          >
            {/* Colored bar */}
            <div className={`h-2.5 rounded-full ${milestoneColor[m.type]} ${i > 0 ? 'ml-1' : ''}`} />
            {/* Connector dot between milestones */}
            {i < milestones.length - 1 && (
              <div
                className={`absolute -right-1.5 top-[14px] w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${milestoneColor[m.type]}`}
              />
            )}
            {/* Labels below */}
            <p className="text-xs font-semibold text-primary mt-2 truncate">{m.label}</p>
            <p className="text-[10px] text-slate-400">
              {m.durationYears} yr{m.durationYears !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>

      {/* Mobile vertical timeline */}
      <div className="sm:hidden space-y-0">
        {milestones.map((m, i) => (
          <button
            key={m.id}
            onClick={() => onToggleExpand(m.id)}
            className="flex items-start gap-3 w-full text-left py-2"
          >
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-3 h-3 rounded-full ${milestoneColor[m.type]}`} />
              {i < milestones.length - 1 && (
                <div
                  className="w-0.5 bg-slate-200"
                  style={{ height: `${m.durationYears * 16}px`, minHeight: '16px' }}
                />
              )}
            </div>
            <div className="flex-1 -mt-0.5">
              <p className="text-sm font-semibold text-primary">{m.label}</p>
              <p className="text-xs text-slate-400">
                {m.durationYears} yr{m.durationYears !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded milestone panel */}
      {expandedMilestone && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mt-4 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Col 1: Requirements */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Requirements</h4>
              <ul className="space-y-1.5">
                {expandedMilestone.requirements.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            {/* Col 2: Salary */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Expected Salary</h4>
              <p className="text-xl font-bold font-display text-primary">
                ${formatSalary(expandedMilestone.salaryRange[0])} &ndash; ${formatSalary(expandedMilestone.salaryRange[1])}
              </p>
              <p className="text-xs text-slate-400 mt-1">Annual compensation</p>
            </div>
            {/* Col 3: Top Programs (only for education type) */}
            {expandedMilestone.type === 'education' && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Top Programs</h4>
                {getRecommendedColleges(expandedMilestone.matchingStrengths).map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: colorMap[c.logoColor] || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── MINI TIMELINE (shared for compare) ──────────────────────── */

function MiniTimeline({ path }: { path: CareerPath }) {
  const milestones = path.milestones;
  return (
    <div className="flex items-end gap-0 w-full">
      {milestones.map((m, i) => (
        <div
          key={m.id}
          style={{ flexGrow: m.durationYears }}
          className="relative min-w-[60px] text-center px-1 py-2"
        >
          <div className={`h-2 rounded-full ${milestoneColor[m.type]} ${i > 0 ? 'ml-0.5' : ''}`} />
          {i < milestones.length - 1 && (
            <div
              className={`absolute -right-1 top-[10px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${milestoneColor[m.type]}`}
            />
          )}
          <p className="text-[10px] font-semibold text-primary mt-1.5 truncate">{m.label}</p>
          <p className="text-[9px] text-slate-400">
            {m.durationYears} yr{m.durationYears !== 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── COMPARE VIEW ──────────────────────── */

function CompareView({
  majorIdA,
  majorIdB,
  onSelectB,
  onChangeA,
  onChangeB,
  onBack,
}: {
  majorIdA: string;
  majorIdB: string | null;
  onSelectB: (majorId: string) => void;
  onChangeA: () => void;
  onChangeB: () => void;
  onBack: () => void;
}) {
  const majorA = MAJORS.find(m => m.id === majorIdA);
  const majorB = majorIdB ? MAJORS.find(m => m.id === majorIdB) : null;

  if (!majorA) return null;

  // Helper to get summary stats for a major's best path (index 0)
  function getMajorStats(major: Major) {
    const bestPath = major.paths[0];
    const totalYears = bestPath.milestones.reduce((sum, m) => sum + m.durationYears, 0);
    const educationSteps = bestPath.milestones.filter(m => m.type === 'education').length;
    return { bestPath, totalYears, peakSalary: bestPath.peakSalary, educationSteps };
  }

  // If majorIdB is null, show mini picker
  if (!majorB) {
    const otherMajors = MAJORS.filter(m => m.id !== majorIdA);
    return (
      <div className="space-y-6 animate-fade-in">
        <BackButton onClick={onBack} />

        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Compare Fields</h2>
          <p className="text-sm text-slate-500 mt-1">
            Comparing <span className="font-semibold text-primary">{majorA.name}</span> &mdash; select a field to compare
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {otherMajors.map(major => {
            const cat = categoryConfig[major.category];
            return (
              <button
                key={major.id}
                onClick={() => onSelectB(major.id)}
                className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 dash-card-hover cursor-pointer text-left transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center mb-3 text-lg`}>
                  {major.icon}
                </div>
                <p className="text-sm font-bold font-display text-primary">{major.name}</p>
                <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-lg mt-2 ${cat.text} ${cat.bg} ${cat.border}`}>
                  {major.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Both selected — show comparison
  const statsA = getMajorStats(majorA);
  const statsB = getMajorStats(majorB);
  const catA = categoryConfig[majorA.category];
  const catB = categoryConfig[majorB.category];

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton onClick={onBack} />

      <h2 className="text-2xl font-bold font-display text-primary">Compare Fields</h2>

      {/* Two column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column A */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${catA.bg} flex items-center justify-center text-lg`}>
                {majorA.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{majorA.name}</h3>
                <p className="text-xs text-slate-400">{statsA.bestPath.name}</p>
              </div>
            </div>
            <button onClick={onChangeA} className="text-sm text-slate-500 hover:text-primary">
              Change
            </button>
          </div>
          <MiniTimeline path={statsA.bestPath} />
        </div>

        {/* Column B */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${catB.bg} flex items-center justify-center text-lg`}>
                {majorB.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{majorB.name}</h3>
                <p className="text-xs text-slate-400">{statsB.bestPath.name}</p>
              </div>
            </div>
            <button onClick={onChangeB} className="text-sm text-slate-500 hover:text-primary">
              Change
            </button>
          </div>
          <MiniTimeline path={statsB.bestPath} />
        </div>
      </div>

      {/* Summary comparison card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-lg font-bold text-primary mb-4">Side-by-Side Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Total Years */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Total Years to Peak</h4>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xl font-bold font-display text-primary">{statsA.totalYears}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorA.name}</p>
              </div>
              <span className="text-slate-300">vs</span>
              <div>
                <p className="text-xl font-bold font-display text-primary">{statsB.totalYears}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorB.name}</p>
              </div>
            </div>
          </div>
          {/* Peak Salary */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Peak Salary</h4>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xl font-bold font-display text-primary">${formatSalary(statsA.peakSalary)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorA.name}</p>
              </div>
              <span className="text-slate-300">vs</span>
              <div>
                <p className="text-xl font-bold font-display text-primary">${formatSalary(statsB.peakSalary)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorB.name}</p>
              </div>
            </div>
          </div>
          {/* Education Steps */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Education Steps</h4>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xl font-bold font-display text-primary">{statsA.educationSteps}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorA.name}</p>
              </div>
              <span className="text-slate-300">vs</span>
              <div>
                <p className="text-xl font-bold font-display text-primary">{statsB.educationSteps}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{majorB.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── MAIN PAGE COMPONENT ──────────────────────── */

export default function CareerRoadmapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<View>({ type: 'picker' });
  const [viewHistory, setViewHistory] = useState<View[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const viewRef = useRef(view);
  viewRef.current = view;

  const pushView = useCallback((next: View) => {
    setViewHistory(prev => [...prev, viewRef.current]);
    setView(next);
  }, []);

  const goBack = useCallback(() => {
    setViewHistory(prev => {
      const copy = [...prev];
      const last = copy.pop();
      if (last) setView(last);
      return copy;
    });
  }, []);

  // Quiz answer handler
  const handleQuizAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    if (view.type !== 'quiz') return;
    const newAnswers = [...view.answers];
    newAnswers[questionIndex] = optionIndex;

    if (questionIndex + 1 < QUIZ_QUESTIONS.length) {
      // Advance to next question (replace current quiz view in place, don't push to history)
      setView({ type: 'quiz', step: questionIndex + 1, answers: newAnswers });
    } else {
      // Quiz complete — compute results
      const results = scoreQuiz(newAnswers);
      pushView({ type: 'quiz-results', results });
    }
  }, [view, pushView]);

  // Navigation helpers
  const goToRoadmap = useCallback((majorId: string) => {
    pushView({ type: 'roadmap', majorId, pathIndex: 0, expandedId: null });
  }, [pushView]);

  const goToCompare = useCallback((majorId: string) => {
    pushView({ type: 'compare', majorIdA: majorId, majorIdB: null });
  }, [pushView]);

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <Head><title>Career Roadmap | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading career roadmaps...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Career Roadmap | AdmitsOnly</title></Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {view.type === 'picker' && (
          <MajorPicker
            onSelectMajor={goToRoadmap}
            onStartQuiz={() => pushView({ type: 'quiz', step: 0, answers: [] })}
          />
        )}

        {view.type === 'quiz' && (
          <ExplorationQuiz
            step={view.step}
            answers={view.answers}
            onAnswer={handleQuizAnswer}
            onBack={goBack}
          />
        )}

        {view.type === 'quiz-results' && (
          <QuizResults
            results={view.results}
            onViewRoadmap={goToRoadmap}
            onRetake={() => pushView({ type: 'quiz', step: 0, answers: [] })}
            onBack={goBack}
          />
        )}

        {view.type === 'roadmap' && (
          <RoadmapView
            majorId={view.majorId}
            pathIndex={view.pathIndex}
            expandedId={view.expandedId}
            onChangePathIndex={(i) =>
              setView({ ...view, pathIndex: i, expandedId: null })
            }
            onToggleExpand={(id) =>
              setView({ ...view, expandedId: view.expandedId === id ? null : id })
            }
            onBack={goBack}
            onCompare={() => goToCompare(view.majorId)}
          />
        )}

        {view.type === 'compare' && (
          <CompareView
            majorIdA={view.majorIdA}
            majorIdB={view.majorIdB}
            onSelectB={(majorId) =>
              setView({ ...view, majorIdB: majorId })
            }
            onChangeA={() =>
              setView({ ...view, majorIdA: view.majorIdA, majorIdB: null })
            }
            onChangeB={() =>
              setView({ ...view, majorIdB: null })
            }
            onBack={goBack}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

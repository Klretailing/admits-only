import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';

/* ──────────────────────── TYPES ──────────────────────── */

type MatchTier = 'safety' | 'match' | 'reach';

interface College {
  id: string;
  name: string;
  location: string;
  state: string;
  type: 'Private' | 'Public';
  acceptanceRate: number;
  avgGPA: number;
  satRange: [number, number];
  strengths: string[];
  size: 'Small' | 'Medium' | 'Large';
  logoColor: string;
}

interface CollegeMatch {
  college: College;
  tier: MatchTier;
  gpaFit: number;
  satFit: number;
  overallFit: number;
}

/* ──────────────────────── TIER CONFIG ──────────────────────── */

const tierConfig: Record<MatchTier, { label: string; color: string; bg: string; border: string; ring: string; description: string }> = {
  reach: {
    label: 'Reach',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    ring: 'ring-rose-500/20',
    description: 'Ambitious — your stats are below their typical admits',
  },
  match: {
    label: 'Match',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-500/20',
    description: 'Competitive — your stats align with their typical admits',
  },
  safety: {
    label: 'Safety',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500/20',
    description: 'Strong fit — your stats exceed their typical admits',
  },
};

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function CollegeMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<CollegeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [studentStats, setStudentStats] = useState<{ gpa: number; totalSAT: number } | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [savedSchools, setSavedSchools] = useState<Set<string>>(new Set());

  // Filters
  const [tierFilter, setTierFilter] = useState<MatchTier | ''>('');
  const [typeFilter, setTypeFilter] = useState<'Private' | 'Public' | ''>('');
  const [sizeFilter, setSizeFilter] = useState<'Small' | 'Medium' | 'Large' | ''>('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Load saved schools from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      if (stored) {
        const apps = JSON.parse(stored);
        setSavedSchools(new Set(apps.map((a: any) => a.name.toLowerCase())));
      }
    } catch {}
  }, []);

  // Fetch matches
  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);

    const params = new URLSearchParams();
    if (tierFilter) params.set('tier', tierFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    if (strengthFilter) params.set('strength', strengthFilter);
    if (stateFilter) params.set('state', stateFilter);

    fetch(`/api/college-match?${params}`)
      .then(r => r.json())
      .then(data => {
        setMatches(data.matches || []);
        setNeedsProfile(data.needsProfile || false);
        setStudentStats(data.studentStats || null);
        setStrengths(data.strengths || []);
        setStates(data.states || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, tierFilter, typeFilter, sizeFilter, strengthFilter, stateFilter]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase();
    return matches.filter(m =>
      m.college.name.toLowerCase().includes(q) ||
      m.college.location.toLowerCase().includes(q) ||
      m.college.strengths.some(s => s.toLowerCase().includes(q))
    );
  }, [matches, searchQuery]);

  // Tier summary counts
  const tierCounts = useMemo(() => {
    const counts = { reach: 0, match: 0, safety: 0 };
    matches.forEach(m => counts[m.tier]++);
    return counts;
  }, [matches]);

  // Add school to application tracker
  function addToTracker(college: College) {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      const apps = stored ? JSON.parse(stored) : [];

      if (apps.some((a: any) => a.name.toLowerCase() === college.name.toLowerCase())) return;

      const newApp = {
        id: `app_${Date.now()}`,
        name: college.name,
        deadline: '',
        type: college.type === 'Public' ? 'Regular Decision' : 'Regular Decision',
        status: 'researching',
        tasks: [
          { id: `t1_${Date.now()}`, label: 'Research program requirements', done: false },
          { id: `t2_${Date.now()}`, label: 'Write main essay', done: false },
          { id: `t3_${Date.now()}`, label: 'Complete supplemental essays', done: false },
          { id: `t4_${Date.now()}`, label: 'Request recommendation letters', done: false },
          { id: `t5_${Date.now()}`, label: 'Submit application', done: false },
        ],
      };
      apps.push(newApp);
      localStorage.setItem('admitsonly_applications', JSON.stringify(apps));
      setSavedSchools(prev => { const next = new Set(Array.from(prev)); next.add(college.name.toLowerCase()); return next; });
    } catch {}
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <Head><title>College Match | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Analyzing your profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (needsProfile) {
    return (
      <DashboardLayout>
        <Head><title>College Match | AdmitsOnly</title></Head>
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-primary mb-3">Complete Your Profile First</h2>
          <p className="text-slate-500 mb-6">
            We need your GPA and SAT scores to match you with colleges.
            Add your academic info to unlock personalized school recommendations.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Go to Profile
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>College Match | AdmitsOnly</title></Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">College Match</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personalized school recommendations based on your GPA ({studentStats?.gpa.toFixed(2)}) and SAT ({studentStats?.totalSAT})
          </p>
        </div>

        {/* Tier Summary Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {(['reach', 'match', 'safety'] as MatchTier[]).map(tier => {
            const config = tierConfig[tier];
            const count = tierCounts[tier];
            const isActive = tierFilter === tier;
            return (
              <button
                key={tier}
                onClick={() => setTierFilter(isActive ? '' : tier)}
                className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all text-left ${
                  isActive
                    ? `${config.border} ${config.bg} ring-2 ${config.ring}`
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className={`text-2xl sm:text-3xl font-bold font-display ${config.color}`}>{count}</div>
                <div className={`text-sm font-semibold mt-1 ${isActive ? config.color : 'text-slate-600'}`}>{config.label}</div>
                <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">{config.description}</div>
                {isActive && (
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${config.bg.replace('50', '500')}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search schools, locations, programs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All Types</option>
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>
            {/* Size filter */}
            <select
              value={sizeFilter}
              onChange={e => setSizeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All Sizes</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
            </select>
            {/* Strength filter */}
            <select
              value={strengthFilter}
              onChange={e => setStrengthFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 max-w-[160px]"
            >
              <option value="">All Programs</option>
              {strengths.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* State filter */}
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Clear filters */}
            {(tierFilter || typeFilter || sizeFilter || strengthFilter || stateFilter || searchQuery) && (
              <button
                onClick={() => {
                  setTierFilter('');
                  setTypeFilter('');
                  setSizeFilter('');
                  setStrengthFilter('');
                  setStateFilter('');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No schools match your current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium">{filtered.length} schools found</p>
            {filtered.map(match => {
              const config = tierConfig[match.tier];
              const isSaved = savedSchools.has(match.college.name.toLowerCase());
              const isExpanded = expandedId === match.college.id;

              return (
                <div
                  key={match.college.id}
                  className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden"
                >
                  {/* Main row */}
                  <div
                    className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : match.college.id)}
                  >
                    {/* Tier badge */}
                    <div className={`shrink-0 w-16 sm:w-20 py-1.5 rounded-xl text-center ${config.bg} ${config.border} border`}>
                      <div className={`text-xs font-bold ${config.color}`}>{config.label}</div>
                    </div>

                    {/* School info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-primary truncate">{match.college.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{match.college.location} &middot; {match.college.type} &middot; {match.college.size}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <div className="text-xs text-slate-400">Accept</div>
                        <div className="text-sm font-bold text-primary">{match.college.acceptanceRate}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400">Avg GPA</div>
                        <div className="text-sm font-bold text-primary">{match.college.avgGPA.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400">SAT Range</div>
                        <div className="text-sm font-bold text-primary">{match.college.satRange[0]}-{match.college.satRange[1]}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSaved ? (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); addToTracker(match.college); }}
                          className="text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          + Track
                        </button>
                      )}
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 sm:px-5 py-4 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Fit Analysis */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Fit</h4>
                          <div className="space-y-2">
                            <FitBar label="GPA" value={match.gpaFit} studentVal={studentStats?.gpa.toFixed(2) || '—'} schoolVal={match.college.avgGPA.toFixed(2)} />
                            <FitBar label="SAT" value={match.satFit} studentVal={String(studentStats?.totalSAT || '—')} schoolVal={`${match.college.satRange[0]}-${match.college.satRange[1]}`} />
                          </div>
                        </div>

                        {/* Strengths */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Known For</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {match.college.strengths.map(s => (
                              <span key={s} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">{s}</span>
                            ))}
                          </div>
                        </div>

                        {/* Quick Stats (mobile) */}
                        <div className="sm:hidden">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stats</h4>
                          <div className="flex gap-4 text-sm">
                            <div><span className="text-slate-400">Accept: </span><span className="font-bold text-primary">{match.college.acceptanceRate}%</span></div>
                            <div><span className="text-slate-400">GPA: </span><span className="font-bold text-primary">{match.college.avgGPA.toFixed(2)}</span></div>
                            <div><span className="text-slate-400">SAT: </span><span className="font-bold text-primary">{match.college.satRange[0]}-{match.college.satRange[1]}</span></div>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recommendation</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {match.tier === 'reach' && 'Focus your application on standout essays and strong extracurriculars. Consider applying Early Decision for a competitive edge.'}
                            {match.tier === 'match' && 'You\'re well-positioned for this school. Ensure your essays showcase unique qualities and genuine interest in their specific programs.'}
                            {match.tier === 'safety' && 'Your academics are strong for this school. Still craft a compelling application — demonstrate why this school is a great fit for you.'}
                          </p>
                          {!isSaved && (
                            <button
                              onClick={() => addToTracker(match.college)}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add to Application Tracker
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ──────────────────────── FIT BAR COMPONENT ──────────────────────── */

function FitBar({ label, value, studentVal, schoolVal }: { label: string; value: number; studentVal: string; schoolVal: string }) {
  // value is -1 to 1; 0 = dead center
  const pct = Math.round((value + 1) * 50);
  const barColor = value >= 0.2 ? 'bg-emerald-500' : value >= -0.2 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-400">You: <span className="font-semibold text-primary">{studentVal}</span> &middot; School: {schoolVal}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
        {/* Fill */}
        <div
          className={`absolute top-0 bottom-0 rounded-full transition-all ${barColor}`}
          style={{
            left: pct < 50 ? `${pct}%` : '50%',
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
      </div>
    </div>
  );
}

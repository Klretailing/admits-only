import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { colleges, type College } from '../../lib/colleges';

/* ──────────────────────── TYPES ──────────────────────── */

interface HeatmapTile {
  college: College;
  overallFit: number;
  gpaFit: number;
  satFit: number;
  tier: 'safety' | 'match' | 'reach';
  isSaved: boolean;
}

/* ──────────────────────── SCORING (client-side, mirrors collegeMatch.ts) ──────────────────────── */

function computeMatch(gpa: number, sat: number, college: College): { overallFit: number; gpaFit: number; satFit: number; tier: 'safety' | 'match' | 'reach' } {
  const gpaDiff = gpa - college.avgGPA;
  const gpaFit = Math.max(-1, Math.min(1, gpaDiff / 0.4));

  const [sat25, sat75] = college.satRange;
  const satMid = (sat25 + sat75) / 2;
  const satSpread = (sat75 - sat25) / 2;
  const satDiff = sat - satMid;
  const satFit = Math.max(-1, Math.min(1, satDiff / Math.max(satSpread, 40)));

  const composite = gpaFit * 0.4 + satFit * 0.6;
  const selectivityPenalty = college.acceptanceRate < 10 ? -0.2 : college.acceptanceRate < 20 ? -0.1 : 0;
  const adjusted = composite + selectivityPenalty;

  const tier = adjusted >= 0.25 ? 'safety' : adjusted >= -0.25 ? 'match' : 'reach';
  const overallFit = Math.round(Math.max(0, Math.min(100, 50 + composite * 40 + (100 - college.acceptanceRate) * 0.1)));

  return { overallFit, gpaFit, satFit, tier };
}

/* ──────────────────────── COLOR INTERPOLATION ──────────────────────── */

function getTempColor(fit: number): string {
  const stops = [
    { at: 0, r: 59, g: 130, b: 246 },
    { at: 25, r: 99, g: 102, b: 241 },
    { at: 50, r: 245, g: 158, b: 11 },
    { at: 75, r: 249, g: 115, b: 22 },
    { at: 100, r: 239, g: 68, b: 68 },
  ];
  const clamped = Math.max(0, Math.min(100, fit));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const t = lo.at === hi.at ? 0 : (clamped - lo.at) / (hi.at - lo.at);
  const r = Math.round(lo.r + (hi.r - lo.r) * t);
  const g = Math.round(lo.g + (hi.g - lo.g) * t);
  const b = Math.round(lo.b + (hi.b - lo.b) * t);
  return `rgb(${r},${g},${b})`;
}

function getTempLabel(fit: number): string {
  if (fit >= 75) return 'Hot';
  if (fit >= 50) return 'Warm';
  if (fit >= 30) return 'Cool';
  return 'Cold';
}

/* ──────────────────────── ADVICE GENERATOR ──────────────────────── */

function generateAdvice(tile: HeatmapTile, gpa: number, sat: number): string[] {
  const tips: string[] = [];
  const college = tile.college;
  const [sat25, sat75] = college.satRange;
  const satMid = Math.round((sat25 + sat75) / 2);

  if (tile.tier === 'reach') {
    if (tile.gpaFit < -0.3) {
      const target = Math.min(4.0, college.avgGPA + 0.05).toFixed(2);
      tips.push(`Raise your GPA to ${target}+ to match ${college.name}'s average of ${college.avgGPA.toFixed(2)}.`);
    }
    if (tile.satFit < -0.3) {
      const target = Math.min(1600, satMid + 20);
      tips.push(`Aim for a ${target}+ SAT to be competitive (their median is ~${satMid}).`);
    }
    if (college.acceptanceRate < 10) {
      tips.push('Ultra-selective — strong essays, extracurriculars, and recommendations are critical.');
    }
    tips.push('Consider applying Early Decision/Action to improve your odds.');
  } else if (tile.tier === 'match') {
    tips.push('You\'re competitive here. Focus on standout essays and demonstrated interest.');
    if (tile.satFit < 0) {
      const boost = Math.min(1600, sat + 40);
      tips.push(`Boosting your SAT to ${boost}+ would shift this toward a safety school.`);
    }
    if (tile.gpaFit < 0) {
      tips.push('Strengthening your GPA this semester would improve your position.');
    }
  } else {
    tips.push('Strong academic fit — focus your application on showing genuine interest and fit.');
    tips.push('Consider whether this school\'s culture and programs align with your goals.');
  }

  return tips;
}

/* ──────────────────────── SORT OPTIONS ──────────────────────── */

type SortKey = 'fit-desc' | 'fit-asc' | 'name' | 'acceptance';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'fit-desc', label: 'Hottest First' },
  { key: 'fit-asc', label: 'Coldest First' },
  { key: 'name', label: 'A → Z' },
  { key: 'acceptance', label: 'Most Selective' },
];

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function CollegeHeatmapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [gpa, setGpa] = useState(3.5);
  const [sat, setSat] = useState(1200);
  const [view3d, setView3d] = useState(true);
  const [selectedTile, setSelectedTile] = useState<HeatmapTile | null>(null);
  const [savedSchools, setSavedSchools] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('fit-desc');
  const [filterTier, setFilterTier] = useState<'' | 'safety' | 'match' | 'reach'>('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Load saved schools + profile stats from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      if (stored) {
        const apps = JSON.parse(stored);
        setSavedSchools(new Set(apps.map((a: any) => a.name.toLowerCase())));
      }
    } catch {}

    // Try to load profile stats for initial slider values
    if (status === 'authenticated' && !profileLoaded) {
      fetch('/api/college-match')
        .then(r => r.json())
        .then(data => {
          if (data.studentStats) {
            setGpa(data.studentStats.gpa || 3.5);
            setSat(data.studentStats.totalSAT || 1200);
          }
          setProfileLoaded(true);
        })
        .catch(() => setProfileLoaded(true));
    }
  }, [status, profileLoaded]);

  // Compute tiles
  const tiles = useMemo<HeatmapTile[]>(() => {
    return colleges.map(college => {
      const match = computeMatch(gpa, sat, college);
      return {
        college,
        ...match,
        isSaved: savedSchools.has(college.name.toLowerCase()),
      };
    });
  }, [gpa, sat, savedSchools]);

  // Filter + sort
  const visibleTiles = useMemo(() => {
    let result = [...tiles];
    if (filterTier) result = result.filter(t => t.tier === filterTier);
    if (showSavedOnly) result = result.filter(t => t.isSaved);

    switch (sortKey) {
      case 'fit-desc': result.sort((a, b) => b.overallFit - a.overallFit); break;
      case 'fit-asc': result.sort((a, b) => a.overallFit - b.overallFit); break;
      case 'name': result.sort((a, b) => a.college.name.localeCompare(b.college.name)); break;
      case 'acceptance': result.sort((a, b) => a.college.acceptanceRate - b.college.acceptanceRate); break;
    }
    return result;
  }, [tiles, filterTier, showSavedOnly, sortKey]);

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts = { safety: 0, match: 0, reach: 0 };
    tiles.forEach(t => counts[t.tier]++);
    return counts;
  }, [tiles]);

  // Discovery: high-match schools not on the student's saved list
  const discoveries = useMemo(() => {
    return tiles
      .filter(t => !t.isSaved && t.tier === 'safety')
      .sort((a, b) => b.overallFit - a.overallFit)
      .slice(0, 6);
  }, [tiles]);

  // Add school to tracker
  const addToTracker = useCallback((college: College) => {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      const apps = stored ? JSON.parse(stored) : [];
      if (apps.some((a: any) => a.name.toLowerCase() === college.name.toLowerCase())) return;
      apps.push({
        id: `app_${Date.now()}`,
        name: college.name,
        deadline: '',
        type: 'Regular Decision',
        status: 'researching',
        tasks: [
          { id: `t1_${Date.now()}`, label: 'Research program requirements', done: false },
          { id: `t2_${Date.now()}`, label: 'Write main essay', done: false },
          { id: `t3_${Date.now()}`, label: 'Complete supplemental essays', done: false },
          { id: `t4_${Date.now()}`, label: 'Request recommendation letters', done: false },
          { id: `t5_${Date.now()}`, label: 'Submit application', done: false },
        ],
      });
      localStorage.setItem('admitsonly_applications', JSON.stringify(apps));
      setSavedSchools(prev => { const next = new Set(Array.from(prev)); next.add(college.name.toLowerCase()); return next; });
    } catch {}
  }, []);

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <Head><title>Admissions Map | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading heatmap...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Admissions Map | AdmitsOnly</title></Head>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-primary">Admissions Heatmap</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {tiles.length} colleges mapped &middot; {tierCounts.safety} hot &middot; {tierCounts.match} warm &middot; {tierCounts.reach} cold
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView3d(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!view3d ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Flat
            </button>
            <button
              onClick={() => setView3d(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view3d ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              3D
            </button>
          </div>
        </div>

        {/* What-If Simulator */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h2 className="text-sm font-bold text-primary">What-If Simulator</h2>
            <span className="text-xs text-slate-400 ml-1">Adjust your stats to see how the heatmap changes in real-time</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* GPA Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">GPA</label>
                <span className="text-sm font-bold text-primary tabular-nums">{gpa.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="4.0"
                step="0.01"
                value={gpa}
                onChange={e => setGpa(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${((gpa - 2) / 2) * 100}%, #e2e8f0 ${((gpa - 2) / 2) * 100}%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>2.0</span><span>3.0</span><span>4.0</span>
              </div>
            </div>
            {/* SAT Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">SAT</label>
                <span className="text-sm font-bold text-primary tabular-nums">{sat}</span>
              </div>
              <input
                type="range"
                min="800"
                max="1600"
                step="10"
                value={sat}
                onChange={e => setSat(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${((sat - 800) / 800) * 100}%, #e2e8f0 ${((sat - 800) / 800) * 100}%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>800</span><span>1200</span><span>1600</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Temperature legend */}
          <div className="flex items-center gap-2 mr-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTempColor(0) }} />
              <span className="text-[10px] text-slate-400">Cold</span>
            </div>
            <div className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(99,102,241), rgb(245,158,11), rgb(249,115,22), rgb(239,68,68))' }} />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTempColor(100) }} />
              <span className="text-[10px] text-slate-400">Hot</span>
            </div>
          </div>

          {/* Tier filters */}
          {(['', 'safety', 'match', 'reach'] as const).map(tier => (
            <button
              key={tier || 'all'}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTier === tier
                  ? 'bg-accent text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tier === '' ? `All (${tiles.length})` : tier === 'safety' ? `Hot (${tierCounts.safety})` : tier === 'match' ? `Warm (${tierCounts.match})` : `Cold (${tierCounts.reach})`}
            </button>
          ))}

          {/* Saved only toggle */}
          {savedSchools.size > 0 && (
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showSavedOnly ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              My List ({savedSchools.size})
            </button>
          )}

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {sortOptions.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 3D Heatmap Grid */}
        <div
          className="overflow-visible"
          style={view3d ? { perspective: '1200px' } : undefined}
        >
          <div
            className="transition-transform duration-500"
            style={view3d ? { transform: 'rotateX(14deg) rotateY(-2deg)', transformStyle: 'preserve-3d' } : undefined}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {visibleTiles.map((tile, i) => {
                const color = getTempColor(tile.overallFit);
                const elevation = view3d ? tile.overallFit * 0.6 : 0;
                return (
                  <button
                    key={tile.college.id}
                    onClick={() => setSelectedTile(tile)}
                    className="relative group text-left rounded-xl border border-white/20 overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    style={{
                      backgroundColor: color,
                      transform: view3d ? `translateZ(${elevation}px)` : undefined,
                      boxShadow: view3d
                        ? `0 ${Math.round(elevation * 0.3)}px ${Math.round(elevation * 0.6)}px rgba(0,0,0,0.15)`
                        : '0 1px 3px rgba(0,0,0,0.08)',
                      animationDelay: `${i * 20}ms`,
                    }}
                  >
                    <div className="p-3 min-h-[90px] flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-white leading-tight truncate drop-shadow-sm">
                          {tile.college.name}
                        </p>
                        <p className="text-[9px] text-white/70 mt-0.5 truncate">
                          {tile.college.location}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <div className="text-lg font-bold text-white drop-shadow-sm tabular-nums">
                            {tile.overallFit}
                          </div>
                          <div className="text-[9px] text-white/60 font-medium uppercase tracking-wide">
                            {getTempLabel(tile.overallFit)}
                          </div>
                        </div>
                        {tile.isSaved && (
                          <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Hover shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {visibleTiles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-sm text-slate-500">No schools match your current filters.</p>
            <button onClick={() => { setFilterTier(''); setShowSavedOnly(false); }} className="text-xs text-accent font-semibold mt-2 hover:underline">
              Clear filters
            </button>
          </div>
        )}

        {/* Discovery Section */}
        {discoveries.length > 0 && !showSavedOnly && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Discover Hot Schools</h2>
                <p className="text-xs text-slate-400">High-match schools not on your list yet</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoveries.map(tile => (
                <div
                  key={tile.college.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                  onClick={() => setSelectedTile(tile)}
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: getTempColor(tile.overallFit) }}
                  >
                    {tile.overallFit}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{tile.college.name}</p>
                    <p className="text-xs text-slate-400">{tile.college.acceptanceRate}% accept &middot; {tile.college.satRange[0]}-{tile.college.satRange[1]} SAT</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); addToTracker(tile.college); }}
                    className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTile(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-up">
            {/* Modal header with temperature bar */}
            <div className="p-5 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: getTempColor(selectedTile.overallFit) }}
                  >
                    {selectedTile.overallFit}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-display text-primary">{selectedTile.college.name}</h2>
                    <p className="text-xs text-slate-400">{selectedTile.college.location} &middot; {selectedTile.college.type} &middot; {selectedTile.college.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Temperature gauge */}
              <div className="mt-4 mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Admissions Temperature</span>
                  <span className="font-bold" style={{ color: getTempColor(selectedTile.overallFit) }}>
                    {getTempLabel(selectedTile.overallFit)}
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(99,102,241), rgb(245,158,11), rgb(249,115,22), rgb(239,68,68))' }}>
                  <div className="relative h-full">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all"
                      style={{ left: `calc(${selectedTile.overallFit}% - 8px)`, borderColor: getTempColor(selectedTile.overallFit) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 p-5">
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.acceptanceRate}%</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Accept Rate</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.avgGPA.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avg GPA</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.satRange[0]}-{selectedTile.college.satRange[1]}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">SAT Range</div>
              </div>
            </div>

            {/* Fit breakdown */}
            <div className="px-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Fit Breakdown</h3>
              <FitBar label="GPA" value={selectedTile.gpaFit} yours={gpa.toFixed(2)} theirs={selectedTile.college.avgGPA.toFixed(2)} />
              <FitBar label="SAT" value={selectedTile.satFit} yours={String(sat)} theirs={`${selectedTile.college.satRange[0]}-${selectedTile.college.satRange[1]}`} />
            </div>

            {/* Strengths */}
            <div className="px-5 mt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Known For</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedTile.college.strengths.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-accent/5 border border-accent/10 text-accent font-medium">{s}</span>
                ))}
              </div>
            </div>

            {/* Actionable advice */}
            <div className="px-5 mt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {selectedTile.tier === 'reach' ? 'How to Improve Your Chances' : selectedTile.tier === 'match' ? 'Strategy Tips' : 'Why This Is a Great Fit'}
              </h3>
              <div className="space-y-2">
                {generateAdvice(selectedTile, gpa, sat).map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      selectedTile.tier === 'reach' ? 'bg-blue-50 text-blue-600' :
                      selectedTile.tier === 'match' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar hot-zone suggestions */}
            {selectedTile.tier === 'reach' && (
              <SimilarHotSchools
                currentCollege={selectedTile.college}
                tiles={tiles}
                onSelect={setSelectedTile}
                onAdd={addToTracker}
              />
            )}

            {/* Action footer */}
            <div className="p-5 mt-2 border-t border-slate-100 flex items-center gap-3">
              {selectedTile.isSaved ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  On Your List
                </span>
              ) : (
                <button
                  onClick={() => addToTracker(selectedTile.college)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Tracker
                </button>
              )}
              <Link
                href="/dashboard/college-match"
                className="text-xs font-semibold text-accent hover:underline ml-auto"
              >
                View in College Match &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ──────────────────────── FIT BAR ──────────────────────── */

function FitBar({ label, value, yours, theirs }: { label: string; value: number; yours: string; theirs: string }) {
  const pct = Math.round((value + 1) * 50);
  const barColor = value >= 0.2 ? 'bg-emerald-500' : value >= -0.2 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-400">
          You: <span className="font-semibold text-primary">{yours}</span> &middot; Them: {theirs}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
        <div
          className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{
            left: pct < 50 ? `${pct}%` : '50%',
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────── SIMILAR HOT SCHOOLS ──────────────────────── */

function SimilarHotSchools({
  currentCollege,
  tiles,
  onSelect,
  onAdd,
}: {
  currentCollege: College;
  tiles: HeatmapTile[];
  onSelect: (t: HeatmapTile) => void;
  onAdd: (c: College) => void;
}) {
  const similar = useMemo(() => {
    const currentStrengths = new Set(currentCollege.strengths.map(s => s.toLowerCase().replace(/\s*\(.*\)/, '')));
    return tiles
      .filter(t => t.college.id !== currentCollege.id && (t.tier === 'safety' || t.tier === 'match'))
      .map(t => {
        const overlap = t.college.strengths.filter(s =>
          currentStrengths.has(s.toLowerCase().replace(/\s*\(.*\)/, ''))
        ).length;
        return { ...t, overlap };
      })
      .filter(t => t.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.overallFit - a.overallFit)
      .slice(0, 4);
  }, [currentCollege, tiles]);

  if (similar.length === 0) return null;

  return (
    <div className="px-5 mt-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        Similar Schools in the Hot Zone
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Strong matches with similar programs to {currentCollege.name}
      </p>
      <div className="space-y-2">
        {similar.map(s => (
          <div
            key={s.college.id}
            className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-accent/20 hover:bg-accent/5 transition-all cursor-pointer"
            onClick={() => onSelect(s)}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: getTempColor(s.overallFit) }}
            >
              {s.overallFit}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{s.college.name}</p>
              <p className="text-[10px] text-slate-400">
                {s.overlap} shared program{s.overlap > 1 ? 's' : ''} &middot; {s.college.acceptanceRate}% accept
              </p>
            </div>
            {!s.isSaved && (
              <button
                onClick={e => { e.stopPropagation(); onAdd(s.college); }}
                className="shrink-0 text-[10px] font-semibold text-accent hover:underline"
              >
                + Add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

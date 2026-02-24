import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

/* ──────────────────────── TYPES ──────────────────────── */

interface Extracurricular {
  id: string;
  name: string;
  role: string;
  description: string;
  years: number;
  hoursPerWeek: number;
  category: string;
}

interface ProfileData {
  gpa: string;
  gpaScale: '4.0' | '5.0';
  satMath: string;
  satRW: string;
  extracurriculars: Extracurricular[];
}

/* ──────────────────────── SCORING ENGINE ──────────────────────── */

const comparativeData = [
  { gpa: 3.2, sat: 1050, score: 42 }, { gpa: 3.4, sat: 1100, score: 48 },
  { gpa: 3.0, sat: 1020, score: 38 }, { gpa: 3.6, sat: 1200, score: 58 },
  { gpa: 3.5, sat: 1150, score: 52 }, { gpa: 3.8, sat: 1280, score: 65 },
  { gpa: 3.7, sat: 1250, score: 62 }, { gpa: 3.9, sat: 1350, score: 72 },
  { gpa: 4.0, sat: 1400, score: 78 }, { gpa: 3.3, sat: 1080, score: 45 },
  { gpa: 3.1, sat: 1060, score: 40 }, { gpa: 4.0, sat: 1520, score: 92 },
  { gpa: 3.9, sat: 1480, score: 88 }, { gpa: 3.8, sat: 1450, score: 85 },
  { gpa: 3.7, sat: 1380, score: 76 }, { gpa: 4.0, sat: 1560, score: 95 },
  { gpa: 3.6, sat: 1320, score: 70 }, { gpa: 3.5, sat: 1280, score: 64 },
  { gpa: 3.4, sat: 1220, score: 56 }, { gpa: 3.3, sat: 1180, score: 50 },
  { gpa: 3.2, sat: 1120, score: 46 }, { gpa: 4.0, sat: 1490, score: 90 },
  { gpa: 3.9, sat: 1420, score: 82 }, { gpa: 3.8, sat: 1380, score: 75 },
  { gpa: 3.6, sat: 1300, score: 68 }, { gpa: 3.5, sat: 1240, score: 60 },
  { gpa: 3.7, sat: 1340, score: 72 }, { gpa: 4.0, sat: 1540, score: 94 },
  { gpa: 3.8, sat: 1400, score: 80 }, { gpa: 3.4, sat: 1160, score: 54 },
];

function evaluateExtracurriculars(ecs: Extracurricular[]): { score: number; feedback: string } {
  if (ecs.length === 0) return { score: 0, feedback: 'Add your extracurriculars to receive an assessment.' };

  let score = 0;
  const factors: string[] = [];

  const leadershipKeywords = ['president', 'founder', 'captain', 'leader', 'chair', 'director', 'head', 'editor', 'chief'];
  const leadershipCount = ecs.filter((ec) =>
    leadershipKeywords.some((k) => ec.role.toLowerCase().includes(k) || ec.name.toLowerCase().includes(k))
  ).length;
  score += Math.min(leadershipCount * 8, 24);
  if (leadershipCount >= 2) factors.push('Strong leadership presence');
  else if (leadershipCount === 0) factors.push('Consider pursuing leadership roles');

  const categories = new Set(ecs.map((ec) => ec.category));
  score += Math.min(categories.size * 5, 20);
  if (categories.size >= 3) factors.push('Well-rounded across categories');

  const avgYears = ecs.reduce((sum, ec) => sum + ec.years, 0) / ecs.length;
  const avgHours = ecs.reduce((sum, ec) => sum + ec.hoursPerWeek, 0) / ecs.length;
  score += Math.min(avgYears * 4, 16);
  score += Math.min(avgHours * 1.5, 15);
  if (avgYears >= 3) factors.push('Deep commitment shown');
  if (avgHours >= 8) factors.push('Significant time investment');

  const impactKeywords = ['community', 'national', 'state', 'award', 'published', 'research', 'raised', 'organized', 'created', 'launched', 'served', 'mentored'];
  const impactCount = ecs.filter((ec) =>
    impactKeywords.some((k) => ec.description.toLowerCase().includes(k))
  ).length;
  score += Math.min(impactCount * 5, 25);
  if (impactCount >= 2) factors.push('Demonstrated measurable impact');

  score = Math.min(Math.round(score), 100);
  const feedback = factors.length > 0 ? factors.join(' | ') : 'Keep building your profile with meaningful activities.';
  return { score, feedback };
}

function computeHolisticScore(profile: ProfileData) {
  const gpa = parseFloat(profile.gpa) || 0;
  const normalizedGpa = profile.gpaScale === '5.0' ? (gpa / 5) * 4 : gpa;
  const satMath = parseInt(profile.satMath) || 0;
  const satRW = parseInt(profile.satRW) || 0;
  const totalSAT = satMath + satRW;

  const gpaScore = Math.min((normalizedGpa / 4.0) * 100, 100);
  const satScore = Math.min(((totalSAT - 400) / 1200) * 100, 100);
  const ecEval = evaluateExtracurriculars(profile.extracurriculars);
  const holistic = Math.round(gpaScore * 0.35 + satScore * 0.30 + ecEval.score * 0.35);
  const betterThan = comparativeData.filter((d) => holistic > d.score).length;
  const percentile = Math.round((betterThan / comparativeData.length) * 100);

  return { holistic, percentile, gpaScore: Math.round(gpaScore), satScore: Math.round(satScore), ecScore: ecEval.score, ecFeedback: ecEval.feedback, totalSAT, normalizedGpa };
}

/* ──────────────────────── MODERN SCATTERPLOT ──────────────────────── */

function Scatterplot({ userGpa, userSat }: { userGpa: number; userSat: number }) {
  const W = 520, H = 360;
  const PAD = { top: 24, right: 34, bottom: 50, left: 58 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xMin = 2.5, xMax = 4.2;
  const yMin = 800, yMax = 1600;

  const toX = (gpa: number) => PAD.left + ((gpa - xMin) / (xMax - xMin)) * plotW;
  const toY = (sat: number) => PAD.top + plotH - ((sat - yMin) / (yMax - yMin)) * plotH;

  const hasUser = userGpa > 0 && userSat > 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[540px]">
      <defs>
        {/* Gradient backgrounds for zones */}
        <linearGradient id="zone-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fee2e2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fecaca" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="zone-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="zone-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.3" />
        </linearGradient>
        {/* Glow for user dot */}
        <radialGradient id="user-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#6366f1" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        {/* Shadow filter */}
        <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.3" />
        </filter>
        <filter id="zone-shadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.06" />
        </filter>
        {/* Comparative dot gradient */}
        <radialGradient id="comp-dot" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </radialGradient>
        {/* User dot gradient */}
        <radialGradient id="user-dot-grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width={W} height={H} rx="16" fill="white" />

      {/* Zone: Needs Improvement */}
      <rect
        x={toX(xMin)} y={toY(1150)}
        width={toX(3.3) - toX(xMin)} height={toY(yMin) - toY(1150)}
        fill="url(#zone-red)" rx="8" filter="url(#zone-shadow)"
      />
      <text x={toX(xMin) + 8} y={toY(1150) + 16} className="text-[9px] font-bold" fill="#dc2626" opacity="0.7">
        Needs Improvement
      </text>

      {/* Zone: Developing */}
      <rect
        x={toX(3.3)} y={toY(1350)}
        width={toX(3.7) - toX(3.3)} height={toY(1150) - toY(1350)}
        fill="url(#zone-amber)" rx="8" filter="url(#zone-shadow)"
      />
      <text x={toX(3.3) + 8} y={toY(1350) + 16} className="text-[9px] font-bold" fill="#d97706" opacity="0.7">
        Developing
      </text>

      {/* Zone: Competitive */}
      <rect
        x={toX(3.7)} y={toY(yMax)}
        width={toX(xMax) - toX(3.7)} height={toY(1350) - toY(yMax)}
        fill="url(#zone-green)" rx="8" filter="url(#zone-shadow)"
      />
      <text x={toX(3.7) + 8} y={toY(yMax) + 16} className="text-[9px] font-bold" fill="#059669" opacity="0.7">
        Competitive
      </text>

      {/* Grid lines */}
      {[3.0, 3.5, 4.0].map((g) => (
        <line key={`gx-${g}`} x1={toX(g)} y1={PAD.top} x2={toX(g)} y2={PAD.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}
      {[1000, 1200, 1400].map((s) => (
        <line key={`gy-${s}`} x1={PAD.left} y1={toY(s)} x2={PAD.left + plotW} y2={toY(s)} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />

      {/* X axis labels */}
      {[2.5, 3.0, 3.5, 4.0].map((g) => (
        <text key={`xl-${g}`} x={toX(g)} y={PAD.top + plotH + 20} textAnchor="middle" className="text-[10px] font-medium" fill="#94a3b8">{g.toFixed(1)}</text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" className="text-[11px] font-bold" fill="#6366f1">GPA</text>

      {/* Y axis labels */}
      {[800, 1000, 1200, 1400, 1600].map((s) => (
        <text key={`yl-${s}`} x={PAD.left - 10} y={toY(s) + 4} textAnchor="end" className="text-[10px] font-medium" fill="#94a3b8">{s}</text>
      ))}
      <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" className="text-[11px] font-bold" fill="#6366f1" transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>SAT Score</text>

      {/* Comparative dots with 3D effect */}
      {comparativeData.map((d, i) => (
        <g key={i}>
          <circle cx={toX(d.gpa)} cy={toY(d.sat)} r="5" fill="url(#comp-dot)" opacity="0.6" />
          <circle cx={toX(d.gpa)} cy={toY(d.sat)} r="5" fill="none" stroke="#818cf8" strokeWidth="0.5" opacity="0.3" />
        </g>
      ))}

      {/* User dot with glow + 3D */}
      {hasUser && (
        <g>
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="20" fill="url(#user-glow)" />
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="8" fill="url(#user-dot-grad)" filter="url(#dot-shadow)" />
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="8" fill="none" stroke="white" strokeWidth="2.5" />
          <circle cx={toX(userGpa) - 2} cy={toY(userSat) - 2} r="2" fill="white" opacity="0.5" />
          <text x={toX(userGpa) + 14} y={toY(userSat) + 4} className="text-[11px] font-extrabold" fill="#4f46e5">You</text>
        </g>
      )}

      {/* Modern Legend */}
      <g transform={`translate(${PAD.left + plotW - 140}, ${PAD.top + 4})`}>
        <rect x="0" y="0" width="138" height="58" rx="10" fill="white" stroke="#e2e8f0" filter="url(#zone-shadow)" />
        <circle cx="14" cy="14" r="5" fill="#a7f3d0" stroke="#059669" strokeWidth="1" />
        <text x="26" y="18" className="text-[9px] font-semibold" fill="#374151">Competitive</text>
        <circle cx="14" cy="30" r="5" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
        <text x="26" y="34" className="text-[9px] font-semibold" fill="#374151">Developing</text>
        <circle cx="14" cy="46" r="5" fill="#fecaca" stroke="#dc2626" strokeWidth="1" />
        <text x="26" y="50" className="text-[9px] font-semibold" fill="#374151">Needs Improvement</text>
      </g>
    </svg>
  );
}

/* ──────────────────────── SCORE RING ──────────────────────── */

function ScoreRing({ score, label, size = 100, color = '#6366f1' }: { score: number; label: string; size?: number; color?: string }) {
  const r = (size - 12) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            className="transition-all duration-1000"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold font-display text-primary">{score}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 text-center">{label}</p>
    </div>
  );
}

/* ──────────────────────── EC CATEGORIES ──────────────────────── */

const ecCategories = [
  'Athletics', 'Arts & Music', 'STEM / Research', 'Community Service',
  'Leadership / Government', 'Clubs & Organizations', 'Work / Internship', 'Other',
];

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function StudentProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [profile, setProfile] = useState<ProfileData>({
    gpa: '',
    gpaScale: '4.0',
    satMath: '',
    satRW: '',
    extracurriculars: [],
  });

  const [showAddEC, setShowAddEC] = useState(false);
  const [newEC, setNewEC] = useState<Omit<Extracurricular, 'id'>>({
    name: '', role: '', description: '', years: 1, hoursPerWeek: 3, category: 'Clubs & Organizations',
  });

  const [scored, setScored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load profile from DB on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const p = data.profile;
          setProfile({
            gpa: p.gpa != null ? p.gpa.toString() : '',
            gpaScale: (p.gpaScale as '4.0' | '5.0') || '4.0',
            satMath: p.satMath != null ? p.satMath.toString() : '',
            satRW: p.satRW != null ? p.satRW.toString() : '',
            extracurriculars: (p.extracurriculars as Extracurricular[]) || [],
          });
          if (p.holisticScore != null) setScored(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [status]);

  const results = useMemo(() => computeHolisticScore(profile), [profile]);

  // Save profile to DB
  const saveProfile = useCallback(async (showScore: boolean) => {
    setSaving(true);
    const res = computeHolisticScore(profile);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpa: profile.gpa || null,
          gpaScale: profile.gpaScale,
          satMath: profile.satMath || null,
          satRW: profile.satRW || null,
          extracurriculars: profile.extracurriculars,
          holisticScore: showScore ? res.holistic : null,
          percentile: showScore ? res.percentile : null,
          gpaScore: showScore ? res.gpaScore : null,
          satScore: showScore ? res.satScore : null,
          ecScore: showScore ? res.ecScore : null,
        }),
      });
    } catch (e) {
      // silently fail for now
    }
    setSaving(false);
  }, [profile]);

  const addExtracurricular = () => {
    if (!newEC.name.trim()) return;
    setProfile((prev) => ({
      ...prev,
      extracurriculars: [...prev.extracurriculars, { ...newEC, id: `ec_${Date.now()}` }],
    }));
    setNewEC({ name: '', role: '', description: '', years: 1, hoursPerWeek: 3, category: 'Clubs & Organizations' });
    setShowAddEC(false);
  };

  const removeEC = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter((ec) => ec.id !== id),
    }));
  };

  // Auto-save when profile changes (debounced)
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      saveProfile(scored);
    }, 1500);
    return () => clearTimeout(timer);
  }, [profile, scored, loaded, saveProfile]);

  if (status !== 'authenticated') return null;

  const totalSAT = (parseInt(profile.satMath) || 0) + (parseInt(profile.satRW) || 0);

  return (
    <DashboardLayout>
      <Head><title>My Profile | AdmitsOnly Dashboard</title></Head>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">My Profile</h1>
            <p className="mt-1 text-slate-500">Enter your stats and extracurriculars to see your holistic admissions evaluation.</p>
          </div>
          {saving && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* ─── INPUT COLUMN ─── */}
          <div className="space-y-6">
            {/* Academic Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold font-display text-primary mb-5">Academic Stats</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">GPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={profile.gpaScale === '5.0' ? '5.0' : '4.0'}
                      value={profile.gpa}
                      onChange={(e) => setProfile({ ...profile, gpa: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      placeholder="e.g. 3.85"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">Scale</label>
                    <select
                      value={profile.gpaScale}
                      onChange={(e) => setProfile({ ...profile, gpaScale: e.target.value as '4.0' | '5.0' })}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                      <option value="4.0">/ 4.0</option>
                      <option value="5.0">/ 5.0</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">SAT Scores</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        min="200"
                        max="800"
                        value={profile.satMath}
                        onChange={(e) => setProfile({ ...profile, satMath: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        placeholder="Math (200-800)"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Math</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="200"
                        max="800"
                        value={profile.satRW}
                        onChange={(e) => setProfile({ ...profile, satRW: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        placeholder="R&W (200-800)"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Reading & Writing</p>
                    </div>
                  </div>
                  {totalSAT > 0 && (
                    <p className="text-xs text-accent font-semibold mt-2">Total: {totalSAT} / 1600</p>
                  )}
                </div>
              </div>
            </div>

            {/* Extracurriculars */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold font-display text-primary">Extracurriculars</h3>
                <button
                  onClick={() => setShowAddEC(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  + Add Activity
                </button>
              </div>

              {profile.extracurriculars.length === 0 && !showAddEC && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Add your activities, clubs, sports, and volunteer work.</p>
                  <p className="text-xs text-slate-400 mt-1">These are factored into your holistic evaluation.</p>
                </div>
              )}

              <div className="space-y-3">
                {profile.extracurriculars.map((ec) => (
                  <div key={ec.id} className="p-4 rounded-xl bg-surface border border-slate-100 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-primary">{ec.name}</p>
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-semibold rounded-md">{ec.category}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{ec.role}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ec.description}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{ec.years} yr{ec.years !== 1 ? 's' : ''} &middot; {ec.hoursPerWeek} hrs/wk</p>
                      </div>
                      <button onClick={() => removeEC(ec.id)} className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddEC && (
                <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newEC.name}
                      onChange={(e) => setNewEC({ ...newEC, name: e.target.value })}
                      placeholder="Activity name"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <input
                      type="text"
                      value={newEC.role}
                      onChange={(e) => setNewEC({ ...newEC, role: e.target.value })}
                      placeholder="Your role (e.g. President)"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <textarea
                    value={newEC.description}
                    onChange={(e) => setNewEC({ ...newEC, description: e.target.value })}
                    placeholder="Describe your involvement and impact..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={newEC.category}
                      onChange={(e) => setNewEC({ ...newEC, category: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      {ecCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={newEC.years}
                        onChange={(e) => setNewEC({ ...newEC, years: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Years</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={newEC.hoursPerWeek}
                        onChange={(e) => setNewEC({ ...newEC, hoursPerWeek: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Hrs/week</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddEC(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={addExtracurricular} className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors">Add Activity</button>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluate button */}
            <button
              onClick={() => {
                setScored(true);
                saveProfile(true);
              }}
              disabled={!profile.gpa && !profile.satMath}
              className="btn-primary w-full text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Evaluate My Profile
            </button>
          </div>

          {/* ─── RESULTS COLUMN ─── */}
          <div className="space-y-6">
            {!scored ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold font-display text-primary">Your Evaluation Awaits</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  Fill in your GPA, SAT scores, and extracurriculars, then click &ldquo;Evaluate My Profile&rdquo; to see your holistic score and ranking.
                </p>
              </div>
            ) : (
              <>
                {/* Holistic Score */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-bold font-display text-primary mb-5">Holistic Evaluation</h3>
                  <div className="flex items-center justify-around gap-4">
                    <ScoreRing score={results.holistic} label="Overall Score" size={110} />
                    <ScoreRing score={results.percentile} label="Percentile" size={110} color="#10b981" />
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-surface border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</p>
                    <div className="space-y-3">
                      {[
                        { label: 'GPA', score: results.gpaScore, weight: '35%', color: 'bg-accent' },
                        { label: 'SAT', score: results.satScore, weight: '30%', color: 'bg-purple-500' },
                        { label: 'Extracurriculars', score: results.ecScore, weight: '35%', color: 'bg-emerald-500' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-primary">{item.label} <span className="text-slate-400 text-xs">({item.weight})</span></span>
                            <span className="font-bold text-primary">{item.score}/100</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent/5 to-purple-50 border border-accent/10">
                    <p className="text-sm font-semibold text-primary">
                      You&apos;re in the <span className="text-accent">{results.percentile}th percentile</span> compared to {comparativeData.length} students on the platform.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {results.percentile >= 80 ? 'Excellent position for top-tier universities.' :
                       results.percentile >= 60 ? 'Strong profile with room for strategic improvement.' :
                       results.percentile >= 40 ? 'Solid foundation — focus on extracurriculars and test prep.' :
                       'Great starting point. Let\'s build a plan to boost your profile.'}
                    </p>
                  </div>

                  {results.ecFeedback && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">AI Extracurricular Assessment</p>
                      <p className="text-sm text-emerald-800">{results.ecFeedback}</p>
                    </div>
                  )}
                </div>

                {/* Scatterplot */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-bold font-display text-primary mb-1">Where You Stand</h3>
                  <p className="text-xs text-slate-400 mb-4">Your position vs. other AdmitsOnly students. Color zones show competitiveness.</p>
                  <Scatterplot
                    userGpa={results.normalizedGpa}
                    userSat={results.totalSAT}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

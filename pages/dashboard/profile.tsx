import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
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

// Simulated comparative dataset (anonymized aggregate of 2,847 students)
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

  // Depth: leadership roles
  const leadershipKeywords = ['president', 'founder', 'captain', 'leader', 'chair', 'director', 'head', 'editor', 'chief'];
  const leadershipCount = ecs.filter((ec) =>
    leadershipKeywords.some((k) => ec.role.toLowerCase().includes(k) || ec.name.toLowerCase().includes(k))
  ).length;
  score += Math.min(leadershipCount * 8, 24);
  if (leadershipCount >= 2) factors.push('Strong leadership presence');
  else if (leadershipCount === 0) factors.push('Consider pursuing leadership roles');

  // Breadth: unique categories
  const categories = new Set(ecs.map((ec) => ec.category));
  score += Math.min(categories.size * 5, 20);
  if (categories.size >= 3) factors.push('Well-rounded across categories');

  // Commitment: years and hours
  const avgYears = ecs.reduce((sum, ec) => sum + ec.years, 0) / ecs.length;
  const avgHours = ecs.reduce((sum, ec) => sum + ec.hoursPerWeek, 0) / ecs.length;
  score += Math.min(avgYears * 4, 16);
  score += Math.min(avgHours * 1.5, 15);
  if (avgYears >= 3) factors.push('Deep commitment shown');
  if (avgHours >= 8) factors.push('Significant time investment');

  // Impact keywords in descriptions
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

  // Academic score (0-100)
  const gpaScore = Math.min((normalizedGpa / 4.0) * 100, 100);
  const satScore = Math.min(((totalSAT - 400) / 1200) * 100, 100);

  // Extracurricular score
  const ecEval = evaluateExtracurriculars(profile.extracurriculars);

  // Holistic: 35% GPA, 30% SAT, 35% Extracurriculars
  const holistic = Math.round(gpaScore * 0.35 + satScore * 0.30 + ecEval.score * 0.35);

  // Percentile: compare against dataset
  const betterThan = comparativeData.filter((d) => holistic > d.score).length;
  const percentile = Math.round((betterThan / comparativeData.length) * 100);

  return { holistic, percentile, gpaScore: Math.round(gpaScore), satScore: Math.round(satScore), ecScore: ecEval.score, ecFeedback: ecEval.feedback, totalSAT, normalizedGpa };
}

/* ──────────────────────── SCATTERPLOT ──────────────────────── */

function Scatterplot({ userGpa, userSat }: { userGpa: number; userSat: number }) {
  const W = 500, H = 340;
  const PAD = { top: 20, right: 30, bottom: 45, left: 55 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xMin = 2.5, xMax = 4.2;
  const yMin = 800, yMax = 1600;

  const toX = (gpa: number) => PAD.left + ((gpa - xMin) / (xMax - xMin)) * plotW;
  const toY = (sat: number) => PAD.top + plotH - ((sat - yMin) / (yMax - yMin)) * plotH;

  // Zone boundaries
  const zones = [
    { label: 'Needs Improvement', xStart: xMin, xEnd: 3.3, yStart: yMin, yEnd: 1150, color: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    { label: 'Developing', xStart: 3.3, xEnd: 3.7, yStart: 1150, yEnd: 1350, color: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Competitive', xStart: 3.7, xEnd: xMax, yStart: 1350, yEnd: yMax, color: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  ];

  const hasUser = userGpa > 0 && userSat > 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]">
      {/* Background zones */}
      {zones.map((z) => (
        <g key={z.label}>
          <rect
            x={toX(z.xStart)} y={toY(z.yEnd)}
            width={toX(z.xEnd) - toX(z.xStart)} height={toY(z.yStart) - toY(z.yEnd)}
            fill={z.color} stroke={z.border} strokeWidth="1" strokeDasharray="4 2" rx="4"
          />
          <text
            x={toX(z.xStart) + 6} y={toY(z.yEnd) + 14}
            className="text-[9px] font-semibold" fill={z.border.replace('0.2', '0.7')}
          >
            {z.label}
          </text>
        </g>
      ))}

      {/* Grid lines */}
      {[3.0, 3.5, 4.0].map((g) => (
        <line key={`gx-${g}`} x1={toX(g)} y1={PAD.top} x2={toX(g)} y2={PAD.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {[1000, 1200, 1400].map((s) => (
        <line key={`gy-${s}`} x1={PAD.left} y1={toY(s)} x2={PAD.left + plotW} y2={toY(s)} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#94a3b8" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#94a3b8" strokeWidth="1" />

      {/* X axis labels */}
      {[2.5, 3.0, 3.5, 4.0].map((g) => (
        <text key={`xl-${g}`} x={toX(g)} y={PAD.top + plotH + 18} textAnchor="middle" className="text-[10px]" fill="#94a3b8">{g.toFixed(1)}</text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 5} textAnchor="middle" className="text-[11px] font-semibold" fill="#64748b">GPA</text>

      {/* Y axis labels */}
      {[800, 1000, 1200, 1400, 1600].map((s) => (
        <text key={`yl-${s}`} x={PAD.left - 8} y={toY(s) + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">{s}</text>
      ))}
      <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" className="text-[11px] font-semibold" fill="#64748b" transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>SAT Score</text>

      {/* Comparative dots */}
      {comparativeData.map((d, i) => (
        <circle key={i} cx={toX(d.gpa)} cy={toY(d.sat)} r="4" fill="#94a3b8" opacity="0.3" />
      ))}

      {/* User dot */}
      {hasUser && (
        <g>
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="10" fill="rgba(99,102,241,0.15)" />
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="6" fill="#6366f1" stroke="white" strokeWidth="2" />
          <text x={toX(userGpa) + 12} y={toY(userSat) + 4} className="text-[10px] font-bold" fill="#6366f1">You</text>
        </g>
      )}

      {/* Legend */}
      <g transform={`translate(${PAD.left + plotW - 130}, ${PAD.top + 5})`}>
        <rect x="0" y="0" width="130" height="52" rx="6" fill="white" stroke="#e2e8f0" />
        <circle cx="12" cy="12" r="4" fill="rgba(34,197,94,0.5)" />
        <text x="22" y="15" className="text-[9px]" fill="#64748b">Competitive</text>
        <circle cx="12" cy="26" r="4" fill="rgba(245,158,11,0.5)" />
        <text x="22" y="29" className="text-[9px]" fill="#64748b">Developing</text>
        <circle cx="12" cy="40" r="4" fill="rgba(239,68,68,0.5)" />
        <text x="22" y="43" className="text-[9px]" fill="#64748b">Needs Improvement</text>
      </g>
    </svg>
  );
}

/* ──────────────────────── SCORE RING ──────────────────────── */

function ScoreRing({ score, label, size = 100, color = '#6366f1' }: { score: number; label: string; size?: number; color?: string }) {
  const r = (size - 10) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-extrabold font-display text-primary">{score}</span>
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

  const results = useMemo(() => computeHolisticScore(profile), [profile]);

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

  if (status !== 'authenticated') return null;

  const totalSAT = (parseInt(profile.satMath) || 0) + (parseInt(profile.satRW) || 0);

  return (
    <DashboardLayout>
      <Head><title>My Profile | AdmitsOnly Dashboard</title></Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">My Profile</h1>
          <p className="mt-1 text-slate-500">Enter your stats and extracurriculars to see your holistic admissions evaluation.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* ─── INPUT COLUMN ─── */}
          <div className="space-y-6">
            {/* Academic Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold font-display text-primary mb-5">Academic Stats</h3>

              {/* GPA */}
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

                {/* SAT */}
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
                        placeholder="Math (200–800)"
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
                        placeholder="R&W (200–800)"
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

              {/* EC list */}
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

              {/* Add EC form */}
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
              onClick={() => setScored(true)}
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
                    <div className="relative">
                      <ScoreRing score={results.holistic} label="Overall Score" size={110} />
                    </div>
                    <div className="relative">
                      <ScoreRing score={results.percentile} label="Percentile" size={110} color="#10b981" />
                    </div>
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

                  {/* Percentile context */}
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

                  {/* EC feedback */}
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

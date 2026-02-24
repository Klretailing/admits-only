import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

interface Essay {
  id: string;
  title: string;
  prompt: string;
  content: string;
  status: string;
  aiScore: number | null;
  vocabScore: number | null;
  grammarScore: number | null;
  originalityScore: number | null;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  'Complete': 'bg-green-100 text-green-700',
  'In Review': 'bg-accent/10 text-accent',
  'Draft': 'bg-amber-100 text-amber-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

/* ──────────── Score Gauge ──────────── */
function ScoreGauge({ value, label, sublabel, color, invert }: { value: number | null; label: string; sublabel: string; color: string; invert?: boolean }) {
  const display = value != null ? value : '—';
  const pct = value != null ? value : 0;
  // For AI score: lower is better (less AI-generated), so invert the gauge fill
  const fillPct = invert ? (100 - pct) : pct;

  // Color based on score quality
  let ringColor = color;
  if (value != null) {
    if (invert) {
      // AI detection: low = good (human-written)
      ringColor = value <= 20 ? '#10b981' : value <= 45 ? '#f59e0b' : '#ef4444';
    } else {
      ringColor = value >= 70 ? '#10b981' : value >= 45 ? '#f59e0b' : '#ef4444';
    }
  }

  const r = 32;
  const c = Math.PI * 2 * r;
  const offset = c - (fillPct / 100) * c;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 80, height: 80 }}>
        <svg width={80} height={80} className="-rotate-90">
          <circle cx={40} cy={40} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
          {value != null && (
            <circle
              cx={40} cy={40} r={r} fill="none"
              stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              className="transition-all duration-700"
              style={{ filter: `drop-shadow(0 0 4px ${ringColor}40)` }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold font-display text-primary">
            {typeof display === 'number' ? `${display}%` : display}
          </span>
        </div>
      </div>
      <p className="text-xs font-bold text-primary mt-1.5">{label}</p>
      <p className="text-[10px] text-slate-400 text-center leading-tight">{sublabel}</p>
    </div>
  );
}

/* ──────────── Main Component ──────────── */
export default function Essays() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  // Active essay editor
  const [activeEssay, setActiveEssay] = useState<Essay | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load essays from DB
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/essays')
      .then(r => r.json())
      .then(data => {
        setEssays(data.essays || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  // Create new essay
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), prompt: newPrompt.trim() }),
      });
      const data = await res.json();
      if (data.essay) {
        setEssays(prev => [data.essay, ...prev]);
        setActiveEssay(data.essay);
        setEditContent(data.essay.content || '');
      }
    } catch (e) {}
    setCreating(false);
    setShowNewForm(false);
    setNewTitle('');
    setNewPrompt('');
  };

  // Live save + scoring with debounce
  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!activeEssay) return;
      setSaving(true);
      try {
        const res = await fetch('/api/essays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeEssay.id,
            content,
            status: content.trim().length > 50 ? 'Draft' : 'Not Started',
          }),
        });
        const data = await res.json();
        if (data.essay) {
          setActiveEssay(data.essay);
          setEssays(prev => prev.map(e => e.id === data.essay.id ? data.essay : e));
        }
      } catch (e) {}
      setSaving(false);
    }, 1200);
  }, [activeEssay]);

  // Open essay for editing
  const openEssay = (essay: Essay) => {
    setActiveEssay(essay);
    setEditContent(essay.content || '');
  };

  // Delete essay
  const deleteEssay = async (id: string) => {
    try {
      await fetch('/api/essays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setEssays(prev => prev.filter(e => e.id !== id));
      if (activeEssay?.id === id) {
        setActiveEssay(null);
        setEditContent('');
      }
    } catch (e) {}
  };

  // Mark complete
  const markComplete = async () => {
    if (!activeEssay) return;
    setSaving(true);
    try {
      const res = await fetch('/api/essays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeEssay.id, status: 'Complete' }),
      });
      const data = await res.json();
      if (data.essay) {
        setActiveEssay(data.essay);
        setEssays(prev => prev.map(e => e.id === data.essay.id ? data.essay : e));
      }
    } catch (e) {}
    setSaving(false);
  };

  if (status !== 'authenticated') return null;

  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

  return (
    <DashboardLayout>
      <Head><title>Essays | AdmitsOnly Dashboard</title></Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Essay Workspace</h1>
            <p className="mt-1 text-slate-500">Write, analyze, and improve your college application essays.</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary text-sm"
          >
            + New Essay
          </button>
        </div>

        {/* New Essay Form */}
        {showNewForm && (
          <div className="bg-white rounded-2xl border border-accent/20 p-6 shadow-lg">
            <h3 className="text-lg font-bold font-display text-primary mb-4">Create New Essay</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Essay Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Personal Statement, Stanford Short Essay..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Prompt (optional)</label>
                <input
                  type="text"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g. Describe your most meaningful activity..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setShowNewForm(false); setNewTitle(''); setNewPrompt(''); }} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || creating}
                  className="px-5 py-2 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
                >
                  {creating ? 'Creating...' : 'Create Essay'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Essay list */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <div className="animate-pulse text-slate-400 text-sm">Loading essays...</div>
              </div>
            ) : essays.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No essays yet</p>
                <p className="text-xs text-slate-400 mt-1">Click &ldquo;New Essay&rdquo; to start writing your first college essay.</p>
              </div>
            ) : (
              essays.map((essay) => (
                <div
                  key={essay.id}
                  onClick={() => openEssay(essay)}
                  className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group ${
                    activeEssay?.id === essay.id ? 'border-accent shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-primary truncate">{essay.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${statusColors[essay.status] || statusColors['Draft']}`}>
                          {essay.status}
                        </span>
                      </div>
                      {essay.prompt && (
                        <p className="text-xs text-slate-400 italic truncate">&ldquo;{essay.prompt}&rdquo;</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {essay.overallScore != null && (
                          <span className="text-xs font-bold text-accent">{essay.overallScore}% quality</span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {essay.content ? `${essay.content.trim().split(/\s+/).length} words` : '0 words'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEssay(essay.id); }}
                      className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Editor + Scoring */}
          <div className="space-y-4">
            {activeEssay ? (
              <>
                {/* Editor */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold font-display text-primary">{activeEssay.title}</h3>
                      {activeEssay.prompt && (
                        <p className="text-xs text-slate-400 italic mt-0.5">&ldquo;{activeEssay.prompt}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {saving && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
                      <span className="text-xs text-slate-400">{wordCount} words</span>
                      <button
                        onClick={markComplete}
                        disabled={wordCount < 50}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Start writing your essay here... Your writing will be automatically analyzed as you type."
                    rows={14}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none font-sans"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-slate-400">
                      {wordCount < 50 ? 'Write at least 50 words to see your scores update live.' :
                       wordCount < 250 ? 'Keep going! Aim for 500-700 words for a college essay.' :
                       wordCount >= 500 && wordCount <= 700 ? 'Great length for a college essay.' :
                       wordCount > 700 ? 'Consider trimming — most college essays should be under 700 words.' :
                       'Good progress! Keep writing.'}
                    </p>
                    <div className="flex gap-1">
                      {[500, 650, 700].map(target => (
                        <span key={target} className={`text-[9px] px-1.5 py-0.5 rounded ${wordCount >= target ? 'bg-green-100 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                          {target}w
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score Cards */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h4 className="text-sm font-bold font-display text-primary mb-1">Live Essay Analysis</h4>
                  <p className="text-[10px] text-slate-400 mb-5">Scores update automatically as you write. Write at least 50 words to activate.</p>

                  <div className="grid grid-cols-5 gap-3">
                    <ScoreGauge
                      value={activeEssay.aiScore}
                      label="AI Detected"
                      sublabel={activeEssay.aiScore != null ? (activeEssay.aiScore <= 20 ? 'Likely human' : activeEssay.aiScore <= 45 ? 'Some AI patterns' : 'High AI signals') : 'N/A'}
                      color="#ef4444"
                      invert
                    />
                    <ScoreGauge
                      value={activeEssay.vocabScore}
                      label="Vocabulary"
                      sublabel={activeEssay.vocabScore != null ? (activeEssay.vocabScore >= 70 ? 'Advanced' : activeEssay.vocabScore >= 45 ? 'Average' : 'Basic') : 'N/A'}
                      color="#8b5cf6"
                    />
                    <ScoreGauge
                      value={activeEssay.grammarScore}
                      label="Grammar"
                      sublabel={activeEssay.grammarScore != null ? (activeEssay.grammarScore >= 80 ? 'Excellent' : activeEssay.grammarScore >= 60 ? 'Good' : 'Needs work') : 'N/A'}
                      color="#6366f1"
                    />
                    <ScoreGauge
                      value={activeEssay.originalityScore}
                      label="Originality"
                      sublabel={activeEssay.originalityScore != null ? (activeEssay.originalityScore >= 70 ? 'Unique voice' : activeEssay.originalityScore >= 45 ? 'Some cliches' : 'Too common') : 'N/A'}
                      color="#f59e0b"
                    />
                    <ScoreGauge
                      value={activeEssay.overallScore}
                      label="Overall"
                      sublabel={activeEssay.overallScore != null ? (activeEssay.overallScore >= 70 ? 'Strong' : activeEssay.overallScore >= 45 ? 'Average' : 'Needs work') : 'N/A'}
                      color="#10b981"
                    />
                  </div>

                  {/* Detailed breakdown */}
                  {activeEssay.overallScore != null && (
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                      {[
                        { label: 'AI Detection', score: activeEssay.aiScore, desc: activeEssay.aiScore != null && activeEssay.aiScore <= 20 ? 'Your writing shows authentic human voice and natural flow.' : activeEssay.aiScore != null && activeEssay.aiScore <= 45 ? 'Some patterns may resemble AI-generated content. Consider varying sentence structure.' : 'Multiple AI-like patterns detected. Review for formulaic phrasing and cliches.', color: activeEssay.aiScore != null && activeEssay.aiScore <= 20 ? 'text-green-600' : activeEssay.aiScore != null && activeEssay.aiScore <= 45 ? 'text-amber-600' : 'text-red-600', invert: true },
                        { label: 'Vocabulary', score: activeEssay.vocabScore, desc: 'Measures word sophistication, variety, and appropriate use of advanced vocabulary.', color: 'text-purple-600' },
                        { label: 'Grammar', score: activeEssay.grammarScore, desc: 'Evaluates sentence structure, punctuation, spelling, and grammatical correctness.', color: 'text-accent' },
                        { label: 'Originality', score: activeEssay.originalityScore, desc: 'Compares against common essay cliches and benchmarks unique phrasing and perspective.', color: 'text-amber-600' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <span className={`text-xs font-bold ${item.color}`}>
                              {item.invert ? `${item.score}%` : `${item.score}/100`}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-primary">{item.label}</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold font-display text-primary">Select an Essay</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  Choose an essay from the list to start editing, or click &ldquo;New Essay&rdquo; to create one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

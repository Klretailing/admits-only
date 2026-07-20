import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { SCHOOLS, findSchoolByName, generateSmartTimeline, generateWeeklyDigest, type SchoolData } from '../../lib/schoolData';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

type TaskCategory = 'essays' | 'recommendations' | 'testing' | 'financial_aid' | 'misc';

interface ApplicationTask {
  id: string;
  label: string;
  done: boolean;
  category?: TaskCategory;
}

type Priority = 'reach' | 'target' | 'safety' | '';

interface CollegeApp {
  id: string;
  name: string;
  deadline: string;
  type: 'EA' | 'ED' | 'ED2' | 'RD' | 'REA' | 'Rolling';
  status: 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred';
  tasks: ApplicationTask[];
  notes: string;
  priority?: Priority;
}

type ViewMode = 'board' | 'timeline' | 'list';
type SortKey = 'name' | 'deadline' | 'status' | 'type';
type SortDir = 'asc' | 'desc';

const APP_TYPES: CollegeApp['type'][] = ['EA', 'ED', 'ED2', 'RD', 'REA', 'Rolling'];

const STATUS_OPTIONS: { value: CollegeApp['status']; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { value: 'submitted', label: 'Submitted', color: 'bg-indigo-50 text-indigo-600' },
  { value: 'accepted', label: 'Accepted', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-500' },
  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-amber-50 text-amber-600' },
  { value: 'deferred', label: 'Deferred', color: 'bg-orange-50 text-orange-500' },
];

const BOARD_COLUMNS: { status: CollegeApp['status']; label: string }[] = [
  { status: 'not_started', label: 'Not Started' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'submitted', label: 'Submitted' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'waitlisted', label: 'Waitlisted' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: '', label: 'Not Set', color: 'bg-slate-50 text-slate-400 border-slate-200' },
  { value: 'reach', label: 'Reach', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { value: 'target', label: 'Target', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'safety', label: 'Safety', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
];

const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'essays', label: 'Essays' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'testing', label: 'Testing' },
  { value: 'financial_aid', label: 'Financial Aid' },
  { value: 'misc', label: 'Misc' },
];

const DEFAULT_TASKS: Omit<ApplicationTask, 'id'>[] = [
  { label: 'Common App essay finalized', done: false, category: 'essays' },
  { label: 'School-specific supplementals', done: false, category: 'essays' },
  { label: 'Request recommendation letters', done: false, category: 'recommendations' },
  { label: 'Send test scores', done: false, category: 'testing' },
  { label: 'Complete FAFSA/CSS Profile', done: false, category: 'financial_aid' },
  { label: 'Submit application', done: false, category: 'misc' },
  { label: 'Interview prep', done: false, category: 'misc' },
];

const STORAGE_KEY = 'admitsonly_applications';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const typeColors: Record<string, string> = {
  EA: 'bg-blue-50 text-blue-600 border-blue-200',
  ED: 'bg-red-50 text-red-600 border-red-200',
  ED2: 'bg-rose-50 text-rose-600 border-rose-200',
  RD: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  REA: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  Rolling: 'bg-amber-50 text-amber-600 border-amber-200',
};

const typeTimelineColors: Record<string, string> = {
  EA: '#3b82f6',
  ED: '#ef4444',
  ED2: '#f43f5e',
  RD: '#22c55e',
  REA: '#6366f1',
  Rolling: '#f59e0b',
};

function getDaysUntil(deadline: string): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function getTaskCompletion(tasks: ApplicationTask[]): number {
  if (!tasks || tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
}

/* Coerce any stored/foreign application object into a safe CollegeApp.
   Other features (e.g. the Admissions Map) write into the same store, and
   legacy entries may lack fields — this guarantees the shape so the page
   never crashes on imperfect data. */
const TYPE_ALIASES: Record<string, CollegeApp['type']> = {
  'Regular Decision': 'RD', 'Early Action': 'EA', 'Early Decision': 'ED',
  'Early Decision 2': 'ED2', 'Restrictive Early Action': 'REA', 'Rolling Admission': 'Rolling',
};
const STATUS_ALIASES: Record<string, CollegeApp['status']> = {
  researching: 'not_started', planning: 'not_started', applying: 'in_progress', in_review: 'in_progress',
};
function normalizeApp(raw: any): CollegeApp {
  const type = TYPE_ALIASES[raw?.type] || (APP_TYPES.includes(raw?.type) ? raw.type : 'RD');
  const validStatuses = STATUS_OPTIONS.map(o => o.value);
  const status = STATUS_ALIASES[raw?.status] || (validStatuses.includes(raw?.status) ? raw.status : 'not_started');
  const rawTasks = Array.isArray(raw?.tasks) ? raw.tasks : [];
  return {
    id: raw?.id || generateId(),
    name: (raw?.name || 'Untitled').toString(),
    deadline: raw?.deadline || '',
    type,
    status,
    priority: raw?.priority || '',
    notes: raw?.notes || '',
    tasks: rawTasks.filter(Boolean).map((t: any) => ({
      id: t?.id || generateId(),
      label: (t?.label || '').toString(),
      done: !!t?.done,
      category: t?.category || inferTaskCategory(t?.label || ''),
    })),
  };
}

function inferTaskCategory(label: string): TaskCategory {
  const l = label.toLowerCase();
  if (l.includes('essay') || l.includes('supplement') || l.includes('writing')) return 'essays';
  if (l.includes('rec') || l.includes('letter') || l.includes('recommendation')) return 'recommendations';
  if (l.includes('test') || l.includes('score') || l.includes('sat') || l.includes('act')) return 'testing';
  if (l.includes('fafsa') || l.includes('css') || l.includes('financial') || l.includes('aid') || l.includes('fee')) return 'financial_aid';
  return 'misc';
}

/* ── Progress Ring SVG ── */
function ProgressRing({ pct, size = 36, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#6366f1" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="fill-slate-600 transform rotate-90 origin-center"
        style={{ fontSize: size < 40 ? '9px' : '11px', fontWeight: 700 }}
      >
        {pct}%
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function Applications() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [apps, setApps] = useState<CollegeApp[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>('board');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailApp, setDetailApp] = useState<string | null>(null);
  const syncingRef = useRef(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newType, setNewType] = useState<CollegeApp['type']>('RD');
  const [newPriority, setNewPriority] = useState<Priority>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // List view sort
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // New task in detail panel
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('misc');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredSchools = useMemo(() => {
    if (!newName.trim()) return [];
    const q = newName.toLowerCase();
    const alreadyAdded = new Set(apps.map(a => a.name.toLowerCase()));
    return SCHOOLS.filter(s =>
      !alreadyAdded.has(s.name.toLowerCase()) &&
      (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [newName, apps]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectSchool = (school: SchoolData) => {
    setNewName(school.name);
    setShowSuggestions(false);
  };

  // Load from server first, fall back to localStorage, merge
  useEffect(() => {
    let cancelled = false;
    async function loadApps() {
      let serverApps: CollegeApp[] = [];
      let localApps: CollegeApp[] = [];

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) localApps = JSON.parse(stored);
      } catch {}

      try {
        const res = await fetch('/api/applications');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.applications)) serverApps = data.applications;
        }
      } catch {}

      if (cancelled) return;

      // Merge: use server as source of truth, add any local-only entries
      let merged: CollegeApp[];
      if (serverApps.length > 0 && localApps.length > 0) {
        const serverIds = new Set(serverApps.map(a => a.id));
        const serverNames = new Set(serverApps.map(a => a.name.toLowerCase()));
        const localOnly = localApps.filter(a => !serverIds.has(a.id) && !serverNames.has(a.name.toLowerCase()));
        merged = [...serverApps, ...localOnly];
      } else if (serverApps.length > 0) {
        merged = serverApps;
      } else {
        merged = localApps;
      }

      // Normalize every entry into a safe shape (guards against legacy/foreign
      // records written by other features that may lack tasks/priority/etc.)
      merged = (Array.isArray(merged) ? merged : []).filter(Boolean).map(normalizeApp);

      setApps(merged);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      if (merged.length > serverApps.length && merged.length > 0) {
        fetch('/api/applications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applications: merged }),
        }).catch(() => {});
      }
      setLoaded(true);
    }
    loadApps();
    return () => { cancelled = true; };
  }, []);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setApps(parsed.filter(Boolean).map(normalizeApp));
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Save to both localStorage and server
  const save = useCallback((updated: CollegeApp[]) => {
    setApps(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    if (!syncingRef.current) {
      syncingRef.current = true;
      fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applications: updated }),
      }).catch(() => {}).finally(() => { syncingRef.current = false; });
    }
  }, []);

  const addApp = () => {
    if (!newName.trim()) return;
    const app: CollegeApp = {
      id: generateId(),
      name: newName.trim(),
      deadline: newDeadline,
      type: newType,
      status: 'not_started',
      priority: newPriority,
      tasks: DEFAULT_TASKS.map(t => ({ ...t, id: generateId() })),
      notes: '',
    };
    save([...apps, app]);
    setNewName('');
    setNewDeadline('');
    setNewType('RD');
    setNewPriority('');
    setShowAddForm(false);
  };

  const removeApp = (id: string) => {
    save(apps.filter(a => a.id !== id));
    if (detailApp === id) setDetailApp(null);
    setDeleteConfirmId(null);
  };

  const updateApp = (id: string, patch: Partial<CollegeApp>) => {
    save(apps.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const toggleTask = (appId: string, taskId: string) => {
    save(apps.map(a => a.id === appId ? {
      ...a,
      tasks: a.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    } : a));
  };

  const addTask = (appId: string, label: string, category: TaskCategory) => {
    if (!label.trim()) return;
    save(apps.map(a => a.id === appId ? {
      ...a,
      tasks: [...a.tasks, { id: generateId(), label: label.trim(), done: false, category }],
    } : a));
  };

  const deleteTask = (appId: string, taskId: string) => {
    save(apps.map(a => a.id === appId ? {
      ...a,
      tasks: a.tasks.filter(t => t.id !== taskId),
    } : a));
  };

  // Deadline Intelligence
  const timeline = useMemo(() => generateSmartTimeline(apps), [apps]);
  const digest = useMemo(() => generateWeeklyDigest(timeline, apps), [timeline, apps]);

  if (status !== 'authenticated' || !loaded) return null;

  const getStatusInfo = (s: CollegeApp['status']) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
  const selectedApp = detailApp ? apps.find(a => a.id === detailApp) : null;

  // Stats
  const totalApps = apps.length;
  const reachCount = apps.filter(a => a.priority === 'reach').length;
  const targetCount = apps.filter(a => a.priority === 'target').length;
  const safetyCount = apps.filter(a => a.priority === 'safety').length;
  const totalTasks = apps.reduce((s, a) => s + a.tasks.length, 0);
  const doneTasks = apps.reduce((s, a) => s + a.tasks.filter(t => t.done).length, 0);
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const upcomingDeadlines = [...apps]
    .filter(a => a.deadline && getDaysUntil(a.deadline)! >= 0 && !['submitted', 'accepted', 'rejected'].includes(a.status))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  // Sort helper for list view
  const sortedApps = useMemo(() => {
    const sorted = [...apps];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'deadline': {
          if (!a.deadline && !b.deadline) cmp = 0;
          else if (!a.deadline) cmp = 1;
          else if (!b.deadline) cmp = -1;
          else cmp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        }
        case 'status': {
          const order = STATUS_OPTIONS.map(o => o.value);
          cmp = order.indexOf(a.status) - order.indexOf(b.status);
          break;
        }
        case 'type': cmp = a.type.localeCompare(b.type); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [apps, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Timeline grouping by month
  const timelineMonths = useMemo(() => {
    const byMonth = new Map<string, CollegeApp[]>();
    for (const app of apps) {
      if (!app.deadline) continue;
      const d = new Date(app.deadline);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const list = byMonth.get(key) || [];
      list.push(app);
      byMonth.set(key, list);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, appList]) => ({
        key,
        label: new Date(key + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        apps: appList.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
      }));
  }, [apps]);

  return (
    <DashboardLayout>
      <Head><title>Applications | AdmitsOnly Dashboard</title></Head>

      {/* ═══ Slide-over Detail Panel ═══ */}
      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          onClose={() => setDetailApp(null)}
          onUpdate={(patch) => updateApp(selectedApp.id, patch)}
          onToggleTask={(taskId) => toggleTask(selectedApp.id, taskId)}
          onAddTask={(label, cat) => addTask(selectedApp.id, label, cat)}
          onDeleteTask={(taskId) => deleteTask(selectedApp.id, taskId)}
          onDelete={() => {
            if (deleteConfirmId === selectedApp.id) {
              removeApp(selectedApp.id);
            } else {
              setDeleteConfirmId(selectedApp.id);
            }
          }}
          deleteConfirming={deleteConfirmId === selectedApp.id}
          onCancelDelete={() => setDeleteConfirmId(null)}
        />
      )}

      <div className="space-y-6">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold font-display text-primary tracking-tight">Application Tracker</h1>
            <p className="mt-0.5 text-sm text-slate-400">Track every college application, deadline, and task in one place.</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors flex-shrink-0 self-start sm:self-auto"
          >
            + Add School
          </button>
        </div>

        {/* ═══ Statistics Header ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Apps</p>
            <p className="text-2xl font-bold font-display text-primary mt-1">{totalApps}</p>
            {(reachCount > 0 || targetCount > 0 || safetyCount > 0) && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {reachCount > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{reachCount} Reach</span>}
                {targetCount > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{targetCount} Target</span>}
                {safetyCount > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">{safetyCount} Safety</span>}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Next Deadlines</p>
            {upcomingDeadlines.length > 0 ? (
              <div className="mt-1.5 space-y-1">
                {upcomingDeadlines.map(a => {
                  const days = getDaysUntil(a.deadline)!;
                  return (
                    <button key={a.id} onClick={() => setDetailApp(a.id)} className="w-full text-left flex items-center gap-2 group">
                      <span className={`text-[10px] font-bold w-12 flex-shrink-0 ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days}d`}
                      </span>
                      <span className="text-xs text-primary font-medium truncate group-hover:text-indigo-600 transition-colors">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-300 mt-2">No upcoming</p>
            )}
          </div>

          {/* Completion */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Completion</p>
            <div className="flex items-center gap-3 mt-1">
              <ProgressRing pct={overallPct} size={44} stroke={4} />
              <div>
                <p className="text-lg font-bold font-display text-primary">{overallPct}%</p>
                <p className="text-[10px] text-slate-400">{doneTasks}/{totalTasks} tasks</p>
              </div>
            </div>
          </div>

          {/* Submitted / Accepted */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Results</p>
            <div className="flex items-end gap-4 mt-1">
              <div>
                <p className="text-2xl font-bold font-display text-indigo-600">{apps.filter(a => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(a.status)).length}</p>
                <p className="text-[10px] text-slate-400">Submitted</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-emerald-600">{apps.filter(a => a.status === 'accepted').length}</p>
                <p className="text-[10px] text-slate-400">Accepted</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ View Switcher ═══ */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {([
            { key: 'board' as ViewMode, label: 'Board', icon: <BoardIcon /> },
            { key: 'timeline' as ViewMode, label: 'Timeline', icon: <TimelineIcon /> },
            { key: 'list' as ViewMode, label: 'List', icon: <ListIcon /> },
          ]).map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === v.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* ═══ Add School Form ═══ */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-primary mb-3">Add a School</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_100px_100px]">
              <div className="relative" ref={suggestionRef}>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if (newName.trim()) setShowSuggestions(true); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredSchools.length > 0 && showSuggestions) {
                      e.preventDefault();
                      selectSchool(filteredSchools[0]);
                    }
                  }}
                  placeholder="Search for a school..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  autoFocus
                />
                {showSuggestions && filteredSchools.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                    {filteredSchools.map(school => (
                      <button
                        key={school.id}
                        onClick={() => selectSchool(school)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-primary truncate">{school.name}</p>
                          <p className="text-[11px] text-slate-400">{school.location} &middot; {school.acceptanceRate}% acceptance</p>
                        </div>
                        {school.deadlines?.rd && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">RD: {school.deadlines.rd}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showSuggestions && newName.trim().length >= 2 && filteredSchools.length === 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg p-3">
                    <p className="text-xs text-slate-400 text-center">No matching schools found -- you can still add a custom name</p>
                  </div>
                )}
              </div>
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as CollegeApp['type'])}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as Priority)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">Priority</option>
                <option value="reach">Reach</option>
                <option value="target">Target</option>
                <option value="safety">Safety</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => { setShowAddForm(false); setNewName(''); setNewDeadline(''); setShowSuggestions(false); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button onClick={addApp} disabled={!newName.trim()} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-40">Add School</button>
            </div>
          </div>
        )}

        {/* ═══ Empty State ═══ */}
        {apps.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary mb-2">No applications yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add the schools you&apos;re applying to and track every deadline and task.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors"
            >
              + Add Your First School
            </button>
          </div>
        )}

        {/* ═══ Board View ═══ */}
        {view === 'board' && apps.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory lg:snap-none">
            {BOARD_COLUMNS.map(col => {
              const colApps = apps.filter(a => a.status === col.status);
              const statusInfo = getStatusInfo(col.status);
              return (
                <div key={col.status} className="min-w-[280px] w-[280px] lg:min-w-0 lg:w-auto lg:flex-1 flex-shrink-0 snap-start">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color.split(' ')[0]}`} />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</h3>
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-full">{colApps.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {colApps.map(app => (
                      <BoardCard key={app.id} app={app} onClick={() => setDetailApp(app.id)} />
                    ))}
                    {colApps.length === 0 && (
                      <div className="border-2 border-dashed border-slate-100 rounded-2xl p-6 text-center">
                        <p className="text-xs text-slate-300">No apps</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ Timeline View ═══ */}
        {view === 'timeline' && apps.length > 0 && (
          <div className="space-y-6">
            {timelineMonths.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-sm text-slate-400">No deadlines set. Add deadlines to your applications to see the timeline.</p>
              </div>
            )}
            {timelineMonths.map(month => (
              <div key={month.key}>
                <h3 className="text-sm font-bold text-primary mb-3 sticky top-0 bg-surface py-1 z-10">{month.label}</h3>
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-3">
                    {month.apps.map(app => {
                      const d = new Date(app.deadline);
                      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                      const pct = getTaskCompletion(app.tasks);
                      const days = getDaysUntil(app.deadline);
                      return (
                        <button
                          key={app.id}
                          onClick={() => setDetailApp(app.id)}
                          className="relative w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow group"
                        >
                          {/* Dot on timeline */}
                          <div
                            className="absolute -left-6 top-5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: typeTimelineColors[app.type] || '#6366f1' }}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">{dayStr}</span>
                                {days !== null && days >= 0 && (
                                  <span className={`text-[10px] font-bold ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-300'}`}>
                                    {days === 0 ? 'Today' : `${days}d left`}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-bold text-primary mt-0.5 group-hover:text-indigo-600 transition-colors">{app.name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColors[app.type]}`}>{app.type}</span>
                            <ProgressRing pct={pct} size={32} stroke={2.5} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {/* Apps without deadlines */}
            {apps.filter(a => !a.deadline).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">No Deadline Set</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {apps.filter(a => !a.deadline).map(app => (
                    <button
                      key={app.id}
                      onClick={() => setDetailApp(app.id)}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow"
                    >
                      <p className="text-sm font-bold text-primary">{app.name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColors[app.type]} mt-1 inline-block`}>{app.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ List View ═══ */}
        {view === 'list' && apps.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {([
                      { key: 'name' as SortKey, label: 'School' },
                      { key: 'deadline' as SortKey, label: 'Deadline' },
                      { key: 'type' as SortKey, label: 'Type' },
                      { key: 'status' as SortKey, label: 'Status' },
                    ]).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition-colors select-none"
                      >
                        {col.label}{sortArrow(col.key)}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedApps.map(app => {
                    const statusInfo = getStatusInfo(app.status);
                    const pct = getTaskCompletion(app.tasks);
                    const days = getDaysUntil(app.deadline);
                    const prioInfo = PRIORITY_OPTIONS.find(p => p.value === (app.priority || ''));
                    return (
                      <tr
                        key={app.id}
                        onClick={() => setDetailApp(app.id)}
                        className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-primary">{app.name}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {app.deadline ? (
                            <span>
                              {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {days !== null && days >= 0 && (
                                <span className={`ml-1.5 text-[10px] font-bold ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-300'}`}>
                                  ({days}d)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColors[app.type]}`}>{app.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {prioInfo && prioInfo.value ? (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioInfo.color}`}>{prioInfo.label}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   BOARD CARD COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

function BoardCard({ app, onClick }: { app: CollegeApp; onClick: () => void }) {
  const pct = getTaskCompletion(app.tasks);
  const days = getDaysUntil(app.deadline);
  const prioInfo = PRIORITY_OPTIONS.find(p => p.value === (app.priority || ''));

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-100 transition-all group"
    >
      {/* Name + Type */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-primary group-hover:text-indigo-600 transition-colors leading-snug">{app.name}</h4>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0 ${typeColors[app.type]}`}>{app.type}</span>
      </div>

      {/* Deadline */}
      {app.deadline && (
        <p className="text-xs text-slate-400 mt-1.5">
          {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {days !== null && days >= 0 && (
            <span className={`ml-1.5 font-semibold ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
              &middot; {days === 0 ? 'Today' : days === 1 ? '1 day left' : `${days}d left`}
            </span>
          )}
          {days !== null && days < 0 && (
            <span className="ml-1.5 font-semibold text-slate-300">&middot; Past due</span>
          )}
        </p>
      )}

      {/* Progress ring + priority */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <ProgressRing pct={pct} size={32} stroke={2.5} />
          <span className="text-[11px] text-slate-400">{app.tasks.filter(t => t.done).length}/{app.tasks.length} tasks</span>
        </div>
        {prioInfo && prioInfo.value && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioInfo.color}`}>{prioInfo.label}</span>
        )}
      </div>

      {/* Notes preview */}
      {app.notes && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{app.notes}</p>
      )}
    </button>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   DETAIL SLIDE-OVER PANEL
   ══════════════════════════════════════════════════════════════════════ */

interface DetailPanelProps {
  app: CollegeApp;
  onClose: () => void;
  onUpdate: (patch: Partial<CollegeApp>) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (label: string, cat: TaskCategory) => void;
  onDeleteTask: (taskId: string) => void;
  onDelete: () => void;
  deleteConfirming: boolean;
  onCancelDelete: () => void;
}

function DetailPanel({ app, onClose, onUpdate, onToggleTask, onAddTask, onDeleteTask, onDelete, deleteConfirming, onCancelDelete }: DetailPanelProps) {
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskCat, setNewTaskCat] = useState<TaskCategory>('misc');
  const panelRef = useRef<HTMLDivElement>(null);

  const days = getDaysUntil(app.deadline);
  const pct = getTaskCompletion(app.tasks);
  const statusInfo = STATUS_OPTIONS.find(o => o.value === app.status) || STATUS_OPTIONS[0];
  const schoolData = findSchoolByName(app.name);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const map = new Map<TaskCategory, ApplicationTask[]>();
    for (const cat of TASK_CATEGORIES) {
      map.set(cat.value, []);
    }
    for (const task of app.tasks) {
      const cat = task.category || inferTaskCategory(task.label);
      const list = map.get(cat) || [];
      list.push(task);
      map.set(cat, list);
    }
    return map;
  }, [app.tasks]);

  const href = schoolData
    ? `/dashboard/essays?school=${schoolData.id}&mode=supplementals`
    : '/dashboard/essays?mode=supplementals';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-xl overflow-y-auto transition-transform"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${typeColors[app.type]}`}>{app.type}</span>
            </div>
          </div>
          <h2 className="text-lg font-bold font-display text-primary mt-2">{app.name}</h2>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Deadline + countdown */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Deadline</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={app.deadline}
                onChange={e => onUpdate({ deadline: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
              {days !== null && (
                <span className={`text-sm font-bold ${
                  days < 0 ? 'text-slate-300' : days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-500'
                }`}>
                  {days < 0 ? 'Past due' : days === 0 ? 'Due today!' : days === 1 ? '1 day left' : `${days} days left`}
                </span>
              )}
            </div>
          </div>

          {/* Status pills */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ status: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    app.status === opt.value
                      ? opt.color + ' border-current/20 ring-2 ring-indigo-200'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ priority: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    (app.priority || '') === opt.value
                      ? opt.color + ' ring-2 ring-indigo-200'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks by category */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasks ({app.tasks.filter(t => t.done).length}/{app.tasks.length})</label>
              <ProgressRing pct={pct} size={28} stroke={2} />
            </div>

            <div className="space-y-4">
              {TASK_CATEGORIES.map(cat => {
                const tasks = tasksByCategory.get(cat.value) || [];
                if (tasks.length === 0) return null;
                return (
                  <div key={cat.value}>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5 capitalize">{cat.label}</p>
                    <div className="space-y-1">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 group">
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className="flex items-center gap-2.5 flex-1 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors"
                          >
                            <span className={`w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                              task.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-200'
                            }`} style={{ width: 18, height: 18 }}>
                              {task.done && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-primary'}`}>{task.label}</span>
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-400 transition-all"
                            title="Remove task"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add task */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTaskLabel}
                onChange={e => setNewTaskLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTaskLabel.trim()) {
                    onAddTask(newTaskLabel, newTaskCat);
                    setNewTaskLabel('');
                  }
                }}
                placeholder="Add a task..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <select
                value={newTaskCat}
                onChange={e => setNewTaskCat(e.target.value as TaskCategory)}
                className="px-2 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
              >
                {TASK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button
                onClick={() => {
                  if (newTaskLabel.trim()) {
                    onAddTask(newTaskLabel, newTaskCat);
                    setNewTaskLabel('');
                  }
                }}
                className="px-3 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Notes</label>
            <textarea
              value={app.notes}
              onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Add notes about this application..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* View Supplementals link */}
          <Link
            href={href}
            className="flex items-center gap-2 text-sm text-indigo-500 font-semibold hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View {schoolData ? `${schoolData.name} ` : ''}Supplemental Prompts
          </Link>

          {/* Delete */}
          <div className="pt-4 border-t border-slate-100">
            {deleteConfirming ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-red-500 font-medium">Are you sure?</p>
                <button onClick={onDelete} className="px-3 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Yes, Delete</button>
                <button onClick={onCancelDelete} className="px-3 py-1.5 text-sm font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              </div>
            ) : (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-500 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Application
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   ICON COMPONENTS
   ══════════════════════════════════════════════════════════════════════ */

function BoardIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

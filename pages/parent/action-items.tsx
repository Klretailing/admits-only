import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import ParentLayout from '../../components/ParentLayout';

interface ParentTask {
  id: string;
  label: string;
  category: string;
  schoolName?: string;
  done: boolean;
  dueDate?: string;
}

interface Suggestion {
  label: string;
  category: string;
  schoolName?: string | null;
  dueDate?: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  financial: { label: 'Financial', color: 'text-teal-600', bg: 'bg-teal-50' },
  deadline: { label: 'Deadline', color: 'text-amber-600', bg: 'bg-amber-50' },
  deposit: { label: 'Deposit', color: 'text-red-600', bg: 'bg-red-50' },
  planning: { label: 'Planning', color: 'text-slate-600', bg: 'bg-slate-100' },
  visit: { label: 'Campus Visit', color: 'text-blue-600', bg: 'bg-blue-50' },
  discussion: { label: 'Discussion', color: 'text-purple-600', bg: 'bg-purple-50' },
  custom: { label: 'Custom', color: 'text-slate-600', bg: 'bg-slate-50' },
};

function catConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;
}

function fmtDue(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default function ParentActionItems() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [tasks, setTasks] = useState<ParentTask[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [studentName, setStudentName] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/parent/overview').then(r => r.json()),
      fetch('/api/parent/action-items').then(r => r.json()),
      fetch('/api/parent/action-items?action=suggestions').then(r => r.json()),
    ]).then(([overviewData, actionData, suggData]) => {
      setConnected(overviewData.connected);
      if (overviewData.students?.length) {
        setStudentName(overviewData.students[0].name);
      }
      if (Array.isArray(actionData.items)) setTasks(actionData.items);
      if (Array.isArray(suggData?.suggestions)) setSuggestions(suggData.suggestions);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t));
    fetch('/api/parent/action-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done: newDone }),
    }).catch(() => {});
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    fetch('/api/parent/action-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const addTask = () => {
    if (!newTaskLabel.trim()) return;
    const newTask: ParentTask = { id: genId(), label: newTaskLabel.trim(), category: 'custom', done: false };
    setTasks(prev => [...prev, newTask]);
    setNewTaskLabel('');
    fetch('/api/parent/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newTask.label, category: 'custom' }),
    }).catch(() => {});
  };

  const suggestionToTask = (s: Suggestion): ParentTask => ({
    id: genId(),
    label: s.label,
    category: s.category,
    schoolName: s.schoolName || undefined,
    done: false,
    dueDate: s.dueDate || undefined,
  });

  const addSuggestion = (s: Suggestion) => {
    const newTask = suggestionToTask(s);
    setTasks(prev => [...prev, newTask]);
    setSuggestions(prev => prev.filter(x => x.label !== s.label));
    fetch('/api/parent/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [newTask] }),
    }).catch(() => {});
  };

  const addAllSuggestions = () => {
    if (suggestions.length === 0) return;
    const newTasks = suggestions.map(suggestionToTask);
    setTasks(prev => [...prev, ...newTasks]);
    setSuggestions([]);
    fetch('/api/parent/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newTasks }),
    }).catch(() => {});
  };

  const now = new Date();
  const sections = useMemo(() => {
    const active = tasks.filter(t => !t.done);
    const completed = tasks.filter(t => t.done);

    const urgent = active.filter(t => {
      if (!t.dueDate) return false;
      const days = Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 14;
    });
    const urgentIds = new Set(urgent.map(t => t.id));

    const thisMonth = active.filter(t => {
      if (urgentIds.has(t.id)) return false;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthIds = new Set(thisMonth.map(t => t.id));

    const comingUp = active.filter(t => !urgentIds.has(t.id) && !thisMonthIds.has(t.id));

    return { urgent, thisMonth, comingUp, completed };
  }, [tasks, now]);

  const donePct = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <Head><title>Action Items | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ParentLayout>
    );
  }

  if (connected === false) {
    return (
      <ParentLayout>
        <Head><title>Action Items | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-4">Enter your student&apos;s connection code to generate action items.</p>
            <button onClick={() => router.push('/parent/settings')} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600">Go to Settings</button>
          </div>
        </div>
      </ParentLayout>
    );
  }

  const TaskRow = ({ task }: { task: ParentTask }) => {
    const cat = catConfig(task.category);
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
        <button onClick={() => toggleTask(task.id)} className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
          task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-200 hover:border-teal-400'
        }`}>
          {task.done && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-primary font-medium'}`}>{task.label}</p>
          {task.schoolName && <p className="text-[10px] text-slate-400 mt-0.5">{task.schoolName}</p>}
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${cat.bg} ${cat.color}`}>{cat.label}</span>
        <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  };

  return (
    <ParentLayout>
      <Head><title>Action Items | AdmitsOnly Parent</title></Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Family Action Items</h1>
            <p className="text-sm text-slate-500 mt-1">Tasks that need your attention</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold font-display text-primary">{donePct}%</p>
              <p className="text-xs text-slate-400">{tasks.filter(t => t.done).length} of {tasks.length} done</p>
            </div>
            <div className="w-12 h-12 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#0d9488" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${donePct * 2.51} 251`} />
              </svg>
            </div>
          </div>
        </div>

        {/* Add task */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskLabel}
              onChange={e => setNewTaskLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a custom task..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
            <button onClick={addTask} disabled={!newTaskLabel.trim()} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-40">
              Add
            </button>
          </div>
        </div>

        {/* Suggested for you */}
        {suggestions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider">Suggested for you</h3>
              </div>
              <button onClick={addAllSuggestions} className="text-xs font-semibold text-teal-600 hover:text-teal-700 shrink-0">
                Add all
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Based on {studentName ? `${studentName}'s` : 'your student’s'} applications and deadlines</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => {
                const cat = catConfig(s.category);
                const due = fmtDue(s.dueDate);
                return (
                  <div key={`${s.label}-${i}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary font-medium">{s.label}</p>
                      {(s.schoolName || due) && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {s.schoolName}{s.schoolName && due ? ' · ' : ''}{due ? `Due ${due}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${cat.bg} ${cat.color}`}>{cat.label}</span>
                    <button onClick={() => addSuggestion(s)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors shrink-0">
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Urgent */}
        {sections.urgent.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Urgent — Action Needed</h3>
            </div>
            <div className="space-y-1">{sections.urgent.map(t => <TaskRow key={t.id} task={t} />)}</div>
          </div>
        )}

        {/* This Month */}
        {sections.thisMonth.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">This Month</h3>
            <div className="space-y-1">{sections.thisMonth.map(t => <TaskRow key={t.id} task={t} />)}</div>
          </div>
        )}

        {/* Coming Up */}
        {sections.comingUp.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Coming Up</h3>
            <div className="space-y-1">{sections.comingUp.map(t => <TaskRow key={t.id} task={t} />)}</div>
          </div>
        )}

        {/* Completed */}
        {sections.completed.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Completed ({sections.completed.length})</h3>
            <div className="space-y-1">{sections.completed.map(t => <TaskRow key={t.id} task={t} />)}</div>
          </div>
        )}
      </div>
    </ParentLayout>
  );
}

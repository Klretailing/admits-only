import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { findSchoolByName, generateSmartTimeline, generateWeeklyDigest, type SchoolData } from '../../lib/schoolData';
import { useCountUp } from '../../hooks/useAnimations';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

interface ApplicationTask {
  id: string;
  label: string;
  done: boolean;
}

interface CollegeApp {
  id: string;
  name: string;
  deadline: string;
  type: 'EA' | 'ED' | 'ED2' | 'RD' | 'REA' | 'Rolling';
  status: 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred';
  tasks: ApplicationTask[];
  notes: string;
}

const APP_TYPES: CollegeApp['type'][] = ['EA', 'ED', 'ED2', 'RD', 'REA', 'Rolling'];
const STATUS_OPTIONS: { value: CollegeApp['status']; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { value: 'submitted', label: 'Submitted', color: 'bg-accent/10 text-accent' },
  { value: 'accepted', label: 'Accepted', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-500' },
  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-amber-50 text-amber-600' },
  { value: 'deferred', label: 'Deferred', color: 'bg-orange-50 text-orange-500' },
];

const DEFAULT_TASKS: Omit<ApplicationTask, 'id'>[] = [
  { label: 'Common App / Coalition filled', done: false },
  { label: 'Main essay finalized', done: false },
  { label: 'Supplemental essays done', done: false },
  { label: 'Rec letters requested', done: false },
  { label: 'Test scores sent', done: false },
  { label: 'Transcript requested', done: false },
  { label: 'Financial aid / CSS Profile', done: false },
  { label: 'Application fee paid', done: false },
];

const STORAGE_KEY = 'admitsonly_applications';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newType, setNewType] = useState<CollegeApp['type']>('RD');

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setApps(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, []);

  // Save to localStorage on change
  const save = useCallback((updated: CollegeApp[]) => {
    setApps(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const addApp = () => {
    if (!newName.trim()) return;
    const app: CollegeApp = {
      id: generateId(),
      name: newName.trim(),
      deadline: newDeadline,
      type: newType,
      status: 'not_started',
      tasks: DEFAULT_TASKS.map(t => ({ ...t, id: generateId() })),
      notes: '',
    };
    save([...apps, app]);
    setNewName('');
    setNewDeadline('');
    setNewType('RD');
    setShowAddForm(false);
  };

  const removeApp = (id: string) => {
    save(apps.filter(a => a.id !== id));
    if (expandedApp === id) setExpandedApp(null);
  };

  const updateStatus = (id: string, status: CollegeApp['status']) => {
    save(apps.map(a => a.id === id ? { ...a, status } : a));
  };

  const toggleTask = (appId: string, taskId: string) => {
    save(apps.map(a => a.id === appId ? {
      ...a,
      tasks: a.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    } : a));
  };

  const updateNotes = (id: string, notes: string) => {
    save(apps.map(a => a.id === id ? { ...a, notes } : a));
  };

  // Deadline Intelligence
  const timeline = useMemo(() => generateSmartTimeline(apps), [apps]);
  const digest = useMemo(() => generateWeeklyDigest(timeline, apps), [timeline, apps]);
  const [showResearch, setShowResearch] = useState<string | null>(null);

  if (status !== 'authenticated' || !loaded) return null;

  const getStatusInfo = (s: CollegeApp['status']) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
  const sortedApps = [...apps].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const totalTasks = apps.reduce((s, a) => s + a.tasks.length, 0);
  const doneTasks = apps.reduce((s, a) => s + a.tasks.filter(t => t.done).length, 0);
  const submitted = apps.filter(a => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(a.status)).length;
  const accepted = apps.filter(a => a.status === 'accepted').length;

  const getDaysUntil = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    return days;
  };

  const typeColors: Record<string, string> = {
    EA: 'bg-blue-50 text-blue-600 border-blue-200',
    ED: 'bg-purple-50 text-purple-600 border-purple-200',
    ED2: 'bg-violet-50 text-violet-600 border-violet-200',
    RD: 'bg-slate-50 text-slate-600 border-slate-200',
    REA: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    Rolling: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };

  return (
    <DashboardLayout>
      <Head><title>Applications | AdmitsOnly Dashboard</title></Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold font-display text-primary tracking-tight">Application Tracker</h1>
            <p className="mt-0.5 text-sm text-slate-400">Track every college application, deadline, and task in one place.</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-accent to-purple-600 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5 flex-shrink-0 self-start sm:self-auto"
          >
            + Add School
          </button>
        </div>

        {/* Stats bar — enhanced with gradients */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Schools', value: apps.length, color: 'text-primary', gradient: 'from-blue-500 to-indigo-600' },
            { label: 'Submitted', value: submitted, color: 'text-accent', gradient: 'from-accent to-purple-600' },
            { label: 'Accepted', value: accepted, color: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
          ].map((stat, i) => (
            <div key={stat.label} className="dash-stat-card dash-card-hover bg-white rounded-xl border border-slate-100 p-4" style={{ '--stat-accent': i === 0 ? '#3b82f6' : i === 1 ? '#6366f1' : '#10b981', '--stat-accent-end': i === 0 ? '#4f46e5' : i === 1 ? '#9333ea' : '#0d9488' } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center opacity-80`}>
                  {i === 0 && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>}
                  {i === 1 && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  {i === 2 && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
              </div>
              <p className={`text-2xl font-bold font-display ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
          <div className="dash-stat-card dash-card-hover bg-white rounded-xl border border-slate-100 p-4" style={{ '--stat-accent': '#f59e0b', '--stat-accent-end': '#ea580c' } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tasks Done</p>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center opacity-80">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
              </div>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold font-display text-primary">{doneTasks}<span className="text-sm text-slate-300 font-normal">/{totalTasks}</span></p>
            </div>
            {totalTasks > 0 && (
              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full progress-animated" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Smart Planner — Deadline Intelligence */}
        {apps.length > 0 && (digest.critical.length > 0 || digest.thisWeek.length > 0) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Smart Planner</h3>
                <p className="text-xs text-slate-400">Your most urgent tasks across all applications</p>
              </div>
            </div>

            {digest.critical.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Critical — Action Needed Now
                </p>
                <div className="space-y-1.5">
                  {digest.critical.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                      <span className="text-xs font-semibold text-red-600 flex-shrink-0">{task.dueDescription}</span>
                      <span className="text-xs text-red-700 flex-1">{task.label}</span>
                      <span className="text-[10px] text-red-400 flex-shrink-0">{task.school}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digest.thisWeek.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">This Week</p>
                <div className="space-y-1.5">
                  {digest.thisWeek.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                      <span className="text-xs font-semibold text-amber-600 flex-shrink-0">{task.dueDescription}</span>
                      <span className="text-xs text-slate-600 flex-1">{task.label}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{task.school}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digest.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Coming Up</p>
                <div className="space-y-1">
                  {digest.upcoming.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50">
                      <span className="text-[11px] font-medium text-slate-400 flex-shrink-0 w-20">{task.dueDescription}</span>
                      <span className="text-xs text-slate-500 flex-1">{task.label}</span>
                      <span className="text-[10px] text-slate-300 flex-shrink-0">{task.school}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add school form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-primary mb-3">Add a School</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_150px_120px]">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="School name (e.g. Stanford University)"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                autoFocus
              />
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as CollegeApp['type'])}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
              >
                {APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => { setShowAddForm(false); setNewName(''); setNewDeadline(''); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button onClick={addApp} disabled={!newName.trim()} className="px-5 py-2 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-40">Add School</button>
            </div>
          </div>
        )}

        {/* Application cards */}
        {sortedApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold font-display text-primary mb-2">No applications yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add the schools you&apos;re applying to and track every deadline and task.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors"
            >
              + Add Your First School
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedApps.map(app => {
              const isExpanded = expandedApp === app.id;
              const statusInfo = getStatusInfo(app.status);
              const completedTasks = app.tasks.filter(t => t.done).length;
              const taskPct = app.tasks.length > 0 ? Math.round((completedTasks / app.tasks.length) * 100) : 0;
              const daysUntil = getDaysUntil(app.deadline);
              const isUrgent = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && app.status !== 'submitted' && app.status !== 'accepted';

              return (
                <div
                  key={app.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 ${
                    isExpanded ? 'border-accent/30 shadow-lg shadow-accent/5' : 'border-slate-100 dash-card-hover'
                  } ${isUrgent ? 'ring-2 ring-amber-200' : ''}`}
                  style={{ animationDelay: `${sortedApps.indexOf(app) * 60}ms` }}
                >
                  {/* Collapsed row */}
                  <div
                    className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 cursor-pointer"
                    onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  >
                    {/* Expand indicator */}
                    <svg className={`w-4 h-4 text-slate-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    {/* School name + type */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm lg:text-base font-bold text-primary truncate">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColors[app.type]}`}>{app.type}</span>
                      </div>
                      {app.deadline && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {daysUntil !== null && daysUntil >= 0 && (
                            <span className={`ml-2 font-semibold ${daysUntil <= 7 ? 'text-amber-500' : daysUntil <= 30 ? 'text-blue-500' : 'text-slate-400'}`}>
                              {daysUntil === 0 ? 'Due today' : daysUntil === 1 ? '1 day left' : `${daysUntil} days left`}
                            </span>
                          )}
                          {daysUntil !== null && daysUntil < 0 && (
                            <span className="ml-2 font-semibold text-slate-300">Past due</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Progress ring */}
                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full progress-animated" style={{ width: `${taskPct}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 w-8">{taskPct}%</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 lg:px-5 pb-5 border-t border-slate-100">
                      <div className="grid gap-5 lg:grid-cols-[1fr_280px] pt-4">
                        {/* Left: Tasks */}
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Checklist ({completedTasks}/{app.tasks.length})</p>
                          <div className="space-y-1.5">
                            {app.tasks.map(task => (
                              <button
                                key={task.id}
                                onClick={() => toggleTask(app.id, task.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors group"
                              >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                  task.done ? 'bg-accent border-accent' : 'border-slate-200 group-hover:border-accent/40'
                                }`}>
                                  {task.done && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-primary font-medium'}`}>{task.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Right: Status + Notes + Actions */}
                        <div className="space-y-4">
                          {/* Status selector */}
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateStatus(app.id, opt.value)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                                    app.status === opt.value
                                      ? opt.color + ' border-current/20 ring-2 ring-current/10'
                                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                            {editingNotes === app.id ? (
                              <div>
                                <textarea
                                  value={app.notes}
                                  onChange={e => updateNotes(app.id, e.target.value)}
                                  placeholder="Add notes about this application..."
                                  rows={3}
                                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                                  autoFocus
                                />
                                <button onClick={() => setEditingNotes(null)} className="text-xs text-accent font-semibold mt-1 hover:underline">Done</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingNotes(app.id)}
                                className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
                              >
                                {app.notes || 'Click to add notes...'}
                              </button>
                            )}
                          </div>

                          {/* Mobile progress */}
                          <div className="sm:hidden">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Progress</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${taskPct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-500">{taskPct}%</span>
                            </div>
                          </div>

                          {/* Quick Links */}
                          <Link
                            href="/dashboard/essays"
                            className="flex items-center gap-2 text-xs text-accent font-semibold hover:underline"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Supplemental Prompts →
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => removeApp(app.id)}
                            className="flex items-center gap-2 text-xs text-slate-300 hover:text-red-400 transition-colors mt-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove school
                          </button>
                        </div>
                      </div>

                      {/* School Research Card */}
                      {(() => {
                        const schoolData = findSchoolByName(app.name);
                        if (!schoolData) return null;
                        const isResearchOpen = showResearch === app.id;
                        return (
                          <div className="mt-4">
                            <button
                              onClick={() => setShowResearch(isResearchOpen ? null : app.id)}
                              className="flex items-center gap-2 text-xs font-bold text-accent hover:underline mb-3"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {isResearchOpen ? 'Hide' : 'Show'} School Research & Insights
                            </button>
                            {isResearchOpen && (
                              <div className="bg-gradient-to-br from-accent/5 to-purple-50 rounded-xl p-4 border border-accent/10 space-y-4">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-sm font-bold text-primary">{schoolData.name} — Research Card</h4>
                                  <div className="flex gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-semibold text-slate-400">{schoolData.acceptanceRate} accept</span>
                                    <span className="text-[10px] font-semibold text-slate-400">SAT {schoolData.avgSAT}</span>
                                    <span className="text-[10px] font-semibold text-slate-400">GPA {schoolData.avgGPA}</span>
                                  </div>
                                </div>

                                {schoolData.essayTip && (
                                  <div className="px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-[11px] text-amber-700"><span className="font-bold">Essay Tip:</span> {schoolData.essayTip}</p>
                                  </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unique Programs</p>
                                    <ul className="space-y-1">
                                      {schoolData.research.uniquePrograms.slice(0, 4).map((p, i) => (
                                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                          <span className="text-accent mt-0.5">•</span> {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notable Features</p>
                                    <ul className="space-y-1">
                                      {schoolData.research.notableFeatures.slice(0, 4).map((f, i) => (
                                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                          <span className="text-purple-500 mt-0.5">•</span> {f}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Campus Culture</p>
                                    <ul className="space-y-1">
                                      {schoolData.research.campusCulture.slice(0, 4).map((c, i) => (
                                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                          <span className="text-emerald-500 mt-0.5">•</span> {c}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Student Life</p>
                                    <ul className="space-y-1">
                                      {schoolData.research.studentLife.slice(0, 4).map((sl, i) => (
                                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                          <span className="text-amber-500 mt-0.5">•</span> {sl}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {schoolData.research.recentNews.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recent News</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {schoolData.research.recentNews.map((n, i) => (
                                        <span key={i} className="text-[10px] px-2 py-1 bg-white rounded-lg border border-slate-100 text-slate-500">{n}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <p className="text-[10px] text-slate-400 italic">Use these details in your &ldquo;Why Us&rdquo; and supplemental essays to show genuine research.</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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

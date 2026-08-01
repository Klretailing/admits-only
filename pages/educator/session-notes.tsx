import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';
import { FREE_TEMPLATES, PREMIUM_TEMPLATES, getTemplate, type LessonTemplate } from '../../lib/lessonTemplates';

interface Note {
  id: string;
  educatorId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  sortOrder: number;
  student: string;
  subject: string;
  grade: string;
  lessonDate: string;
  template: string;
  createdAt: string;
  updatedAt: string;
}

const SUBJECTS = ['Reading', 'Writing', 'Math', 'Science', 'Language', 'Test Prep', 'Study Skills', 'Other'];
const GRADES = ['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const SUBJECT_STYLES: Record<string, string> = {
  Reading: 'bg-blue-50 text-blue-600',
  Writing: 'bg-purple-50 text-purple-600',
  Math: 'bg-emerald-50 text-emerald-600',
  Science: 'bg-teal-50 text-teal-600',
  Language: 'bg-rose-50 text-rose-600',
  'Test Prep': 'bg-amber-50 text-amber-600',
  'Study Skills': 'bg-indigo-50 text-indigo-600',
  Other: 'bg-slate-100 text-slate-500',
};


const NOTE_COLORS = [
  { key: 'default', dot: 'bg-slate-300', bg: 'bg-slate-50', ring: 'ring-slate-300' },
  { key: 'blue', dot: 'bg-blue-400', bg: 'bg-blue-50', ring: 'ring-blue-400' },
  { key: 'green', dot: 'bg-emerald-400', bg: 'bg-emerald-50', ring: 'ring-emerald-400' },
  { key: 'purple', dot: 'bg-purple-400', bg: 'bg-purple-50', ring: 'ring-purple-400' },
  { key: 'amber', dot: 'bg-amber-400', bg: 'bg-amber-50', ring: 'ring-amber-400' },
  { key: 'rose', dot: 'bg-rose-400', bg: 'bg-rose-50', ring: 'ring-rose-400' },
  { key: 'teal', dot: 'bg-teal-400', bg: 'bg-teal-50', ring: 'ring-teal-400' },
] as const;

function getColorConfig(colorKey: string) {
  return NOTE_COLORS.find(c => c.key === colorKey) || NOTE_COLORS[0];
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function getFirstLine(content: string): string {
  if (!content) return '';
  const firstLine = content.split('\n')[0];
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
}

function TemplateCard({ t, locked, onClick }: { t: LessonTemplate; locked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative text-left rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden group"
    >
      <div className={`h-1.5 bg-gradient-to-r ${t.accent}`} />
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xl">{t.emoji}</span>
          {t.tier === 'premium' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
              {locked ? (
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              )}
              PREMIUM
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800">{t.name}</p>
        <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[2.5rem]">{t.tagline}</p>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {t.sections.slice(0, 4).map(s => (
            <span key={s} className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{s}</span>
          ))}
          {t.sections.length > 4 && <span className="text-[10px] text-slate-300 self-center">+{t.sections.length - 4}</span>}
        </div>
        <p className="text-[11px] font-semibold text-emerald-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {t.tier === 'free' || !locked ? 'Use this template →' : 'Preview →'}
        </p>
      </div>
    </button>
  );
}

export default function SessionNotes() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<LessonTemplate | null>(null);

  // Premium templates are preview-only for now (billing isn't set up yet).
  // Flip to true once a paid plan / entitlement is live to make them usable.
  const premiumLive = false;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  // Fetch notes
  const fetchNotes = useCallback(async (archived = false) => {
    try {
      const url = archived
        ? '/api/educator/session-notes?archived=true'
        : '/api/educator/session-notes';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(true);
      fetchNotes(showArchived);
    }
  }, [status, showArchived, fetchNotes]);

  // Keyboard shortcut: Ctrl/Cmd+N for new note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowGallery(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 300) + 'px';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [activeNoteId, resizeTextarea]);

  // Derived state
  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const filteredNotes = notes.filter(n => {
    if (subjectFilter && n.subject !== subjectFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.student || '').toLowerCase().includes(q) ||
      (n.subject || '').toLowerCase().includes(q)
    );
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // --- API helpers ---

  const createFromTemplate = async (templateId: string) => {
    const t = getTemplate(templateId);
    if (!t) return;
    if (t.tier === 'premium' && !premiumLive) return; // gated — preview only
    setShowGallery(false);
    setPreviewTemplate(null);
    try {
      const isLesson = t.id !== 'blank';
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/educator/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: t.body,
          color: t.color,
          template: t.id,
          subject: t.subject || '',
          lessonDate: isLesson ? today : '',
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const note: Note = await res.json();
      setNotes(prev => [note, ...prev]);
      setActiveNoteId(note.id);
      setMobileShowEditor(true);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } catch {
      // silently fail
    }
  };

  const debouncedSave = useCallback(
    (noteId: string, updates: Partial<Note>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/educator/session-notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: noteId, ...updates }),
          });
          if (!res.ok) throw new Error('Failed to save');
          const updated: Note = await res.json();
          setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('idle');
        }
      }, 1500);
    },
    [],
  );

  const handleUpdateField = (field: 'title' | 'content' | 'student' | 'subject' | 'grade' | 'lessonDate', value: string) => {
    if (!activeNote) return;
    // Optimistic local update
    setNotes(prev =>
      prev.map(n =>
        n.id === activeNote.id
          ? { ...n, [field]: value, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
    debouncedSave(activeNote.id, { [field]: value });
  };

  const handleSetColor = async (color: string) => {
    if (!activeNote) return;
    setNotes(prev =>
      prev.map(n => (n.id === activeNote.id ? { ...n, color } : n)),
    );
    try {
      const res = await fetch('/api/educator/session-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeNote.id, color }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
    } catch {
      // revert on failure handled by next fetch
    }
  };

  const handleTogglePin = async () => {
    if (!activeNote) return;
    const newPinned = !activeNote.pinned;
    setNotes(prev =>
      prev.map(n => (n.id === activeNote.id ? { ...n, pinned: newPinned } : n)),
    );
    try {
      const res = await fetch('/api/educator/session-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeNote.id, pinned: newPinned }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
    } catch {
      // revert
      setNotes(prev =>
        prev.map(n => (n.id === activeNote.id ? { ...n, pinned: !newPinned } : n)),
      );
    }
  };

  const handleArchive = async () => {
    if (!activeNote) return;
    const newArchived = !activeNote.archived;
    setNotes(prev => prev.filter(n => n.id !== activeNote.id));
    setActiveNoteId(null);
    setMobileShowEditor(false);
    try {
      await fetch('/api/educator/session-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeNote.id, archived: newArchived }),
      });
    } catch {
      // refetch to restore
      fetchNotes(showArchived);
    }
  };

  const handleDelete = async (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
      setMobileShowEditor(false);
    }
    setDeleteConfirmId(null);
    try {
      await fetch('/api/educator/session-notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      });
    } catch {
      fetchNotes(showArchived);
    }
  };

  const selectNote = (noteId: string) => {
    // Flush any pending save before switching
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setActiveNoteId(noteId);
    setMobileShowEditor(true);
    setDeleteConfirmId(null);
    setTimeout(() => resizeTextarea(), 50);
  };

  // Loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // ---- Render ----

  return (
    <EducatorDashboardLayout>
      <Head>
        <title>Session Notes | AdmitsOnly</title>
      </Head>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden -m-6 lg:-m-8">
        {/* ===== LEFT PANEL: Note list sidebar ===== */}
        <div
          className={`${
            mobileShowEditor ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-[300px] lg:w-[320px] border-r border-slate-200 bg-white flex-shrink-0`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold text-slate-800">Lesson Notes</h1>
              <button
                onClick={() => setShowGallery(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                title="New note from a template (Ctrl+N)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors"
              />
            </div>

            {/* Toggle: Active / Archived */}
            <div className="flex mt-3 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => { setShowArchived(false); setActiveNoteId(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !showArchived
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => { setShowArchived(true); setActiveNoteId(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  showArchived
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Archived
              </button>
            </div>

            {/* Subject filter */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5 -mx-1 px-1">
              <button
                onClick={() => setSubjectFilter('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  !subjectFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(subjectFilter === s ? '' : s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    subjectFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse text-slate-400 text-sm">Loading notes...</div>
              </div>
            ) : sortedNotes.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  {search ? 'No notes match your search' : showArchived ? 'No archived notes' : 'No notes yet'}
                </p>
                {!search && !showArchived && (
                  <button
                    onClick={() => setShowGallery(true)}
                    className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Log your first lesson
                  </button>
                )}
              </div>
            ) : (
              <div className="py-1">
                {sortedNotes.map(note => {
                  const color = getColorConfig(note.color);
                  const isActive = note.id === activeNoteId;

                  return (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note.id)}
                      className={`w-full text-left px-4 py-3 border-l-[3px] transition-all duration-150 hover:bg-slate-50 group ${
                        isActive
                          ? 'border-l-emerald-500 bg-emerald-50/50'
                          : 'border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Color dot */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${color.dot}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-medium truncate ${
                                isActive ? 'text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              {note.title || 'Untitled'}
                            </span>
                            {note.pinned && (
                              <svg
                                className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.828 3.414a2 2 0 012.828 0l1.93 1.93a2 2 0 010 2.828l-1.06 1.06 2.829 2.83a1 1 0 01-1.415 1.414l-2.828-2.829-1.061 1.06a2 2 0 01-2.828 0l-1.93-1.929a2 2 0 010-2.828l4.535-3.536zM8.414 7l-3.536 3.536a1 1 0 000 1.414l1.93 1.93a1 1 0 001.414 0L11.757 10.343 8.414 7z" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5 leading-relaxed">
                            {getFirstLine(note.content) || 'No content'}
                          </p>
                          {(note.student || note.subject) && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {note.student && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  {note.student}
                                </span>
                              )}
                              {note.subject && (
                                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${SUBJECT_STYLES[note.subject] || 'bg-slate-100 text-slate-500'}`}>
                                  {note.subject}{note.grade ? ` · ${note.grade}` : ''}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">
                            {relativeDate(note.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL: Editor ===== */}
        <div
          className={`${
            mobileShowEditor ? 'flex' : 'hidden md:flex'
          } flex-col flex-1 bg-white min-w-0`}
        >
          {!activeNote ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Select a note or create a new one</p>
                <p className="text-slate-400 text-xs mt-1">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono">Ctrl+N</kbd> to create
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile back button + toolbar */}
              <div className="border-b border-slate-100">
                {/* Mobile back row */}
                <div className="md:hidden flex items-center px-4 pt-3">
                  <button
                    onClick={() => {
                      setMobileShowEditor(false);
                      setActiveNoteId(null);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                </div>

                {/* Color picker row */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {NOTE_COLORS.map(c => (
                      <button
                        key={c.key}
                        onClick={() => handleSetColor(c.key)}
                        className={`w-6 h-6 rounded-full transition-all ${c.dot} ${
                          activeNote.color === c.key
                            ? `ring-2 ${c.ring} ring-offset-2 scale-110`
                            : 'hover:scale-110'
                        }`}
                        title={c.key.charAt(0).toUpperCase() + c.key.slice(1)}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Zoom summary — future integration */}
                    <span
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 mr-1 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 cursor-default"
                      title="Coming soon: auto-generate a lesson summary from your Zoom recording"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Zoom summary · soon
                    </span>
                    {/* Pin toggle */}
                    <button
                      onClick={handleTogglePin}
                      className={`p-2 rounded-lg transition-colors ${
                        activeNote.pinned
                          ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                    >
                      <svg className="w-4.5 h-4.5" width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.828 3.414a2 2 0 012.828 0l1.93 1.93a2 2 0 010 2.828l-1.06 1.06 2.829 2.83a1 1 0 01-1.415 1.414l-2.828-2.829-1.061 1.06a2 2 0 01-2.828 0l-1.93-1.929a2 2 0 010-2.828l4.535-3.536zM8.414 7l-3.536 3.536a1 1 0 000 1.414l1.93 1.93a1 1 0 001.414 0L11.757 10.343 8.414 7z" />
                      </svg>
                    </button>

                    {/* Archive toggle */}
                    <button
                      onClick={handleArchive}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title={activeNote.archived ? 'Unarchive' : 'Archive'}
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === activeNote.id ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => handleDelete(activeNote.id)}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(activeNote.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete note"
                      >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Editor content area */}
              <div
                className={`flex-1 overflow-y-auto ${getColorConfig(activeNote.color).bg} transition-colors duration-300`}
              >
                <div className="max-w-3xl mx-auto px-6 md:px-10 py-6">
                  {/* Title input */}
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="Untitled"
                    value={activeNote.title}
                    onChange={e => handleUpdateField('title', e.target.value)}
                    className="w-full text-2xl md:text-3xl font-semibold text-slate-800 placeholder-slate-300 bg-transparent border-none outline-none tracking-tight leading-tight"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  />

                  {/* Lesson meta row */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <div className="inline-flex items-center gap-1.5 bg-white/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <input
                        value={activeNote.student || ''}
                        onChange={e => handleUpdateField('student', e.target.value)}
                        placeholder="Student name"
                        className="text-sm text-slate-700 placeholder-slate-300 bg-transparent outline-none w-28"
                      />
                    </div>
                    <select
                      value={activeNote.subject || ''}
                      onChange={e => handleUpdateField('subject', e.target.value)}
                      className={`text-sm rounded-lg px-2.5 py-1.5 border border-slate-200 outline-none cursor-pointer ${activeNote.subject ? 'text-slate-700 bg-white/70' : 'text-slate-400 bg-white/70'}`}
                    >
                      <option value="">Subject</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={activeNote.grade || ''}
                      onChange={e => handleUpdateField('grade', e.target.value)}
                      className={`text-sm rounded-lg px-2.5 py-1.5 border border-slate-200 outline-none cursor-pointer bg-white/70 ${activeNote.grade ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                      <option value="">Grade</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <input
                      type="date"
                      value={activeNote.lessonDate || ''}
                      onChange={e => handleUpdateField('lessonDate', e.target.value)}
                      className="text-sm text-slate-700 rounded-lg px-2.5 py-1.5 border border-slate-200 outline-none bg-white/70 cursor-pointer"
                    />
                  </div>

                  {/* Content textarea */}
                  <textarea
                    ref={textareaRef}
                    placeholder="Start writing..."
                    value={activeNote.content}
                    onChange={e => handleUpdateField('content', e.target.value)}
                    onInput={resizeTextarea}
                    className="w-full mt-4 text-base md:text-[17px] text-slate-700 placeholder-slate-300 bg-transparent border-none outline-none resize-none leading-relaxed"
                    style={{
                      minHeight: '300px',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 bg-white px-5 py-2.5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>{(activeNote.content || '').length} characters</span>
                  <span>{countWords(activeNote.content)} words</span>
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                  {saveStatus === 'idle' && activeNote.updatedAt && (
                    <span>Last saved {relativeDate(activeNote.updatedAt)}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Template Gallery ===== */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowGallery(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Choose a template</h2>
                <p className="text-xs text-slate-400">Start fast with a format built for the way you tutor.</p>
              </div>
              <button onClick={() => setShowGallery(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Free · quick & simple</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {FREE_TEMPLATES.map(t => (
                    <TemplateCard key={t.id} t={t} locked={false} onClick={() => createFromTemplate(t.id)} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  Premium · deeper, parent- &amp; data-ready
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">COMING SOON</span>
                </p>
                <p className="text-xs text-slate-400 -mt-2 mb-3">Tap any premium template to preview what’s coming.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PREMIUM_TEMPLATES.map(t => (
                    <TemplateCard
                      key={t.id}
                      t={t}
                      locked={!premiumLive}
                      onClick={() => { if (premiumLive) createFromTemplate(t.id); else setPreviewTemplate(t); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Premium template preview ===== */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${previewTemplate.accent} flex-shrink-0`} />
            <div className="flex items-start justify-between px-6 pt-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{previewTemplate.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">{previewTemplate.name}</h3>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">PREMIUM</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{previewTemplate.tagline}</p>
                </div>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 pb-4 overflow-y-auto space-y-4">
              {previewTemplate.highlights && previewTemplate.highlights.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">What it is</p>
                  <ul className="space-y-1">
                    {previewTemplate.highlights.map(h => (
                      <li key={h} className="text-xs text-slate-600 flex gap-2 leading-snug">
                        <span className="text-emerald-500 flex-shrink-0">•</span>{h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewTemplate.features && previewTemplate.features.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-2">
                    Premium features
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">SOON</span>
                  </p>
                  <ul className="space-y-1">
                    {previewTemplate.features.map(f => (
                      <li key={f} className="text-xs text-slate-700 flex gap-2 leading-snug">
                        <span className="text-amber-500 flex-shrink-0">✦</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Template preview</p>
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-56 overflow-hidden">
                  <pre className="text-[12px] leading-relaxed text-slate-600 whitespace-pre-wrap" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{previewTemplate.body}</pre>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 to-transparent rounded-b-xl" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              {premiumLive ? (
                <button onClick={() => createFromTemplate(previewTemplate.id)} className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors">
                  Use this template
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2.5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs border border-amber-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Coming soon
                  </span>
                  <span className="text-xs text-slate-400">Premium templates unlock once billing is live.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}

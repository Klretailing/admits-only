import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface Note {
  id: string;
  educatorId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

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

export default function SessionNotes() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
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
        handleCreateNote();
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
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // --- API helpers ---

  const handleCreateNote = async () => {
    try {
      const res = await fetch('/api/educator/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', content: '', color: 'default' }),
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

  const handleUpdateField = (field: 'title' | 'content', value: string) => {
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
        <div className="animate-pulse text-slate-400">Loading...</div>
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
              <h1 className="text-lg font-semibold text-slate-800">Session Notes</h1>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm"
                title="New Note (Ctrl+N)"
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
                    onClick={handleCreateNote}
                    className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Create your first note
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
    </EducatorDashboardLayout>
  );
}

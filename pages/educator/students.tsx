import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface StudentNote {
  id: string;
  text: string;
  date: string;
}

interface Student {
  id: string;
  studentName: string;
  studentEmail: string;
  tags: string[];
  notes: StudentNote[];
  status: string;
  startDate: string;
  _count?: { bookings: number };
}

const TAG_OPTIONS = ['SAT Prep', 'ACT Prep', 'Essay Review', 'College Counseling', 'STEM', 'Humanities', 'Test Prep', 'Interview Prep'];

export default function EducatorStudents() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newStudent, setNewStudent] = useState({ studentName: '', studentEmail: '', tags: [] as string[] });
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  const fetchStudents = () => {
    fetch('/api/educator/students')
      .then(r => r.json())
      .then(data => { setStudents(data.students || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'authenticated') fetchStudents();
  }, [status]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/educator/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent),
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewStudent({ studentName: '', studentEmail: '', tags: [] });
      fetchStudents();
    }
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!selectedStudent || !noteText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/educator/students/${selectedStudent.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedStudent(data.student);
      setStudents(prev => prev.map(s => s.id === data.student.id ? data.student : s));
      setNoteText('');
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (studentId: string, newStatus: string) => {
    await fetch(`/api/educator/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchStudents();
  };

  const toggleTag = (tag: string) => {
    setNewStudent(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const filtered = students.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.studentName.toLowerCase().includes(search.toLowerCase()) && !s.studentEmail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="animate-pulse text-slate-400">Loading...</div></div>;
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>My Students | AdmitsOnly Educator</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">My Students</h1>
            <p className="mt-1 text-slate-500">{students.length} student{students.length !== 1 ? 's' : ''} in your roster</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Student
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="flex-1 border border-slate-200 bg-white p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <div className="flex gap-2">
            {['all', 'active', 'paused', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Student List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">No students yet</p>
            <p className="text-xs text-slate-400 mb-4">Add your first student to start tracking sessions and notes.</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">Add Your First Student</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(student => (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer"
                onClick={() => setSelectedStudent(student)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                      {student.studentName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{student.studentName}</p>
                      <p className="text-xs text-slate-400">{student.studentEmail || 'No email'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    student.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    student.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {student.status}
                  </span>
                </div>
                {student.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {student.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{student.notes.length} note{student.notes.length !== 1 ? 's' : ''}</span>
                  <span>Since {new Date(student.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-4">Add New Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Student Name</label>
                <input
                  type="text"
                  value={newStudent.studentName}
                  onChange={e => setNewStudent(p => ({ ...p, studentName: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Email (optional)</label>
                <input
                  type="email"
                  value={newStudent.studentEmail}
                  onChange={e => setNewStudent(p => ({ ...p, studentEmail: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newStudent.tags.includes(tag) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm disabled:opacity-60">{saving ? 'Adding...' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedStudent.studentName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-primary">{selectedStudent.studentName}</h2>
                  <p className="text-sm text-slate-400">{selectedStudent.studentEmail || 'No email'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Status */}
            <div className="mb-5">
              <label className="block mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
              <div className="flex gap-2">
                {['active', 'paused', 'completed'].map(s => (
                  <button
                    key={s}
                    onClick={() => { handleUpdateStatus(selectedStudent.id, s); setSelectedStudent({ ...selectedStudent, status: s }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedStudent.status === s
                        ? s === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : s === 'paused' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {selectedStudent.tags.length > 0 && (
              <div className="mb-5">
                <label className="block mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudent.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Session Notes</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Add a note about this student..."
                />
                <button
                  onClick={handleAddNote}
                  disabled={saving || !noteText.trim()}
                  className="px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {selectedStudent.notes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No notes yet. Add one after your next session.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {[...selectedStudent.notes].reverse().map(note => (
                    <div key={note.id} className="p-3 rounded-xl bg-surface border border-slate-100">
                      <p className="text-sm text-primary">{note.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

interface EssayDoc {
  id: string;
  title: string;
  collegeName: string;
  prompt: string;
  fileType: string;
  studentGpa: string;
  studentSat: string;
  studentState: string;
  studentECs: string;
  studentAwards: string;
  isFree: boolean;
  priceInCents: number;
  published: boolean;
  createdAt: string;
}

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export default function AdminEssayLibrary() {
  const { loading: guardLoading } = useAdminGuard();
  const [documents, setDocuments] = useState<EssayDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    collegeName: '',
    prompt: '',
    content: '',
    fileData: '',
    fileType: 'text',
    studentGpa: '',
    studentSat: '',
    studentState: '',
    studentECs: '',
    studentAwards: '',
    isFree: true,
    priceInCents: 0,
    published: true,
  });

  const resetForm = () => {
    setForm({
      title: '', collegeName: '', prompt: '', content: '', fileData: '', fileType: 'text',
      studentGpa: '', studentSat: '', studentState: '', studentECs: '', studentAwards: '',
      isFree: true, priceInCents: 0, published: true,
    });
    setEditingId(null);
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/essay-library');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setForm(prev => ({
        ...prev,
        fileData: base64,
        fileType: file.type.includes('pdf') ? 'pdf' : 'text',
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...form } : form;

    try {
      await fetch('/api/admin/essay-library', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      resetForm();
      setShowForm(false);
      fetchDocuments();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this essay document?')) return;
    await fetch('/api/admin/essay-library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchDocuments();
  };

  const togglePublished = async (doc: EssayDoc) => {
    await fetch('/api/admin/essay-library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, published: !doc.published }),
    });
    fetchDocuments();
  };

  if (guardLoading) return null;

  return (
    <AdminLayout>
      <Head><title>Essay Library | Admin</title></Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Essay Library</h1>
            <p className="mt-1 text-slate-500 text-sm">Upload successful college admissions essays for students to access.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Upload Essay'}
          </button>
        </div>

        {/* Upload / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
            <h3 className="text-lg font-bold text-primary">{editingId ? 'Edit Essay' : 'Upload New Essay'}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Essay Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Common App Essay - Personal Growth"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">College Name</label>
                <input
                  type="text"
                  value={form.collegeName}
                  onChange={e => setForm({ ...form, collegeName: e.target.value })}
                  placeholder="e.g. Harvard University"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Essay Prompt</label>
              <textarea
                value={form.prompt}
                onChange={e => setForm({ ...form, prompt: e.target.value })}
                placeholder="The essay prompt or question..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
            </div>

            {/* File upload or text paste */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Essay Content</label>
              <div className="flex gap-3 mb-2">
                <button
                  onClick={() => setForm({ ...form, fileType: 'text', fileData: '' })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${form.fileType === 'text' ? 'bg-accent text-white border-accent' : 'text-slate-500 border-slate-200 hover:border-accent'}`}
                >
                  Paste Text
                </button>
                <button
                  onClick={() => setForm({ ...form, fileType: 'pdf', content: '' })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${form.fileType === 'pdf' ? 'bg-accent text-white border-accent' : 'text-slate-500 border-slate-200 hover:border-accent'}`}
                >
                  Upload PDF
                </button>
              </div>
              {form.fileType === 'text' ? (
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="Paste the full essay text here..."
                  rows={8}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-mono"
                />
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" id="essay-file" />
                  <label htmlFor="essay-file" className="cursor-pointer">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <p className="text-sm text-slate-500">Click to upload PDF, DOC, or TXT</p>
                    {form.fileData && <p className="text-xs text-emerald-600 mt-1 font-semibold">File uploaded successfully</p>}
                  </label>
                </div>
              )}
            </div>

            {/* Student Profile Context */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-bold text-primary mb-3">Student Profile Context</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">GPA</label>
                  <input
                    type="text"
                    value={form.studentGpa}
                    onChange={e => setForm({ ...form, studentGpa: e.target.value })}
                    placeholder="e.g. 3.95"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">SAT Score</label>
                  <input
                    type="text"
                    value={form.studentSat}
                    onChange={e => setForm({ ...form, studentSat: e.target.value })}
                    placeholder="e.g. 1520"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">State</label>
                  <select
                    value={form.studentState}
                    onChange={e => setForm({ ...form, studentState: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">Select state</option>
                    {US_STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Extracurriculars</label>
                  <input
                    type="text"
                    value={form.studentECs}
                    onChange={e => setForm({ ...form, studentECs: e.target.value })}
                    placeholder="e.g. Debate Team Captain, Math Olympiad, Volunteering"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Awards & Honors</label>
                  <input
                    type="text"
                    value={form.studentAwards}
                    onChange={e => setForm({ ...form, studentAwards: e.target.value })}
                    placeholder="e.g. National Merit Semifinalist, AP Scholar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            </div>

            {/* Publishing Options */}
            <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm({ ...form, published: e.target.checked })}
                  className="rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-slate-600">Published (visible to students)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={e => setForm({ ...form, isFree: e.target.checked })}
                  className="rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-slate-600">Free access</span>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.title.trim()}
                className="px-6 py-2 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Essay' : 'Upload Essay'}
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-lg font-bold text-primary">No essays uploaded yet</h3>
            <p className="text-sm text-slate-500 mt-1">Upload successful college admissions essays for students to learn from.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-primary truncate">{doc.title}</h4>
                      {doc.collegeName && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full flex-shrink-0">{doc.collegeName}</span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ${doc.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {doc.published ? 'Published' : 'Draft'}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ${doc.isFree ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {doc.isFree ? 'Free' : `$${(doc.priceInCents / 100).toFixed(2)}`}
                      </span>
                    </div>
                    {doc.prompt && <p className="text-xs text-slate-400 truncate mb-1">{doc.prompt}</p>}
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {doc.studentGpa && <span>GPA: {doc.studentGpa}</span>}
                      {doc.studentSat && <span>SAT: {doc.studentSat}</span>}
                      {doc.studentState && <span>State: {doc.studentState}</span>}
                      {doc.studentECs && <span>ECs: {doc.studentECs.substring(0, 50)}{doc.studentECs.length > 50 ? '...' : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePublished(doc)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      {doc.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

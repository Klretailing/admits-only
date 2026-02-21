import Head from 'next/head';
import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const mockEssays = [
  { id: 1, title: 'Personal Statement', student: 'Maya Johnson', prompt: 'Discuss a meaningful experience...', status: 'review', score: null, drafts: 3, submitted: 'Feb 16, 2026' },
  { id: 2, title: 'Why Stanford', student: 'Aisha Patel', prompt: 'What excites you about Stanford...', status: 'review', score: null, drafts: 2, submitted: 'Feb 15, 2026' },
  { id: 3, title: 'Extracurricular Essay', student: 'James Williams', prompt: 'Describe an activity that is meaningful...', status: 'review', score: null, drafts: 1, submitted: 'Feb 14, 2026' },
  { id: 4, title: 'Personal Statement', student: 'Emma Thompson', prompt: 'Discuss a meaningful experience...', status: 'scored', score: 9.2, drafts: 4, submitted: 'Feb 12, 2026' },
  { id: 5, title: 'Why MIT', student: 'David Kim', prompt: 'Why is MIT a good fit for you...', status: 'scored', score: 8.8, drafts: 3, submitted: 'Feb 10, 2026' },
  { id: 6, title: 'Diversity Essay', student: 'Carlos Rivera', prompt: 'How will you contribute to diversity...', status: 'scored', score: 8.5, drafts: 2, submitted: 'Feb 8, 2026' },
  { id: 7, title: 'Personal Statement', student: 'Sofia Garcia', prompt: 'Discuss a meaningful experience...', status: 'draft', score: null, drafts: 1, submitted: 'Feb 5, 2026' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  review: { label: 'Needs Review', color: 'bg-amber-50 text-amber-700' },
  scored: { label: 'Scored', color: 'bg-green-50 text-green-700' },
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-500' },
};

export default function AdminEssays() {
  const { loading } = useAdminGuard();
  const [tab, setTab] = useState<'review' | 'scored' | 'all'>('review');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const essays = mockEssays.filter((e) => tab === 'all' || e.status === tab);
  const pendingCount = mockEssays.filter((e) => e.status === 'review').length;

  return (
    <AdminLayout>
      <Head><title>Essays | Admin — AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Essays</h1>
            <p className="mt-1 text-slate-500">{pendingCount} essays awaiting review</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'review' as const, label: `Needs Review (${pendingCount})` },
            { key: 'scored' as const, label: 'Scored' },
            { key: 'all' as const, label: 'All' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-accent text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Essay cards */}
        <div className="space-y-3">
          {essays.map((essay) => (
            <div key={essay.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-primary">{essay.title}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusConfig[essay.status]?.color}`}>
                      {statusConfig[essay.status]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    by <span className="font-medium text-primary">{essay.student}</span>
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-1">{essay.prompt}</p>
                </div>
                <div className="flex items-center gap-6 sm:text-right">
                  <div>
                    <p className="text-xs text-slate-400">Drafts</p>
                    <p className="text-sm font-semibold text-primary">{essay.drafts}</p>
                  </div>
                  {essay.score !== null && (
                    <div>
                      <p className="text-xs text-slate-400">Score</p>
                      <p className="text-sm font-bold text-accent">{essay.score}/10</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">Submitted</p>
                    <p className="text-sm text-slate-600">{essay.submitted}</p>
                  </div>
                  {essay.status === 'review' && (
                    <button className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors">
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {essays.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No essays to display.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

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
  createdAt: string;
}

interface EssayDocFull extends EssayDoc {
  content: string;
  fileData: string;
}

export default function EssayLibrary() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<EssayDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<EssayDocFull | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/essay-library')
      .then(r => r.json())
      .then(data => setDocuments(data.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const openDocument = async (id: string) => {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/essay-library?id=${id}`);
      const data = await res.json();
      if (data.document) setSelectedDoc(data.document);
    } catch { /* silent */ }
    setLoadingDoc(false);
  };

  const filteredDocs = documents.filter(doc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.collegeName.toLowerCase().includes(q) ||
      doc.studentState.toLowerCase().includes(q) ||
      doc.studentECs.toLowerCase().includes(q) ||
      doc.prompt.toLowerCase().includes(q)
    );
  });

  if (status !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <Head><title>Essay Library | AdmitsOnly</title></Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Essay Library</h1>
          <p className="mt-1 text-slate-500 text-sm">Read successful college admissions essays from admitted students.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by college, state, topic..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Document reader modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{selectedDoc.title}</h2>
                    {selectedDoc.collegeName && (
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-accent/10 text-accent text-xs font-bold rounded-full">{selectedDoc.collegeName}</span>
                    )}
                    {selectedDoc.prompt && (
                      <p className="text-xs text-slate-400 mt-2 italic">&ldquo;{selectedDoc.prompt}&rdquo;</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Student profile tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDoc.studentGpa && (
                    <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded-lg">GPA: {selectedDoc.studentGpa}</span>
                  )}
                  {selectedDoc.studentSat && (
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[11px] font-semibold rounded-lg">SAT: {selectedDoc.studentSat}</span>
                  )}
                  {selectedDoc.studentState && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg">State: {selectedDoc.studentState}</span>
                  )}
                  {selectedDoc.studentECs && selectedDoc.studentECs.split(',').map((ec, i) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-lg">{ec.trim()}</span>
                  ))}
                  {selectedDoc.studentAwards && selectedDoc.studentAwards.split(',').map((award, i) => (
                    <span key={i} className="px-2.5 py-1 bg-pink-50 text-pink-700 text-[11px] font-semibold rounded-lg">{award.trim()}</span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedDoc.fileType === 'pdf' && selectedDoc.fileData ? (
                  <iframe
                    src={`data:application/pdf;base64,${selectedDoc.fileData}`}
                    className="w-full h-[60vh] rounded-lg border border-slate-100"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {selectedDoc.content.split('\n').map((para, i) => (
                      para.trim() ? <p key={i} className="text-sm text-slate-700 leading-relaxed mb-3">{para}</p> : <br key={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading essay library...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h3 className="text-lg font-bold text-primary">
              {searchQuery ? 'No essays match your search' : 'Essay library coming soon'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term.' : 'Successful admissions essays will be available here shortly.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => openDocument(doc.id)}
                className="text-left bg-white rounded-2xl border border-slate-100 p-5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  {doc.collegeName && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full">{doc.collegeName}</span>
                  )}
                  {doc.isFree ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full ml-auto">Free</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full ml-auto">${(doc.priceInCents / 100).toFixed(2)}</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-2">{doc.title}</h4>
                {doc.prompt && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">{doc.prompt}</p>}

                {/* Student stats */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {doc.studentGpa && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded">GPA: {doc.studentGpa}</span>}
                  {doc.studentSat && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded">SAT: {doc.studentSat}</span>}
                  {doc.studentState && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded">{doc.studentState}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {loadingDoc && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-xl px-6 py-4 shadow-xl">
              <p className="text-sm text-slate-500 animate-pulse">Loading essay...</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

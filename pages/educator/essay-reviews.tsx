import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Annotation {
  id: string;
  paragraphIndex: number;
  type: 'strength' | 'suggestion' | 'issue' | 'question';
  comment: string;
}

interface TutorScores {
  structure: number;
  voice: number;
  argument: number;
  grammar: number;
  impact: number;
}

interface Review {
  id: string;
  essayId: string;
  studentId: string;
  tutorId: string | null;
  status: string;
  priority: string | null;
  studentNote: string | null;
  tutorFeedback: string | null;
  annotations: Annotation[] | null;
  scores: TutorScores | null;
  submittedAt: string;
  reviewedAt: string | null;
  essayTitle: string;
  essayPrompt: string | null;
  essayContent: string;
  aiScore: number | null;
  vocabScore: number | null;
  grammarScore: number | null;
  originalityScore: number | null;
  overallScore: number | null;
  studentName: string;
}

type ViewState =
  | { type: 'queue'; filter: string }
  | { type: 'review'; reviewId: string };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

function avgSentenceLength(text: string | null): number {
  if (!text) return 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + wordCount(s), 0);
  return Math.round(totalWords / sentences.length);
}

function charCount(text: string | null): number {
  if (!text) return 0;
  return text.length;
}

function scoreBarColor(score: number | null): string {
  if (score === null || score === undefined) return 'bg-slate-200';
  if (score > 7) return 'bg-emerald-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-rose-500';
}

function scoreBarBg(score: number | null): string {
  if (score === null || score === undefined) return 'bg-slate-100';
  if (score > 7) return 'bg-emerald-50';
  if (score >= 5) return 'bg-amber-50';
  return 'bg-rose-50';
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_review: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  returned: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const ANNOTATION_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; light: string }> = {
  strength: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', light: 'bg-emerald-500/10' },
  suggestion: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', light: 'bg-blue-500/10' },
  issue: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', light: 'bg-rose-500/10' },
  question: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', light: 'bg-amber-500/10' },
};

const ANNOTATION_TYPES: { value: Annotation['type']; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'issue', label: 'Issue' },
  { value: 'question', label: 'Question' },
];

const SCORE_DIMENSIONS: { key: keyof TutorScores; label: string }[] = [
  { key: 'structure', label: 'Structure & Organization' },
  { key: 'voice', label: 'Voice & Authenticity' },
  { key: 'argument', label: 'Argument & Evidence' },
  { key: 'grammar', label: 'Grammar & Mechanics' },
  { key: 'impact', label: 'Admissions Impact' },
];

const AUTO_SCORE_LABELS: { key: string; label: string }[] = [
  { key: 'aiScore', label: 'Voice & Authenticity' },
  { key: 'vocabScore', label: 'Language & Precision' },
  { key: 'grammarScore', label: 'Structure & Coherence' },
  { key: 'originalityScore', label: 'Storytelling' },
  { key: 'overallScore', label: 'Admissions Impact' },
];

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

const DEFAULT_SCORES: TutorScores = { structure: 5, voice: 5, argument: 5, grammar: 5, impact: 5 };

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function EssayReviews() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ type: 'queue', filter: 'all' });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Review editing state
  const [tutorFeedback, setTutorFeedback] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scores, setScores] = useState<TutorScores>({ ...DEFAULT_SCORES });
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState<{
    paragraphIndex: number;
    type: Annotation['type'];
    comment: string;
    editingId: string | null;
  }>({ paragraphIndex: 0, type: 'suggestion', comment: '', editingId: null });

  // Auto-save ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeReviewId = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && !['educator','admin'].includes((session?.user as any)?.role)) router.push('/dashboard');
  }, [status, session, router]);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    fetch('/api/educator/essay-reviews')
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchReviews();
  }, [status, fetchReviews]);

  // Auto-save logic
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const reviewId = activeReviewId.current;
      if (!reviewId) return;
      fetch('/api/educator/essay-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action: 'save',
          tutorFeedback,
          annotations,
          scores,
        }),
      }).catch(() => {});
    }, 3000);
  }, [tutorFeedback, annotations, scores]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleAction = async (reviewId: string, action: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { reviewId, action };
      if (action === 'save' || action === 'complete' || action === 'return') {
        body.tutorFeedback = tutorFeedback;
        body.annotations = annotations;
        body.scores = scores;
      }
      const res = await fetch('/api/educator/essay-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (action === 'complete' || action === 'return') {
          activeReviewId.current = null;
          setView({ type: 'queue', filter: 'all' });
          fetchReviews();
        } else {
          fetchReviews();
        }
      }
    } catch {
      // silent fail
    }
    setActionLoading(false);
  };

  const openReview = async (review: Review) => {
    // Claim if pending
    if (review.status === 'pending') {
      setActionLoading(true);
      try {
        await fetch('/api/educator/essay-reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: review.id, action: 'claim' }),
        });
        fetchReviews();
      } catch {
        // continue anyway
      }
      setActionLoading(false);
    }
    // Initialize editing state
    setTutorFeedback(review.tutorFeedback || '');
    setAnnotations(review.annotations || []);
    setScores(review.scores || { ...DEFAULT_SCORES });
    activeReviewId.current = review.id;
    setView({ type: 'review', reviewId: review.id });
  };

  const backToQueue = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    activeReviewId.current = null;
    setView({ type: 'queue', filter: 'all' });
  };

  const openAnnotationModal = (paragraphIndex: number) => {
    setAnnotationDraft({ paragraphIndex, type: 'suggestion', comment: '', editingId: null });
    setShowAnnotationModal(true);
  };

  const openNewAnnotationModal = () => {
    setAnnotationDraft({ paragraphIndex: 0, type: 'suggestion', comment: '', editingId: null });
    setShowAnnotationModal(true);
  };

  const saveAnnotation = () => {
    if (!annotationDraft.comment.trim()) return;
    if (annotationDraft.editingId) {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationDraft.editingId
            ? { ...a, paragraphIndex: annotationDraft.paragraphIndex, type: annotationDraft.type, comment: annotationDraft.comment }
            : a
        )
      );
    } else {
      const newAnnotation: Annotation = {
        id: generateId(),
        paragraphIndex: annotationDraft.paragraphIndex,
        type: annotationDraft.type,
        comment: annotationDraft.comment,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    }
    setShowAnnotationModal(false);
    triggerAutoSave();
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    triggerAutoSave();
  };

  const editAnnotation = (annotation: Annotation) => {
    setAnnotationDraft({
      paragraphIndex: annotation.paragraphIndex,
      type: annotation.type,
      comment: annotation.comment,
      editingId: annotation.id,
    });
    setShowAnnotationModal(true);
  };

  const updateScore = (key: keyof TutorScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
    triggerAutoSave();
  };

  const handleFeedbackChange = (value: string) => {
    setTutorFeedback(value);
    triggerAutoSave();
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const currentReview = view.type === 'review' ? reviews.find((r) => r.id === view.reviewId) || null : null;

  return (
    <EducatorDashboardLayout>
      <Head>
        <title>Essay Review Queue | AdmitsOnly Educator</title>
      </Head>

      {view.type === 'queue' ? (
        <QueueView
          reviews={reviews}
          loading={loading}
          filter={view.filter}
          onFilterChange={(f) => setView({ type: 'queue', filter: f })}
          onOpenReview={openReview}
          actionLoading={actionLoading}
        />
      ) : (
        currentReview && (
          <ReviewInterface
            review={currentReview}
            tutorFeedback={tutorFeedback}
            annotations={annotations}
            scores={scores}
            actionLoading={actionLoading}
            onBack={backToQueue}
            onFeedbackChange={handleFeedbackChange}
            onAddAnnotation={openAnnotationModal}
            onNewAnnotation={openNewAnnotationModal}
            onEditAnnotation={editAnnotation}
            onDeleteAnnotation={deleteAnnotation}
            onUpdateScore={updateScore}
            onAction={(action) => handleAction(currentReview.id, action)}
          />
        )
      )}

      {/* Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowAnnotationModal(false)} />
          <div className="relative bg-white rounded-2xl modal-card w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-4">
              {annotationDraft.editingId ? 'Edit Annotation' : 'Add Annotation'}
            </h2>

            {/* Type selection */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-primary">Type</label>
              <div className="flex gap-2">
                {ANNOTATION_TYPES.map((t) => {
                  const colors = ANNOTATION_COLORS[t.value];
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAnnotationDraft((prev) => ({ ...prev, type: t.value }))}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        annotationDraft.type === t.value
                          ? `${colors.bg} ${colors.text} ${colors.border}`
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paragraph number */}
            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-semibold text-primary">Paragraph Number</label>
              <input
                type="number"
                min={0}
                value={annotationDraft.paragraphIndex + 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    setAnnotationDraft((prev) => ({ ...prev, paragraphIndex: val - 1 }));
                  }
                }}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Comment */}
            <div className="mb-5">
              <label className="block mb-1.5 text-sm font-semibold text-primary">Comment</label>
              <textarea
                value={annotationDraft.comment}
                onChange={(e) => setAnnotationDraft((prev) => ({ ...prev, comment: e.target.value }))}
                rows={4}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                placeholder="Write your annotation comment..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAnnotationModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAnnotation}
                disabled={!annotationDraft.comment.trim()}
                className="flex-1 btn-primary text-sm disabled:opacity-60"
              >
                {annotationDraft.editingId ? 'Update' : 'Add Annotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue View                                                         */
/* ------------------------------------------------------------------ */

function QueueView({
  reviews,
  loading,
  filter,
  onFilterChange,
  onOpenReview,
  actionLoading,
}: {
  reviews: Review[];
  loading: boolean;
  filter: string;
  onFilterChange: (f: string) => void;
  onOpenReview: (r: Review) => void;
  actionLoading: boolean;
}) {
  const FILTERS = ['all', 'pending', 'in_review', 'completed', 'returned'];

  const filtered = reviews.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const inReviewCount = reviews.filter((r) => r.status === 'in_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display text-primary">Essay Review Queue</h1>
          {(pendingCount + inReviewCount) > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {pendingCount + inReviewCount} active
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {reviews.length} total review{reviews.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {formatStatus(f === 'all' ? 'all' : f)}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No reviews found</p>
          <p className="text-xs text-slate-400">
            {filter === 'all'
              ? 'No essays have been submitted for review yet.'
              : `No reviews with status "${formatStatus(filter)}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onOpen={() => onOpenReview(review)}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review Card (queue item)                                           */
/* ------------------------------------------------------------------ */

function ReviewCard({
  review,
  onOpen,
  actionLoading,
}: {
  review: Review;
  onOpen: () => void;
  actionLoading: boolean;
}) {
  const statusClass = STATUS_BADGE[review.status] || 'bg-slate-50 text-slate-500 border border-slate-200';
  const isActionable = review.status === 'pending' || review.status === 'in_review';
  const promptSnippet = review.essayPrompt
    ? review.essayPrompt.length > 100
      ? review.essayPrompt.substring(0, 100) + '...'
      : review.essayPrompt
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: avatar + content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(review.studentName?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-primary">{review.studentName || 'Unknown Student'}</p>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusClass}`}>
                {formatStatus(review.status)}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1 truncate">
              {review.essayTitle || 'Untitled Essay'}
            </p>
            {promptSnippet && (
              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{promptSnippet}</p>
            )}
            {review.studentNote && (
              <div className="flex items-start gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="text-xs text-slate-500 italic line-clamp-2">{review.studentNote}</p>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Submitted {relativeTime(review.submittedAt)}
            </p>
          </div>
        </div>

        {/* Right: action */}
        <div className="shrink-0 self-center sm:self-start">
          <button
            onClick={onOpen}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 ${
              isActionable
                ? 'btn-primary text-sm'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {isActionable ? 'Review' : 'View'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review Interface (two-column)                                      */
/* ------------------------------------------------------------------ */

function ReviewInterface({
  review,
  tutorFeedback,
  annotations,
  scores,
  actionLoading,
  onBack,
  onFeedbackChange,
  onAddAnnotation,
  onNewAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onUpdateScore,
  onAction,
}: {
  review: Review;
  tutorFeedback: string;
  annotations: Annotation[];
  scores: TutorScores;
  actionLoading: boolean;
  onBack: () => void;
  onFeedbackChange: (value: string) => void;
  onAddAnnotation: (paragraphIndex: number) => void;
  onNewAnnotation: () => void;
  onEditAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateScore: (key: keyof TutorScores, value: number) => void;
  onAction: (action: string) => void;
}) {
  const essayParagraphs = paragraphs(review.essayContent);
  const wc = wordCount(review.essayContent);
  const pc = essayParagraphs.length;
  const asl = avgSentenceLength(review.essayContent);
  const cc = charCount(review.essayContent);
  const isEditable = review.status === 'pending' || review.status === 'in_review';

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to queue
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {(review.studentName?.[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-primary">{review.essayTitle || 'Untitled Essay'}</h1>
          <p className="text-sm text-slate-500">by {review.studentName || 'Unknown Student'}</p>
        </div>
        <span className={`ml-auto shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${STATUS_BADGE[review.status] || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {formatStatus(review.status)}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: Essay content */}
        <div className="lg:w-[60%] space-y-4">
          {/* Prompt */}
          {review.essayPrompt && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Essay Prompt</p>
              <p className="text-sm text-slate-700 leading-relaxed">{review.essayPrompt}</p>
            </div>
          )}

          {/* Student note */}
          {review.studentNote && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Student Note</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">{review.studentNote}</p>
            </div>
          )}

          {/* Essay paragraphs */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Essay Content</p>
            <div className="space-y-1">
              {essayParagraphs.length > 0 ? (
                essayParagraphs.map((para, idx) => {
                  const paraAnnotations = annotations.filter((a) => a.paragraphIndex === idx);
                  const hasAnnotations = paraAnnotations.length > 0;
                  return (
                    <div key={idx} className="group relative">
                      {/* Paragraph with click target */}
                      <div className="flex gap-2">
                        {/* Annotation markers sidebar */}
                        <div className="w-3 shrink-0 flex flex-col gap-1 pt-1">
                          {paraAnnotations.map((a) => {
                            const colors = ANNOTATION_COLORS[a.type] || ANNOTATION_COLORS.suggestion;
                            return (
                              <div
                                key={a.id}
                                className={`w-3 h-3 rounded-full ${colors.dot} cursor-pointer`}
                                title={`${a.type}: ${a.comment}`}
                                onClick={() => onEditAnnotation(a)}
                              />
                            );
                          })}
                        </div>
                        <div
                          className={`flex-1 rounded-lg px-3 py-2 transition-all cursor-pointer ${
                            hasAnnotations
                              ? 'bg-slate-50 border border-slate-100'
                              : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                          } ${isEditable ? 'cursor-pointer' : ''}`}
                          onClick={() => isEditable && onAddAnnotation(idx)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap flex-1">
                              {para.trim()}
                            </p>
                            {isEditable && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-300 mt-1 block">Paragraph {idx + 1}</span>
                        </div>
                      </div>

                      {/* Inline annotations */}
                      {paraAnnotations.length > 0 && (
                        <div className="ml-5 mt-1 mb-3 space-y-1.5">
                          {paraAnnotations.map((a) => {
                            const colors = ANNOTATION_COLORS[a.type] || ANNOTATION_COLORS.suggestion;
                            return (
                              <div
                                key={a.id}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border}`}
                              >
                                <span className={`text-[10px] font-bold uppercase mt-0.5 shrink-0 ${colors.text}`}>
                                  {a.type}
                                </span>
                                <p className={`text-xs ${colors.text} flex-1`}>{a.comment}</p>
                                {isEditable && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onEditAnnotation(a); }}
                                      className={`p-1 rounded ${colors.text} hover:opacity-70 transition-opacity`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(a.id); }}
                                      className={`p-1 rounded ${colors.text} hover:opacity-70 transition-opacity`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400 italic">No essay content available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Tools (sticky) */}
        <div className="lg:w-[40%]">
          <div className="lg:sticky lg:top-4 space-y-4 pb-24 lg:pb-4">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Stats</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{wc}</p>
                  <p className="text-[10px] text-slate-400">Words</p>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{pc}</p>
                  <p className="text-[10px] text-slate-400">Paragraphs</p>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{asl}</p>
                  <p className="text-[10px] text-slate-400">Avg Sentence Len</p>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{cc.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Characters</p>
                </div>
              </div>
            </div>

            {/* Auto Scores */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Auto Scores</p>
              <div className="space-y-3">
                {AUTO_SCORE_LABELS.map((item) => {
                  const val = review[item.key as keyof Review] as number | null;
                  const displayVal = val !== null && val !== undefined ? val : null;
                  const pct = displayVal !== null ? (displayVal / 10) * 100 : 0;
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <span className={`text-xs font-bold ${displayVal !== null ? (displayVal > 7 ? 'text-emerald-600' : displayVal >= 5 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400'}`}>
                          {displayVal !== null ? displayVal.toFixed(1) : '--'}
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${scoreBarBg(displayVal)}`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${scoreBarColor(displayVal)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tutor Scoring Rubric */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tutor Scoring</p>
              <div className="space-y-4">
                {SCORE_DIMENSIONS.map((dim) => {
                  const val = scores[dim.key] ?? 5;
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-600">{dim.label}</span>
                        <span className={`text-xs font-bold ${val > 7 ? 'text-emerald-600' : val >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {val}/10
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            disabled={!isEditable}
                            onClick={() => onUpdateScore(dim.key, n)}
                            className={`flex-1 h-7 rounded-md text-[10px] font-bold transition-all ${
                              n <= val
                                ? val > 7
                                  ? 'bg-emerald-500 text-white'
                                  : val >= 5
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-500 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${!isEditable ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Annotations panel */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Annotations ({annotations.length})
                </p>
                {isEditable && (
                  <button
                    onClick={onNewAnnotation}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </button>
                )}
              </div>
              {annotations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  No annotations yet. Click on a paragraph to add one.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {annotations.map((a) => {
                    const colors = ANNOTATION_COLORS[a.type] || ANNOTATION_COLORS.suggestion;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${colors.bg} ${colors.border} hover:opacity-90 transition-opacity`}
                        onClick={() => isEditable && onEditAnnotation(a)}
                      >
                        <div className={`w-5 h-5 rounded-full ${colors.dot} flex items-center justify-center shrink-0 mt-0.5`}>
                          <span className="text-[8px] font-bold text-white">{a.paragraphIndex + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold uppercase ${colors.text}`}>{a.type}</span>
                          <p className={`text-xs ${colors.text} mt-0.5 line-clamp-2`}>{a.comment}</p>
                        </div>
                        {isEditable && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(a.id); }}
                            className={`p-1 rounded shrink-0 ${colors.text} hover:opacity-70 transition-opacity`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overall Feedback */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overall Feedback</p>
              <textarea
                value={tutorFeedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
                disabled={!isEditable}
                rows={6}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none disabled:opacity-60 disabled:cursor-default"
                placeholder="Write your overall feedback for the student..."
              />
            </div>

            {/* Action bar (sticky on mobile, static in sidebar on desktop) */}
            {isEditable && (
              <div className="fixed bottom-0 left-0 right-0 lg:static bg-white border-t border-slate-100 lg:border lg:border-slate-100 lg:rounded-2xl p-4 lg:p-5 flex gap-3 z-40">
                <button
                  onClick={() => onAction('save')}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => onAction('return')}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl border border-purple-200 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-60"
                >
                  Return to Student
                </button>
                <button
                  onClick={() => onAction('complete')}
                  disabled={actionLoading}
                  className="flex-1 btn-primary text-sm disabled:opacity-60"
                >
                  {actionLoading ? 'Completing...' : 'Complete Review'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

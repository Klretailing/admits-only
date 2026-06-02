import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface StudentProfile {
  gpa: number | null;
  gpaScale: number | null;
  satMath: number | null;
  satRW: number | null;
  holisticScore: number | null;
  percentile: number | null;
}

interface EssayCounts {
  draft: number;
  inReview: number;
  complete: number;
  total: number;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  connectedAt: string;
  profile: StudentProfile | null;
  essayCounts: EssayCounts;
  applicationCount: number;
  pendingReviews: number;
}

interface Essay {
  id: string;
  title: string;
  status: string;
  overallScore: number | null;
  updatedAt: string;
}

interface Application {
  name: string;
  status: string;
  type: string;
  deadline: string | null;
  tasks: number;
}

interface StudentDetail extends StudentSummary {
  essays: Essay[];
  applications: Application[];
}

type ViewState = { type: 'list' } | { type: 'detail'; studentId: string };

function satComposite(profile: StudentProfile | null): number | null {
  if (!profile) return null;
  if (profile.satMath == null && profile.satRW == null) return null;
  return (profile.satMath ?? 0) + (profile.satRW ?? 0);
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function holisticRingColor(score: number | null): string {
  if (score == null) return 'border-slate-200';
  if (score >= 70) return 'border-emerald-500';
  if (score >= 50) return 'border-amber-500';
  return 'border-red-400';
}

const essayStatusBadge: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200',
  complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const appStatusBadge: Record<string, string> = {
  not_started: 'bg-slate-50 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  waitlisted: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function StudentProgress() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ type: 'list' });
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchStudents();
  }, [status]);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/educator/student-progress');
      if (!res.ok) throw new Error('Failed to load students');
      const data = await res.json();
      setStudents(data.students ?? []);
    } catch (err) {
      setError('Could not load student data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (studentId: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/educator/student-progress?studentId=${studentId}`);
      if (!res.ok) throw new Error('Failed to load student detail');
      const data = await res.json();
      const student = (data.students ?? [])[0] ?? null;
      setDetail(student);
    } catch {
      setError('Could not load student details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (studentId: string) => {
    setView({ type: 'detail', studentId });
    fetchDetail(studentId);
  };

  const backToList = () => {
    setView({ type: 'list' });
    setDetail(null);
    setError('');
  };

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

  return (
    <EducatorDashboardLayout>
      <Head>
        <title>Student Progress | AdmitsOnly Educator</title>
      </Head>

      <div className="space-y-6">
        {view.type === 'list' ? (
          <ListView
            students={students}
            loading={loading}
            error={error}
            onViewDetail={openDetail}
          />
        ) : (
          <DetailView
            detail={detail}
            loading={detailLoading}
            error={error}
            onBack={backToList}
          />
        )}
      </div>
    </EducatorDashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  List View                                                          */
/* ------------------------------------------------------------------ */

function ListView({
  students,
  loading,
  error,
  onViewDetail,
}: {
  students: StudentSummary[];
  loading: boolean;
  error: string;
  onViewDetail: (id: string) => void;
}) {
  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-primary">Student Progress</h1>
        <p className="mt-1 text-slate-500">
          {students.length} connected student{students.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No connected students yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ask your students for their connection code, then enter it in{' '}
            <span className="font-medium text-emerald-600">My Students &gt; Add Student</span> to link accounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} onViewDetail={onViewDetail} />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Student Card                                                       */
/* ------------------------------------------------------------------ */

function StudentCard({
  student,
  onViewDetail,
}: {
  student: StudentSummary;
  onViewDetail: (id: string) => void;
}) {
  const composite = satComposite(student.profile);
  const holistic = student.profile?.holisticScore ?? null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
      {/* Name row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(student.name?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{student.name}</p>
          <p className="text-xs text-slate-400 truncate">{student.email}</p>
        </div>
        {student.pendingReviews > 0 && (
          <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
            {student.pendingReviews} pending
          </span>
        )}
      </div>

      {/* Academic snapshot */}
      <div className="flex items-center gap-3 mb-4">
        {student.profile?.gpa != null && (
          <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            GPA {student.profile.gpa}
            {student.profile.gpaScale ? `/${student.profile.gpaScale}` : ''}
          </span>
        )}
        {composite != null && (
          <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            SAT {composite}
          </span>
        )}
        {holistic != null && (
          <div
            className={`w-9 h-9 rounded-full border-[3px] ${holisticRingColor(holistic)} flex items-center justify-center`}
          >
            <span className="text-[10px] font-bold text-slate-700">{holistic}</span>
          </div>
        )}
      </div>

      {/* Essay counts */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span>
          <span className="font-medium text-amber-600">{student.essayCounts?.draft ?? 0}</span> Draft
        </span>
        <span>
          <span className="font-medium text-blue-600">{student.essayCounts?.inReview ?? 0}</span> In Review
        </span>
        <span>
          <span className="font-medium text-emerald-600">{student.essayCounts?.complete ?? 0}</span> Complete
        </span>
      </div>

      {/* Application count */}
      <div className="text-xs text-slate-500 mb-4">
        {student.applicationCount ?? 0} application{(student.applicationCount ?? 0) !== 1 ? 's' : ''} tracked
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[11px] text-slate-400">
          Connected {new Date(student.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          onClick={() => onViewDetail(student.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail View                                                        */
/* ------------------------------------------------------------------ */

function DetailView({
  detail,
  loading,
  error,
  onBack,
}: {
  detail: StudentDetail | null;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to overview
        </button>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to overview
        </button>
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <p className="text-sm text-slate-500">{error || 'Student not found.'}</p>
        </div>
      </>
    );
  }

  const profile = detail.profile;
  const composite = satComposite(profile);

  return (
    <>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to overview
      </button>

      {/* Student header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
          {(detail.name?.[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">{detail.name}</h1>
          <p className="text-sm text-slate-400">{detail.email}</p>
        </div>
      </div>

      {/* Profile stats */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Academic Profile</h2>
        {profile ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="GPA"
              value={profile.gpa != null ? `${profile.gpa}` : '--'}
              sub={profile.gpaScale != null ? `/ ${profile.gpaScale}` : undefined}
            />
            <StatCard
              label="SAT Math"
              value={profile.satMath != null ? `${profile.satMath}` : '--'}
            />
            <StatCard
              label="SAT R&W"
              value={profile.satRW != null ? `${profile.satRW}` : '--'}
            />
            <StatCard
              label="SAT Composite"
              value={composite != null ? `${composite}` : '--'}
            />
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col items-center justify-center">
              <div
                className={`w-14 h-14 rounded-full border-4 ${holisticRingColor(profile.holisticScore)} flex items-center justify-center mb-1`}
              >
                <span className="text-lg font-bold text-slate-700">
                  {profile.holisticScore ?? '--'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Holistic / 100</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-sm text-slate-400">No profile data available yet.</p>
          </div>
        )}
      </div>

      {/* Essays */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Essays ({detail.essays?.length ?? 0})
        </h2>
        {!detail.essays || detail.essays.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-sm text-slate-400">No essays yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="py-3 px-5" />
                  </tr>
                </thead>
                <tbody>
                  {detail.essays.map((essay) => (
                    <tr key={essay.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-medium text-primary">
                        {essay.title || 'Untitled'}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            essayStatusBadge[essay.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {formatStatus(essay.status)}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`font-semibold ${scoreColor(essay.overallScore)}`}>
                          {essay.overallScore != null ? essay.overallScore : '--'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-400 text-xs">
                        {essay.updatedAt
                          ? new Date(essay.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '--'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => router.push('/educator/essay-reviews')}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          Review Essay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Applications ({detail.applications?.length ?? 0})
        </h2>
        {!detail.applications || detail.applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-sm text-slate-400">No applications tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {detail.applications.map((app, i) => (
              <div
                key={`${app.name}-${i}`}
                className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{app.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {app.type && (
                      <span className="font-medium text-slate-500 uppercase">{app.type}</span>
                    )}
                    {app.deadline && (
                      <span>
                        Deadline:{' '}
                        {new Date(app.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {app.tasks != null && <span>{app.tasks} task{app.tasks !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <span
                  className={`self-start sm:self-center inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                    appStatusBadge[app.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {formatStatus(app.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Small reusable components                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
      <p className="text-2xl font-bold text-primary">
        {value}
        {sub && <span className="text-sm font-normal text-slate-400 ml-0.5">{sub}</span>}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">{label}</p>
    </div>
  );
}

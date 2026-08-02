import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EducatorDashboardLayout from '../../../components/EducatorDashboardLayout';

interface StudentNote {
  id: string;
  text: string;
  date: string;
}

interface Profile {
  gpa: number | null;
  gpaScale: string | null;
  gpaWeighted: number | null;
  satMath: number | null;
  satRW: number | null;
  actScore: number | null;
  holisticScore: number | null;
  percentile: number | null;
}

interface Essay {
  id: string;
  title: string;
  prompt: string;
  status: string;
  overallScore: number | null;
  wordCount: number;
  updatedAt: string;
}

interface Application {
  name: string;
  type: string;
  deadline: string | null;
  status: string;
}

interface Review {
  id: string;
  essayId: string;
  essayTitle: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  overallScoreFromTutor: number | null;
}

interface Booking {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: string;
  meetingLink: string;
  platform: string;
  amount: number;
  paid: boolean;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  tags: string[];
  notes: StudentNote[];
  status: string;
  inviteStatus: string;
  linkedUserId: string | null;
  startDate: string;
}

interface Workspace {
  student: StudentInfo;
  linked: boolean;
  profile: Profile | null;
  essays: Essay[];
  applications: Application[];
  reviews: Review[];
  bookings: Booking[];
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

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-slate-50 text-slate-600 border-slate-200',
};

const essayStatusBadge: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  'in review': 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200',
  complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const reviewStatusBadge: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200',
  returned: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
  return (status || '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function satComposite(p: Profile | null): number | null {
  if (!p) return null;
  if (p.satMath == null && p.satRW == null) return null;
  return (p.satMath ?? 0) + (p.satRW ?? 0);
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function StudentWorkspace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && !['educator','admin'].includes((session?.user as any)?.role)) router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !id || typeof id !== 'string') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/educator/student/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, id]);

  if (status === 'loading' || loading) {
    return (
      <EducatorDashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </EducatorDashboardLayout>
    );
  }

  if (notFound || !data) {
    return (
      <EducatorDashboardLayout>
        <Head>
          <title>Student not found | AdmitsOnly Educator</title>
        </Head>
        <BackLink />
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
          <p className="text-sm font-medium text-slate-600 mb-1">Student not found</p>
          <p className="text-xs text-slate-400">
            This student may have been removed, or does not belong to your roster.
          </p>
        </div>
      </EducatorDashboardLayout>
    );
  }

  const { student, linked, profile, essays, applications, reviews, bookings } = data;
  const composite = satComposite(profile);

  // Map essayId -> latest review for quick lookup
  const reviewByEssay = new Map<string, Review>();
  for (const r of reviews) {
    if (!reviewByEssay.has(r.essayId)) reviewByEssay.set(r.essayId, r);
  }

  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.date).getTime() >= now);
  const recent = bookings.filter((b) => new Date(b.date).getTime() < now);

  const inviteChip = (() => {
    if (linked) return { label: 'On platform', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (student.inviteStatus === 'invited' || student.inviteStatus === 'pending')
      return { label: 'Invited', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Not invited', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  })();

  return (
    <EducatorDashboardLayout>
      <Head>
        <title>{student.name} | AdmitsOnly Educator</title>
      </Head>

      <div className="space-y-6">
        <BackLink />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {(student.name?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold font-display text-primary">{student.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                  statusBadge[student.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {formatStatus(student.status)}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${inviteChip.cls}`}>
                {inviteChip.label}
              </span>
            </div>
            {student.email && <p className="text-sm text-slate-400 mt-0.5">{student.email}</p>}
            {student.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {student.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite banner */}
        {!linked && (
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">
                Invite {student.name} to AdmitsOnly to see their essays and progress
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Once they join, their live essays, academic profile, applications, and reviews appear here automatically.
              </p>
            </div>
            <Link
              href="/educator/students"
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors text-center"
            >
              Invite student
            </Link>
          </div>
        )}

        {/* Snapshot */}
        {linked && profile && (
          <section>
            <SectionLabel>Snapshot</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                label="GPA"
                value={profile.gpa != null ? `${profile.gpa}` : '--'}
                sub={profile.gpaScale ? `/ ${profile.gpaScale}` : undefined}
              />
              <StatCard label="SAT" value={composite != null ? `${composite}` : '--'} />
              <StatCard label="ACT" value={profile.actScore != null ? `${profile.actScore}` : '--'} />
              <StatCard label="Percentile" value={profile.percentile != null ? `${profile.percentile}` : '--'} />
              <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col items-center justify-center">
                <div
                  className={`w-14 h-14 rounded-full border-4 ${holisticRingColor(profile.holisticScore)} flex items-center justify-center mb-1`}
                >
                  <span className="text-lg font-bold text-slate-700">{profile.holisticScore ?? '--'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Holistic / 100</p>
              </div>
            </div>
          </section>
        )}

        {/* Essays */}
        {linked && (
          <section>
            <SectionLabel>Essays ({essays.length})</SectionLabel>
            {essays.length === 0 ? (
              <EmptyCard>No essays yet.</EmptyCard>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <Th>Title</Th>
                        <Th>Status</Th>
                        <Th>Score</Th>
                        <Th>Review</Th>
                        <Th>Updated</Th>
                        <th className="py-3 px-5" />
                      </tr>
                    </thead>
                    <tbody>
                      {essays.map((essay) => {
                        const review = reviewByEssay.get(essay.id);
                        return (
                          <tr key={essay.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="py-3 px-5 font-medium text-primary">
                              {essay.title || 'Untitled'}
                              <span className="block text-[11px] text-slate-400 font-normal">
                                {essay.wordCount} words
                              </span>
                            </td>
                            <td className="py-3 px-5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  essayStatusBadge[(essay.status || '').toLowerCase()] ??
                                  'bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                              >
                                {formatStatus(essay.status)}
                              </span>
                            </td>
                            <td className="py-3 px-5">
                              <span className={`font-semibold ${scoreColor(essay.overallScore)}`}>
                                {essay.overallScore != null ? Math.round(essay.overallScore) : '--'}
                              </span>
                            </td>
                            <td className="py-3 px-5">
                              {review ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                    reviewStatusBadge[review.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {formatStatus(review.status)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">--</span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-slate-400 text-xs">{fmtDate(essay.updatedAt)}</td>
                            <td className="py-3 px-5 text-right">
                              <Link
                                href="/educator/essay-reviews"
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                Review
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Applications */}
        {linked && (
          <section>
            <SectionLabel>Applications ({applications.length})</SectionLabel>
            {applications.length === 0 ? (
              <EmptyCard>No applications tracked yet.</EmptyCard>
            ) : (
              <div className="space-y-3">
                {applications.map((app, i) => {
                  const dl = daysLeft(app.deadline);
                  let dlCls = 'text-slate-400';
                  if (dl != null) {
                    if (dl <= 7) dlCls = 'text-red-500 font-semibold';
                    else if (dl <= 14) dlCls = 'text-amber-600 font-semibold';
                  }
                  return (
                    <div
                      key={`${app.name}-${i}`}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">{app.name || 'Untitled school'}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                          {app.type && <span className="font-medium text-slate-500 uppercase">{app.type}</span>}
                          {app.deadline && (
                            <span className="text-slate-400">
                              {fmtDate(app.deadline)}
                              {dl != null && (
                                <span className={`ml-1.5 ${dlCls}`}>
                                  ({dl < 0 ? 'past' : `${dl}d left`})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {app.status && (
                        <span
                          className={`self-start sm:self-center inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                            appStatusBadge[app.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {formatStatus(app.status)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Sessions */}
        <section>
          <SectionLabel>Sessions ({bookings.length})</SectionLabel>
          {bookings.length === 0 ? (
            <EmptyCard>No sessions booked yet.</EmptyCard>
          ) : (
            <div className="space-y-4">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Upcoming</p>
                  <div className="space-y-2">
                    {upcoming
                      .slice()
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((b) => (
                        <BookingRow key={b.id} b={b} />
                      ))}
                  </div>
                </div>
              )}
              {recent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Recent</p>
                  <div className="space-y-2">
                    {recent.map((b) => (
                      <BookingRow key={b.id} b={b} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <SectionLabel>Notes ({student.notes.length})</SectionLabel>
          {student.notes.length === 0 ? (
            <EmptyCard>No notes yet.</EmptyCard>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              {student.notes.map((note) => (
                <div key={note.id} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{fmtDate(note.date)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </EducatorDashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

function BackLink() {
  return (
    <Link
      href="/educator/students"
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to students
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h2>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
      <p className="text-sm text-slate-400">{children}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
      <p className="text-2xl font-bold text-primary">
        {value}
        {sub && <span className="text-sm font-normal text-slate-400 ml-0.5">{sub}</span>}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function BookingRow({ b }: { b: Booking }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{b.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
          <span>
            {new Date(b.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            {new Date(b.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
          <span>{b.duration} min</span>
          {b.status && <span className="capitalize">{formatStatus(b.status)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
            b.paid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {b.paid ? 'Paid' : 'Unpaid'}
        </span>
        {b.meetingLink && (
          <a
            href={b.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            Join
          </a>
        )}
      </div>
    </div>
  );
}

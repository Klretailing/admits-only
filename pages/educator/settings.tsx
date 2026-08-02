import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface Connection {
  id: string;
  studentId?: string;
  connectedUserId?: string;
  role: string;
  createdAt: string;
  studentName?: string;
  studentEmail?: string;
  connectedName?: string;
  connectedEmail?: string;
}

interface EducatorProfile {
  bio: string;
  headline: string;
  credentials: { title: string; institution: string; year: string }[];
  subjects: string[];
  hourlyRate: number | null;
  zoomLink: string;
  googleMeetLink: string;
  timezone: string;
}

const SUBJECT_OPTIONS = [
  'SAT Math', 'SAT Reading', 'SAT Writing', 'ACT', 'AP Calculus', 'AP Physics',
  'AP Chemistry', 'AP Biology', 'AP English', 'Essay Writing', 'College Counseling',
  'Interview Prep', 'STEM Tutoring', 'Humanities', 'Test Strategy', 'Financial Aid',
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

export default function EducatorSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<EducatorProfile>({
    bio: '', headline: '', credentials: [], subjects: [],
    hourlyRate: null, zoomLink: '', googleMeetLink: '', timezone: 'America/New_York',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCred, setNewCred] = useState({ title: '', institution: '', year: '' });
  const [myCode, setMyCode] = useState('');
  const [connectionsAsStudent, setConnectionsAsStudent] = useState<Connection[]>([]);
  const [connectionsAsParent, setConnectionsAsParent] = useState<Connection[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchConnections = useCallback(() => {
    fetch('/api/connection-code')
      .then(r => r.json())
      .then(data => {
        setMyCode(data.code || '');
        setConnectionsAsStudent(data.connectionsAsStudent || []);
        setConnectionsAsParent(data.connectionsAsParentOrTutor || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && !['educator','admin'].includes((session?.user as any)?.role)) router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchConnections();
    fetch('/api/educator/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, fetchConnections]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/educator/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const addCredential = () => {
    if (!newCred.title.trim()) return;
    setProfile(p => ({ ...p, credentials: [...p.credentials, { ...newCred }] }));
    setNewCred({ title: '', institution: '', year: '' });
  };

  const removeCredential = (index: number) => {
    setProfile(p => ({ ...p, credentials: p.credentials.filter((_, i) => i !== index) }));
  };

  const toggleSubject = (subject: string) => {
    setProfile(p => ({
      ...p,
      subjects: p.subjects.includes(subject) ? p.subjects.filter(s => s !== subject) : [...p.subjects, subject],
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await fetch('/api/connection-code', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      fetchConnections();
    } catch {}
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>Settings | AdmitsOnly Educator</title></Head>

      <div className="max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Settings</h1>
            <p className="mt-1 text-slate-500">Configure your educator profile and integrations</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium">
            Profile saved successfully!
          </div>
        )}

        {/* Connection Code */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Your Connection Code</h2>
              <p className="text-xs text-slate-400">Share this code so students can find and connect with you</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 text-center">
              <p className="text-2xl font-mono font-bold text-primary tracking-[0.3em]">{myCode}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`px-5 py-4 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-700">
              <span className="font-bold">How it works:</span> Share this code with students so they can find you, or enter a student&apos;s code in My Students to link accounts.
            </p>
          </div>

          {/* Active Connections */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Connections</h3>
            {connectionsAsStudent.length === 0 && connectionsAsParent.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">No connections yet. Share your code with students to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectionsAsStudent.map(conn => (
                  <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                        {(conn.connectedName || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{conn.connectedName}</p>
                        <p className="text-xs text-slate-400">{conn.role === 'parent' ? 'Parent' : 'Tutor'} &middot; Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveConnection(conn.id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {connectionsAsParent.map(conn => (
                  <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                        {(conn.studentName || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{conn.studentName}</p>
                        <p className="text-xs text-slate-400">Student &middot; Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveConnection(conn.id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Profile Info */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Profile</h2>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-primary">Headline</label>
            <input
              type="text"
              value={profile.headline}
              onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))}
              className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. SAT & College Admissions Coach"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-primary">Bio</label>
            <textarea
              value={profile.bio}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-y"
              placeholder="Tell students about your experience, teaching style, and what makes you unique..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-primary">Hourly Rate ($)</label>
              <input
                type="number"
                value={profile.hourlyRate || ''}
                onChange={e => setProfile(p => ({ ...p, hourlyRate: parseFloat(e.target.value) || null }))}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="100"
                min={0}
                step={5}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-primary">Timezone</label>
              <select
                value={profile.timezone}
                onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Subjects */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map(subject => (
              <button
                key={subject}
                onClick={() => toggleSubject(subject)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  profile.subjects.includes(subject)
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </section>

        {/* Credentials */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Credentials</h2>
          {profile.credentials.length > 0 && (
            <div className="space-y-2">
              {profile.credentials.map((cred, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{cred.title}</p>
                    <p className="text-xs text-slate-400">{cred.institution}{cred.year ? ` · ${cred.year}` : ''}</p>
                  </div>
                  <button onClick={() => removeCredential(i)} className="p-1 text-slate-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 items-end">
            <div>
              <label className="block mb-1 text-xs font-medium text-slate-400">Title / Degree</label>
              <input
                type="text"
                value={newCred.title}
                onChange={e => setNewCred(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-slate-200 bg-surface p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="M.Ed."
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-slate-400">Institution</label>
              <input
                type="text"
                value={newCred.institution}
                onChange={e => setNewCred(p => ({ ...p, institution: e.target.value }))}
                className="w-full border border-slate-200 bg-surface p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Harvard"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-slate-400">Year</label>
              <input
                type="text"
                value={newCred.year}
                onChange={e => setNewCred(p => ({ ...p, year: e.target.value }))}
                className="w-full border border-slate-200 bg-surface p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="2020"
              />
            </div>
            <button onClick={addCredential} className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
          </div>
        </section>

        {/* Meeting Integration */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Meeting Integration</h2>
            <p className="text-xs text-slate-400 mt-1">Add your meeting links — these will auto-populate when scheduling sessions.</p>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-primary flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 4.5h15v15h-15V4.5zM6.5 8v8h5.5v-3.5l3 2.5v-6l-3 2.5V8H6.5z" /></svg>
              Zoom Personal Meeting Link
            </label>
            <input
              type="url"
              value={profile.zoomLink}
              onChange={e => setProfile(p => ({ ...p, zoomLink: e.target.value }))}
              className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="https://zoom.us/j/1234567890"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-primary flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
              Google Meet Link
            </label>
            <input
              type="url"
              value={profile.googleMeetLink}
              onChange={e => setProfile(p => ({ ...p, googleMeetLink: e.target.value }))}
              className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>
        </section>

        {/* Save button (bottom) */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </EducatorDashboardLayout>
  );
}

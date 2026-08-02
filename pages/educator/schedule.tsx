import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

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
  notes: string;
  student?: { id: string; studentName: string };
  service?: { id: string; name: string };
}

interface StudentOption { id: string; studentName: string }
interface ServiceOption { id: string; name: string; duration: number; price: number }

const PLATFORMS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'in_person', label: 'In Person' },
  { value: 'other', label: 'Other' },
];

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function EducatorSchedule() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentsOpts, setStudentsOpts] = useState<StudentOption[]>([]);
  const [servicesOpts, setServicesOpts] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [saving, setSaving] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [newBooking, setNewBooking] = useState({
    title: '', studentId: '', serviceId: '', date: '', time: '',
    duration: 60, platform: 'zoom', meetingLink: '', amount: 0, paid: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && !['educator','admin'].includes((session?.user as any)?.role)) router.push('/dashboard');
  }, [status, session, router]);

  const fetchBookings = () => {
    fetch('/api/educator/bookings')
      .then(r => r.json())
      .then(data => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchBookings();
    fetch('/api/educator/students').then(r => r.json()).then(d => setStudentsOpts(d.students || [])).catch(() => {});
    fetch('/api/educator/services').then(r => r.json()).then(d => setServicesOpts(d.services || [])).catch(() => {});
  }, [status]);

  const handleServiceChange = (serviceId: string) => {
    const svc = servicesOpts.find(s => s.id === serviceId);
    setNewBooking(prev => ({
      ...prev,
      serviceId,
      duration: svc?.duration || prev.duration,
      amount: svc?.price || prev.amount,
      title: svc?.name || prev.title,
    }));
  };

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const dateTime = new Date(`${newBooking.date}T${newBooking.time}`).toISOString();
    const res = await fetch('/api/educator/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newBooking, date: dateTime, paid: newBooking.paid }),
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewBooking({ title: '', studentId: '', serviceId: '', date: '', time: '', duration: 60, platform: 'zoom', meetingLink: '', amount: 0, paid: false });
      fetchBookings();
    }
    setSaving(false);
  };

  const handleTogglePaid = async (bookingId: string, currentPaid: boolean) => {
    await fetch(`/api/educator/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !currentPaid }),
    });
    fetchBookings();
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    await fetch(`/api/educator/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchBookings();
  };

  const handleSaveNotes = async () => {
    if (!showNotesModal) return;
    setSaving(true);
    await fetch(`/api/educator/bookings/${showNotesModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: sessionNotes }),
    });
    fetchBookings();
    setShowNotesModal(null);
    setSaving(false);
  };

  const now = new Date();
  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return new Date(b.date) >= now;
    if (filter === 'past') return new Date(b.date) < now;
    return true;
  }).sort((a, b) => {
    if (filter === 'past') return new Date(b.date).getTime() - new Date(a.date).getTime();
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>Schedule | AdmitsOnly Educator</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Schedule</h1>
            <p className="mt-1 text-slate-500">Manage your sessions and bookings</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            New Session
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['upcoming', 'past', 'all'] as const).map(f => (
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

        {/* Bookings list */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading schedule...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">No {filter === 'all' ? '' : filter} sessions</p>
            <p className="text-xs text-slate-400 mb-4">Schedule your first session to get started.</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">Add Session</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(booking => {
              const dt = formatDateTime(booking.date);
              const isPast = new Date(booking.date) < now;
              return (
                <div key={booking.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Date/time badge */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-100' : 'bg-blue-50'}`}>
                        <span className={`text-xs font-bold ${isPast ? 'text-slate-400' : 'text-blue-600'}`}>{dt.date.split(',')[0]}</span>
                        <span className={`text-sm font-bold ${isPast ? 'text-slate-500' : 'text-blue-700'}`}>{dt.time}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-primary truncate">{booking.title}</p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex-shrink-0 ${
                            booking.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {booking.student && <span>{booking.student.studentName}</span>}
                          <span>&middot;</span>
                          <span>{booking.duration}min</span>
                          <span>&middot;</span>
                          <span className="capitalize">{booking.platform.replace('_', ' ')}</span>
                          <span>&middot;</span>
                          {booking.amount > 0 ? (
                            <button
                              onClick={e => { e.stopPropagation(); handleTogglePaid(booking.id, booking.paid); }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                booking.paid
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {booking.paid ? (
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" /></svg>
                              )}
                              ${booking.amount} {booking.paid ? 'paid' : 'unpaid'}
                            </button>
                          ) : (
                            <span className="text-slate-400">Free</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {booking.meetingLink && booking.status === 'scheduled' && (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          Join Meeting
                        </a>
                      )}
                      <button
                        onClick={() => { setShowNotesModal(booking); setSessionNotes(booking.notes); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Session notes"
                      >
                        Notes
                      </button>
                      {booking.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {booking.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold mb-1">Session Notes:</p>
                      <p className="text-sm text-slate-600">{booking.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-sm w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-4">Schedule New Session</h2>
            <form onSubmit={handleAddBooking} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Session Title</label>
                <input
                  type="text"
                  value={newBooking.title}
                  onChange={e => setNewBooking(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. SAT Math Review"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Student</label>
                  <select
                    value={newBooking.studentId}
                    onChange={e => setNewBooking(p => ({ ...p, studentId: e.target.value }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select...</option>
                    {studentsOpts.map(s => <option key={s.id} value={s.id}>{s.studentName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Service</label>
                  <select
                    value={newBooking.serviceId}
                    onChange={e => handleServiceChange(e.target.value)}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select...</option>
                    {servicesOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Date</label>
                  <input
                    type="date"
                    value={newBooking.date}
                    onChange={e => setNewBooking(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Time</label>
                  <input
                    type="time"
                    value={newBooking.time}
                    onChange={e => setNewBooking(p => ({ ...p, time: e.target.value }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Duration (min)</label>
                  <input
                    type="number"
                    value={newBooking.duration}
                    onChange={e => setNewBooking(p => ({ ...p, duration: parseInt(e.target.value) || 60 }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    min={15}
                    step={15}
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Amount ($)</label>
                  <input
                    type="number"
                    value={newBooking.amount}
                    onChange={e => setNewBooking(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    min={0}
                    step={5}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBooking(p => ({ ...p, paid: false }))}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      !newBooking.paid ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBooking(p => ({ ...p, paid: true }))}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      newBooking.paid ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Paid
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setNewBooking(prev => ({ ...prev, platform: p.value }))}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                        newBooking.platform === p.value ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Meeting Link</label>
                <input
                  type="url"
                  value={newBooking.meetingLink}
                  onChange={e => setNewBooking(p => ({ ...p, meetingLink: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="https://zoom.us/j/... or meet.google.com/..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm disabled:opacity-60">{saving ? 'Scheduling...' : 'Schedule Session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowNotesModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-sm w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-1">Session Notes</h2>
            <p className="text-sm text-slate-400 mb-4">{showNotesModal.title} &middot; {showNotesModal.student?.studentName}</p>
            <textarea
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[150px] resize-y"
              placeholder="What was covered in this session? Key takeaways, homework assigned, areas to focus on..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowNotesModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveNotes} disabled={saving} className="flex-1 btn-primary text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save Notes'}</button>
            </div>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}

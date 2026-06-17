import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import ParentLayout from '../../components/ParentLayout';

const TYPE_COLORS: Record<string, string> = {
  EA: 'bg-blue-500', ED: 'bg-purple-500', ED2: 'bg-violet-500',
  RD: 'bg-slate-400', REA: 'bg-indigo-500', Rolling: 'bg-emerald-500',
  'Regular Decision': 'bg-slate-400',
};
const TYPE_BADGE: Record<string, string> = {
  EA: 'bg-blue-50 text-blue-600', ED: 'bg-purple-50 text-purple-600',
  ED2: 'bg-violet-50 text-violet-600', RD: 'bg-slate-50 text-slate-600',
  REA: 'bg-indigo-50 text-indigo-600', Rolling: 'bg-emerald-50 text-emerald-600',
  'Regular Decision': 'bg-slate-50 text-slate-600',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AppData {
  id: string; name: string; deadline: string; type: string;
  status: string; tasks: { id: string; label: string; done: boolean }[];
}

export default function ParentCalendar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [apps, setApps] = useState<AppData[]>([]);
  const [studentName, setStudentName] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview').then(r => r.json()).then(data => {
      setConnected(data.connected);
      if (data.students?.length) {
        setStudentName(data.students[0].name);
        setApps(data.students[0].applications || []);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  const deadlineMap = useMemo(() => {
    const map: Record<string, AppData[]> = {};
    apps.forEach(app => {
      if (!app.deadline) return;
      const key = app.deadline.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(app);
    });
    return map;
  }, [apps]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };

  const getDateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isToday = (day: number) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const selectedApps = selectedDay ? deadlineMap[getDateKey(selectedDay)] || [] : [];

  const upcoming = useMemo(() => {
    return apps
      .filter(a => a.deadline && new Date(a.deadline) >= new Date(now.toDateString()))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 10);
  }, [apps, now]);

  const getDaysUntil = (d: string) => Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);

  if (status === 'loading' || loading) {
    return (
      <ParentLayout>
        <Head><title>Calendar | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ParentLayout>
    );
  }

  if (connected === false) {
    return (
      <ParentLayout>
        <Head><title>Calendar | AdmitsOnly Parent</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Connect to Your Student</h2>
            <p className="text-sm text-slate-500 mb-4">Enter your student&apos;s connection code to view their deadlines.</p>
            <button onClick={() => router.push('/parent/settings')} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600">Go to Settings</button>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <Head><title>Calendar | AdmitsOnly Parent</title></Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Deadline Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Track every important date for {studentName || 'your student'}</p>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-primary transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-bold font-display text-primary">{monthName}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-primary transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="p-2" />;
              const key = getDateKey(day);
              const hasDeadlines = !!deadlineMap[key];
              const deadlines = deadlineMap[key] || [];
              const today = isToday(day);
              const selected = selectedDay === day;

              return (
                <button
                  key={`d-${day}`}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  className={`relative p-2 rounded-xl text-sm transition-all ${
                    selected ? 'bg-teal-50 ring-2 ring-teal-400' :
                    today ? 'bg-blue-50' :
                    'hover:bg-slate-50'
                  }`}
                >
                  <span className={`font-medium ${today ? 'text-blue-600' : selected ? 'text-teal-700' : 'text-slate-600'}`}>{day}</span>
                  {hasDeadlines && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {deadlines.slice(0, 3).map((app, j) => (
                        <div key={j} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[app.type] || 'bg-slate-400'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
            {Object.entries(TYPE_COLORS).filter(([k]) => !k.includes('Regular')).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[10px] text-slate-500 font-medium">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-fade-up">
            <h3 className="text-sm font-bold text-primary mb-3">
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            {selectedApps.length === 0 ? (
              <p className="text-sm text-slate-400">No deadlines on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedApps.map(app => (
                  <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[app.type] || 'bg-slate-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary">{app.name}</p>
                      <p className="text-xs text-slate-400">{app.type} deadline</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${TYPE_BADGE[app.type] || 'bg-slate-50 text-slate-500'}`}>{app.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming Deadlines</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming deadlines found.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(app => {
                const days = getDaysUntil(app.deadline);
                return (
                  <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      days <= 7 ? 'bg-red-500' : days <= 30 ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{app.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${TYPE_BADGE[app.type] || 'bg-slate-50 text-slate-500'}`}>{app.type}</span>
                    <span className={`text-xs font-semibold shrink-0 ${
                      days <= 7 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}

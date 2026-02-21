import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

export default function Progress() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);
  if (status !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <Head><title>Progress | AdmitsOnly Dashboard</title></Head>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Academic Progress</h1>
          <p className="mt-1 text-slate-500">Track your growth across all subject areas and milestones.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: 'SAT / ACT Preparation', milestones: ['Diagnostic complete', 'Math foundations', 'Verbal strategy', 'Practice test 1', 'Score review'], completed: 3 },
            { title: 'College Essay Portfolio', milestones: ['Story brainstorm', 'Outline approved', 'Draft 1 submitted', 'Draft 2 revision', 'Final polish'], completed: 2 },
            { title: 'School Research & List', milestones: ['Initial research', 'Top 15 shortlist', 'Supplemental review', 'Final list locked', 'Application tracker'], completed: 4 },
            { title: 'Extracurricular Profile', milestones: ['Activity audit', 'Leadership plan', 'Summer program apps', 'Portfolio build', 'Rec letter strategy'], completed: 1 },
          ].map((track) => (
            <div key={track.title} className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold font-display text-primary">{track.title}</h3>
              <div className="mt-1 mb-5">
                <span className="text-sm text-slate-500">{track.completed} of {track.milestones.length} milestones</span>
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(track.completed / track.milestones.length) * 100}%` }} />
                </div>
              </div>
              <ul className="space-y-2">
                {track.milestones.map((m, i) => (
                  <li key={m} className="flex items-center gap-3 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < track.completed ? 'bg-accent text-white' : 'bg-slate-100 text-slate-300'
                    }`}>
                      {i < track.completed ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className={i < track.completed ? 'text-primary font-medium' : 'text-slate-400'}>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

const essays = [
  { title: 'Personal Statement', prompt: 'Background, identity, interest, or talent...', status: 'In Review', score: '9.2/10', drafts: 3 },
  { title: 'Stanford — Short Essay', prompt: 'What matters to you and why?', status: 'Draft', score: '—', drafts: 1 },
  { title: 'MIT — Activity Essay', prompt: 'Describe your most meaningful activity...', status: 'Not Started', score: '—', drafts: 0 },
  { title: 'Columbia — List Essay', prompt: 'List the titles of the required readings...', status: 'Complete', score: '8.8/10', drafts: 4 },
];

const statusColors: Record<string, string> = {
  'Complete': 'bg-green-100 text-green-700',
  'In Review': 'bg-accent/10 text-accent',
  'Draft': 'bg-amber-100 text-amber-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

export default function Essays() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);
  if (status !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <Head><title>Essays | AdmitsOnly Dashboard</title></Head>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Essay Workspace</h1>
            <p className="mt-1 text-slate-500">Track and manage all your college application essays.</p>
          </div>
          <button className="btn-primary text-sm">New Essay</button>
        </div>

        <div className="space-y-4">
          {essays.map((essay) => (
            <div key={essay.title} className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold font-display text-primary">{essay.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[essay.status]}`}>
                      {essay.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 italic">&ldquo;{essay.prompt}&rdquo;</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary">{essay.score}</p>
                  <p className="text-xs text-slate-400">{essay.drafts} draft{essay.drafts !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

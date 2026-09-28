import Link from 'next/link';
import type { ReactNode } from 'react';

/* The logo-and-card frame shared by the sign-in, forgot-password and
   reset-password pages, so the three read as one flow. */
export default function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-surface bg-grid py-16">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
                <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <line x1="20" y1="9" x2="20" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="20" cy="19.5" r="1.2" fill="white" />
              </svg>
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-primary">
              Admits<span className="gradient-text">Only</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold font-display text-primary">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}

export const inputClass =
  'w-full border border-slate-200 bg-surface p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';

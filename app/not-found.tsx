import Link from 'next/link';
import '../styles/globals.css';
import '../styles/theme-tokens.css';

export const metadata = {
  title: 'Page not found | AdmitsOnly',
  robots: { index: false },
};

/* Every broken or outdated link lands here. It used to be Next's bare default
   (white page, someone else's title, no way back), which loses the visitor.
   This keeps the brand and offers the three places most people were going. */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-6 py-16 font-sans text-slate-900">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
          <span className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
              <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-primary">AdmitsOnly</span>
        </Link>
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-slate-500">The link may be old, or the page may have moved.</p>
        <div className="mt-8 grid gap-3">
          <Link href="/" className="btn-primary w-full">Go to the home page</Link>
          <Link href="/essay-checker" className="btn-secondary w-full">Try the free essay checker</Link>
          <Link href="/auth/login" className="text-sm font-semibold text-accent hover:underline mt-1">Sign in</Link>
        </div>
      </div>
    </main>
  );
}

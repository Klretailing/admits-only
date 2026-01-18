import Link from 'next/link';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold text-primary">
            AdmitsOnly
          </Link>
          <nav className="flex flex-wrap gap-6 text-sm font-semibold text-slate-600">
            <Link href="/services" className="hover:text-primary">Programs</Link>
            <Link href="/about" className="hover:text-primary">About</Link>
            <Link href="/faq" className="hover:text-primary">FAQ</Link>
            <Link href="/contact" className="hover:text-primary">Contact</Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="container mx-auto px-6 py-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-primary">AdmitsOnly Learning Collective</h3>
            <p className="mt-2 text-sm text-slate-600">
              Premium academic coaching, immersive programs, and future-ready mentorship for ambitious learners.
            </p>
          </div>
          <div className="md:text-right text-sm text-slate-500">
            <p>Elevate your tutoring practice with bespoke curriculum and hybrid delivery.</p>
            <p className="mt-2">© 2024 AdmitsOnly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

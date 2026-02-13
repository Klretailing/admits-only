import Link from 'next/link';
import Head from 'next/head';
import { useState, type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label="AdmitsOnly Home">
      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/40 transition-shadow">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
          <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="20" y1="9" x2="20" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="19.5" r="1.2" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold font-display tracking-tight text-primary leading-none">
          Admits<span className="gradient-text">Only</span>
        </span>
        <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase leading-none mt-0.5">
          Learning Collective
        </span>
      </div>
    </Link>
  );
}

const navLinks = [
  { href: '/services', label: 'Programs' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AdmitsOnly is a premium college admissions consulting and academic coaching collective. Expert SAT/ACT prep, essay coaching, and mentorship for top-tier university admissions." />
        <meta name="keywords" content="college admissions consulting, SAT prep, ACT prep, college essay coaching, academic mentorship, university admissions, scholarship preparation, STEM tutoring" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%236366f1'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='white' font-weight='bold'>A</text></svg>" />
        <title>AdmitsOnly | Premium College Admissions Consulting &amp; Academic Coaching</title>
      </Head>

      <div className="min-h-screen bg-white text-slate-900 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Logo />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/contact" className="ml-3 btn-primary text-sm !py-2.5 !px-5">
                Get Started
              </Link>
            </nav>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-slate-600 hover:text-primary"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="block mt-2 btn-primary text-sm text-center"
              >
                Get Started
              </Link>
            </div>
          )}
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-primary text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid gap-12 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
                      <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold font-display">AdmitsOnly</span>
                </div>
                <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
                  Premium college admissions consulting and academic coaching for ambitious students.
                  Personalized mentorship that opens doors to the world&apos;s best universities.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Programs</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><Link href="/services" className="hover:text-white transition-colors">Scholarship-Ready Academy</Link></li>
                  <li><Link href="/services" className="hover:text-white transition-colors">STEM Innovators Lab</Link></li>
                  <li><Link href="/services" className="hover:text-white transition-colors">Humanities Studio</Link></li>
                  <li><Link href="/services" className="hover:text-white transition-colors">Foundations for Growth</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Company</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                  <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                  <li><a href="mailto:info@admitsonly.com" className="hover:text-white transition-colors">info@admitsonly.com</a></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} AdmitsOnly Learning Collective. All rights reserved.</p>
              <p className="text-sm text-slate-500">Empowering the next generation of leaders.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

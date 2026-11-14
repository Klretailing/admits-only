import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LogoMark from './LogoMark';

const SITE_URL = 'https://www.admitsonly.com';

interface LayoutProps {
  children: ReactNode;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label="AdmitsOnly Home">
      <div className="relative w-10 h-10 rounded-xl logo-tile flex items-center justify-center">
        <LogoMark size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold font-display tracking-tight text-primary leading-none">
          Admits<span className="gradient-text">Only</span>
        </span>
        <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase leading-none mt-1.5">
          Learning Collective
        </span>
      </div>
    </Link>
  );
}

/* The site is two things: the notebook app (free, self-serve) and 1-on-1
   consulting (a paid, human service). The nav keeps them apart: app pages
   first, then a divider, then Consulting as its own tab. Programs and
   Contact (book a call) live inside the consulting section. */
const appLinks = [
  // First, because it is the one thing a visitor can use right now, free,
  // without an account.
  { href: '/essay-checker', label: 'Essay Checker' },
  { href: '/#inside', label: 'What\'s inside' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
];
const consultingLink = { href: '/consulting', label: 'Consulting' };
const CONSULTING_SECTION = ['/consulting', '/services', '/contact'];

const navItemClass = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? 'text-primary underline underline-offset-[6px] decoration-[1.5px]'
      : 'text-slate-600 hover:text-primary hover:bg-slate-50'
  }`;

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="hidden sm:flex fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-lg items-center justify-center text-slate-500 hover:text-accent hover:border-accent/30 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
      aria-label="Scroll to top"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

function FooterNewsletter() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      router.push(`/newsletter?email=${encodeURIComponent(email.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        className="w-full min-w-0 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/30"
      />
      <button type="submit" className="self-start px-4 py-2 bg-[#f6f3ec] text-[#1c1b19] text-sm font-semibold rounded-lg hover:bg-[#fffdf8] transition-colors whitespace-nowrap">
        Subscribe
      </button>
    </form>
  );
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const canonicalUrl = SITE_URL + (router.asPath.split(/[?#]/)[0] === '/' ? '/' : router.asPath.split(/[?#]/)[0]);
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session;
  const userRole = (session?.user as any)?.role;
  const dashboardHref = userRole === 'parent' ? '/parent' : userRole === 'educator' ? '/educator' : '/dashboard';
  const isActive = (href: string) => router.pathname === href;
  const inConsulting = CONSULTING_SECTION.includes(router.pathname);
  const onHome = router.pathname === '/';

  /* Until the session check answers, render BOTH button sets and let the
     pre-paint hint (lib/authHint.ts) show the right one. Treating "loading"
     as "signed out" made Sign In flash and vanish for signed-in students. */
  const resolved = status !== 'loading';
  const authSwitch = (signedIn: ReactNode, signedOut: ReactNode) =>
    resolved ? (isLoggedIn ? signedIn : signedOut) : (
      <>
        <span className="auth-in-only contents">{signedIn}</span>
        <span className="auth-out-only contents">{signedOut}</span>
      </>
    );

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AdmitsOnly is the all-in-one notebook for high school, grades 9 to 12: activities and GPA, essay feedback, study groups, career exploration and college planning, in one place. Free to start." />
        <meta name="keywords" content="high school planner, student planner app, GPA tracker, extracurricular tracker, essay feedback, college essay checker, study group app, career exploration for teens, college list builder" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%237a7771'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='white' font-weight='bold'>A</text></svg>" />
        <title>AdmitsOnly | The All-in-One Notebook for High School</title>
        {/* One canonical address. The same site is also served on two
            *.vercel.app domains, which otherwise compete with
            www.admitsonly.com in search results. */}
        <link rel="canonical" key="canonical" href={canonicalUrl} />
        {/* Link previews. Without these, a link pasted into iMessage,
            Instagram, Discord or a group chat showed as a bare URL, and word
            of mouth between students is how a product like this spreads.
            Pages can override any of these by reusing the same key. */}
        <meta property="og:site_name" content="AdmitsOnly" />
        <meta property="og:type" key="og:type" content="website" />
        <meta property="og:url" key="og:url" content={canonicalUrl} />
        <meta property="og:title" key="og:title" content="AdmitsOnly | All four years of high school, in one notebook" />
        <meta property="og:description" key="og:description" content="Activities and GPA, essay feedback, study groups, careers and college planning. One free notebook for grades 9 to 12." />
        <meta property="og:image" key="og:image" content={`${SITE_URL}/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" key="twitter:title" content="AdmitsOnly | All four years of high school, in one notebook" />
        <meta name="twitter:description" key="twitter:description" content="Activities and GPA, essay feedback, study groups, careers and college planning. One free notebook for grades 9 to 12." />
        <meta name="twitter:image" key="twitter:image" content={`${SITE_URL}/og.png`} />
      </Head>

      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>

      <div className="min-h-screen bg-white text-slate-900 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Logo />

            {/* Desktop nav. From lg (1024px), not md: seven links plus two buttons
                need ~1000px, and at tablet widths the row overflowed and the whole
                page scrolled sideways. Tablets use the menu button instead. */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {appLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={navItemClass(isActive(link.href))}
                >
                  {link.label}
                </Link>
              ))}
              <span className="mx-2 h-5 w-px bg-slate-300" aria-hidden />
              <Link
                href={consultingLink.href}
                aria-current={inConsulting ? 'page' : undefined}
                className={navItemClass(inConsulting)}
              >
                {consultingLink.label}
              </Link>
              {authSwitch(
                <Link href={dashboardHref} className="ml-2 btn-primary text-sm !py-2.5 !px-5">
                  Dashboard
                </Link>,
                <>
                  <Link href="/auth/login" className="ml-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="btn-primary text-sm !py-2.5 !px-5">
                    Get Started
                  </Link>
                </>,
              )}
            </nav>

            {/* Phones: the account button lives in the header too. It used to
                exist only inside the hamburger menu, so on a phone there was
                no visible way to sign in. */}
            <div className="lg:hidden ml-auto mr-1 flex items-center">
              {authSwitch(
                <Link href={dashboardHref} className="btn-primary text-sm !py-2 !px-3.5">
                  Dashboard
                </Link>,
                <Link href="/auth/login" className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-colors">
                  Sign In
                </Link>,
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="lg:hidden p-2 text-slate-600 hover:text-primary"
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
            <div className="lg:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
              {appLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`block ${navItemClass(isActive(link.href))} !py-3`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="!my-2 border-t border-dashed border-slate-200" aria-hidden />
              <Link
                href={consultingLink.href}
                onClick={() => setMobileOpen(false)}
                aria-current={inConsulting ? 'page' : undefined}
                className={`block ${navItemClass(inConsulting)} !py-3`}
              >
                {consultingLink.label}
                <span className="ml-2 inline-block text-xs text-slate-500">1-on-1 mentors</span>
              </Link>
              {authSwitch(
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="block mt-2 btn-primary text-sm text-center"
                >
                  Dashboard
                </Link>,
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileOpen(false)}
                    className="block mt-2 btn-primary text-sm text-center"
                  >
                    Get Started
                  </Link>
                </>,
              )}
            </div>
          )}
        </header>

        <main id="main-content">{children}</main>

        {/* Footer */}
        <footer className="bg-primary text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl logo-tile flex items-center justify-center">
                    <LogoMark size={18} />
                  </div>
                  <span className="text-lg font-bold font-display">AdmitsOnly</span>
                </div>
                <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
                  The notebook for all four years of high school. Activities and grades, writing feedback, study
                  groups, careers and college planning, kept in one place.
                </p>
                {/* The homepage has its own newsletter card a scroll above;
                    two sign-up forms on one screen is one too many. */}
                {!onHome && (
                  <div className="mt-6 max-w-xs">
                    <p className="text-sm text-slate-400 leading-relaxed mb-3">Opportunities and study tips for families, once a week.</p>
                    <FooterNewsletter />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">The notebook</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><Link href="/auth/register" className="hover:text-white transition-colors">Start your notebook</Link></li>
                  <li><Link href="/essay-checker" className="hover:text-white transition-colors">Free essay checker</Link></li>
                  <li><Link href="/#inside" className="hover:text-white transition-colors">What&apos;s inside</Link></li>
                  <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Consulting</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><Link href="/consulting" className="hover:text-white transition-colors">1-on-1 mentors</Link></li>
                  <li><Link href="/services" className="hover:text-white transition-colors">Programs</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Book a free call</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Company</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                  <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                  <li><Link href="/newsletter" className="hover:text-white transition-colors">Newsletter</Link></li>
                  <li><a href="mailto:info@admitsonly.com" className="hover:text-white transition-colors">info@admitsonly.com</a></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} AdmitsOnly Learning Collective. All rights reserved.</p>
              <p className="text-sm text-slate-500">Made for grades 9 through 12.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Scroll to top button */}
      <ScrollToTop />
    </>
  );
}

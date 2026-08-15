import '../styles/globals.css'
import '../styles/theme-tokens.css'
import '../styles/theme-dark.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, Component as ReactComponent, type ErrorInfo, type ReactNode } from 'react'
import Layout from '../components/Layout'
import { tracker } from '../lib/analytics'
import { ThemeProvider } from '../lib/themeContext'

// Pages that use their own layout (no Layout wrapper)
const customLayoutPrefixes = ['/dashboard', '/educator', '/parent', '/admin', '/auth/'];

class ErrorBoundary extends ReactComponent<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      // Friendly, non-technical fallback for any account type. The real error
      // + stack is logged to the console (componentDidCatch) for debugging, but
      // end users never see a raw stack trace.
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>This page hit a snag</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Sorry about that — something didn&rsquo;t load correctly. Reloading the page usually fixes it, and your data is safe.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }} style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Reload page
              </button>
              <a href="/dashboard" style={{ padding: '10px 18px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
                Back to dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnalyticsInit() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    tracker.init();
    const handleRoute = (url: string) => tracker.pageview(url);
    router.events.on('routeChangeComplete', handleRoute);
    return () => {
      router.events.off('routeChangeComplete', handleRoute);
      tracker.destroy();
    };
  }, [router.events]);

  useEffect(() => {
    tracker.setUserId((session?.user as any)?.id || undefined);
  }, [session]);

  return null;
}

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const usesCustomLayout = customLayoutPrefixes.some((p) => router.pathname.startsWith(p));

  // Lock the mobile viewport at 1:1 scale. Without initial-scale, any
  // overflowing element makes phones zoom the whole page out to fit — the
  // "everything tiny and misaligned" failure mode. (Viewport meta belongs in
  // _app per Next.js docs, not _document.)
  const viewportMeta = (
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    </Head>
  );

  if (!usesCustomLayout) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <SessionProvider session={session}>
            {viewportMeta}
            <AnalyticsInit />
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </SessionProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SessionProvider session={session}>
          {viewportMeta}
          <AnalyticsInit />
          <Component {...pageProps} />
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

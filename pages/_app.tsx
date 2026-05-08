import '../styles/globals.css'
import type { AppProps } from 'next/app'
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
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', fontSize: 13, background: '#fff', color: '#000', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 18, color: '#dc2626', marginBottom: 16 }}>Client Error Caught</h1>
          <p style={{ marginBottom: 8 }}><strong>Message:</strong> {this.state.error.message}</p>
          <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 11, whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Try Again
          </button>
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

  if (!usesCustomLayout) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <SessionProvider session={session}>
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
          <AnalyticsInit />
          <Component {...pageProps} />
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

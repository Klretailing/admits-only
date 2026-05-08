import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Layout from '../components/Layout'
import { tracker } from '../lib/analytics'
import { ThemeProvider } from '../lib/themeContext'

// Pages that use their own layout (no Layout wrapper)
const customLayoutPrefixes = ['/dashboard', '/educator', '/parent', '/admin', '/auth/'];

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
      <ThemeProvider>
        <SessionProvider session={session}>
          <AnalyticsInit />
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </SessionProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SessionProvider session={session}>
        <AnalyticsInit />
        <Component {...pageProps} />
      </SessionProvider>
    </ThemeProvider>
  );
}

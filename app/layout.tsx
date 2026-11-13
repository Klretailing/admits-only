/* Root layout for the few App Router routes (the newsletter and the site-wide
   "not found" page). Everything else is the Pages Router.

   This used to carry the newsletter's title, and Next.js uses the root
   layout for its 404, so every broken link on admitsonly.com showed a bare
   page titled "Join Learner's Edge Weekly". The newsletter's title now lives
   in app/newsletter/layout.tsx; the root carries the site's own. */
// Same self-hosted type as the rest of the site (no Google Fonts request).
import '@fontsource-variable/shantell-sans/full.css';

export const metadata = {
  title: 'AdmitsOnly',
  metadataBase: new URL('https://www.admitsonly.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">

      <body>{children}</body>
    </html>
  );
}

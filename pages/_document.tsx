import { Html, Head, Main, NextScript } from 'next/document';

/* Applies the saved theme BEFORE first paint so there is never a flash of the
   wrong theme on load — the same trick Claude/Notion/Linear use. Must stay a
   tiny inline script (no async/defer) so it runs before the body renders. */
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('admitsonly_theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    // Signed-in hint for the header (see lib/authHint.ts).
    if (localStorage.getItem('ao_auth') === 'in') {
      document.documentElement.classList.add('ao-auth-in');
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Fonts are self-hosted via @fontsource (imported in _app.tsx). */}
        <meta name="theme-color" content="#f7f3ea" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

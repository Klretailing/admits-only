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
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

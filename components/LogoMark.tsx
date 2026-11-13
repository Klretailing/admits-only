/* The mark: a spiral-bound notebook page with a check on it. It replaced a
   graduation cap, which said "admissions" — the one thing the brand is no
   longer only about. Drawn in currentColor; the tile it sits in is the
   `.logo-tile` class (styles/notebook.css), ink on paper and chalk on the
   dark theme. */
export default function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6.5" y="3" width="13" height="18" rx="2.2" />
      <path d="M4 7.5h4M4 12h4M4 16.5h4" />
      <path d="M10.5 12.2l2.2 2.2 4-4.4" />
    </svg>
  );
}

const twColors = require('tailwindcss/colors');
const { INK, inkPalette } = require('./design/ink.cjs');

/* Every Tailwind palette, rebuilt through inkify (see design/ink.cjs): same
   luminance per shade, hue replaced by graphite — or red pencil for the red
   family. Contrast ratios are preserved exactly, so the thousands of existing
   color classes become monochrome without any of them losing legibility. */
const FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const inked = Object.fromEntries(FAMILIES.map((f) => [f, inkPalette(twColors[f])]));

/* Hard "pencil" shadows: a solid offset, no blur — paper cards lifted off
   the page, the 3D feel without the soft glow every AI-generated UI uses.
   The colour is a CSS variable so dark mode can swap it (theme-tokens.css). */
const sh = (x, a) => `${x}px ${x}px 0 0 rgb(var(--shadow-ink) / ${a})`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ...inked,
        white: INK.card,
        primary: INK.ink,
        accent: INK.ink,
        'accent-warm': inkPalette({ x: '#f59e0b' }).x,
        surface: INK.paper,
        /* Theme-aware: these read CSS variables (styles/notebook.css), so
           border-ink / bg-card / text-paper flip on the chalkboard theme. */
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'red-pencil': INK.redPencil,
      },
      /* One handwritten family, two voices (see styles/notebook.css):
         body text at zero informality so data stays crisp, headings at full
         informality with a little bounce so they read hand-lettered.
         Caveat is the margin-note voice; Literata is the student's own page. */
      fontFamily: {
        sans: ['"Shantell Sans Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['"Shantell Sans Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
        hand: ['"Caveat Variable"', 'cursive'],
        serif: ['"Literata Variable"', 'Georgia', 'serif'],
      },
      /* Sharper, less bubbly radii — Notion/Claude proportions. Existing
         rounded-xl/2xl usage across the site tightens automatically. */
      borderRadius: {
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      boxShadow: {
        sm: sh(1.5, 0.14),
        DEFAULT: sh(2, 0.18),
        md: sh(3, 0.9),
        lg: sh(4, 0.9),
        xl: sh(5, 0.9),
        '2xl': sh(7, 0.9),
        none: 'none',
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'marquee-reverse': 'marquee-reverse 40s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': `linear-gradient(${INK.paper}, ${INK.paper})`,
        'accent-gradient': `linear-gradient(${INK.ink}, ${INK.ink})`,
      },
    },
  },
  plugins: [],
};

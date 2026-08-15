/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        accent: '#6366f1',
        'accent-warm': '#f59e0b',
        surface: '#f8fafc',
      },
      /* Single-typeface system (like Notion/Stripe/Linear): Inter everywhere,
         differentiated by weight + tracking instead of a second family. */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      /* Sharper, less bubbly radii — Notion/Claude proportions. Existing
         rounded-xl/2xl usage across the site tightens automatically. */
      borderRadius: {
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      /* Layered, Stripe-style elevation: every shadow includes a hairline
         ring so cards read as crisp physical surfaces, not soft blobs.
         Existing shadow-sm/md/lg usage across the site upgrades automatically. */
      boxShadow: {
        sm: '0 0 0 1px rgb(15 23 42 / 0.03), 0 1px 2px rgb(15 23 42 / 0.04), 0 2px 6px -1px rgb(15 23 42 / 0.05)',
        DEFAULT: '0 0 0 1px rgb(15 23 42 / 0.03), 0 1px 3px rgb(15 23 42 / 0.05), 0 4px 10px -2px rgb(15 23 42 / 0.07)',
        md: '0 0 0 1px rgb(15 23 42 / 0.04), 0 2px 4px rgb(15 23 42 / 0.05), 0 8px 18px -4px rgb(15 23 42 / 0.09)',
        lg: '0 0 0 1px rgb(15 23 42 / 0.04), 0 4px 8px rgb(15 23 42 / 0.05), 0 16px 32px -8px rgb(15 23 42 / 0.12)',
        xl: '0 0 0 1px rgb(15 23 42 / 0.04), 0 6px 12px rgb(15 23 42 / 0.06), 0 24px 48px -12px rgb(15 23 42 / 0.16)',
        '2xl': '0 0 0 1px rgb(15 23 42 / 0.05), 0 10px 20px -5px rgb(15 23 42 / 0.1), 0 32px 64px -16px rgb(15 23 42 / 0.22)',
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
        'hero-pattern': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
      },
    },
  },
  plugins: [],
};

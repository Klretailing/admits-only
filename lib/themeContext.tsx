import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount, sync React state with whatever the pre-hydration script in
  // _document.tsx already applied to <html> (so there is no flash and no
  // mismatch between the DOM class and this state).
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setThemeState(isDark ? 'dark' : 'light');
  }, []);

  const setTheme = (t: Theme) => {
    const root = document.documentElement;

    // Cross-fade: briefly enable color transitions on everything, flip the
    // class, then remove the transition hook. Feels like Claude's toggle —
    // a soft fade instead of a hard cut — without permanently taxing paints.
    root.classList.add('theme-transition');
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => root.classList.remove('theme-transition'), 400);

    setThemeState(t);
    try { localStorage.setItem('admitsonly_theme', t); } catch { /* private mode */ }
    root.classList.toggle('dark', t === 'dark');
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

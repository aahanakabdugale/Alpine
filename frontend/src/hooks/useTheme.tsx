/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'alpine_theme';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    void err;
  }

  return 'light';
}

export function syncDocumentTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    syncDocumentTheme(initial);
    return initial;
  });

  // Keep document element & localStorage synchronized whenever state changes
  useEffect(() => {
    syncDocumentTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      void err;
    }
  }, [theme]);

  // Sync across browser tabs and system preference changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        syncDocumentTheme(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const next: Theme = e.matches ? 'dark' : 'light';
        setThemeState(next);
        syncDocumentTheme(next);
      }
    };

    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    syncDocumentTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (err) {
      void err;
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme: Theme = prev === 'dark' ? 'light' : 'dark';
      syncDocumentTheme(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (err) {
        void err;
      }
      return nextTheme;
    });
  }, []);

  const value: ThemeContextValue = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if called outside ThemeProvider
    const initial = getInitialTheme();
    return {
      theme: initial,
      isDark: initial === 'dark',
      toggleTheme: () => {
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        syncDocumentTheme(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (err) {
          void err;
        }
      },
      setTheme: (t: Theme) => {
        syncDocumentTheme(t);
        try {
          localStorage.setItem(STORAGE_KEY, t);
        } catch (err) {
          void err;
        }
      },
    };
  }
  return context;
}


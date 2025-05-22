'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const defaultState: ThemeContextType = {
  theme: 'light', // Default to light theme
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultState);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    } else {
      setTheme('light'); // Explicitly set to light if no preference/saved theme
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    console.log('[ThemeContext] Applying theme to DOM:', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('[ThemeContext] Added "dark" class to html element');
    } else {
      root.classList.remove('dark');
      console.log('[ThemeContext] Removed "dark" class from html element');
    }
    localStorage.setItem('theme', theme);
    console.log('[ThemeContext] Saved theme to localStorage:', theme);
  }, [theme]);

  const toggleTheme = () => {
    console.log('[ThemeContext] toggleTheme called');
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('[ThemeContext] Changing theme from', prevTheme, 'to', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
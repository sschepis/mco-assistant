'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex flex-shrink-0 h-7 w-12 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-900 ${
        isDark ? 'bg-primary-600' : 'bg-gray-300'
      }`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in ${
            isDark ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'
          }`}
        >
          <i className="fas fa-sun text-sm text-yellow-500"></i>
        </span>
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in ${
            isDark ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'
          }`}
        >
          <i className="fas fa-moon text-sm text-primary-600"></i>
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
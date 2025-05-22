'use client';

import React from 'react';
import ThemeToggle from '@/components/ThemeToggle'; // Import the new component
// Assuming Font Awesome is set up globally or via a different method in Next.js

interface HeaderProps {
  onToggleSidebar: () => void;
  currentChatTitle: string; // Add prop for the current chat title
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, currentChatTitle }) => {
  // useTheme() is no longer needed here as ThemeToggle handles its own theme context.
  // TODO: Replace static data with dynamic state/props for model
  const currentModel = "DeepSeek Chat"; // Update to reflect current model

  return (
    <header className="bg-white dark:bg-dark-800 border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between flex-shrink-0 transition-colors duration-300">
      {/* Left Side */}
      <div className="flex items-center space-x-4">
        <button onClick={onToggleSidebar} className="md:hidden text-gray-400 dark:text-gray-500 hover:text-primary-400 dark:hover:text-primary-300 transition-colors">
          <i className="fas fa-bars"></i> {/* Ensure Font Awesome is loaded */}
        </button>
        <h2 className="text-lg font-semibold flex items-center">
          <span className="text-xs px-2 py-1 rounded mr-2 hidden sm:inline-block bg-primary-100 border border-primary-600 text-gray-700 dark:bg-primary-900/30 dark:border-primary-800/30 dark:text-primary-400">
            {currentModel}
          </span>
          {/* Display the dynamic chat title */}
          <span className="truncate" title={currentChatTitle} style={{ maxWidth: 'calc(100vw - 300px)' }}> {/* Adjust max-width as needed */}
            {currentChatTitle}
          </span>
        </h2>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <ThemeToggle />
        <div className="hidden md:flex items-center space-x-2 bg-gray-100 dark:bg-dark-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-600 dark:text-gray-300 transition-colors">Connected</span>
        </div>

        <div className="relative">
          {/* Model Selection Dropdown - Only DeepSeek Chat */}
          <select className="appearance-none bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 dark:text-gray-100 transition-colors">
            <option value="deepseek-chat">DeepSeek Chat</option>
            {/* Other models removed */}
          </select>
          <i className="fas fa-chevron-down absolute right-2 top-2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none"></i> {/* Ensure Font Awesome is loaded */}
        </div>

        <button className="text-gray-400 dark:text-gray-500 hover:text-primary-400 dark:hover:text-primary-300 transition-colors hidden sm:inline-block">
          <i className="fas fa-users"></i> {/* Ensure Font Awesome is loaded */}
        </button>

        <button className="text-gray-400 dark:text-gray-500 hover:text-primary-400 dark:hover:text-primary-300 transition-colors">
          <i className="fas fa-ellipsis"></i> {/* Ensure Font Awesome is loaded */}
        </button>
      </div>
    </header>
  );
};

export default Header;
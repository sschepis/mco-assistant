'use client';

import React from 'react';
// Assuming Font Awesome is set up globally or via a different method in Next.js
// import '@fortawesome/fontawesome-free/css/all.min.css';

import { Conversation } from '@/types'; // Import Conversation type

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[]; // Add conversations prop
  currentConversationId: string | null; // Add current ID prop
  onNewChat: () => void; // Add new chat handler prop
  onSwitchChat: (id: string) => void; // Add switch chat handler prop
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    conversations,
    currentConversationId,
    onNewChat,
    onSwitchChat
}) => {
  // Helper to format timestamp (optional)
  const formatTimestamp = (timestamp: number) => {
    // Basic time formatting, replace with a library like date-fns if needed
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div
      id="sidebar"
      className={`sidebar w-72 bg-gray-100 dark:bg-dark-800 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed md:static inset-y-0 left-0 z-40 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className="p-4 border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
            <i className="fas fa-bolt text-white"></i> {/* Ensure Font Awesome is loaded */}
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">Nexus AI</h1>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-primary-400">
          <i className="fas fa-times"></i> {/* Ensure Font Awesome is loaded */}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-gray-200 dark:border-gray-800">
        {/* Call onNewChat when button is clicked */}
        <button
          onClick={onNewChat}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200 hover:glow"
        >
          <i className="fas fa-plus mr-2"></i> New Chat {/* Ensure Font Awesome is loaded */}
        </button>
      </div>

      {/* Search (Keep as is for now, functionality not implemented) */}
      <div className="p-4 border-gray-200 dark:border-gray-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500"
          />
          <i className="fas fa-search absolute left-3 top-3 text-gray-500 dark:text-gray-400"></i> {/* Ensure Font Awesome is loaded */}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Remove static sections (Today, Yesterday) */}
          {conversations.length === 0 ? (
             <p className="text-center text-sm text-gray-500 py-4">No conversations yet.</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const itemBg = isActive ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/30' : 'hover:bg-gray-200/50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-300 dark:hover:border-gray-700';
                const titleColor = isActive ? 'text-primary-800 dark:text-white' : 'text-gray-800 dark:text-gray-100';

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSwitchChat(conv.id)} // Call onSwitchChat with conversation ID
                    className={`p-3 rounded-lg cursor-pointer transition-all ${itemBg}`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className={`font-medium truncate ${titleColor}`}>{conv.title}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{formatTimestamp(conv.timestamp)}</span>
                    </div>
                    {/* Optionally show a snippet of the last message here */}
                    {/* <p className="text-sm text-gray-400 truncate mt-1">Last message snippet...</p> */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Profile / Settings (Keep as is) */}
      <div className="p-4 border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
            <i className="fas fa-user"></i> {/* Ensure Font Awesome is loaded */}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-gray-800 dark:text-gray-100">Alex Johnson</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Pro Plan · 12,500 tokens left</p>
          </div>
          <button className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
            <i className="fas fa-cog"></i> {/* Ensure Font Awesome is loaded */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
'use client';

import React, { useState, useMemo } from 'react';
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
  onRenameConversation?: (id: string, newTitle: string) => void; // Add rename handler
  onDeleteConversation?: (id: string) => void; // Add delete handler
  onDuplicateConversation?: (id: string) => void; // Add duplicate handler
  onPinConversation?: (id: string, pinned: boolean) => void; // Add pin handler
  onArchiveConversation?: (id: string, archived: boolean) => void; // Add archive handler
  onExportConversation?: (id: string) => void; // Add export handler
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    conversations,
    currentConversationId,
    onNewChat,
    onSwitchChat,
    onRenameConversation,
    onDeleteConversation,
    onDuplicateConversation,
    onPinConversation,
    onArchiveConversation,
    onExportConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Helper to format timestamp (optional)
  const formatTimestamp = (timestamp: number) => {
    // Basic time formatting, replace with a library like date-fns if needed
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by archived status
    filtered = filtered.filter(conv => showArchived ? conv.archived : !conv.archived);

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(conv => conv.category === selectedCategory);
    }

    // Sort: pinned first, then by timestamp
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastModified || b.timestamp) - (a.lastModified || a.timestamp);
    });
  }, [conversations, searchQuery, showArchived, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    conversations.forEach(conv => {
      if (conv.category) cats.add(conv.category);
    });
    return Array.from(cats);
  }, [conversations]);

  const handleContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    setContextMenuId(convId === contextMenuId ? null : convId);
  };

  const handleRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setContextMenuId(null);
  };

  const handleSaveRename = () => {
    if (editingId && editingTitle.trim() && onRenameConversation) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <i className="fas fa-plus mr-2"></i> New Chat {/* Ensure Font Awesome is loaded */}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-gray-200 dark:border-gray-800">
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500"
          />
          <i className="fas fa-search absolute left-3 top-3 text-gray-500 dark:text-gray-400"></i>
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2 py-1 rounded ${showArchived ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
             <p className="text-center text-sm text-gray-500 py-4">
               {searchQuery ? 'No conversations match your search.' : 'No conversations yet.'}
             </p>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const isEditing = editingId === conv.id;
                const itemBg = isActive ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/30' : 'hover:bg-gray-200/50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-300 dark:hover:border-gray-700';
                const titleColor = isActive ? 'text-primary-800 dark:text-white' : 'text-gray-800 dark:text-gray-100';

                return (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg transition-all relative ${itemBg}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                              className="flex-1 px-2 py-1 text-sm rounded border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                              autoFocus
                            />
                            <button onClick={handleSaveRename} className="text-green-600 hover:text-green-700">
                              <i className="fas fa-check text-xs"></i>
                            </button>
                            <button onClick={handleCancelRename} className="text-red-600 hover:text-red-700">
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {conv.pinned && (
                              <i className="fas fa-thumbtack text-primary-500 text-xs"></i>
                            )}
                            <h3
                              className={`font-medium truncate cursor-pointer ${titleColor}`}
                              onClick={() => onSwitchChat(conv.id)}
                            >
                              {conv.title}
                            </h3>
                            {conv.archived && (
                              <i className="fas fa-archive text-gray-400 text-xs"></i>
                            )}
                          </div>
                        )}
                        
                        {/* Tags */}
                        {conv.tags && conv.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {conv.tags.map(tag => (
                              <span key={tag} className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatTimestamp(conv.lastModified || conv.timestamp)}
                        </span>
                        <button
                          onClick={(e) => handleContextMenu(e, conv.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                        >
                          <i className="fas fa-ellipsis-v text-xs"></i>
                        </button>
                      </div>
                    </div>

                    {/* Context Menu */}
                    {contextMenuId === conv.id && (
                      <div className="absolute right-2 top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-32">
                        <button
                          onClick={() => handleRename(conv)}
                          className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <i className="fas fa-edit text-xs"></i> Rename
                        </button>
                        {onDuplicateConversation && (
                          <button
                            onClick={() => {
                              onDuplicateConversation(conv.id);
                              setContextMenuId(null);
                            }}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <i className="fas fa-copy text-xs"></i> Duplicate
                          </button>
                        )}
                        {onPinConversation && (
                          <button
                            onClick={() => {
                              onPinConversation(conv.id, !conv.pinned);
                              setContextMenuId(null);
                            }}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <i className={`fas fa-thumbtack text-xs ${conv.pinned ? 'text-primary-500' : ''}`}></i>
                            {conv.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        )}
                        {onArchiveConversation && (
                          <button
                            onClick={() => {
                              onArchiveConversation(conv.id, !conv.archived);
                              setContextMenuId(null);
                            }}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <i className="fas fa-archive text-xs"></i>
                            {conv.archived ? 'Unarchive' : 'Archive'}
                          </button>
                        )}
                        {onExportConversation && (
                          <button
                            onClick={() => {
                              onExportConversation(conv.id);
                              setContextMenuId(null);
                            }}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <i className="fas fa-download text-xs"></i> Export
                          </button>
                        )}
                        {onDeleteConversation && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this conversation?')) {
                                onDeleteConversation(conv.id);
                              }
                              setContextMenuId(null);
                            }}
                            className="w-full px-3 py-1 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                          >
                            <i className="fas fa-trash text-xs"></i> Delete
                          </button>
                        )}
                      </div>
                    )}
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
'use client';

import React, { useState, useMemo } from 'react';
import { Conversation, ConversationSearchOptions } from '@/types';

interface ConversationSearchProps {
  conversations: Conversation[];
  onSearchResults: (results: Conversation[]) => void;
  searchOptions?: ConversationSearchOptions;
  onSearchOptionsChange?: (options: ConversationSearchOptions) => void;
}

const ConversationSearch: React.FC<ConversationSearchProps> = ({
  conversations,
  onSearchResults,
  searchOptions = {},
  onSearchOptionsChange
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState<ConversationSearchOptions>(searchOptions);

  // Get unique tags and categories for filter options
  const { availableTags, availableCategories } = useMemo(() => {
    const tags = new Set<string>();
    const categories = new Set<string>();
    
    conversations.forEach(conv => {
      conv.tags?.forEach(tag => tags.add(tag));
      if (conv.category) categories.add(conv.category);
    });
    
    return {
      availableTags: Array.from(tags),
      availableCategories: Array.from(categories)
    };
  }, [conversations]);

  // Filter conversations based on search options
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Text search
    if (localOptions.query?.trim()) {
      const query = localOptions.query.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (localOptions.tags && localOptions.tags.length > 0) {
      filtered = filtered.filter(conv =>
        localOptions.tags!.some(tag => conv.tags?.includes(tag))
      );
    }

    // Category filter
    if (localOptions.category && localOptions.category !== 'all') {
      filtered = filtered.filter(conv => conv.category === localOptions.category);
    }

    // Date range filter
    if (localOptions.dateFrom) {
      const fromTime = localOptions.dateFrom.getTime();
      filtered = filtered.filter(conv => conv.timestamp >= fromTime);
    }

    if (localOptions.dateTo) {
      const toTime = localOptions.dateTo.getTime();
      filtered = filtered.filter(conv => conv.timestamp <= toTime);
    }

    // Pinned filter
    if (localOptions.pinned !== undefined) {
      filtered = filtered.filter(conv => conv.pinned === localOptions.pinned);
    }

    // Archived filter
    if (localOptions.archived !== undefined) {
      filtered = filtered.filter(conv => conv.archived === localOptions.archived);
    }

    return filtered;
  }, [conversations, localOptions]);

  // Update results when filters change
  React.useEffect(() => {
    onSearchResults(filteredConversations);
  }, [filteredConversations, onSearchResults]);

  const updateOptions = (newOptions: Partial<ConversationSearchOptions>) => {
    const updated = { ...localOptions, ...newOptions };
    setLocalOptions(updated);
    onSearchOptionsChange?.(updated);
  };

  const clearFilters = () => {
    const cleared: ConversationSearchOptions = {};
    setLocalOptions(cleared);
    onSearchOptionsChange?.(cleared);
  };

  return (
    <div className="space-y-3">
      {/* Basic Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search conversations..."
          value={localOptions.query || ''}
          onChange={(e) => updateOptions({ query: e.target.value })}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500"
        />
        <i className="fas fa-search absolute left-3 top-3 text-gray-500 dark:text-gray-400"></i>
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-primary-500"
        >
          <i className={`fas fa-filter ${isAdvancedOpen ? 'text-primary-500' : ''}`}></i>
        </button>
      </div>

      {/* Advanced Filters */}
      {isAdvancedOpen && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Filters</h4>
            <button
              onClick={clearFilters}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={localOptions.category || 'all'}
                onChange={(e) => updateOptions({ category: e.target.value === 'all' ? undefined : e.target.value })}
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      const currentTags = localOptions.tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      updateOptions({ tags: newTags.length > 0 ? newTags : undefined });
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      localOptions.tags?.includes(tag)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={localOptions.dateFrom ? localOptions.dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => updateOptions({ 
                  dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                })}
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={localOptions.dateTo ? localOptions.dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => updateOptions({ 
                  dateTo: e.target.value ? new Date(e.target.value) : undefined 
                })}
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateOptions({ pinned: localOptions.pinned === true ? undefined : true })}
              className={`px-2 py-1 text-xs rounded ${
                localOptions.pinned === true
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <i className="fas fa-thumbtack mr-1"></i>
              Pinned Only
            </button>
            <button
              onClick={() => updateOptions({ archived: localOptions.archived === false ? undefined : false })}
              className={`px-2 py-1 text-xs rounded ${
                localOptions.archived === false
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <i className="fas fa-archive mr-1"></i>
              Hide Archived
            </button>
          </div>

          {/* Results Count */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {filteredConversations.length} of {conversations.length} conversations
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationSearch;
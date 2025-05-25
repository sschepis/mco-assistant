'use client';

// Assuming Font Awesome is set up globally or via a different method in Next.js

import React, { useState, ChangeEvent, Dispatch, SetStateAction } from 'react';
import AddMemoryModal from '../AddMemoryModal';
import ModelConfigSection from './ModelConfigSection'; // Import the new component

// Define a type for memory search results (adjust based on actual return type)
interface MemorySearchResult {
  text: string;
  source: string | string[];
  score: number;
  type: 'session' | 'persistent';
}

// Define a type for advanced search parameters
export type FilterType = 'all' | 'session' | 'persistent'; // Export for use in Layout.tsx
export interface MemorySearchParameters {
  query: string;
  filterType?: FilterType;
  filterDateStart?: string;
  filterDateEnd?: string;
  // Future: add limits, sort options etc.
}

interface ModelConfigSidebarProps {
  isOpen: boolean;
  maxTokens: number;
  setMaxTokens: Dispatch<SetStateAction<number>>;
  onMemorySearch?: (params: MemorySearchParameters) => Promise<MemorySearchResult[]>;
}

const ModelConfigSidebar: React.FC<ModelConfigSidebarProps> = ({
  isOpen,
  maxTokens,
  setMaxTokens,
  onMemorySearch = async () => { console.warn("onMemorySearch not implemented"); return []; },
}) => {

  // State for memory search
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState<MemorySearchResult[]>([]);
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [expandedResultIndices, setExpandedResultIndices] = useState<Set<number>>(new Set());
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false); // State for modal visibility

  // State for advanced search filters is already defined above with FilterType
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');


  const MAX_HISTORY_LENGTH = 10;
  const MAX_SUGGESTIONS = 5;

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prevHistory => {
      const newHistory = [query.trim(), ...prevHistory.filter(h => h !== query.trim())];
      return newHistory.slice(0, MAX_HISTORY_LENGTH);
    });
  };

  // Update suggestions when memoryQuery or searchHistory changes
  React.useEffect(() => {
    if (memoryQuery.trim() === '') {
      setSuggestions(searchHistory.slice(0, MAX_SUGGESTIONS)); // Show recent history if query is empty
    } else {
      const filtered = searchHistory.filter(h =>
        h.toLowerCase().includes(memoryQuery.toLowerCase()) && h.toLowerCase() !== memoryQuery.toLowerCase()
      );
      setSuggestions(filtered.slice(0, MAX_SUGGESTIONS));
    }
  }, [memoryQuery, searchHistory]);

  // Removed helper functions as they are now in ModelConfigSection


  const handleMemoryQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setMemoryQuery(query);
    if (query.trim() !== '') {
      setShowHistory(true); // Keep/show suggestions while typing
    } else {
      // If query is cleared, show history or hide if no history
      setShowHistory(searchHistory.length > 0);
    }
    setActiveSuggestionIndex(-1); // Reset active suggestion on query change
  };

  const handleMemorySearchClick = async (searchQuery?: string) => { // Allow passing query for suggestion selection
    const queryToSearch = searchQuery || memoryQuery;
    if (!queryToSearch.trim() || !onMemorySearch) return;

    setIsSearchingMemory(true);
    setMemoryResults([]); // Clear previous results
    addToSearchHistory(queryToSearch); // Add to history
    setShowHistory(false); // Hide history on search
    setActiveSuggestionIndex(-1);
    if (!queryToSearch.trim() || !onMemorySearch) return;

    setIsSearchingMemory(true);
    setMemoryResults([]); // Clear previous results
    addToSearchHistory(queryToSearch); // Add to history
    setShowHistory(false); // Hide history on search
    setActiveSuggestionIndex(-1); // Reset active suggestion

    const searchParams: MemorySearchParameters = {
      query: memoryQuery,
      filterType: filterType,
    };
    if (filterDateStart) searchParams.filterDateStart = filterDateStart;
    if (filterDateEnd) searchParams.filterDateEnd = filterDateEnd;

    console.log("Performing memory search with params:", searchParams);

    try {
      const results = await onMemorySearch(searchParams);
      setMemoryResults(results);
    } catch (error) {
      console.error("Error searching memory:", error);
      // Optionally display an error message in the UI
    } finally {
      setIsSearchingMemory(false);
    }
  };


  const handleMemoryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (showHistory && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex(prevIndex =>
          prevIndex === suggestions.length - 1 ? 0 : prevIndex + 1
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex(prevIndex =>
          prevIndex <= 0 ? suggestions.length - 1 : prevIndex - 1
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          const selectedQuery = suggestions[activeSuggestionIndex];
          setMemoryQuery(selectedQuery);
          handleMemorySearchClick(selectedQuery); // Pass selected query
          setShowHistory(false);
          setActiveSuggestionIndex(-1);
        } else {
          handleMemorySearchClick(); // Regular search if no suggestion highlighted
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowHistory(false);
        setActiveSuggestionIndex(-1);
      }
    } else if (event.key === 'Enter') {
      // If suggestions are not shown or empty, Enter just triggers search
      handleMemorySearchClick();
    }
  };



  if (!isOpen) {
    return null; // Don't render if closed
  }

  return (
    <div className="hidden xl:block w-80 p-4 overflow-y-auto flex-shrink-0 bg-white dark:bg-dark-800 border-gray-200 dark:border-gray-700">
      <div className="space-y-6">
        {/* Model Configuration Section */}
        <ModelConfigSection
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
        />

        {/* Memory Search Section */}
        <div className="pt-4 border-gray-800">
          <h3 className="font-medium mb-3">Memory Search (LanceDB)</h3>
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search memories..."
              value={memoryQuery}
              onChange={handleMemoryQueryChange}
              onKeyDown={handleMemoryKeyDown}
              onFocus={() => (memoryQuery.trim() === '' && searchHistory.length > 0 && suggestions.length > 0) || (memoryQuery.trim() !== '' && suggestions.length > 0) ? setShowHistory(true) : null}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)} // Delay to allow click on history/suggestion item
              className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-700 bg-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              disabled={isSearchingMemory}
            />
            {showHistory && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((suggestionQuery, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 text-sm text-gray-300 hover:bg-dark-600 cursor-pointer ${
                      index === activeSuggestionIndex ? 'bg-dark-600' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setMemoryQuery(suggestionQuery);
                      handleMemorySearchClick(suggestionQuery); // Pass selected query
                      setShowHistory(false);
                      setActiveSuggestionIndex(-1);
                    }}
                  >
                    {suggestionQuery}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => handleMemorySearchClick()} // Call via arrow function
              disabled={isSearchingMemory || !memoryQuery.trim()}
              className="absolute right-1 top-1 bottom-1 px-2 text-gray-400 hover:text-primary-400 disabled:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Search memories"
            >
              {isSearchingMemory ? (
                <i className="fas fa-spinner fa-spin"></i> // Loading indicator
              ) : (
                <i className="fas fa-search"></i> // Search icon
              )}
            </button>
          </div>

          {/* Advanced Search Filters UI */}
          <div className="mb-3 space-y-2 text-xs">
            <div className="text-gray-400">Filter by type:</div>
            <div className="flex space-x-2">
              {(['all', 'session', 'persistent'] as FilterType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 rounded ${filterType === type ? 'bg-primary-600 text-white' : 'bg-dark-600 text-gray-300 hover:bg-dark-500'}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            {/* Basic Date Filter Inputs - can be improved with date pickers later */}
            <div className="text-gray-400 mt-2">Filter by date:</div>
            <div className="flex space-x-2">
              <input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className="bg-dark-600 text-gray-300 p-1 rounded border border-gray-700 text-xs w-1/2" />
              <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="bg-dark-600 text-gray-300 p-1 rounded border border-gray-700 text-xs w-1/2" />
            </div>
          </div>

          {/* Results Area */}
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-800 rounded-md p-2 bg-dark-900/30">
            {isSearchingMemory && <p className="text-xs text-gray-500 text-center">Searching...</p>}
            {!isSearchingMemory && memoryResults.length === 0 && (
              <p className="text-xs text-gray-500 text-center">No results found.</p>
            )}
            {!isSearchingMemory && memoryResults.map((result, index) => {
              const isExpanded = expandedResultIndices.has(index);
              const toggleExpand = () => {
                setExpandedResultIndices(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(index)) {
                    newSet.delete(index);
                  } else {
                    newSet.add(index);
                  }
                  return newSet;
                });
              };

              return (
                <div key={index} className="text-xs p-2 bg-dark-700 rounded border border-gray-700 cursor-pointer" onClick={toggleExpand}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-gray-300 font-medium">
                      {isExpanded ? result.text : (result.text.length > 100 ? result.text.substring(0, 100) + '...' : result.text)}
                    </p>
                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-500 ml-2`}></i>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      <p className="text-gray-400">Score: <span className="font-mono">{result.score.toFixed(4)}</span></p>
                      <p className="text-gray-400">Type: <span className={`capitalize px-1.5 py-0.5 rounded text-xxs ${result.type === 'persistent' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'}`}>{result.type}</span></p>
                      {Array.isArray(result.source) ? (
                        <p className="text-gray-400">Sources: {result.source.join(', ')}</p>
                      ) : (
                        <p className="text-gray-400">Source: {result.source}</p>
                      )}
                    </div>
                  )}
                  {!isExpanded && (
                    <div className="flex justify-between items-center text-gray-500">
                      <span className={`capitalize px-1.5 py-0.5 rounded text-xxs ${result.type === 'persistent' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'}`}>
                        {result.type}
                      </span>
                      <span className="font-mono">Score: {result.score.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Memory Button */}
        <div className="pt-4 border-gray-800">
          <button
            onClick={() => setIsAddMemoryModalOpen(true)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <i className="fas fa-plus-circle mr-2"></i>
            Add New Memory
          </button>
        </div>

        {/* Knowledge & Context Section Removed */}
        {/* ... */}
      </div>
      <AddMemoryModal
        isOpen={isAddMemoryModalOpen}
        onClose={() => setIsAddMemoryModalOpen(false)}
        onAddMemorySuccess={() => {
          // Optionally, refresh memory search results or show a success message
          // For now, just close the modal
          setIsAddMemoryModalOpen(false);
        }}
      />
    </div>
  );
};

export default ModelConfigSidebar;
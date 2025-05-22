'use client';

// Assuming Font Awesome is set up globally or via a different method in Next.js

import React, { useState, ChangeEvent, Dispatch, SetStateAction } from 'react'; // Consolidate imports

// Define a type for memory search results (adjust based on actual return type)
interface MemorySearchResult {
  text: string;
  source: string | string[];
  score: number;
  type: 'session' | 'persistent';
}

interface ModelConfigSidebarProps {
  isOpen: boolean;
  temperature: number;
  setTemperature: Dispatch<SetStateAction<number>>;
  maxTokens: number; // Add maxTokens prop
  setMaxTokens: Dispatch<SetStateAction<number>>; // Add setMaxTokens prop
  systemPrompt: string;
  setSystemPrompt: Dispatch<SetStateAction<string>>;
  // Placeholder for the actual search function prop
  onMemorySearch?: (query: string) => Promise<MemorySearchResult[]>;
}

const ModelConfigSidebar: React.FC<ModelConfigSidebarProps> = ({
  isOpen,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  systemPrompt,
  setSystemPrompt,
  onMemorySearch = async () => { console.warn("onMemorySearch not implemented"); return []; }, // Default placeholder
}) => {

  // State for memory search
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState<MemorySearchResult[]>([]);
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);

  // Helper to map slider value (0, 1, 2) to token count
  const mapSliderToMaxTokens = (value: number): number => {
    if (value === 0) return 500; // Short
    if (value === 1) return 1000; // Medium
    if (value === 2) return 2000; // Long
    return 1000; // Default
  };

  // Helper to map token count back to slider value (0, 1, 2)
  const mapMaxTokensToSlider = (tokens: number): number => {
    if (tokens <= 500) return 0;
    if (tokens <= 1000) return 1;
    return 2;
  };

  // Helper to get the label for the current maxTokens
  const getMaxTokensLabel = (tokens: number): string => {
    if (tokens <= 500) return 'Short';
    if (tokens <= 1000) return 'Medium';
    return 'Long';
  };


  const handleMemoryQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMemoryQuery(event.target.value);
  };

  const handleMemorySearchClick = async () => {
    if (!memoryQuery.trim() || !onMemorySearch) return;
    setIsSearchingMemory(true);
    setMemoryResults([]); // Clear previous results
    try {
      const results = await onMemorySearch(memoryQuery);
      setMemoryResults(results);
    } catch (error) {
      console.error("Error searching memory:", error);
      // Optionally display an error message in the UI
    } finally {
      setIsSearchingMemory(false);
    }
  };

  const handleMemoryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
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
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Model Configuration</h3> {/* Text color will be inherited and should be fine */}
            <div className="flex space-x-2">
              {/* TODO: Update button styles for light/dark theme */}
              <button className="text-xs bg-gray-100 text-gray-600 hover:text-primary-600 px-2 py-0.5 rounded border border-gray-300 dark:bg-dark-700 dark:text-gray-400 dark:hover:text-primary-400 dark:border-gray-800 transition-colors">
                <i className="fas fa-history mr-1"></i> Reset
              </button>
              <button className="text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 px-2 py-0.5 rounded border border-primary-600 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/50 dark:border-primary-800/30 transition-colors">
                <i className="fas fa-save mr-1"></i> Save
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Model Version Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model Version</label>
                <span className="text-xs px-2 py-0.5 rounded text-primary-700 bg-primary-100 dark:text-primary-400 dark:bg-primary-900/20">Default</span>
              </div>
              {/* Model Version Dropdown - Only DeepSeek Chat */}
              <select className="w-full rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-dark-700 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                <option value="deepseek-chat">DeepSeek Chat</option>
                {/* Other models removed */}
              </select>
            </div>

            {/* Creativity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="temperature-slider" className="text-sm font-medium text-gray-300">Creativity</label>
                {/* Display the actual temperature value */}
                <span className="text-xs text-gray-400 font-mono">{temperature.toFixed(1)}</span>
              </div>
              <input
                id="temperature-slider"
                type="range"
                min="0"
                max="1" // DeepSeek temperature range is typically 0-1 or 0-2, check docs if needed
                step="0.1"
                value={temperature} // Use value prop for controlled component
                onChange={(e) => setTemperature(parseFloat(e.target.value))} // Update state on change
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise (0.0)</span>
                {/* Removed Balanced label */}
                <span>Creative</span>
              </div>
            </div>

            {/* Response Length Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="max-tokens-slider" className="text-sm font-medium text-gray-300">Response Length</label>
                {/* Display the label corresponding to the current maxTokens */}
                <span className="text-xs text-gray-400">{getMaxTokensLabel(maxTokens)}</span>
              </div>
              <input
                id="max-tokens-slider"
                type="range"
                min="0"
                max="2"
                step="1"
                value={mapMaxTokensToSlider(maxTokens)} // Map current maxTokens to slider value
                onChange={(e) => setMaxTokens(mapSliderToMaxTokens(parseInt(e.target.value)))} // Map slider value back to maxTokens and update state
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Short (~500)</span>
                <span>Medium (~1k)</span>
                <span>Long</span>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Parameters Section Removed - Top P/K, Freq/Pres Penalty not supported by current DeepSeekProvider */}
        {/*
        <div className="pt-4 border-gray-800">
          <h3 className="font-medium mb-4">Advanced Parameters</h3>
          <div className="space-y-5">
            // Top P/K Slider Removed
            // Frequency Penalty Slider Removed
            // Presence Penalty Slider Removed
          </div>
        </div>
        */}

        {/* System Prompt Section */}
        <div className="pt-4 border-gray-800">
          <h3 className="font-medium mb-3">System Prompt</h3>
          <textarea
            id="system-prompt-textarea"
            className="w-full bg-dark-700 border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-100"
            rows={6} // Increased rows for better visibility
            placeholder="Enter custom instructions for the AI..."
            value={systemPrompt} // Use value prop for controlled component
            onChange={(e) => setSystemPrompt(e.target.value)} // Update state on change
          />
          <div className="flex items-center justify-between mt-2">
            {/* Simple character count for now */}
            <span className="text-xs text-gray-400">Length: {systemPrompt.length}</span>
            <button className="text-xs text-primary-400 hover:underline">Insert template</button>
          </div>
        </div>

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
              className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-700 bg-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              disabled={isSearchingMemory}
            />
            <button
              onClick={handleMemorySearchClick}
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
          {/* Results Area */}
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-800 rounded-md p-2 bg-dark-900/30">
            {isSearchingMemory && <p className="text-xs text-gray-500 text-center">Searching...</p>}
            {!isSearchingMemory && memoryResults.length === 0 && (
              <p className="text-xs text-gray-500 text-center">No results found.</p>
            )}
            {!isSearchingMemory && memoryResults.map((result, index) => (
              <div key={index} className="text-xs p-2 bg-dark-700 rounded border border-gray-700">
                <p className="text-gray-300 truncate mb-1" title={result.text}>{result.text}</p>
                <div className="flex justify-between items-center text-gray-500">
                   <span className={`capitalize px-1.5 py-0.5 rounded text-xxs ${result.type === 'persistent' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'}`}>
                     {result.type}
                   </span>
                   <span className="font-mono">Score: {result.score.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge & Context Section Removed */}
        {/* ... */}
      </div>
    </div>
  );
};

export default ModelConfigSidebar;
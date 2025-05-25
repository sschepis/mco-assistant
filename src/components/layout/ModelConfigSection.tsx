import React, { Dispatch, SetStateAction } from 'react';

interface ModelConfigSectionProps {
  maxTokens: number;
  setMaxTokens: Dispatch<SetStateAction<number>>;
}

const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({
  maxTokens,
  setMaxTokens,
}) => {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Model Configuration</h3>
        <div className="flex space-x-2">
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
          <select className="w-full rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-dark-700 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <option value="deepseek-chat">DeepSeek Chat</option>
          </select>
        </div>


        {/* Response Length Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="max-tokens-slider" className="text-sm font-medium text-gray-300">Response Length</label>
            <span className="text-xs text-gray-400">{getMaxTokensLabel(maxTokens)}</span>
          </div>
          <input
            id="max-tokens-slider"
            type="range"
            min="0"
            max="2"
            step="1"
            value={mapMaxTokensToSlider(maxTokens)}
            onChange={(e) => setMaxTokens(mapSliderToMaxTokens(parseInt(e.target.value)))}
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
  );
};

export default ModelConfigSection;
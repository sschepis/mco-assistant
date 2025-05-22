import { DeepSeekProvider, Message, ToolDefinition, ToolCall } from '@/providers/DeepSeekProvider';

// Export types for use in other files
export type { Message, ToolDefinition, ToolCall };

// Initialize the DeepSeek provider with the API key from environment variable
export const deepseekProvider = new DeepSeekProvider(
  process.env.DEEPSEEK_API_KEY || ''
);

// For debugging
console.log('DeepSeek provider initialized with API key:',
  process.env.DEEPSEEK_API_KEY ? 'API key present' : 'No API key');
// Tool schema definitions
export interface ToolParameterDefinition {
  type: string;
  description?: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameterDefinition>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  output: string;
}

// Message types
export interface Message {
  role: string;
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

// Request body type
export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: string; function: { name: string } };
}

// Provider for DeepSeek API with tool support
export class DeepSeekProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  /**
   * Generate a completion using the DeepSeek API with tool support
   */
  async generateChatCompletion(options: {
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: ToolDefinition[];
    tool_choice?: 'auto' | 'none' | { type: string; function: { name: string } };
  }) {
    // Build the request URL
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build the request body
    const requestBody: ChatCompletionRequest = {
      model: 'deepseek-chat',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      stream: options.stream ?? false,
    };

    // Add tools and tool_choice only if NOT streaming
    // DeepSeek might not support tools with streaming in the same way
    if (!options.stream) {
        if (options.tools && options.tools.length > 0) {
          requestBody.tools = options.tools;
        }
        if (options.tool_choice) {
          requestBody.tool_choice = options.tool_choice;
        }
    }
    
    // Build the headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
    
    console.log('DeepSeek API Request:', JSON.stringify(requestBody, null, 2));
    
    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error response:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    // Handle streaming response
    if (options.stream) {
      return response.body;
    }
    
    // Handle regular response
    const data = await response.json();
    console.log('DeepSeek API Response:', JSON.stringify(data, null, 2));
    return data;
  }
}
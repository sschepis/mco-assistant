/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types.ts
// Define common types used across the project

// Define types for chat messages and usage
export type UsageInfo = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  usage?: UsageInfo | null; // Add optional usage field
  includedMemoryCount?: number; // Add optional includedMemoryCount field
};

// Represents metadata for a conversation
export interface Conversation {
  id: string; // Unique identifier (e.g., timestamp or UUID)
  title: string; // Title of the conversation (e.g., first user message, or generated)
  timestamp: number; // Timestamp of creation or last update
  lastModified?: number; // Last time the conversation was modified
  messageCount?: number; // Number of messages in the conversation
  tags?: string[]; // Tags for categorization
  category?: string; // Category for organization
  pinned?: boolean; // Whether the conversation is pinned
  archived?: boolean; // Whether the conversation is archived
  // Add other metadata like user ID, model used, etc. if needed
}

// Represents conversation search and filter options
export interface ConversationSearchOptions {
  query?: string;
  tags?: string[];
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  pinned?: boolean;
  archived?: boolean;
}

// Represents conversation export format
export interface ConversationExport {
  conversation: Conversation;
  messages: Message[];
  exportDate: number;
  version: string;
}

export interface DataProvider {
  name: string;
  get(keypath: string[]): Promise<unknown>; // Use unknown instead of any
  set(keypath: string[], value: unknown): Promise<void>; // Use unknown
  put(keypath: string[], value: unknown): Promise<void>; // Use unknown
  del(keypath: string[]): Promise<void>;
  on(keypath: string[], callback: (value: unknown) => void): void; // Use unknown
  once(keypath: string[], callback: (value: unknown) => void): void; // Use unknown
  off(keypath: string[], callback: (value: unknown) => void): void; // Use unknown
  verify(signature: string, publicKey: string): Promise<boolean>;
  sign(data: unknown, privateKeyOrPair: unknown): Promise<string>; // Use unknown
  decrypt(data: unknown, privateKeyOrPair: unknown): Promise<unknown>; // Use unknown
  encrypt(data: unknown, publicKeyOrPair: unknown): Promise<unknown>; // Use unknown
  auth(credentials: unknown): Promise<unknown>; // Use unknown
  pair(): Promise<unknown>; // Use unknown
  login(username: string, password: string): Promise<unknown>; // Use unknown
  register(username: string, password: string): Promise<unknown>; // Use unknown
  logout(): Promise<void>;
  checkAuthStatus(): Promise<boolean>;
}

// ContextType definition (basic structure)
export interface ContextType {
  name: string;
  version: string; // Added version property
  // Add other relevant properties if they become known
}

// AIProviderType definition (basic structure)
export interface AIProviderType {
  name: string;
  // Add other relevant properties if they become known
}

// AI Interfaces (from index.d.ts)
export interface AIResponse {
  response: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  // Update usage type to match the exported UsageInfo
  usage?: UsageInfo | null;
  actions?: Action[]; // Added optional actions property
  includedMemoryCount?: number; // Add optional includedMemoryCount field
}

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  type: AIProviderType;
  chat(messages: unknown[], options?: Record<string, unknown>): Promise<AIResponse>; // Use unknown[] and Record
  generateText?(prompt: string, options?: Record<string, unknown>): Promise<string>; // Use Record
  generateResponse(prompt: string, options?: Record<string, unknown>): Promise<string>; // Use Record
  // Add other methods if known/needed
}

// Other common interfaces from index.d.ts or inferred usage
export interface MethodRegistry {
  [key: string]: Map<string, (...args: any[]) => Promise<any>>; // Define a more specific function type
}

export interface DomainConfig {
    rootNode: string;
    publicKey: string;
}

export interface ConfigurationOptions {
    aiProvider: string;
    maxTokens: number;
    temperature: number;
    domains: { [key: string]: { rootNode: string; publicKey: string } };
    apiKeys?: { [key: string]: string };
    azureOpenaiEndpoint?: string;
    anthropicModel?: string;
    anthropicLocation?: string;
    vertexModel?: string;
    azureOpenaiDeploymentName?: string;
    azureOpenaiApiKey?: string;
    gcloudRegionClaude?: string;
    gcloudProjectId?: string;
    gcloudRegion?: string;
    llamaEndpoint?: string;
    transactionSecret?: string;
    llmSettings?: Record<string, unknown>; // Use Record
    currentProjectId?: string;
    userId?: string;
}

export interface ContextConfig {
    [contextName: string]: Record<string, unknown>; // Use Record
}

// Types previously defined locally in AIExecutionPipeline.ts
export interface ExecutionResult {
    state: Record<string, unknown>; // Use Record
    tasks?: Task[];
    actions?: Action[];
}

export interface ExecutionContext {
    id: string;
    startTime: number;
    depth: number;
    options: {
        failFast: boolean;
        maxDepth: number;
        timeout: number;
        [key: string]: unknown; // Use unknown
    };
}

export interface Task {
    tool: string;
    params: Record<string, unknown>; // Use Record
}

export interface Action {
    id: string;
    type: string;
    data: Record<string, unknown>; // Use Record
    echo?: boolean; // Added optional echo property
}

// Type from OfflineManager
export interface Operation {
    (): Promise<unknown>; // Use unknown
}
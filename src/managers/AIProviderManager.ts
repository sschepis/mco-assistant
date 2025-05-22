/* eslint-disable @typescript-eslint/no-explicit-any */
import Configuration from '../Configuration';

import AnthropicProvider from '../providers/AnthropicProvider';
import VertexProvider from '../providers/VertexProvider';
import AzureOpenAIProvider from '../providers/AzureOpenAIProvider';
import MetaProvider from '../providers/MetaProvider';

import { AIExecutionPipeline } from '../ai/AIExecutionPipeline';
import PromptManager from './PromptManager';
import ToolManager from './ToolManager';
import { ActionQueue } from '../utils/ActionQueue';
import StateManager from './StateManager';
import { AIProvider, AIResponse, AIRequest } from '../types'; // Corrected import path
import { MemoryManager } from '../ai/associativeMemory'; // Import MemoryManager

export default class AIProviderManager {
    private providers: Map<string, AIProvider>; // Key by string name
    private currentProvider: string; // Store name as string
    private executionPipeline: AIExecutionPipeline;

    constructor(
        private configuration: Configuration,
        private promptManager: PromptManager,
        private toolManager: ToolManager,
        private stateManager: StateManager,
        private actionQueue: ActionQueue,
        private memoryManager: MemoryManager, // Add MemoryManager parameter
        private sessionId: string // Add sessionId parameter
    ) {
        this.providers = new Map<string, AIProvider>(); // Initialize with string key
        this.currentProvider = this.configuration.getAiProvider(); // Get name as string, remove cast
        this.initializeProviders();
        this.executionPipeline = new AIExecutionPipeline(
            this.promptManager,
            this.toolManager,
            this.stateManager,
            this.actionQueue,
            this.memoryManager, // Pass memoryManager to pipeline
            this.sessionId // Pass sessionId to pipeline
        );
    }

    static newInstance(
        configuration: Configuration,
        promptManager: PromptManager,
        toolManager: ToolManager,
        stateManager: StateManager,
        actionQueue: ActionQueue,
        memoryManager: MemoryManager, // Add MemoryManager parameter
        sessionId: string // Add sessionId parameter
    ): AIProviderManager {
        return new AIProviderManager(configuration, promptManager, toolManager, stateManager, actionQueue, memoryManager, sessionId);
    }

    private initializeProviders(): void {
        this.providers.set('anthropic', new AnthropicProvider(this.configuration));
        this.providers.set('vertex', new VertexProvider(this.configuration));
        this.providers.set('openai', new AzureOpenAIProvider(this.configuration));
        this.providers.set('meta', new MetaProvider(this.configuration));
    }

    setProvider(providerName: string): void { // Accept string name
        if (!this.providers.has(providerName)) {
            throw new Error(`AI provider ${providerName} is not supported`);
        }
        this.currentProvider = providerName;
        this.configuration.setAiProvider(providerName); // Pass string name
    }

    getCurrentProvider(): AIProvider {
        const provider = this.providers.get(this.currentProvider); // Get using string name
        if (!provider) {
            throw new Error(`Current AI provider ${this.currentProvider} is not initialized`);
        }
        return provider;
    }

    getProvider(providerName: string): AIProvider { // Accept string name
        const provider = this.providers.get(providerName); // Get using string name
        if (!provider) {
            throw new Error(`AI provider ${providerName} is not supported`);
        }
        return provider;
    }

    // Modified to accept messages array
    async execute(messages: any[], params: any = {}, options: any = {}): Promise<AIResponse> {
        const provider = this.getCurrentProvider();
        // Pass messages array to the pipeline
        const executionResult = await this.executionPipeline.execute(messages, { ...params, provider }, options);
        
        return {
            response: executionResult.state.response || '',
            usage: executionResult.state.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            includedMemoryCount: executionResult.state.includedMemoryCount // Include includedMemoryCount
        };
    }

    async chat(messages: any, options: any = {}): Promise<AIResponse> {
        // Pass messages directly, assuming chat calls execute with the correct format
        return this.execute(messages, {}, options || {});
    }

    async processRequest(request: AIRequest): Promise<AIResponse> {
        // Assuming request.prompt is the latest message, wrap in array for execute
        // TODO: Re-evaluate if processRequest should handle full history
        return this.execute([{ role: 'user', content: request.prompt }], request, {
            maxTokens: request.maxTokens,
            temperature: request.temperature
        });
    }

    async generateResponse(prompt: string): Promise<string> {
        // Assuming generateResponse takes a single prompt, wrap in array
        const response = await this.execute([{ role: 'user', content: prompt }]);
        return response.response;
    }

    updateFromConfig(): void {
        const configProviderName = this.configuration.getAiProvider(); // Get name as string, remove cast
        if (configProviderName !== this.currentProvider) {
            this.setProvider(configProviderName);
        }
        this.promptManager.updateFromConfig(this.configuration);
        this.toolManager.updateFromConfig(this.configuration);
    }

    toJSON(): object {
        return {
            currentProvider: this.currentProvider, // Already a string
            providers: Array.from(this.providers.keys()), // Keys are strings
            promptManager: this.promptManager.toJSON(),
            toolManager: this.toolManager.toJSON()
        };
    }

    fromJSON(json: any, configuration: Configuration, promptManager: PromptManager, toolManager: ToolManager, stateManager: StateManager, actionQueue: ActionQueue, memoryManager: MemoryManager, sessionId: string): AIProviderManager {
        const manager = new AIProviderManager(configuration, promptManager, toolManager, stateManager, actionQueue, memoryManager, sessionId);
        manager.setProvider(json.currentProvider); // Expect string name
        return manager;
    }
}
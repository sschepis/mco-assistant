/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SERVER_CONTEXT, BROWSER_CONTEXT } from '../Contexts';
import loadManagers from '../Managers';
import provider from '../Provider';
import PromptManager from '../managers/PromptManager'; // Corrected relative path
import ToolManager from '../managers/ToolManager'; // Corrected relative path
import Configuration from '../Configuration'; // Corrected relative path
import { contextMethod } from '../decorators/DecoratorFactory'; // Corrected to named import
import MultiContextObject from '../core/MultiContextObject'; // Corrected to default import
import AIProviderManager from '../managers/AIProviderManager'; // Corrected relative path
import StateManager from '../managers/StateManager'; // Corrected relative path
import { ActionQueue } from '../utils/ActionQueue'; // Corrected relative path
import CacheManager from '../utils/CacheManager'; // Corrected relative path
import { MemoryManager } from './associativeMemory'; // Import MemoryManager

const { objectManager, networkManager, eventManager } = loadManagers(provider);

// Removed redundant assignment, contextMethod is now imported directly

export default class DynamicAISystem extends MultiContextObject {
    private promptManager: PromptManager | undefined;
    private toolManager: ToolManager | undefined;
    private aiProviderManager: AIProviderManager;
    private stateManager: StateManager;
    private config: Configuration;
    private actionQueue: ActionQueue;
    private cacheManager: CacheManager = CacheManager.getInstance();
    private memoryManager: MemoryManager | undefined;
    private sessionId: string;

    static instance: DynamicAISystem | null = null;

    private constructor(config: Configuration) {
        super('dynamic-ai-system', 'system', [SERVER_CONTEXT, BROWSER_CONTEXT as any], provider, networkManager as any, objectManager as any);
        this.config = config;
        this.stateManager = new StateManager();
        this.actionQueue = new ActionQueue();
        this.toolManager = new ToolManager(config);
        this.promptManager = new PromptManager(config, provider, networkManager, objectManager, this.toolManager);

        // Instantiate MemoryManager
        const dbPath = './radata/memory'; // Define LanceDB path
        this.memoryManager = new MemoryManager(this as any, dbPath); // Use 'this' as assistant ref, cast to any for now

        // Generate a simple session ID
        this.sessionId = `session_${Date.now()}`; // Simple timestamp ID

        this.aiProviderManager = AIProviderManager.newInstance(
            this.config,
            this.promptManager,
            this.toolManager,
            this.stateManager,
            this.actionQueue,
            this.memoryManager, // Pass memoryManager
            this.sessionId // Pass sessionId
        );
    }

    static async getInstance(config: Configuration) {
        if (this.instance) return this.instance;
        this.instance = new DynamicAISystem(config);
        await this.instance.init();
        return this.instance;
    }

    @contextMethod(SERVER_CONTEXT)
    async init() {
        // Get the current provider object directly
        const aiProvider = this.aiProviderManager.getCurrentProvider();
        // Removed unnecessary getProvider call

        this.toolManager = new ToolManager(this.config);
        this.promptManager = new PromptManager(this.config, provider, networkManager, objectManager, this.toolManager);

        await this.promptManager.init(aiProvider);
        await this.toolManager.init();

        // Initialize MemoryManager
        if (this.memoryManager) {
            await this.memoryManager.initialize(this.sessionId);
        }

        return this;
    }

    // Updated decorator usage to pass an array of contexts
    @contextMethod([SERVER_CONTEXT, BROWSER_CONTEXT])
    async chat(messages: any, options: any = {}) {
        const cacheKey = JSON.stringify({ messages, options });
        if (this.cacheManager.has(cacheKey)) return this.cacheManager.get(cacheKey);

        const response = await this.aiProviderManager.chat(messages, options);
        this.cacheManager.set(cacheKey, response);
        return response;
    }

    // Updated decorator usage to pass an array of contexts
    @contextMethod([SERVER_CONTEXT, BROWSER_CONTEXT])
    // Modified signature to align with pipeline changes (though this method might be less used now)
    async executePrompt(messages: any[], params: any, state: any = {}, options: any = {}) {
        // Pass messages and params directly to promptManager
        return this.promptManager && this.promptManager.executePrompt(messages, params, { state }, options);
    }

    // Updated decorator usage to pass an array of contexts
    @contextMethod([SERVER_CONTEXT, BROWSER_CONTEXT])
    async executeTool(toolName: string, params: any) {
        return this.toolManager && this.toolManager.executeTool(toolName, params);
    }

    // Updated decorator usage to pass an array of contexts
    @contextMethod([SERVER_CONTEXT, BROWSER_CONTEXT])
    async generateResponse(prompt: string): Promise<string> {
        const response: any = await this.chat([{ role: 'user', content: prompt }]);
        return response.choices[0].message.content;
    }

    updateFromConfig(): void {
        // Update other components as needed
    }

    toJSON(): object {
        if(!this.promptManager || !this.toolManager || !this.aiProviderManager || !this.cacheManager) {
            throw new Error('Cannot serialize DynamicAISystem before initialization');
        }
        return {
            promptManager: this.promptManager.toJSON(),
            toolManager: this.toolManager.toJSON(),
            aiProviderManager: this.aiProviderManager.toJSON(),
            cacheManager: this.cacheManager.toJSON()
        };
    }

    fromJSON(data: any): void {
        if(!this.promptManager || !this.toolManager || !data.promptManager || !data.toolManager) {
            throw new Error('Invalid JSON data for DynamicAISystem');
        }
        this.promptManager.fromJSON(data.promptManager);
        this.toolManager.fromJSON(data.toolManager);
        this.cacheManager.fromJSON(data.cacheManager);
    }
}
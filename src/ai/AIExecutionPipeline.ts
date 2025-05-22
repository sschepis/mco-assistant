/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Removed incorrect imports from "@nomyx/multi-context-objects"
import EventEmitter from "events";
import PromptManager from "../managers/PromptManager"; // Corrected relative path
import StateManager from "../managers/StateManager"; // Corrected relative path
import ToolManager from "../managers/ToolManager"; // Corrected relative path
import { ActionQueue } from "../utils/ActionQueue"; // Corrected relative path, removed Action import
import Logger from "../utils/Logger"; // Corrected to default import

// Define missing interfaces/classes locally
// Added Action interface definition
export interface Action {
    id: string;
    type: string;
    data: any;
}

export interface ExecutionResult {
    state: any;
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
        [key: string]: any; // Allow additional options
    };
}

export interface Task {
    tool: string;
    params: any;
}

export class ExecutionError extends Error {
    public id: string;
    public startTime: number;
    public depth: number;
    public options: any;
    public context: { prompt: string; params: any; };
    public cause?: Error; // Make cause optional

    constructor(message: string, options: {
        id: string;
        startTime: number;
        depth: number;
        options: any;
        cause?: Error;
        context: {
            prompt: string;
            params: any;
        };
    }) {
        super(message);
        this.name = 'ExecutionError';
        this.id = options.id;
        this.startTime = options.startTime;
        this.depth = options.depth;
        this.options = options.options;
        this.context = options.context;
        if (options.cause) {
            this.cause = options.cause;
        }
        // Ensure stack trace is captured
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, ExecutionError);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
         // Ensure stack trace is captured
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, TimeoutError);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

export class MaxDepthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MaxDepthError';
         // Ensure stack trace is captured
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, MaxDepthError);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}


// pipeline


export class AIExecutionPipeline extends EventEmitter {
    private logger: Logger;

    constructor(
        private promptManager: PromptManager,
        private toolManager: ToolManager,
        private stateManager: StateManager,
        private actionQueue: ActionQueue,
        private memoryManager: any, // Add MemoryManager parameter (using any for now)
        private sessionId: string // Add sessionId parameter
    ) {
        super();
        this.logger = Logger.getInstance();
    }

    // Modified to accept messages array instead of single prompt string
    async execute(messages: any[], params: any = {}, options: any = {}): Promise<ExecutionResult> {
        const context = this.createExecutionContext(options);
        const latestPrompt = messages.length > 0 ? messages[messages.length - 1].content : ''; // Get latest user prompt
        this.logger.info('Starting execution', { latestPrompt, messageCount: messages.length, params, executionId: context.id });
        this.emit('executionStart', { messages, params, executionId: context.id });

        try {
            const result = await this.executeWithTimeout(async () => {
                // 1. Query Memory using the latest prompt
                const memoryResults = await this.queryMemory(latestPrompt, context.options);

                // Store the count of included memories in the context options
                context.options.includedMemoryCount = memoryResults.length;

                // 2. Format memory results and include in params for the prompt
                const formattedMemory = this.formatMemoryResults(memoryResults);
                const promptParams = { ...params, memoryContext: formattedMemory };

                // Pass the full messages array to executePrompt
                const promptResult = await this.executePrompt(messages, promptParams, context);
                await this.processExecutionResult(promptResult, context);

                // 3. Process and store turn in session memory (async, doesn't block return)
                // Use latestPrompt and the assistant's response
                const assistantResponse = promptResult.state?.response; // Assuming response is in state.response
                if (assistantResponse && this.memoryManager && this.sessionId) {
                    this.memoryManager.processAndStoreTurn(this.sessionId, latestPrompt, assistantResponse)
                        .catch((error: any) => this.logger.error('Error processing and storing turn:', { error, executionId: context.id }));
                }


                return promptResult;
            }, context.options.timeout);

            this.logger.info('Execution completed', { executionId: context.id });
            this.emit('executionComplete', { executionId: context.id, result });

            return result;
        } catch (error) {
            this.logger.error('Execution failed', { error, executionId: context.id });
            this.emit('executionError', { error, executionId: context.id });
            throw new ExecutionError('Execution failed', {
                id: context.id,
                startTime: context.startTime,
                depth: context.depth,
                options: context.options,
                cause: error as Error,
                context: {
                    prompt: latestPrompt, // Log latest prompt in error context
                    params
                }
            });
        }
    }

    private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new TimeoutError(`Execution timed out after ${timeout}ms`));
            }, timeout);

            fn().then(
                result => {
                    clearTimeout(timer);
                    resolve(result);
                },
                error => {
                    clearTimeout(timer);
                    reject(error);
                }
            );
        });
    }

    // Modified to accept messages array
    private async executePrompt(messages: any[], params: any, context: ExecutionContext): Promise<ExecutionResult> {
        this.logger.debug('Executing prompt', { messageCount: messages.length, params, executionId: context.id }); // Log params to see memory context
        // Pass messages array to promptManager
        const result = await this.promptManager.executePrompt(messages, params, context);
        this.logger.debug('Prompt executed', { executionId: context.id, resultSummary: this.summarizeResult(result) });
        return result;
    }

    private async processExecutionResult(result: ExecutionResult, context: ExecutionContext): Promise<void> {
        await this.updateState(result.state, context);
        await this.executeTasks(result.tasks || [], context);
        await this.executeActions(context);
    }

    private async updateState(newState: any, context: ExecutionContext): Promise<void> {
        this.logger.debug('Updating state', { newState, executionId: context.id });
        await this.stateManager.updateState(newState);
        this.emit('stateUpdated', { newState, executionId: context.id });
    }

    private async executeTasks(tasks: Task[], context: ExecutionContext): Promise<void> {
        for (const task of tasks) {
            if (context.depth >= context.options.maxDepth) {
                throw new MaxDepthError(`Maximum execution depth of ${context.options.maxDepth} reached`);
            }

            this.logger.debug('Executing task', { task, executionId: context.id });

            try {
                // Pass assistant context (memoryManager, sessionId) to tool execution
                const assistantContext = { memoryManager: this.memoryManager, sessionId: this.sessionId };
                const taskResult = await this.toolManager.executeTool(task.tool, task.params, assistantContext);
                await this.updateState({ [task.tool]: taskResult }, context);

                if (taskResult.actions) {
                    this.actionQueue.addActions(taskResult.actions);
                }

                this.emit('taskExecuted', { task, result: taskResult, executionId: context.id });
            } catch (error) {
                this.logger.error('Task execution failed', { task, error, executionId: context.id });
                this.emit('taskError', { task, error, executionId: context.id });
                if (context.options.failFast) {
                    throw error;
                }
            }

            context.depth++;
        }
    }

    private async executeActions(context: ExecutionContext): Promise<void> {
        while (!this.actionQueue.isEmpty()) {
            const action = this.actionQueue.getNextAction();
            if(!action) {
                break;
            }
            this.logger.debug('Executing action', { action, executionId: context.id });

            try {
                // Pass assistant context (memoryManager, sessionId) to action execution (which calls executeTool)
                const assistantContext = { memoryManager: this.memoryManager, sessionId: this.sessionId };
                const actionResult = await this.executeAction(action, context, assistantContext);
                await this.updateState({ [action.type]: actionResult }, context);

                if (actionResult.tasks) {
                    await this.executeTasks(actionResult.tasks, context);
                }
                if (actionResult.actions) {
                    this.actionQueue.addActions(actionResult.actions);
                }

                this.emit('actionExecuted', { action, result: actionResult, executionId: context.id });
            } catch (error) {
                this.logger.error('Action execution failed', { action, error, executionId: context.id });
                this.emit('actionError', { action, error, executionId: context.id });
                if (context.options.failFast) {
                    throw error;
                }
            }
        }
    }

    private async executeAction(action: Action, _context: ExecutionContext, assistantContext?: any): Promise<any> {
        // Pass assistantContext down to executeTool
        return this.toolManager.executeTool(action.type, action.data, assistantContext);
    }

    private createExecutionContext(options: any): ExecutionContext {
        return {
            id: this.generateExecutionId(),
            startTime: Date.now(),
            depth: 0,
            options: {
                failFast: options.failFast || false,
                maxDepth: options.maxDepth || 10,
                timeout: options.timeout || 30000,
                ...options
            }
        };
    }

    private generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private summarizeResult(result: ExecutionResult): object {
        return {
            stateKeys: Object.keys(result.state || {}),
            taskCount: result.tasks?.length || 0,
            actionCount: result.actions?.length || 0,
            // Include includedMemoryCount in the summary if available
            includedMemoryCount: result.state?.includedMemoryCount || 0,
        };
    }

    // --- Memory Integration Methods ---

    private async queryMemory(queryText: string, options: any): Promise<any[]> {
        if (!this.memoryManager || !this.sessionId) {
            this.logger.warn('MemoryManager or sessionId not available for querying.');
            return [];
        }

        // Define query options (limits could be configurable)
        const queryOptions = {
            sessionLimit: options.memorySessionLimit || 10, // Default limits
            persistentLimit: options.memoryPersistentLimit || 20,
        };

        try {
            const results = await this.memoryManager.queryMemories(queryText, this.sessionId, queryOptions);
            // Filter by relevance score threshold (threshold could be configurable)
            const relevanceThreshold = options.memoryRelevanceThreshold || 0.5; // Default threshold
            const filteredResults = results.filter((item: any) => item.score <= relevanceThreshold);

            this.logger.debug(`Queried memory for "${queryText.substring(0, 50)}...", found ${results.length} results, filtered to ${filteredResults.length} below threshold ${relevanceThreshold}.`);

            return filteredResults;
        } catch (error) {
            this.logger.error('Error querying memory:', error);
            return []; // Return empty on error
        }
    }

    private formatMemoryResults(memoryItems: any[]): string {
        if (memoryItems.length === 0) {
            return "No relevant memory found.";
        }

        // Format the memory items into a string to be included in the prompt
        // This format can be adjusted based on how the prompt templates are designed
        const formatted = memoryItems.map((item, index) =>
            `Memory Item ${index + 1} (Source: ${Array.isArray(item.source) ? item.source.join(', ') : item.source}, Relevance: ${item.score.toFixed(2)}):\n${item.text}`
        ).join('\n\n');

        return `Relevant Information from Memory:\n---\n${formatted}\n---`;
    }
}
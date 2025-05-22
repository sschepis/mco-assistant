/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected imports using relative paths
import MultiContextObject from '../core/MultiContextObject';
import { contextMethod } from '../decorators/DecoratorFactory'; // Import specific decorator
import Configuration from '../Configuration';
import { JsonRepair } from '../utils/JsonRepair';
import ToolManager from './ToolManager'; // Corrected relative path
import type { AIProvider, AIResponse } from '../types'; // Corrected import path, Added AIResponse
import { SERVER_CONTEXT, BROWSER_CONTEXT } from '../Contexts'; // Corrected import path
import Logger from '../utils/Logger'; // Import Logger
import { ExecutionResult } from '../ai/AIExecutionPipeline'; // Import ExecutionResult

// Removed redundant contextMethod assignment

export default class PromptManager extends MultiContextObject {
    private prompts: Map<string, any> = new Map();
    private promptSource: any[] = [];
    private logger: Logger; // Add logger property

    constructor(
        private config: Configuration,
        private dataProvider: any,
        public networkManager: any,
        public objectManager: any,
        private toolManager: ToolManager
    ) {
        super('prompt-manager', 'component', [SERVER_CONTEXT, BROWSER_CONTEXT], dataProvider, networkManager, objectManager);
        this.logger = Logger.getInstance(); // Initialize logger
    }

    @contextMethod(SERVER_CONTEXT)
    async init(aiProvider: AIProvider) {
        const promptsPath = this.config.getSharedConfig('promptsPath') || 'prompts.json';
        await this.loadPrompts(aiProvider, promptsPath);
    }

    @contextMethod(SERVER_CONTEXT)
    private async loadPrompts(aiProvider: AIProvider, promptsPath: string) {
        const fs = await import('fs');
        const path = await import('path');
        try {
            const ppath = path.join(__dirname, promptsPath);
            const files = fs.readdirSync(ppath);
            files.forEach((file: any) => {
                if (!file.endsWith('.json')) return;
                const promptSource = JSON.parse(fs.readFileSync(path.join(ppath, file), 'utf8'));
                const prompts = promptSource.reduce((acc: any, prompt: any) => {
                    const pName = Object.keys(prompt)[0];
                    acc[pName] = prompt[pName];
                    acc[pName].exec = this.createDynamicPromptExecutor(aiProvider, prompt[pName]);
                    return acc;
                }, {});
                this.prompts = { ...this.prompts, ...prompts };
            });
            console.log(`Prompts loaded: ${Object.keys(this.prompts).join(', ')}`);
        } catch (error) {
            console.error('Error loading prompts:', error);
            throw error;
        }
    }

    @contextMethod(SERVER_CONTEXT)
    @contextMethod(BROWSER_CONTEXT as any)
    // Modified to accept messages array instead of promptName/data
    async executePrompt(messages: any[], params: any, context: any = {}, options: any = {}) {
        // Note: The concept of a 'promptName' might need rethinking if we're always passing full history.
        // For now, assume the executor handles the messages directly.
        // We might need a way to select a system prompt or initial instruction based on context.
        // Let's assume a default executor or find one based on context if needed.
        // This part needs refinement based on how prompts vs full history should interact.

        // Placeholder: Using a generic executor that processes the messages array.
        // We need to adapt createDynamicPromptExecutor or have a different path.
        // Let's modify createDynamicPromptExecutor to handle messages array.
        const promptName = params.promptName || 'default'; // Need a way to determine which prompt logic to use
        const promptTemplate = this.prompts.get(promptName); // Get template if needed for structure/validation

        if (!promptTemplate?.exec) {
             // Fallback or error if no specific prompt executor found
             console.warn(`No specific prompt executor found for ${promptName}, using generic execution.`);
             // Need a generic execution path here, potentially just calling the provider directly.
             // This requires access to the AIProvider instance.
             // For now, let's assume createDynamicPromptExecutor is adapted.
             throw new Error(`Prompt executor for ${promptName} not found or invalid.`);
        }

        // Pass messages and params (which includes memoryContext) to the executor
        return promptTemplate.exec(messages, params, context.state || {}, options);
    }

    @contextMethod(SERVER_CONTEXT)
    async updateFromConfig(configuration: Configuration) {
        this.config = configuration;
    }

    private createDynamicPromptExecutor(aiProvider: AIProvider, promptTemplate: any) {
        if (!promptTemplate) return;
        // Modified to accept messages array and params object
        return async (messages: any[], params: any, state = {}, userOptions: any = {}) => {
            console.log('Executing prompt template:', promptTemplate.name || 'anonymous'); // Log template name if available

            // --- Construct the final messages array ---
            const finalMessages = [];

            // 1. Add System Prompt (if defined in template)
            //    We might want a more sophisticated way to manage system prompts.
            if (promptTemplate.system) {
                 finalMessages.push({
                     role: 'system',
                     // Interpolate system prompt with params if needed
                     content: this.interpolate(promptTemplate.system, params)
                 });
            } else {
                 // Default system prompt if none provided in template
                 finalMessages.push({
                     role: 'system',
                     content: JSON.stringify({
                         system: "You are an advanced assistant capable of performing a wide variety of tasks. Use the available tools and prompts to perform the task given to you. Return a chat response to the user in `chatResponse` along with any actions you want to take in `actions`. Chain actions together by using the runPromptInClient action.",
                         response_format: {
                             type: "json_object",
                             format: "Respond with a JSON object. Include 'chatResponse' (string) for the user and optionally 'actions' (array of {type: string, data: object}).",
                             options: ["JSON_OUTPUT_ONLY", "SYNTACTICALLY_CORRECT_JSON", "DISABLE_NEWLINES", "DISABLE_WHITESPACE", "VALIDATE_JSON"]
                         },
                         prompts: this.promptSource, // Consider if this is still needed here
                         tools: this.toolManager.getToolsSource(),
                         actions: ['To use a tool or a prompt, add an actions parameter to your response containing an array of action objects. Action objects have the format { type: "<tool or prompt name>", data: { key: value } }.',
                             'Prompts can be run both server-server and client-side in the browser. To chain prompts together, return a prompt action set to run in the client using the `runPromptInClient` action.'
                         ]
                     }),
                 });
            }

             // 2. Add Memory Context (if provided in params)
             if (params.memoryContext) {
                 finalMessages.push({
                     role: 'system', // Or potentially 'user' depending on model/preference
                     content: params.memoryContext // Already formatted string
                 });
             }

            // 3. Add Conversation History (passed in messages array)
            //    Filter out any existing system messages if we added one above? Or allow multiple?
            //    For now, append all passed messages.
            finalMessages.push(...messages);

            // 4. Add final user instructions from template (if applicable)
            //    This might be redundant if the last message in the array is the user prompt.
            //    If promptTemplate.user exists, it might represent additional instructions.
            if (promptTemplate.user) {
                 finalMessages.push({
                     role: 'user',
                     content: this.interpolate(promptTemplate.user, params) // Interpolate with params
                 });
            }

            // --- AI Call and Response Handling ---
            // Renamed msgs to inputMessages for clarity
            const call = async (inputMessages: any[]): Promise<ExecutionResult> => {
                this.logger.debug('Calling AI Provider with messages:', { messages: inputMessages, options: userOptions });
                // Assuming aiProvider.chat now returns an AIResponse object { response: string|object, usage: object }
                const aiResponse: AIResponse = await aiProvider.chat(inputMessages, {
                    source: userOptions.source || this.config.getSharedConfig('AI_PROVIDER') || 'anthropic',
                    temperature: userOptions.temperature || 0,
                    max_tokens: userOptions.maxTokens || 4000,
                    // response_format: { type: "json_object" } // Add if needed by provider
                });
                this.logger.debug('Received AI response object:', { aiResponse });

                try {
                    let parsedContent: any = aiResponse.response; // Start with the response content

                    // Attempt to parse if it's a string expecting JSON
                    if (typeof parsedContent === 'string') {
                        try {
                            parsedContent = JsonRepair.parseJsonSafely(parsedContent);
                        } catch (parseError) {
                            this.logger.warn('Failed to parse AI response string as JSON, treating as plain text.', { response: parsedContent, error: parseError });
                            // Keep parsedContent as the original string if parsing fails
                        }
                    }

                    // Ensure parsedContent is an object for consistent state merging
                    // If it's not an object (e.g., plain string response), wrap it.
                    if (typeof parsedContent !== 'object' || parsedContent === null) {
                         parsedContent = { chatResponse: String(parsedContent) }; // Use chatResponse key
                    }

                    // Construct the state part of the ExecutionResult
                    const resultState = {
                        ...state, // Include previous state passed in
                        ...(parsedContent || {}), // Spread the parsed AI response content
                        // Ensure 'response' key holds the primary chat message if available
                        response: parsedContent.chatResponse || String(aiResponse.response),
                        usage: aiResponse.usage || null // Include usage info
                    };

                    // Extract actions if present in the parsed content
                    const actions = parsedContent.actions || [];

                    // --- Action/Tool Execution ---
                    // The pipeline should handle executing these actions based on the result.
                    // No recursive calls needed here.

                    // Return the ExecutionResult
                    return {
                         state: resultState,
                         actions: actions
                         // tasks are typically generated by tools, not directly by prompts
                    };

                } catch (e) {
                    this.logger.error('Error processing AI response:', { error: e, rawResponse: aiResponse });
                    // Return error state within ExecutionResult structure
                    const errorState = {
                        ...state,
                        response: `Error: Failed to process AI response. Raw response: ${JSON.stringify(aiResponse.response)}`,
                        usage: aiResponse.usage || null,
                        error: `Failed to process response: ${e instanceof Error ? e.message : String(e)}`
                    };
                    return { state: errorState };
                }
            };

            return call(finalMessages);
        };
    }

    private interpolate(template: string, data: any): string {
        return template.replace(/\${(\w+)}|\{(\w+)\}/g, (_, p1, p2) => {
            const key = p1 || p2;
            return data[key] !== undefined ? data[key] : '';
        });
    }

    toJSON(): object {
        return { prompts: Array.from(this.prompts.entries()) };
    }

    fromJSON(data: any): void {
        this.prompts = new Map(data.prompts);
    }
}
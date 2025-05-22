/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected imports using relative paths
import MultiContextObject from '../core/MultiContextObject';
import { contextMethod } from '../decorators/DecoratorFactory'; // Import specific decorator
import { SERVER_CONTEXT, BROWSER_CONTEXT } from '../Contexts';

import loadManagers from '../Managers';
import provider from '../Provider';
import Configuration from '../Configuration'; // Corrected relative path
import { memoryToolMetadata } from '../ai/tools/memoryTools'; // Import memory tools metadata

const { objectManager, networkManager } = loadManagers(provider);
// Removed redundant contextMethod assignment

export default class ToolManager extends MultiContextObject {
    private tools: Map<string, any> = new Map();

    constructor(private config: Configuration) {
        super('tool-manager', 'component', [SERVER_CONTEXT, BROWSER_CONTEXT as any], provider, networkManager as any, objectManager as any);
    }

    @contextMethod(SERVER_CONTEXT)
    async init() {
        const toolsPath = this.config.getSharedConfig('toolsPath') || 'tools.json';
        await this.loadTools(toolsPath);
    }

    @contextMethod(SERVER_CONTEXT)
    private async loadTools(toolsPath: string) {
        // TODO: Load tools from JSON file specified by toolsPath
        // For now, manually register memory tools
        this.registerTool('remember_this', memoryToolMetadata.remember_this);
        this.registerTool('load_document_to_session_memory', memoryToolMetadata.load_document_to_session_memory);
        this.registerTool('commit_session_memory_to_persistent', memoryToolMetadata.commit_session_memory_to_persistent);
        console.log('Manually registered memory tools.');
    }

    // Added registerTool method
    @contextMethod(SERVER_CONTEXT)
    @contextMethod(BROWSER_CONTEXT as any)
    registerTool(toolName: string, toolDefinition: any) {
        // TODO: Validate toolDefinition schema
        // TODO: Implement a more robust way to link tool name to function implementation
        this.tools.set(toolName, {
            // Store definition for later use, execution logic moved to executeTool
            definition: toolDefinition,
            type: 'function', // Assuming all are functions for now
            schema: toolDefinition.parameters // Use parameters as schema
        });
        console.log(`Registered tool: ${toolName}`);
    }

    @contextMethod(SERVER_CONTEXT)
    @contextMethod(BROWSER_CONTEXT as any)
    async executeTool(toolName: string, params: any, assistantContext?: any) { // Add optional assistantContext
        const tool = this.tools.get(toolName);
        if (!tool) throw new Error(`Tool ${toolName} not found`);

        // Dynamically import the tool implementation based on the toolName
        // This assumes tool functions are exported from a known location like '../ai/tools/memoryTools'
        // A more robust solution might involve a mapping or dynamic path resolution.
        try {
            // Assuming memory tools are the only ones for now
            const toolImplementations = await import('../ai/tools/memoryTools');
            const toolFunction = (toolImplementations as any)[toolName];

            if (typeof toolFunction === 'function') {
                // Check if the tool requires assistant context (like memory tools)
                // This is a convention - tools needing context should expect it as the first arg.
                // A more explicit check based on tool definition might be better.
                 if (['remember_this', 'load_document_to_session_memory', 'commit_session_memory_to_persistent'].includes(toolName)) {
                    if (!assistantContext) {
                        console.error(`Cannot execute tool ${toolName}: Assistant context not provided.`);
                        throw new Error(`Assistant context (MemoryManager, sessionId) not provided for tool ${toolName}`);
                    }
                    console.log(`Executing tool ${toolName} with context.`);
                    // Pass the assistant context (which should include memoryManager and sessionId)
                    return await toolFunction(assistantContext, params);
                 } else {
                     // Execute tool without context if not needed
                     console.log(`Executing tool ${toolName} without context.`);
                     return await toolFunction(params); // Assuming tools not needing context take params directly
                 }
            } else {
                throw new Error(`Tool function implementation for ${toolName} not found.`);
            }
        } catch (error) {
             console.error(`Error loading or executing tool ${toolName}:`, error);
             throw new Error(`Failed to execute tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    @contextMethod(SERVER_CONTEXT)
    @contextMethod(BROWSER_CONTEXT as any)
    async hasTool(toolName: string): Promise<boolean> {
        return this.tools.has(toolName);
    }

    @contextMethod(SERVER_CONTEXT)
    @contextMethod(BROWSER_CONTEXT as any)
    getToolsSource(): any[] {
        return Array.from(this.tools.entries()).map(([name, tool]) => ({
            [name]: {
                type: tool.type,
                schema: tool.schema,
            }
        }));
    }

    @contextMethod(SERVER_CONTEXT)
    async updateFromConfig(configuration: Configuration): Promise<void> {
        const toolsPath = configuration.getSharedConfig('toolsPath') || 'tools.json';
        await this.loadTools(toolsPath);
    }

    toJSON(): object {
        return { tools: Array.from(this.tools.entries()) };
    }

    fromJSON(data: any): void {
        this.tools = new Map(data.tools);
    }
}
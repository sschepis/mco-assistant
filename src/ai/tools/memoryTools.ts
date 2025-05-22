/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import path from 'path';
// Assuming AIAssistant type is defined elsewhere and includes memoryManager & sessionId
// import { AIAssistant } from '../assistant/AIAssistant';
import { ToolExecutionError } from '../AIError';

// --- Tool Implementations ---

/**
 * Explicitly stores a piece of text content into the assistant's memory.
 * @param assistant The AIAssistant instance.
 * @param params Parameters for the tool.
 * @param params.content The text content to remember.
 * @param params.targetMemory Optional. 'session' (default) or 'persistent'.
 * @returns Success or error message.
 */
export async function remember_this(
    assistant: any, // Use 'any' for now, replace with actual AIAssistant type if available
    params: { content: string; targetMemory?: 'session' | 'persistent' }
): Promise<{ success: boolean } | { error: string }> {
    const { content, targetMemory = 'session' } = params;

    if (!content) {
        return { error: "Missing required parameter: content" };
    }
    if (!assistant.memoryManager || !assistant.sessionId) {
         return { error: "Memory system not available on assistant instance." };
    }

    try {
        console.log(`Remembering content (target: ${targetMemory}): "${content.substring(0, 50)}..."`);
        if (targetMemory === 'persistent') {
            await assistant.memoryManager.addPersistentItems([{
                text: content,
                source_ids: ['user_explicit'] // Mark as explicitly added by user
            }]);
        } else {
            await assistant.memoryManager.addSessionItems(assistant.sessionId, [{
                text: content,
                source: 'user_explicit' // Mark as explicitly added by user
            }]);
        }
        return { success: true };
    } catch (error: any) {
        console.error(`Error in remember_this tool:`, error);
        // Redact potentially large content from arguments
        const safeArgs = { ...params, content: '[Content Redacted]' };
        throw new ToolExecutionError(`Failed to store content in ${targetMemory} memory: ${error.message}`, {
            toolName: 'remember_this',
            arguments: safeArgs,
            code: 'memory_store_failed',
            originalError: error
        });
    }
}

/**
 * Loads the content of a file, chunks it, and stores it in the session memory.
 * @param assistant The AIAssistant instance.
 * @param params Parameters for the tool.
 * @param params.filePath The path to the file to load (relative to project root).
 * @returns Success message with chunk count or error message.
 */
export async function load_document_to_session_memory(
    assistant: any, // Use 'any' for now
    params: { filePath: string }
): Promise<{ success: boolean; message: string } | { error: string }> {
    const { filePath } = params;

    if (!filePath) {
        return { error: "Missing required parameter: filePath" };
    }
     if (!assistant.memoryManager || !assistant.sessionId) {
         return { error: "Memory system not available on assistant instance." };
    }

    try {
        console.log(`Loading document to session memory: ${filePath}`);
        // TODO: Implement proper path resolution relative to project root if needed
        const absolutePath = path.resolve(process.cwd(), filePath); // Basic resolution
        const fileContent = await fs.readFile(absolutePath, 'utf-8');

        // Simple chunking by paragraph (split by double newline)
        // More sophisticated chunking (e.g., fixed size with overlap) could be added later
        const chunks = fileContent.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);

        if (chunks.length === 0) {
            return { success: true, message: `File "${filePath}" was empty or contained no text paragraphs.` };
        }

        console.log(`Storing ${chunks.length} chunks from ${filePath}...`);
        const items = chunks.map(chunk => ({
            text: chunk,
            source: filePath // Use file path as the source identifier
        }));

        await assistant.memoryManager.addSessionItems(assistant.sessionId, items);

        return { success: true, message: `Successfully loaded and stored ${chunks.length} chunks from "${filePath}" into session memory.` };

    } catch (error: any) {
        console.error(`Error in load_document_to_session_memory tool:`, error);
        let code = 'load_document_failed';
        let message = `Failed to load document "${filePath}": ${error.message}`;
        if (error.code === 'ENOENT') {
             code = 'file_not_found';
             message = `File not found at path: ${filePath}`;
        }
        // Add other potential file system error codes if needed (EACCES, etc.)
        throw new ToolExecutionError(message, {
            toolName: 'load_document_to_session_memory',
            arguments: params,
            code: code,
            originalError: error
        });
    }
}


/**
 * Triggers the process to consolidate/summarize session memory items
 * and commit them to the persistent memory store.
 * @param assistant The AIAssistant instance.
 * @returns Success or error message.
 */
export async function commit_session_memory_to_persistent(
    assistant: any // Use 'any' for now
): Promise<{ success: boolean; message?: string } | { error: string }> {
     if (!assistant.memoryManager || !assistant.sessionId) {
         return { error: "Memory system not available on assistant instance." };
    }

    // Check if the commit function exists on the manager (it might be deferred)
    if (typeof assistant.memoryManager.commitSessionToPersistent !== 'function') {
        return { error: "The 'commitSessionToPersistent' functionality is not yet implemented in the MemoryManager." };
    }

    try {
        console.log(`Committing session memory (${assistant.sessionId}) to persistent store...`);
        // The actual logic is within the MemoryManager method
        await assistant.memoryManager.commitSessionToPersistent(assistant.sessionId);
        return { success: true, message: "Session memory commit process initiated." };
    } catch (error: any) {
        console.error(`Error in commit_session_memory_to_persistent tool:`, error);
        throw new ToolExecutionError(`Failed to commit session memory: ${error.message}`, {
            toolName: 'commit_session_memory_to_persistent',
            arguments: {}, // No parameters for this tool
            code: 'memory_commit_failed',
            originalError: error
        });
    }
}

// --- Tool Metadata (for registration) ---
// It's good practice to define metadata alongside the functions

export const memoryToolMetadata = {
    remember_this: {
        description: "Stores a specific piece of text content into the assistant's memory (session or persistent). Useful for explicitly telling the assistant to remember a fact or instruction.",
        parameters: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "The text content to be remembered."
                },
                targetMemory: {
                    type: "string",
                    enum: ["session", "persistent"],
                    description: "Where to store the memory. 'session' (default) is for the current interaction, 'persistent' is for long-term storage.",
                    optional: true
                }
            },
            required: ["content"]
        }
    },
    load_document_to_session_memory: {
        description: "Loads a document from the specified file path, chunks it, and stores the chunks in the current session's memory for context.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "The relative path to the document file from the project root."
                }
            },
            required: ["filePath"]
        }
    },
    commit_session_memory_to_persistent: {
        description: "Initiates the process to review items currently in session memory (like extracted facts or explicitly added items) and potentially summarize or transfer them to the long-term persistent memory.",
        parameters: { type: "object", properties: {} } // No parameters needed
    }
};
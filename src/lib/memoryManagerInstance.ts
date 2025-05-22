// Use dynamic imports to prevent webpack from bundling LanceDB for client components
import { MemoryManager } from '@/ai/associativeMemory';

// Define interface for memory manager capabilities
interface IMemoryManager {
  initialize: (sessionId: string) => Promise<void>;
  queryMemories: (
    queryText: string,
    sessionId: string,
    options: { sessionLimit: number, persistentLimit: number }
  ) => Promise<Array<{ text: string, source: string | string[], score: number, type: 'session' | 'persistent' }>>;
  addSessionItems: (sessionId: string, items: Array<{ text: string, source: string }>) => Promise<void>;
  addPersistentItems: (items: Array<{ text: string, source_ids: string[] }>) => Promise<void>;
  clearSessionMemory: (sessionId: string) => Promise<void>;
  processAndStoreTurn: (sessionId: string, userText: string, assistantText: string) => Promise<void>;
  commitSessionToPersistent: (sessionId: string) => Promise<void>;
}

// Track memory manager instance
let memoryManagerInstance: IMemoryManager | null = null;
let isInitializing = false;
let initializationPromise: Promise<IMemoryManager | null> | null = null;

// Config values
const dbPath = process.env.LANCEDB_PATH || './lancedb'; // Use env var or default
const defaultSessionId = 'server_default_session';

// Placeholder for the assistant instance needed by MemoryManager
const placeholderAssistant = {
    query: async (): Promise<string> => {
        console.warn("MemoryManager placeholder assistant query called. Fact extraction might not work.");
        return "[]"; // Default empty JSON array for fact extraction
    }
};

// Client-side stub implementation that returns empty results
const clientStub: IMemoryManager = {
    queryMemories: async () => {
        console.warn("Client-side memory manager stub called - memory features only work server-side");
        return [];
    },
    // Add other methods as needed with stub implementations
    initialize: async () => {},
    addSessionItems: async () => {},
    addPersistentItems: async () => {},
    clearSessionMemory: async () => {},
    processAndStoreTurn: async () => {},
    commitSessionToPersistent: async () => {}
};

async function initializeMemoryManager(): Promise<IMemoryManager | null> {
    // Check if we're on server-side
    if (typeof window !== 'undefined') {
        console.log("Running in browser environment, using client stub for memory manager");
        return clientStub;
    }

    console.log("Attempting to initialize server-side MemoryManager...");
    isInitializing = true;
    try {
        const manager = new MemoryManager(placeholderAssistant, dbPath);
        // Initialize with a default or server-specific session ID if needed
        await manager.initialize(defaultSessionId);
        console.log("Server-side MemoryManager initialized successfully.");
        memoryManagerInstance = manager;
        isInitializing = false;
        initializationPromise = null; // Clear promise after success
        return memoryManagerInstance;
    } catch (error) {
        console.error("Failed to initialize server-side MemoryManager:", error);
        isInitializing = false;
        memoryManagerInstance = null;
        initializationPromise = null; // Clear promise after failure
        return null;
    }
}

export async function getMemoryManagerInstance(): Promise<IMemoryManager | null> {
    // For client-side, return the stub
    if (typeof window !== 'undefined') {
        return clientStub;
    }

    if (memoryManagerInstance) {
        return memoryManagerInstance;
    }

    if (isInitializing && initializationPromise) {
        console.log("MemoryManager initialization in progress, awaiting existing promise...");
        return initializationPromise;
    }

    if (!isInitializing) {
        initializationPromise = initializeMemoryManager();
        return initializationPromise;
    }

    // Should not be reached, but return null as fallback
    return null;
}
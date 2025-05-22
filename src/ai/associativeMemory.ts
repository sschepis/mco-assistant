/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import { initModel, EmbeddingsModel, EmbeddingsModelSource } from "@energetic-ai/embeddings"; // Import EmbeddingsModelSource
import { modelSource as defaultEmbeddingModelSource } from "@energetic-ai/model-embeddings-en"; // Default model source
import fs from 'fs/promises'; // For ensuring directory exists

// Define table names
const PERSISTENT_TABLE_NAME = "persistent_memory";
const SESSION_TABLE_PREFIX = "session_";

// Define schemas using Apache Arrow
// TODO: Determine the exact vector dimension from the embedding model after loading
const VECTOR_DIMENSION = 384; // Placeholder - GET THIS FROM THE MODEL

const sessionSchema = new arrow.Schema([
    new arrow.Field("vector", new arrow.FixedSizeList(VECTOR_DIMENSION, new arrow.Field("item", new arrow.Float32()))),
    new arrow.Field("text", new arrow.Utf8()),
    new arrow.Field("source", new arrow.Utf8()),
    new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
]);

const persistentSchema = new arrow.Schema([
    new arrow.Field("vector", new arrow.FixedSizeList(VECTOR_DIMENSION, new arrow.Field("item", new arrow.Float32()))),
    new arrow.Field("text", new arrow.Utf8()),
    new arrow.Field("source_ids", new arrow.List(new arrow.Field("item", new arrow.Utf8()))),
    new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
    new arrow.Field("last_accessed", new arrow.TimestampMillisecond()), // Added as per plan
]);


export class MemoryManager {
    private embeddingModel: EmbeddingsModel | null = null;
    private db: lancedb.Connection | null = null;
    private dbPath: string;
    private embeddingModelSource: EmbeddingsModelSource; // Store the source object
    private isInitialized = false;
    private assistant: any; // Reference to the main assistant instance

    constructor(assistant: any, dbPath: string, embeddingModelSource?: string) {
        this.assistant = assistant; // Store assistant reference
        this.dbPath = dbPath;
        // TODO: Handle selecting different sources based on string config more robustly if needed
        // For now, primarily use the default imported source. The config string isn't directly used here yet.
        this.embeddingModelSource = defaultEmbeddingModelSource;
        console.log(`MemoryManager configured with DB path: ${this.dbPath} and Default Embedding model source`);
        console.log(`MemoryManager configured with DB path: ${this.dbPath} and Default Embedding model source`); // Corrected log message
    }

    async initialize(sessionId: string): Promise<void> {
        if (this.isInitialized) {
            console.log("MemoryManager already initialized.");
            // Ensure session table exists for the *current* session ID
            await this.ensureTableExists(this.getSessionTableName(sessionId), sessionSchema);
            return;
        }

        console.log("Initializing MemoryManager...");
        try {
            // 1. Ensure DB directory exists
            await fs.mkdir(this.dbPath, { recursive: true });
            console.log(`LanceDB directory ensured at: ${this.dbPath}`);

            // 2. Connect to LanceDB
            this.db = await lancedb.connect(this.dbPath);
            console.log("Connected to LanceDB.");

            // 3. Load Embedding Model
            // Pass the stored source object to initModel
            const modelSource = this.embeddingModelSource;
            this.embeddingModel = await initModel(modelSource);
            // TODO: Get actual vector dimension from the loaded model
            // const actualDimension = this.embeddingModel.dimension; // Or similar property
            // if (actualDimension !== VECTOR_DIMENSION) {
            //    console.warn(`Mismatch vector dimension! Expected ${VECTOR_DIMENSION}, got ${actualDimension}. Schemas need update.`);
            //    // Need to recreate schemas with actualDimension here if dynamically handling
            // } else {
            //    console.warn(`Could not determine embedding dimension from model.`);
            // }
            console.log(`Embedding model loaded. Dimension: ${VECTOR_DIMENSION} (Placeholder)`);


            // 4. Ensure tables exist
            await this.ensureTableExists(PERSISTENT_TABLE_NAME, persistentSchema);
            await this.ensureTableExists(this.getSessionTableName(sessionId), sessionSchema);

            this.isInitialized = true;
            console.log("MemoryManager initialized successfully.");

        } catch (error) {
            console.error("Error initializing MemoryManager:", error);
            this.isInitialized = false; // Ensure state reflects failure
            // Clear potentially partially initialized state
            this.db = null;
            this.embeddingModel = null;
            throw new Error(`MemoryManager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getSessionTableName(sessionId: string): string {
        // Basic sanitization, replace non-alphanumeric with underscore
        const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, '_');
        return `${SESSION_TABLE_PREFIX}${sanitizedSessionId}`;
    }

    private async ensureTableExists(tableName: string, schema: arrow.Schema): Promise<lancedb.Table> {
        if (!this.db) {
            throw new Error("Database connection not initialized.");
        }
        try {
            console.log(`Attempting to open table: ${tableName}`);
            const table = await this.db.openTable(tableName);
            console.log(`Table "${tableName}" opened successfully.`);
            // TODO: Optionally check if schema matches and handle migration/recreation if needed
            return table;
        } catch (error: any) {
            // Error code for "table not found" might vary, check LanceDB specifics
            // Assuming error message contains "Not found" or similar for non-existent table
            if (error.message && error.message.toLowerCase().includes('not found')) {
                console.log(`Table "${tableName}" not found, creating...`);
                try {
                    // Use createEmptyTable when creating based on schema without initial data
                    const table = await this.db.createEmptyTable(tableName, schema);
                    // Alternative: Create empty table if schema is complex or data added later
                    // const table = await this.db.createEmptyTable(tableName, schema);
                    console.log(`Table "${tableName}" created successfully.`);
                    // Create vector index immediately? Or defer? Deferring for now.
                    // await table.createIndex({ column: 'vector' }); // Example index creation
                    return table;
                } catch (createError) {
                    console.error(`Failed to create table "${tableName}":`, createError);
                    throw createError; // Re-throw creation error
                }
            } else {
                // Re-throw unexpected errors during openTable
                console.error(`Error opening table "${tableName}":`, error);
                throw error;
            }
        }
    }

    // --- Placeholder for other methods ---
    async embedTexts(texts: string[]): Promise<number[][]> {
        if (!this.embeddingModel) throw new Error("Embedding model not initialized.");
        if (texts.length === 0) return [];
        console.log(`Embedding ${texts.length} texts...`);
        const embeddings = await this.embeddingModel.embed(texts);
        console.log(`Embedding complete.`);
        return embeddings;
    } // <-- Added closing brace for embedTexts

    // --- Core Memory Operations ---

    private async checkInitialized(): Promise<void> {
        if (!this.isInitialized || !this.db || !this.embeddingModel) {
            throw new Error("MemoryManager is not initialized. Call initialize() first.");
        }
    }

    async addSessionItems(sessionId: string, items: { text: string, source: string }[]): Promise<void> {
        await this.checkInitialized();
        if (items.length === 0) return;

        console.log(`Adding ${items.length} items to session memory: ${sessionId}`);
        const texts = items.map(item => item.text);
        const vectors = await this.embedTexts(texts);

        const data = items.map((item, index) => ({
            vector: vectors[index],
            text: item.text,
            source: item.source,
            timestamp: new Date(),
        }));

        try {
            const tableName = this.getSessionTableName(sessionId);
            const table = await this.db!.openTable(tableName); // DB checked in checkInitialized
            await table.add(data);
            console.log(`Successfully added ${data.length} items to ${tableName}.`);
        } catch (error) {
            console.error(`Error adding items to session table ${sessionId}:`, error);
            throw error; // Re-throw for upstream handling
        }
    }

    async addPersistentItems(items: { text: string, source_ids: string[] }[]): Promise<void> {
        await this.checkInitialized();
        if (items.length === 0) return;

        console.log(`Adding ${items.length} items to persistent memory.`);
        const texts = items.map(item => item.text);
        const vectors = await this.embedTexts(texts);

        const data = items.map((item, index) => ({
            vector: vectors[index],
            text: item.text,
            source_ids: item.source_ids,
            timestamp: new Date(),
            last_accessed: new Date(), // Set last_accessed on creation
        }));

        try {
            const table = await this.db!.openTable(PERSISTENT_TABLE_NAME); // DB checked in checkInitialized
            await table.add(data);
            console.log(`Successfully added ${data.length} items to ${PERSISTENT_TABLE_NAME}.`);
            // TODO: Consider adding logic for handling duplicates or updating existing items if needed.
        } catch (error) {
            console.error(`Error adding items to persistent table:`, error);
            throw error; // Re-throw for upstream handling
        }
    }

    async queryMemories(
        queryText: string,
        sessionId: string,
        options: { sessionLimit: number, persistentLimit: number }
    ): Promise<{ text: string, source: string | string[], score: number, type: 'session' | 'persistent' }[]> {
        await this.checkInitialized();
        console.log(`Querying memories for: "${queryText.substring(0, 50)}..." (Session Limit: ${options.sessionLimit}, Persistent Limit: ${options.persistentLimit})`);

        const queryVector = (await this.embedTexts([queryText]))[0];
        if (!queryVector) {
            console.warn("Failed to generate query vector.");
            return [];
        }

        let sessionResults: any[] = [];
        let persistentResults: any[] = [];

        // Query Session Memory
        if (options.sessionLimit > 0) {
            try {
                const sessionTableName = this.getSessionTableName(sessionId);
                const sessionTable = await this.db!.openTable(sessionTableName);
                sessionResults = await sessionTable.search(queryVector)
                    .limit(options.sessionLimit)
                    // .select(['text', 'source']) // Select specific columns
                    .toArray();
                console.log(`Found ${sessionResults.length} results in session memory.`);
            } catch (error: any) {
                 // If session table doesn't exist, that's okay, just means no results
                 if (error.message && error.message.toLowerCase().includes('not found')) {
                    console.log(`Session table ${this.getSessionTableName(sessionId)} not found for query.`);
                 } else {
                    console.error(`Error querying session table ${sessionId}:`, error);
                    // Decide whether to throw or just return empty results for this part
                 }
            }
        }

        // Query Persistent Memory
        if (options.persistentLimit > 0) {
            try {
                const persistentTable = await this.db!.openTable(PERSISTENT_TABLE_NAME);
                persistentResults = await persistentTable.search(queryVector)
                    .limit(options.persistentLimit)
                    // .select(['text', 'source_ids']) // Select specific columns
                    .toArray();
                console.log(`Found ${persistentResults.length} results in persistent memory.`);
                // TODO: Update last_accessed timestamp for retrieved persistent items?
                // This would require getting IDs and performing an update operation.
            } catch (error) {
                console.error(`Error querying persistent table:`, error);
                 // Decide whether to throw or just return empty results for this part
            }
        }

        // Combine and format results
        const combinedResults = [
            ...sessionResults.map(r => ({ ...r, type: 'session', source: r.source, score: r._distance })),
            ...persistentResults.map(r => ({ ...r, type: 'persistent', source: r.source_ids, score: r._distance }))
        ];

        // Simple sort by score (lower distance is better)
        combinedResults.sort((a, b) => a.score - b.score);

        // TODO: Add more sophisticated ranking/filtering if needed (e.g., deduplication, relevance threshold)

        console.log(`Returning ${combinedResults.length} combined results.`);
        // Select only the necessary fields for the final return
        return combinedResults.map(r => ({
            text: r.text,
            source: r.source,
            score: r.score,
            type: r.type
        }));
    }

    async clearSessionMemory(sessionId: string): Promise<void> {
        await this.checkInitialized();
        const tableName = this.getSessionTableName(sessionId);
        console.log(`Clearing session memory by dropping table: ${tableName}`);
        try {
            await this.db!.dropTable(tableName);
            console.log(`Successfully dropped session table: ${tableName}`);
        } catch (error: any) {
             // It's okay if the table doesn't exist when trying to drop
             if (error.message && error.message.toLowerCase().includes('not found')) {
                console.log(`Session table ${tableName} did not exist, nothing to drop.`);
             } else {
                console.error(`Error dropping session table ${tableName}:`, error);
                throw error; // Re-throw unexpected errors
             }
        }
    } // End clearSessionMemory

    // --- Extraction and Processing Methods ---

    /**
     * Uses the LLM to extract key facts or observations from a given text.
     * NOTE: This requires careful prompt engineering and is a placeholder implementation.
     */
    private async extractFacts(text: string): Promise<string[]> { // Start extractFacts
        await this.checkInitialized();
        if (!text || text.trim().length < 10) { // Avoid processing very short texts
            return [];
        }

        // Placeholder prompt - NEEDS REFINEMENT!
        const extractionPrompt = `Analyze the following text and extract the 1-3 most important, self-contained facts, observations, or conclusions. Present each fact as a concise sentence. If no significant facts are present, return an empty list. Output ONLY a valid JSON array of strings. Example: ["Fact one.", "Fact two."]

Text to analyze:
---
${text}
---

JSON Array of Facts:`;

        try {
            console.log(`Extracting facts from text: "${text.substring(0, 50)}..."`);
            // Use the assistant's query method
            const response = await this.assistant.query(extractionPrompt, {
                providerConfigId: 'DeepSeek (Chat)', // Explicitly set provider for internal query
                temperature: 0.1, // Low temperature for factual extraction
                // TODO: Consider making the provider configurable via assistant config
            });

            // Attempt to parse the response
            let facts: string[] = [];
            try {
                const parsed = JSON.parse(response);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                    facts = parsed;
                }
            } catch (parseError) {
                console.warn(`Failed to parse fact extraction response as JSON: ${parseError}. Response: ${response}`);
                // Fallback: Try simple line splitting if JSON fails and response looks like a list
                if (response.includes('\n') && response.trim().startsWith('-') || response.trim().startsWith('[')) {
                    facts = response.split('\n')
                                  .map((line: string) => line.replace(/^\s*[-\*]?\s*/, '').trim())
                                  .filter((line: string) => line.length > 5);
                }
            }

            console.log(`Extracted ${facts.length} facts.`);
            return facts;

        } catch (error) {
            console.error("Error during fact extraction LLM call:", error);
            return []; // Return empty on error
        }
    }

    /**
     * Processes a conversation turn, extracts facts, and stores them in session memory.
     * Intended to be called asynchronously after a response is generated.
     */
    async processAndStoreTurn(sessionId: string, userText: string, assistantText: string): Promise<void> {
        await this.checkInitialized();
        console.log("Processing turn for session memory...");

        try {
            // Extract facts from assistant's response (could also include userText if desired)
            const facts = await this.extractFacts(assistantText);

            if (facts.length > 0) {
                const items = facts.map(fact => ({
                    text: fact,
                    source: 'conversation_fact'
                }));
                await this.addSessionItems(sessionId, items);
            }
        } catch (error) {
            console.error("Error processing and storing turn:", error);
            // Log error but don't block other operations
        }
    }

    /**
     * Selects relevant items from session memory and adds them to persistent memory.
     * Placeholder implementation - needs logic for selecting/summarizing.
     */
    async commitSessionToPersistent(sessionId: string): Promise<void> {
        await this.checkInitialized();
        console.log(`Attempting to commit session ${sessionId} to persistent memory...`);

        try {
            const sessionTableName = this.getSessionTableName(sessionId);
            const sessionTable = await this.db!.openTable(sessionTableName);

            // 1. Select items to commit (e.g., facts extracted during the session)
            // This query might need refinement based on how data is structured/sourced.
            // Use query() for filter-based selection, not search() which requires a vector
            const itemsToCommitData = await sessionTable.query()
                .where(`source = 'conversation_fact' OR source = 'user_explicit'`) // Example filter
                .select(['text', 'source', 'timestamp']) // Select relevant columns
                .toArray();

            if (itemsToCommitData.length === 0) {
                console.log("No relevant items found in session memory to commit.");
                return;
            }

            console.log(`Found ${itemsToCommitData.length} items in session to potentially commit.`);

            // 2. Process/Summarize (Placeholder - potentially complex)
            // - Could involve an LLM call to summarize related facts.
            // - Could involve deduplication or filtering based on relevance/importance.
            // For now, we'll just transfer them directly.
            const persistentItems = itemsToCommitData.map((item: any) => ({
                text: item.text,
                source_ids: [sessionId, item.source] // Link back to session and original source type
            }));

            // 3. Add to Persistent Store
            await this.addPersistentItems(persistentItems);

            // 4. Optional: Clean up committed items from session memory?
            // await sessionTable.delete(`source = 'conversation_fact' OR source = 'user_explicit'`);
            // console.log("Cleaned up committed items from session memory.");

        } catch (error: any) {
             if (error.message && error.message.toLowerCase().includes('not found')) {
                console.log(`Session table ${this.getSessionTableName(sessionId)} not found for commit. Nothing to commit.`);
             } else {
                console.error(`Error committing session ${sessionId} to persistent memory:`, error);
                throw error; // Re-throw unexpected errors
             }
        }
    }


    // Placeholder for potential future methods
} // Closing brace for the MemoryManager class
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { 
    MemoryQueryResultItem, 
    QueryMemoryOptions,
    FactExtractionConfig,
    DatabaseConfig,
    RankingOptions,
    PERSISTENT_TABLE_NAME,
    SessionMemoryItem,
    PersistentMemoryItem
} from './types';
import { MemoryRanker } from './MemoryRanker';
import { EmbeddingManager } from './EmbeddingManager';
import { DatabaseManager } from './DatabaseManager';

/**
 * AssociativeMemory is the main orchestrating class that coordinates
 * embedding generation, database operations, and memory ranking
 */
export class AssociativeMemory {
    private embeddingManager: EmbeddingManager;
    private databaseManager: DatabaseManager;
    private memoryRanker: MemoryRanker;
    private assistant: any; // Reference to the main assistant instance
    private factExtractionConfig: FactExtractionConfig;
    private isInitialized = false;

    constructor(
        assistant: any,
        dbPath: string,
        embeddingModelSource?: string,
        factExtractionConfig?: Partial<FactExtractionConfig>
    ) {
        this.assistant = assistant;
        this.embeddingManager = new EmbeddingManager(embeddingModelSource);
        this.databaseManager = new DatabaseManager({ dbPath });
        this.memoryRanker = new MemoryRanker();
        
        this.factExtractionConfig = {
            providerConfigId: factExtractionConfig?.providerConfigId || 'DeepSeek (Chat)',
            temperature: factExtractionConfig?.temperature ?? 0.1,
            model: factExtractionConfig?.model,
        };
        
        console.log(`AssociativeMemory configured with DB path: ${dbPath}`);
    }

    /**
     * Initialize all components (embedding model, database, schemas)
     * @param sessionId - Session identifier for ensuring session table exists
     */
    async initialize(sessionId: string): Promise<void> {
        if (this.isInitialized) {
            console.log("AssociativeMemory already initialized.");
            // Ensure session table exists for the current session ID
            await this.databaseManager.ensureSessionTable(sessionId);
            return;
        }

        try {
            console.log("Initializing AssociativeMemory...");
            
            // Initialize embedding manager first to get vector dimension
            const vectorDimension = await this.embeddingManager.initialize();
            
            // Initialize database with the actual vector dimension
            await this.databaseManager.initialize(vectorDimension);
            
            // Ensure session table exists for this specific session
            await this.databaseManager.ensureSessionTable(sessionId);
            
            this.isInitialized = true;
            console.log("AssociativeMemory initialization complete.");
            
        } catch (error) {
            console.error("AssociativeMemory initialization failed:", error);
            this.isInitialized = false;
            throw new Error(`AssociativeMemory initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Add items to session memory
     * @param sessionId - Session identifier
     * @param items - Array of text and source pairs to add
     */
    async addSessionItems(sessionId: string, items: { text: string, source: string }[]): Promise<void> {
        await this.checkInitialized();
        if (items.length === 0) return;

        console.log(`Adding ${items.length} items to session memory: ${sessionId}`);
        
        const texts = items.map(item => item.text);
        const vectors = await this.embeddingManager.embedTexts(texts);

        const data = items.map((item, index) => ({
            vector: vectors[index],
            text: item.text,
            source: item.source,
            timestamp: new Date(),
        }));

        try {
            const tableName = this.databaseManager.getSessionTableName(sessionId);
            const table = await this.databaseManager.getConnection().openTable(tableName);
            await table.add(data);
            console.log(`Successfully added ${data.length} items to ${tableName}.`);
        } catch (error) {
            console.error(`Error adding items to session table ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Add items to persistent memory with duplicate checking
     * @param items - Array of text and source_ids pairs to add
     */
    async addPersistentItems(items: { text: string, source_ids: string[] }[]): Promise<void> {
        await this.checkInitialized();
        if (items.length === 0) return;

        console.log(`Attempting to add ${items.length} items to persistent memory with duplicate checking.`);
        const table = await this.databaseManager.getConnection().openTable(PERSISTENT_TABLE_NAME);

        const SIMILARITY_THRESHOLD_ADD = 0.05; // Example: very high similarity (low distance)
        let itemsAddedCount = 0;
        let itemsSkippedCount = 0;

        for (const item of items) {
            const vector = await this.embeddingManager.embedText(item.text);

            if (!vector) {
                console.warn(`Could not generate vector for item: "${item.text.substring(0, 50)}...". Skipping.`);
                itemsSkippedCount++;
                continue;
            }

            // Search for highly similar items
            const searchResults = await table.search(vector)
                .limit(1)
                .select(['text', '_distance'])
                .toArray();

            if (searchResults.length > 0 && searchResults[0]._distance <= SIMILARITY_THRESHOLD_ADD) {
                console.log(`Skipping item "${item.text.substring(0, 30)}..." (distance: ${searchResults[0]._distance.toFixed(4)}) as it's too similar to existing item: "${searchResults[0].text.substring(0, 30)}..."`);
                itemsSkippedCount++;
            } else {
                // Add the item
                const dataToAdd = {
                    vector: vector,
                    text: item.text,
                    source_ids: item.source_ids,
                    timestamp: new Date(),
                    last_accessed: new Date(),
                };

                try {
                    await table.add([dataToAdd]);
                    console.log(`Added to persistent memory: "${item.text.substring(0, 50)}..."`);
                    itemsAddedCount++;
                } catch (addError) {
                    console.error(`Error adding item to persistent memory:`, addError);
                    itemsSkippedCount++;
                }
            }
        }

        console.log(`Persistent memory update complete. Added: ${itemsAddedCount}, Skipped (duplicates/errors): ${itemsSkippedCount}.`);
    }

    /**
     * Query memories from both session and persistent storage
     * @param queryText - Text to search for
     * @param sessionId - Session identifier
     * @param options - Query options including limits and filters
     * @returns Array of ranked and filtered memory results
     */
    async queryMemories(
        queryText: string,
        sessionId: string,
        options: QueryMemoryOptions
    ): Promise<MemoryQueryResultItem[]> {
        await this.checkInitialized();
        console.log(`Querying memories for: "${queryText.substring(0, 50)}..." with options:`, options);

        const queryVector = await this.embeddingManager.embedText(queryText);
        if (!queryVector) {
            console.warn("Failed to generate query vector.");
            return [];
        }

        let sessionResults: any[] = [];
        let persistentResults: any[] = [];

        const filterType = options.filterType || 'all';
        const whereClauses: string[] = [];

        // Build date filter clauses
        if (options.filterDateStart) {
            try {
                const startDateMillis = new Date(options.filterDateStart).getTime();
                if (!isNaN(startDateMillis)) {
                    whereClauses.push(`timestamp >= ${startDateMillis}`);
                }
            } catch (e) { 
                console.error("Invalid start date format", options.filterDateStart); 
            }
        }
        if (options.filterDateEnd) {
            try {
                const endDateMillis = new Date(options.filterDateEnd).setHours(23, 59, 59, 999);
                if (!isNaN(endDateMillis)) {
                    whereClauses.push(`timestamp <= ${endDateMillis}`);
                }
            } catch (e) { 
                console.error("Invalid end date format", options.filterDateEnd); 
            }
        }
        const combinedWhereClause = whereClauses.join(' AND ');

        // Query Session Memory
        if (filterType === 'all' || filterType === 'session') {
            if (options.sessionLimit > 0) {
                sessionResults = await this.querySessionMemory(sessionId, queryVector, options.sessionLimit, combinedWhereClause);
            }
        }

        // Query Persistent Memory
        if (filterType === 'all' || filterType === 'persistent') {
            if (options.persistentLimit > 0) {
                persistentResults = await this.queryPersistentMemory(queryVector, options.persistentLimit, combinedWhereClause);
            }
        }

        // Combine and format results
        const combinedResults = this.formatQueryResults(sessionResults, persistentResults);

        // Apply ranking and filtering
        const rankingOptions: RankingOptions = {
            relevanceThreshold: 0.75,
            deduplicateByText: true
        };
        
        const finalResults = this.memoryRanker.rankAndFilter(combinedResults, rankingOptions);
        console.log(`Returning ${finalResults.length} final results after ranking/filtering.`);
        
        return finalResults;
    }

    /**
     * Query session memory
     * @param sessionId - Session identifier
     * @param queryVector - Query embedding vector
     * @param limit - Maximum number of results
     * @param whereClause - Optional SQL where clause for filtering
     * @returns Raw session query results
     */
    private async querySessionMemory(
        sessionId: string, 
        queryVector: number[], 
        limit: number, 
        whereClause?: string
    ): Promise<any[]> {
        try {
            const sessionTableName = this.databaseManager.getSessionTableName(sessionId);
            const sessionTable = await this.databaseManager.getConnection().openTable(sessionTableName);
            
            let queryBuilder = sessionTable.search(queryVector);
            if (whereClause) {
                queryBuilder = queryBuilder.where(whereClause);
            }
            
            const results = await queryBuilder
                .limit(limit)
                .select(['text', 'source', '_distance'])
                .toArray();
                
            console.log(`Found ${results.length} results in session memory.`);
            return results;
            
        } catch (error: any) {
            if (error.message && error.message.toLowerCase().includes('not found')) {
                console.log(`Session table ${this.databaseManager.getSessionTableName(sessionId)} not found for query.`);
                return [];
            } else {
                console.error(`Error querying session table ${sessionId}:`, error);
                return [];
            }
        }
    }

    /**
     * Query persistent memory
     * @param queryVector - Query embedding vector
     * @param limit - Maximum number of results
     * @param whereClause - Optional SQL where clause for filtering
     * @returns Raw persistent query results
     */
    private async queryPersistentMemory(
        queryVector: number[], 
        limit: number, 
        whereClause?: string
    ): Promise<any[]> {
        try {
            const persistentTable = await this.databaseManager.getConnection().openTable(PERSISTENT_TABLE_NAME);
            
            let queryBuilder = persistentTable.search(queryVector);
            if (whereClause) {
                queryBuilder = queryBuilder.where(whereClause);
            }
            
            const results = await queryBuilder
                .limit(limit)
                .select(['text', 'source_ids', '_rowid', '_distance', 'last_accessed'])
                .toArray();

            // Update last_accessed for found items
            if (results.length > 0) {
                const rowIdsToUpdate = results.map(r => r._rowid).filter(id => id !== undefined) as string[];
                if (rowIdsToUpdate.length > 0) {
                    const whereClause = `_rowid IN (${rowIdsToUpdate.map(id => `'${id}'`).join(', ')})`;
                    try {
                        await persistentTable.update({ last_accessed: new Date().toISOString() }, { where: whereClause });
                        console.log(`Updated last_accessed for ${rowIdsToUpdate.length} items in persistent memory.`);
                    } catch (updateError) {
                        console.error("Error updating last_accessed in persistent memory:", updateError);
                    }
                }
            }

            console.log(`Found ${results.length} results in persistent memory.`);
            return results;
            
        } catch (error) {
            console.error(`Error querying persistent table:`, error);
            return [];
        }
    }

    /**
     * Format and combine query results from different sources
     * @param sessionResults - Raw session query results
     * @param persistentResults - Raw persistent query results
     * @returns Formatted and combined results
     */
    private formatQueryResults(sessionResults: any[], persistentResults: any[]): MemoryQueryResultItem[] {
        const typedSessionResults: MemoryQueryResultItem[] = sessionResults.map((r: any) => ({
            text: String(r.text ?? ''),
            source: r.source as string,
            score: Number(r._distance ?? Infinity),
            type: 'session' as const
        }));

        const typedPersistentResults: MemoryQueryResultItem[] = persistentResults.map((r: any) => ({
            text: String(r.text ?? ''),
            source: r.source_ids as string[],
            score: Number(r._distance ?? Infinity),
            type: 'persistent' as const,
            last_accessed: r.last_accessed ? new Date(r.last_accessed) : undefined
        }));

        const combinedResults: MemoryQueryResultItem[] = [
            ...typedSessionResults,
            ...typedPersistentResults
        ];

        // Primary sort by score (lower distance is better)
        combinedResults.sort((a, b) => a.score - b.score);

        return combinedResults;
    }

    /**
     * Clear session memory by dropping the table
     * @param sessionId - Session identifier
     */
    async clearSessionMemory(sessionId: string): Promise<void> {
        await this.checkInitialized();
        await this.databaseManager.clearSessionMemory(sessionId);
    }

    /**
     * Extract facts from text using the configured AI provider
     * @param text - Text to extract facts from
     * @returns Array of extracted facts
     */
    private async extractFacts(text: string): Promise<string[]> {
        // TODO: Implement fact extraction using the assistant
        // This would use the configured AI provider to extract structured facts
        console.log("Fact extraction not yet implemented");
        return [];
    }

    /**
     * Check if the memory system is properly initialized
     */
    private async checkInitialized(): Promise<void> {
        if (!this.isInitialized || !this.embeddingManager.isReady() || !this.databaseManager.isReady()) {
            throw new Error("AssociativeMemory is not initialized. Call initialize() first.");
        }
    }

    /**
     * Generate embeddings for an array of texts
     * @param texts - Array of text strings to embed
     * @returns Promise<number[][]> - Array of embedding vectors
     */
    async embedTexts(texts: string[]): Promise<number[][]> {
        return await this.embeddingManager.embedTexts(texts);
    }

    /**
     * Generate embedding for a single text
     * @param text - Text string to embed
     * @returns Promise<number[]> - Embedding vector
     */
    async embedText(text: string): Promise<number[]> {
        return await this.embeddingManager.embedText(text);
    }

    /**
     * Get current vector dimension
     * @returns Vector dimension
     */
    getVectorDimension(): number {
        return this.embeddingManager.getVectorDimension();
    }

    /**
     * Get actual vector dimension (for backwards compatibility)
     * @returns Vector dimension
     */
    getActualVectorDimension(): number {
        return this.embeddingManager.getVectorDimension();
    }

    /**
     * Get database connection (for backwards compatibility)
     * @returns LanceDB connection
     */
    getDatabase(): any {
        return this.databaseManager.getConnection();
    }

    /**
     * Clean up all resources
     */
    async dispose(): Promise<void> {
        await this.databaseManager.dispose();
        this.embeddingManager.dispose();
        this.isInitialized = false;
        console.log("AssociativeMemory disposed");
    }
}

// Re-export for backwards compatibility
export { AssociativeMemory as MemoryManager };

// Re-export types
export * from './types';
export { MemoryRanker } from './MemoryRanker';
export { EmbeddingManager } from './EmbeddingManager';
export { DatabaseManager } from './DatabaseManager';
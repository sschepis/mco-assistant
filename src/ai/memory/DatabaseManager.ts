/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import fs from 'fs/promises';
import { 
    SCHEMA_VERSION, 
    PERSISTENT_TABLE_NAME, 
    SESSION_TABLE_PREFIX_BASE,
    DatabaseConfig,
    SessionMemoryItem,
    PersistentMemoryItem
} from './types';

/**
 * DatabaseManager handles all LanceDB database operations
 * Manages connections, table creation, schema management, and data operations
 */
export class DatabaseManager {
    private db: lancedb.Connection | null = null;
    private dbPath: string;
    private sessionSchema: arrow.Schema | null = null;
    private persistentSchema: arrow.Schema | null = null;
    private actualVectorDimension: number;
    private isInitialized = false;

    constructor(config: DatabaseConfig) {
        this.dbPath = config.dbPath;
        this.actualVectorDimension = config.vectorDimension || 384;
        console.log(`DatabaseManager configured with DB path: ${this.dbPath}`);
    }

    /**
     * Initialize the database connection and schemas
     * @param vectorDimension - The actual vector dimension from the embedding model
     */
    async initialize(vectorDimension: number): Promise<void> {
        if (this.isInitialized && this.db) {
            console.log("DatabaseManager already initialized.");
            return;
        }

        try {
            console.log("Initializing database connection...");
            
            // Ensure the directory exists
            const dbDir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
            if (dbDir) {
                await fs.mkdir(dbDir, { recursive: true });
                console.log(`Ensured directory exists: ${dbDir}`);
            }

            // Connect to LanceDB
            this.db = await lancedb.connect(this.dbPath);
            console.log(`Connected to LanceDB at: ${this.dbPath}`);

            // Create schemas with the actual vector dimension
            this.actualVectorDimension = vectorDimension;
            this._createSchemas(vectorDimension);

            // Ensure persistent table exists
            await this.ensureTableExists(PERSISTENT_TABLE_NAME, this.persistentSchema!);
            
            this.isInitialized = true;
            console.log("DatabaseManager initialization complete.");

        } catch (error) {
            console.error("DatabaseManager initialization failed:", error);
            // Clean up on failure
            this.db = null;
            this.sessionSchema = null;
            this.persistentSchema = null;
            throw new Error(`DatabaseManager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Create Arrow schemas for session and persistent tables
     * @param dimension - Vector dimension
     */
    private _createSchemas(dimension: number): void {
        if (dimension <= 0 || !Number.isInteger(dimension)) {
            console.error(`Invalid dimension for schema creation: ${dimension}. Using fallback.`);
            dimension = 384; // Fallback to a default dimension
        }

        this.sessionSchema = new arrow.Schema([
            new arrow.Field("vector", new arrow.FixedSizeList(dimension, new arrow.Field("item", new arrow.Float32()))),
            new arrow.Field("text", new arrow.Utf8()),
            new arrow.Field("source", new arrow.Utf8()),
            new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
        ]);

        this.persistentSchema = new arrow.Schema([
            new arrow.Field("vector", new arrow.FixedSizeList(dimension, new arrow.Field("item", new arrow.Float32()))),
            new arrow.Field("text", new arrow.Utf8()),
            new arrow.Field("source_ids", new arrow.List(new arrow.Field("item", new arrow.Utf8()))),
            new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
            new arrow.Field("last_accessed", new arrow.TimestampMillisecond()),
        ]);
        
        console.log(`Schemas created with vector dimension: ${dimension} for schema version ${SCHEMA_VERSION}`);
    }

    /**
     * Get sanitized table name for a session
     * @param sessionId - Session identifier
     * @returns Sanitized table name
     */
    getSessionTableName(sessionId: string): string {
        // Basic sanitization, replace non-alphanumeric with underscore
        const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, '_');
        return `${SESSION_TABLE_PREFIX_BASE}${sanitizedSessionId}_v${SCHEMA_VERSION}`;
    }

    /**
     * Ensure a table exists with the correct schema
     * @param tableName - Name of the table
     * @param schema - Arrow schema for the table
     * @returns LanceDB table instance
     */
    async ensureTableExists(tableName: string, schema: arrow.Schema): Promise<lancedb.Table> {
        if (!this.db) {
            throw new Error("Database connection not initialized.");
        }
        if (!schema) {
            throw new Error(`Schema for table ${tableName} is not initialized.`);
        }

        const expectedVectorField = schema.fields.find(f => f.name === 'vector');
        if (!expectedVectorField || !(expectedVectorField.type instanceof arrow.FixedSizeList)) {
            throw new Error(`Invalid schema for table ${tableName}: 'vector' field is missing or not a FixedSizeList.`);
        }
        const expectedDimension = (expectedVectorField.type as arrow.FixedSizeList).listSize;

        try {
            console.log(`Attempting to open table: ${tableName}`);
            const table = await this.db.openTable(tableName);
            console.log(`Table "${tableName}" opened successfully.`);

            // Check for dimension mismatch and general schema compatibility
            const actualTableSchema = await table.schema();
            const actualVectorField = actualTableSchema.fields.find((f: arrow.Field) => f.name === 'vector');

            let incompatibleSchema = false;

            if (actualVectorField && actualVectorField.type instanceof arrow.FixedSizeList) {
                const actualDimension = (actualVectorField.type as arrow.FixedSizeList).listSize;
                if (actualDimension !== expectedDimension) {
                    console.warn(`Dimension mismatch for table "${tableName}". Expected: ${expectedDimension}, Actual: ${actualDimension}.`);
                    incompatibleSchema = true;
                }
            } else {
                console.warn(`Existing table "${tableName}" does not have a valid 'vector' field of type FixedSizeList.`);
                incompatibleSchema = true;
            }

            // General schema comparison (simplified: check field count and names for now)
            if (!incompatibleSchema && actualTableSchema.fields.length !== schema.fields.length) {
                console.warn(`Schema mismatch for table "${tableName}": Field count differs. Expected: ${schema.fields.length}, Actual: ${actualTableSchema.fields.length}.`);
                incompatibleSchema = true;
            }

            if (incompatibleSchema) {
                console.log(`Dropping and recreating table "${tableName}" due to incompatible schema (current schema version ${SCHEMA_VERSION}).`);
                // TODO: Implement more sophisticated migration strategy instead of just dropping. (Task 1.2.1)
                await this.db.dropTable(tableName);
                console.log(`Table "${tableName}" dropped.`);
                
                // Create fresh table with correct schema
                const newTable = await this.db.createTable(tableName, [], { schema });
                console.log(`Table "${tableName}" recreated with updated schema.`);
                return newTable;
            }

            return table;

        } catch (error: any) {
            if (error.message && error.message.toLowerCase().includes('not found')) {
                console.log(`Table "${tableName}" does not exist. Creating...`);
                try {
                    const newTable = await this.db.createTable(tableName, [], { schema });
                    console.log(`Table "${tableName}" created successfully.`);
                    return newTable;
                } catch (createError) {
                    console.error(`Failed to create table "${tableName}":`, createError);
                    throw createError;
                }
            } else {
                console.error(`Unexpected error with table "${tableName}":`, error);
                throw error;
            }
        }
    }

    /**
     * Ensure session table exists for a specific session
     * @param sessionId - Session identifier
     */
    async ensureSessionTable(sessionId: string): Promise<lancedb.Table> {
        if (!this.sessionSchema) {
            throw new Error("Session schema not initialized.");
        }
        const tableName = this.getSessionTableName(sessionId);
        return await this.ensureTableExists(tableName, this.sessionSchema);
    }

    /**
     * Get database connection
     * @returns LanceDB connection
     */
    getConnection(): lancedb.Connection {
        if (!this.db) {
            throw new Error("Database connection not initialized.");
        }
        return this.db;
    }

    /**
     * Get session schema
     * @returns Arrow schema for session tables
     */
    getSessionSchema(): arrow.Schema {
        if (!this.sessionSchema) {
            throw new Error("Session schema not initialized.");
        }
        return this.sessionSchema;
    }

    /**
     * Get persistent schema
     * @returns Arrow schema for persistent table
     */
    getPersistentSchema(): arrow.Schema {
        if (!this.persistentSchema) {
            throw new Error("Persistent schema not initialized.");
        }
        return this.persistentSchema;
    }

    /**
     * Clear session memory by dropping the table
     * @param sessionId - Session identifier
     */
    async clearSessionMemory(sessionId: string): Promise<void> {
        if (!this.db) {
            throw new Error("Database connection not initialized.");
        }
        
        const tableName = this.getSessionTableName(sessionId);
        console.log(`Clearing session memory by dropping table: ${tableName}`);
        
        try {
            await this.db.dropTable(tableName);
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
    }

    /**
     * Check if the database manager is properly initialized
     * @returns boolean - True if initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.db !== null;
    }

    /**
     * Clean up database connection and resources
     */
    async dispose(): Promise<void> {
        if (this.db) {
            // LanceDB connections don't typically need explicit cleanup
            this.db = null;
        }
        this.sessionSchema = null;
        this.persistentSchema = null;
        this.isInitialized = false;
        console.log("DatabaseManager disposed");
    }
}
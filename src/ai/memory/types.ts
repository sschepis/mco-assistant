/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Schema version for table naming
export const SCHEMA_VERSION = 1;

// Define table names
export const PERSISTENT_TABLE_NAME_BASE = "persistent_memory";
export const SESSION_TABLE_PREFIX_BASE = "session_";
export const PERSISTENT_TABLE_NAME = `${PERSISTENT_TABLE_NAME_BASE}_v${SCHEMA_VERSION}`;

// TODO: Determine the exact vector dimension from the embedding model after loading
export const VECTOR_DIMENSION = 384; // Placeholder - GET THIS FROM THE MODEL. Will be overridden.

// Define the return item type for clarity, at module level
export type MemoryQueryResultItem = {
    text: string;
    source: string | string[];
    score: number; // Lower is better (distance)
    type: 'session' | 'persistent';
    last_accessed?: Date; // Optional, primarily for persistent items
};

// For queryMemories options
export type MemoryFilterType = 'all' | 'session' | 'persistent';

export interface QueryMemoryOptions {
    sessionLimit: number;
    persistentLimit: number;
    filterType?: MemoryFilterType;
    filterDateStart?: string; // YYYY-MM-DD
    filterDateEnd?: string;   // YYYY-MM-DD
}

export interface FactExtractionConfig {
    providerConfigId?: string;
    temperature?: number;
    model?: string; // Optional model override for the provider
    // Potentially add prompt template here later
}

// --- Memory Ranking ---
export interface RankingOptions {
    relevanceThreshold?: number; // Max distance for a result to be considered relevant
    deduplicateByText?: boolean; // Option to enable text-based deduplication
}

// Database connection configuration
export interface DatabaseConfig {
    dbPath: string;
    vectorDimension?: number;
}

// Memory item structure for storage
export interface MemoryItem {
    text: string;
    vector: number[];
    source: string | string[];
    timestamp: number;
    factual_summary?: string;
    last_accessed?: Date;
}

// Session memory item structure
export interface SessionMemoryItem extends MemoryItem {
    source: string; // Session items always have single string source
}

// Persistent memory item structure  
export interface PersistentMemoryItem extends MemoryItem {
    source_ids: string[]; // Persistent items can have multiple sources
    access_count?: number;
    importance_score?: number;
}
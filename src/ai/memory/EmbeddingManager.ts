/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { initModel, EmbeddingsModel, EmbeddingsModelSource } from "@energetic-ai/embeddings";
import { modelSource as defaultEmbeddingModelSource } from "@energetic-ai/model-embeddings-en";
import { VECTOR_DIMENSION } from './types';

/**
 * EmbeddingManager handles all embedding model operations
 * Manages model initialization, text embedding, and vector dimensions
 */
export class EmbeddingManager {
    private embeddingModel: EmbeddingsModel | null = null;
    private embeddingModelSource: EmbeddingsModelSource;
    private actualVectorDimension: number = VECTOR_DIMENSION;
    private isInitialized = false;

    constructor(embeddingModelSource?: string) {
        // TODO: Handle selecting different sources based on string config more robustly if needed
        // For now, primarily use the default imported source. The config string isn't directly used here yet.
        this.embeddingModelSource = defaultEmbeddingModelSource;
        console.log('EmbeddingManager configured with default embedding model source');
    }

    /**
     * Initialize the embedding model
     * @returns Promise<number> - The actual vector dimension of the loaded model
     */
    async initialize(): Promise<number> {
        if (this.isInitialized && this.embeddingModel) {
            console.log("EmbeddingManager already initialized.");
            return this.actualVectorDimension;
        }

        try {
            console.log("Initializing embedding model...");
            
            // Pass the stored source object to initModel
            const modelSource = this.embeddingModelSource;
            this.embeddingModel = await initModel(modelSource);

            // Attempt to get actual vector dimension from the loaded model
            if (this.embeddingModel && typeof (this.embeddingModel as any).dimension === 'number') {
                this.actualVectorDimension = (this.embeddingModel as any).dimension;
                console.log(`Embedding model loaded. Actual dimension: ${this.actualVectorDimension}`);
            } else {
                console.warn(`Could not determine vector dimension from model. Using placeholder: ${VECTOR_DIMENSION}`);
                this.actualVectorDimension = VECTOR_DIMENSION;
            }

            this.isInitialized = true;
            return this.actualVectorDimension;

        } catch (error) {
            console.error("Failed to initialize embedding model:", error);
            this.embeddingModel = null;
            throw new Error(`EmbeddingManager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate embeddings for an array of texts
     * @param texts - Array of text strings to embed
     * @returns Promise<number[][]> - Array of embedding vectors
     */
    async embedTexts(texts: string[]): Promise<number[][]> {
        if (!this.embeddingModel) {
            throw new Error("Embedding model not initialized. Call initialize() first.");
        }
        if (texts.length === 0) return [];

        console.log(`Embedding ${texts.length} texts...`);
        try {
            const embeddings = await this.embeddingModel.embed(texts);
            console.log(`Embedding complete.`);
            return embeddings;
        } catch (error) {
            console.error("Error generating embeddings:", error);
            throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate embedding for a single text
     * @param text - Text string to embed
     * @returns Promise<number[]> - Embedding vector
     */
    async embedText(text: string): Promise<number[]> {
        const embeddings = await this.embedTexts([text]);
        return embeddings[0];
    }

    /**
     * Get the actual vector dimension of the loaded model
     * @returns number - Vector dimension
     */
    getVectorDimension(): number {
        return this.actualVectorDimension;
    }

    /**
     * Check if the embedding manager is properly initialized
     * @returns boolean - True if initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.embeddingModel !== null;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.embeddingModel = null;
        this.isInitialized = false;
        console.log("EmbeddingManager disposed");
    }
}
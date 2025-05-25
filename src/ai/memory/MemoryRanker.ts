/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { MemoryQueryResultItem, RankingOptions } from './types';

/**
 * MemoryRanker handles ranking and filtering of memory query results
 * Provides relevance thresholding, recency bias, and deduplication
 */
export class MemoryRanker {
    /**
     * Ranks and filters memory query results based on provided options
     * @param results - Array of memory query results to rank and filter
     * @param options - Ranking options for filtering and scoring
     * @returns Filtered and ranked array of memory results
     */
    rankAndFilter(
        results: MemoryQueryResultItem[],
        options?: RankingOptions
    ): MemoryQueryResultItem[] {
        let rankedResults = [...results]; // Start with a copy

        // 1. Relevance Thresholding
        if (options?.relevanceThreshold !== undefined) {
            rankedResults = rankedResults.filter(result => result.score <= options.relevanceThreshold!);
            console.log(`MemoryRanker: Filtered by relevance threshold (${options.relevanceThreshold}), ${rankedResults.length} results remaining.`);
        }

        // 2. Recency Bias (simple example: boost score slightly for newer items)
        // This is a placeholder for a more sophisticated recency model.
        // It assumes lower score is better.
        const now = Date.now();
        const recencyFactor = 0.0000000001; // Tiny factor to avoid drastic score changes, adjust as needed
        rankedResults = rankedResults.map(result => {
            if (result.type === 'persistent' && result.last_accessed) {
                const ageMillis = now - result.last_accessed.getTime();
                // Simple linear decay of a small bonus. Max age of ~1 year for this to have an effect.
                // This will slightly reduce the score (improve it) for more recent items.
                const recencyBonus = Math.max(0, (3.154e+10 - ageMillis)) * recencyFactor; // 3.154e+10 is approx 1 year in ms
                return { ...result, score: result.score - recencyBonus };
            }
            return result;
        });
        
        // Re-sort if recency bias changed scores significantly relative to each other
        // The primary sort by distance is done in queryMemories. This is a secondary sort/adjustment.
        // If recency bias is applied, results should be re-sorted.
        rankedResults.sort((a, b) => a.score - b.score);

        // 3. Deduplication by Text (if enabled)
        if (options?.deduplicateByText) {
            const uniqueTextResults: MemoryQueryResultItem[] = [];
            const seenTexts = new Set<string>();
            for (const result of rankedResults) {
                if (!seenTexts.has(result.text)) {
                    uniqueTextResults.push(result);
                    seenTexts.add(result.text);
                }
            }
            rankedResults = uniqueTextResults;
            console.log(`MemoryRanker: Deduplicated by text, ${rankedResults.length} results remaining.`);
        }
        // TODO: Implement more advanced vector-based deduplication (Task 1.2.4)

        return rankedResults;
    }

    /**
     * Apply sophisticated recency bias based on access patterns
     * TODO: Implement more sophisticated recency models (Task 1.2.4)
     */
    private applyRecencyBias(results: MemoryQueryResultItem[], options?: RankingOptions): MemoryQueryResultItem[] {
        // Placeholder for future enhancement
        return results;
    }

    /**
     * Apply vector-based deduplication to remove semantically similar results
     * TODO: Implement vector-based deduplication strategy (Task 1.2.4)
     */
    private applyVectorDeduplication(results: MemoryQueryResultItem[], options?: RankingOptions): MemoryQueryResultItem[] {
        // Placeholder for future enhancement
        return results;
    }
}
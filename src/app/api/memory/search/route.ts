import { NextRequest, NextResponse } from 'next/server';
import { getMemoryManagerInstance } from '@/lib/memoryManagerInstance';
import type { QueryMemoryOptions, MemoryFilterType } from '@/ai/associativeMemory'; // Import the types

// This ensures that this code only runs on the server
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // Check if we're on the server side
    if (typeof window !== 'undefined') {
        return NextResponse.json(
            { error: 'Memory search can only be performed server-side' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const {
            query,
            sessionId = 'default_session',
            filterType,
            filterDateStart,
            filterDateEnd
        } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid query parameter' }, { status: 400 });
        }

        console.log(`API Route: Processing memory search request for query: "${query}", sessionId: ${sessionId}, filters:`, { filterType, filterDateStart, filterDateEnd });

        const memoryManager = await getMemoryManagerInstance();

        if (!memoryManager) {
            console.error("API Route: Memory Manager instance is not available.");
            return NextResponse.json({ error: 'Memory system not initialized' }, { status: 503 }); // Service Unavailable
        }

        // Define search limits and include new filters
        const searchOptions: QueryMemoryOptions = {
            sessionLimit: 5, // Default limit
            persistentLimit: 5, // Default limit
        };

        if (filterType) searchOptions.filterType = filterType as MemoryFilterType; // Cast if necessary, ensure validation
        if (filterDateStart) searchOptions.filterDateStart = filterDateStart;
        if (filterDateEnd) searchOptions.filterDateEnd = filterDateEnd;
        
        // The TODO to update MemoryManager.queryMemories was addressed in the previous steps.
        const results = await memoryManager.queryMemories(query, sessionId, searchOptions);

        console.log(`API Route: Found ${results.length} memory results.`);

        return NextResponse.json(results);

    } catch (error) {
        console.error("API Route: Error during memory search:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to search memory', details: errorMessage }, { status: 500 });
    }
}

// Optional: Add GET handler if needed, or other methods
export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
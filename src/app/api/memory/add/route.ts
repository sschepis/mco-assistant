import { NextRequest, NextResponse } from 'next/server';
import { getMemoryManagerInstance } from '@/lib/memoryManagerInstance';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (typeof window !== 'undefined') {
        return NextResponse.json(
            { error: 'Memory addition can only be performed server-side' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { text, source } = body;

        if (!text || typeof text !== 'string' || !source || typeof source !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid text or source parameters' }, { status: 400 });
        }

        console.log(`API Route: Processing memory add request for text: "${text.substring(0, 50)}...", source: "${source}"`);

        const memoryManager = await getMemoryManagerInstance();

        if (!memoryManager) {
            console.error("API Route: Memory Manager instance is not available.");
            return NextResponse.json({ error: 'Memory system not initialized' }, { status: 503 });
        }

        // addPersistentItems expects an array of items, and source_ids is string[]
        await memoryManager.addPersistentItems([{ text, source_ids: [source] }]);

        console.log(`API Route: Successfully added new memory.`);

        return NextResponse.json({ message: 'Memory added successfully' });

    } catch (error) {
        console.error("API Route: Error during memory addition:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to add memory', details: errorMessage }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
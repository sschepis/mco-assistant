// src/app/api/conversation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { type Message } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'generate_title': {
        // Generate a smart title based on conversation content
        const { messages } = data;
        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }

        // Simple title generation - in a real implementation, you might use AI
        const firstUserMessage = messages.find((m: Message) => m.role === 'user');
        if (firstUserMessage) {
          const words = firstUserMessage.content.split(' ').slice(0, 8);
          const title = words.join(' ') + (firstUserMessage.content.split(' ').length > 8 ? '...' : '');
          return NextResponse.json({ title });
        }

        return NextResponse.json({ error: 'No user messages found' }, { status: 400 });
      }

      case 'validate_export': {
        // Validate export data format
        const { exportData } = data;
        
        if (!exportData || typeof exportData !== 'object') {
          return NextResponse.json({ valid: false, error: 'Invalid export data format' });
        }

        if (!exportData.conversation || !exportData.messages) {
          return NextResponse.json({ valid: false, error: 'Missing conversation or messages data' });
        }

        if (!Array.isArray(exportData.messages)) {
          return NextResponse.json({ valid: false, error: 'Messages must be an array' });
        }

        // Validate conversation structure
        const conversation = exportData.conversation;
        if (!conversation.id || !conversation.title || !conversation.timestamp) {
          return NextResponse.json({ valid: false, error: 'Invalid conversation structure' });
        }

        return NextResponse.json({ valid: true });
      }

      case 'analyze_conversation': {
        // Analyze conversation for insights
        const { messages } = data;
        if (!messages || !Array.isArray(messages)) {
          return NextResponse.json({ error: 'Invalid messages data' }, { status: 400 });
        }

        const analysis = {
          messageCount: messages.length,
          userMessages: messages.filter((m: Message) => m.role === 'user').length,
          assistantMessages: messages.filter((m: Message) => m.role === 'assistant').length,
          averageMessageLength: messages.reduce((acc: number, m: Message) => acc + m.content.length, 0) / messages.length,
          topics: [], // Could be enhanced with actual topic analysis
          sentiment: 'neutral' // Could be enhanced with sentiment analysis
        };

        return NextResponse.json({ analysis });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats': {
        // Return conversation statistics
        // In a real implementation, this would query the database
        const stats = {
          totalConversations: 0,
          totalMessages: 0,
          averageConversationLength: 0,
          mostActiveDay: new Date().toISOString().split('T')[0],
          categories: []
        };

        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
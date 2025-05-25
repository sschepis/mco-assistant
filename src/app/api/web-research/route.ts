import { NextRequest, NextResponse } from 'next/server';
import { WebIntelligenceTool } from '../../../ai/tools/WebIntelligenceTool';

const intelligence = new WebIntelligenceTool(process.env.SERPER_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      maxResults = 3,
      includeContent = true,
      type = 'research' // 'research', 'news', 'quick'
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!intelligence.isConfigured()) {
      return NextResponse.json(
        { error: 'Web research is not configured. SERPER_API_KEY environment variable is required.' },
        { status: 503 }
      );
    }

    let result: string;

    switch (type) {
      case 'news':
        result = await intelligence.getNews(query, maxResults);
        break;
      case 'quick':
        result = await intelligence.quickResearch(query, maxResults);
        break;
      case 'research':
      default:
        if (includeContent) {
          result = await intelligence.deepResearch(query, maxResults);
        } else {
          result = await intelligence.quickResearch(query, maxResults);
        }
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Web research API error:', error);
    return NextResponse.json(
      { 
        error: 'Web research failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const maxResults = parseInt(searchParams.get('maxResults') || '3');
  const includeContent = searchParams.get('includeContent') !== 'false';
  const type = searchParams.get('type') || 'research';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    if (!intelligence.isConfigured()) {
      return NextResponse.json(
        { error: 'Web research is not configured. SERPER_API_KEY environment variable is required.' },
        { status: 503 }
      );
    }

    let result: string;

    switch (type) {
      case 'news':
        result = await intelligence.getNews(query, maxResults);
        break;
      case 'quick':
        result = await intelligence.quickResearch(query, maxResults);
        break;
      case 'research':
      default:
        if (includeContent) {
          result = await intelligence.deepResearch(query, maxResults);
        } else {
          result = await intelligence.quickResearch(query, maxResults);
        }
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Web research API error:', error);
    return NextResponse.json(
      { 
        error: 'Web research failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
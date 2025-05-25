import { NextRequest, NextResponse } from 'next/server';
import { WebSearchTool } from '../../../ai/tools/WebSearchTool';

const searchTool = new WebSearchTool(process.env.SERPER_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxResults = 5, type = 'search', gl = 'us', hl = 'en' } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!searchTool.isConfigured()) {
      return NextResponse.json(
        { error: 'Web search is not configured. SERPER_API_KEY environment variable is required.' },
        { status: 503 }
      );
    }

    const options = {
      num: maxResults,
      type,
      gl,
      hl
    };

    const response = await searchTool.search(query, options);

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: response.organic || [],
        totalResults: response.organic?.length || 0,
        answerBox: response.answerBox,
        knowledgeGraph: response.knowledgeGraph,
        relatedSearches: response.relatedSearches
      }
    });

  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json(
      { 
        error: 'Web search failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const maxResults = parseInt(searchParams.get('maxResults') || '5');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    if (!searchTool.isConfigured()) {
      return NextResponse.json(
        { error: 'Web search is not configured. SERPER_API_KEY environment variable is required.' },
        { status: 503 }
      );
    }

    const formattedResults = await searchTool.searchForAI(query, maxResults);

    return NextResponse.json({
      success: true,
      data: {
        query,
        formattedResults
      }
    });

  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json(
      { 
        error: 'Web search failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
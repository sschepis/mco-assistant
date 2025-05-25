import { NextRequest, NextResponse } from 'next/server';
import { WebContentParser } from '../../../ai/tools/WebContentParser';

const parser = new WebContentParser();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url, 
      maxLength = 10000, 
      includeImages = true, 
      includeLinks = true,
      forAI = false
    } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const options = {
      maxContentLength: maxLength,
      includeImages,
      includeLinks
    };

    if (forAI) {
      // Return formatted content for AI consumption
      const formattedContent = await parser.parseForAI(url, maxLength);
      return NextResponse.json({
        success: true,
        data: {
          url,
          formattedContent
        }
      });
    } else {
      // Return structured parsed content
      const parsed = await parser.parseUrl(url, options);
      return NextResponse.json({
        success: true,
        data: parsed
      });
    }

  } catch (error) {
    console.error('Web content parsing API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse web content', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const maxLength = parseInt(searchParams.get('maxLength') || '5000');
  const forAI = searchParams.get('forAI') === 'true';

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    new URL(url);

    if (forAI) {
      const formattedContent = await parser.parseForAI(url, maxLength);
      return NextResponse.json({
        success: true,
        data: {
          url,
          formattedContent
        }
      });
    } else {
      const parsed = await parser.parseUrl(url, { maxContentLength: maxLength });
      return NextResponse.json({
        success: true,
        data: parsed
      });
    }

  } catch (error) {
    console.error('Web content parsing API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse web content', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
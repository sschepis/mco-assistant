/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { WebSearchTool, SearchResult, WebSearchOptions } from './WebSearchTool';
import { WebContentParser, ParsedContent, ParsingOptions } from './WebContentParser';

export interface WebIntelligenceOptions {
  searchOptions?: WebSearchOptions;
  parsingOptions?: ParsingOptions;
  maxSearchResults?: number;
  maxContentLength?: number;
  includeFullContent?: boolean;
}

export interface WebIntelligenceResult {
  query: string;
  searchResults: SearchResult[];
  parsedContent: ParsedContent[];
  summary: string;
  timestamp: Date;
}

/**
 * WebIntelligenceTool combines web search and content parsing for comprehensive web research
 */
export class WebIntelligenceTool {
  private searchTool: WebSearchTool;
  private contentParser: WebContentParser;

  constructor(serperApiKey?: string) {
    this.searchTool = new WebSearchTool(serperApiKey);
    this.contentParser = new WebContentParser();
  }

  /**
   * Perform comprehensive web research on a topic
   * @param query - Research query
   * @param options - Research options
   * @returns Promise<WebIntelligenceResult> - Comprehensive research results
   */
  async research(query: string, options: WebIntelligenceOptions = {}): Promise<WebIntelligenceResult> {
    const startTime = new Date();
    
    try {
      console.log(`WebIntelligenceTool: Starting research for "${query}"`);
      
      // Step 1: Perform web search
      const searchResults = await this.searchTool.quickSearch(
        query, 
        options.maxSearchResults || 5
      );

      if (searchResults.length === 0) {
        return {
          query,
          searchResults: [],
          parsedContent: [],
          summary: `No search results found for "${query}".`,
          timestamp: startTime
        };
      }

      console.log(`WebIntelligenceTool: Found ${searchResults.length} search results`);

      // Step 2: Parse content from top search results (if requested)
      const parsedContent: ParsedContent[] = [];
      
      if (options.includeFullContent !== false) {
        const urlsToParse = searchResults
          .slice(0, Math.min(3, searchResults.length)) // Parse top 3 results
          .map(result => result.link);

        for (const url of urlsToParse) {
          try {
            console.log(`WebIntelligenceTool: Parsing content from ${url}`);
            const parsed = await this.contentParser.parseUrl(url, {
              maxContentLength: options.maxContentLength || 5000,
              ...options.parsingOptions
            });
            parsedContent.push(parsed);
          } catch (error) {
            console.warn(`WebIntelligenceTool: Failed to parse ${url}:`, error);
            // Continue with other URLs even if one fails
          }
        }
      }

      // Step 3: Generate comprehensive summary
      const summary = this.generateResearchSummary(query, searchResults, parsedContent);

      const result: WebIntelligenceResult = {
        query,
        searchResults,
        parsedContent,
        summary,
        timestamp: startTime
      };

      console.log(`WebIntelligenceTool: Research completed for "${query}" with ${parsedContent.length} parsed pages`);
      return result;

    } catch (error) {
      console.error(`WebIntelligenceTool: Research failed for "${query}":`, error);
      throw new Error(`Web research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quick research that returns a formatted text summary
   * @param query - Research query
   * @param maxResults - Maximum search results to include
   * @returns Promise<string> - Formatted research summary
   */
  async quickResearch(query: string, maxResults: number = 3): Promise<string> {
    try {
      const result = await this.research(query, {
        maxSearchResults: maxResults,
        includeFullContent: false,
        maxContentLength: 2000
      });

      return this.formatForAI(result);
    } catch (error) {
      console.error('WebIntelligenceTool: Quick research failed:', error);
      return `Failed to research "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Deep research with full content parsing
   * @param query - Research query
   * @param maxResults - Maximum search results
   * @returns Promise<string> - Comprehensive research report
   */
  async deepResearch(query: string, maxResults: number = 5): Promise<string> {
    try {
      const result = await this.research(query, {
        maxSearchResults: maxResults,
        includeFullContent: true,
        maxContentLength: 10000
      });

      return this.formatForAI(result, true);
    } catch (error) {
      console.error('WebIntelligenceTool: Deep research failed:', error);
      return `Failed to conduct deep research on "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Search and parse a specific URL
   * @param url - URL to parse
   * @param context - Optional context for why this URL is being parsed
   * @returns Promise<string> - Formatted content
   */
  async parseUrl(url: string, context?: string): Promise<string> {
    try {
      console.log(`WebIntelligenceTool: Parsing specific URL: ${url}`);
      const parsed = await this.contentParser.parseUrl(url);
      
      let formatted = context ? `Content Analysis (${context}):\n\n` : 'Content Analysis:\n\n';
      formatted += `URL: ${url}\n`;
      formatted += `Title: ${parsed.title}\n`;
      
      if (parsed.author) {
        formatted += `Author: ${parsed.author}\n`;
      }
      
      if (parsed.publishedDate) {
        formatted += `Published: ${parsed.publishedDate}\n`;
      }
      
      formatted += `\nSummary: ${parsed.summary}\n\n`;
      formatted += `Full Content:\n${parsed.content}\n\n`;
      formatted += `Reading Time: ${parsed.readingTime} minutes | Word Count: ${parsed.wordCount}`;
      
      return formatted;
    } catch (error) {
      console.error(`WebIntelligenceTool: Failed to parse ${url}:`, error);
      return `Failed to parse content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get current events and news about a topic
   * @param topic - Topic to search for news about
   * @param maxResults - Maximum news results
   * @returns Promise<string> - Formatted news summary
   */
  async getNews(topic: string, maxResults: number = 5): Promise<string> {
    try {
      console.log(`WebIntelligenceTool: Getting news about "${topic}"`);
      const newsResults = await this.searchTool.searchNews(topic, { num: maxResults });
      
      if (newsResults.length === 0) {
        return `No recent news found about "${topic}".`;
      }

      let formatted = `Recent News about "${topic}":\n\n`;
      
      newsResults.forEach((result, index) => {
        formatted += `${index + 1}. ${result.title}\n`;
        formatted += `   ${result.snippet}\n`;
        formatted += `   Source: ${result.source || new URL(result.link).hostname}\n`;
        if (result.date) {
          formatted += `   Date: ${result.date}\n`;
        }
        formatted += `   URL: ${result.link}\n\n`;
      });

      return formatted.trim();
    } catch (error) {
      console.error(`WebIntelligenceTool: Failed to get news about "${topic}":`, error);
      return `Failed to get news about "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Format research results for AI consumption
   * @param result - Web intelligence result
   * @param includeFullContent - Whether to include full parsed content
   * @returns string - Formatted result
   */
  private formatForAI(result: WebIntelligenceResult, includeFullContent: boolean = false): string {
    let formatted = `Web Research Results for "${result.query}":\n\n`;
    
    // Add search results summary
    formatted += `Found ${result.searchResults.length} search results:\n\n`;
    
    result.searchResults.forEach((searchResult, index) => {
      formatted += `${index + 1}. ${searchResult.title}\n`;
      formatted += `   ${searchResult.snippet}\n`;
      formatted += `   Source: ${searchResult.link}\n\n`;
    });

    // Add parsed content if available and requested
    if (includeFullContent && result.parsedContent.length > 0) {
      formatted += `\nDetailed Content Analysis:\n\n`;
      
      result.parsedContent.forEach((content, index) => {
        formatted += `--- Content ${index + 1}: ${content.title} ---\n`;
        formatted += `URL: ${content.url}\n`;
        if (content.author) {
          formatted += `Author: ${content.author}\n`;
        }
        formatted += `Summary: ${content.summary}\n\n`;
        formatted += `Full Content:\n${content.content}\n\n`;
        formatted += `Word Count: ${content.wordCount} | Reading Time: ${content.readingTime} minutes\n\n`;
      });
    }

    // Add overall summary
    formatted += `\nResearch Summary:\n${result.summary}`;
    
    return formatted;
  }

  /**
   * Generate a comprehensive summary from search and parsed content
   * @param query - Original query
   * @param searchResults - Search results
   * @param parsedContent - Parsed content
   * @returns string - Research summary
   */
  private generateResearchSummary(
    query: string, 
    searchResults: SearchResult[], 
    parsedContent: ParsedContent[]
  ): string {
    let summary = `Research on "${query}" found ${searchResults.length} relevant sources. `;
    
    if (searchResults.length > 0) {
      summary += `Key findings include: `;
      
      // Extract key points from search snippets
      const keyPoints = searchResults
        .slice(0, 3)
        .map(result => result.snippet)
        .join(' ');
      
      summary += keyPoints.substring(0, 300);
      
      if (keyPoints.length > 300) {
        summary += '...';
      }
    }
    
    if (parsedContent.length > 0) {
      summary += ` Detailed analysis of ${parsedContent.length} sources provided additional insights including `;
      
      const insights = parsedContent
        .map(content => content.summary)
        .join(' ');
      
      summary += insights.substring(0, 200);
      
      if (insights.length > 200) {
        summary += '...';
      }
    }
    
    return summary;
  }

  /**
   * Check if the tool is properly configured
   * @returns boolean - True if both search and parsing are available
   */
  isConfigured(): boolean {
    return this.searchTool.isConfigured();
  }

  /**
   * Set the Serper API key
   * @param apiKey - Serper API key
   */
  setApiKey(apiKey: string): void {
    this.searchTool.setApiKey(apiKey);
  }
}
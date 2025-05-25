/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

export interface SearchResponse {
  searchParameters: {
    q: string;
    type?: string;
    engine?: string;
  };
  organic: SearchResult[];
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    descriptionSource: string;
    descriptionLink: string;
    attributes: Record<string, string>;
  };
  peopleAlsoAsk?: Array<{
    question: string;
    snippet: string;
    title: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
}

export interface WebSearchOptions {
  num?: number; // Number of results (1-100)
  page?: number; // Page number
  gl?: string; // Country code (e.g., 'us', 'uk')
  hl?: string; // Language code (e.g., 'en', 'es')
  autocorrect?: boolean;
  safeSearch?: 'off' | 'moderate' | 'strict';
  type?: 'search' | 'images' | 'videos' | 'places' | 'news';
}

/**
 * WebSearchTool provides web search capabilities using the Serper API
 */
export class WebSearchTool {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('WebSearchTool: No Serper API key provided. Search functionality will be disabled.');
    }
  }

  /**
   * Search the web using Serper API
   * @param query - Search query
   * @param options - Search options
   * @returns Promise<SearchResponse> - Search results
   */
  async search(query: string, options: WebSearchOptions = {}): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error('Serper API key is required for web search');
    }

    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const searchParams = {
      q: query.trim(),
      num: options.num || 10,
      page: options.page || 1,
      gl: options.gl || 'us',
      hl: options.hl || 'en',
      autocorrect: options.autocorrect !== false,
      safe: options.safeSearch || 'moderate',
      type: options.type || 'search'
    };

    try {
      console.log(`WebSearchTool: Searching for "${query}" with options:`, searchParams);
      
      const response = await axios.post(
        `${this.baseUrl}/${searchParams.type}`,
        searchParams,
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const searchResponse: SearchResponse = response.data;
      console.log(`WebSearchTool: Found ${searchResponse.organic?.length || 0} results for "${query}"`);
      
      return searchResponse;

    } catch (error: any) {
      console.error('WebSearchTool: Search failed:', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        switch (status) {
          case 401:
            throw new Error('Invalid Serper API key');
          case 429:
            throw new Error('Serper API rate limit exceeded');
          case 400:
            throw new Error(`Invalid search parameters: ${message}`);
          default:
            throw new Error(`Search API error (${status}): ${message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Search request timed out');
      } else {
        throw new Error(`Search failed: ${error.message}`);
      }
    }
  }

  /**
   * Quick search that returns only the most relevant results
   * @param query - Search query
   * @param maxResults - Maximum number of results (default: 5)
   * @returns Promise<SearchResult[]> - Array of search results
   */
  async quickSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const response = await this.search(query, { num: maxResults });
    return response.organic || [];
  }

  /**
   * Search for news articles
   * @param query - Search query
   * @param options - Search options
   * @returns Promise<SearchResult[]> - Array of news results
   */
  async searchNews(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
    const response = await this.search(query, { ...options, type: 'news' });
    return response.organic || [];
  }

  /**
   * Get answer box content if available
   * @param query - Search query
   * @returns Promise<string | null> - Answer box content or null
   */
  async getQuickAnswer(query: string): Promise<string | null> {
    try {
      const response = await this.search(query, { num: 3 });
      
      if (response.answerBox?.answer) {
        return response.answerBox.answer;
      }
      
      if (response.knowledgeGraph?.description) {
        return response.knowledgeGraph.description;
      }
      
      // Fall back to first search result snippet
      if (response.organic?.[0]?.snippet) {
        return response.organic[0].snippet;
      }
      
      return null;
    } catch (error) {
      console.error('WebSearchTool: Failed to get quick answer:', error);
      return null;
    }
  }

  /**
   * Search and format results for AI consumption
   * @param query - Search query
   * @param maxResults - Maximum number of results
   * @returns Promise<string> - Formatted search results as text
   */
  async searchForAI(query: string, maxResults: number = 5): Promise<string> {
    try {
      const response = await this.search(query, { num: maxResults });
      
      let formattedResults = `Search results for "${query}":\n\n`;
      
      // Add answer box if available
      if (response.answerBox?.answer) {
        formattedResults += `Direct Answer: ${response.answerBox.answer}\n`;
        formattedResults += `Source: ${response.answerBox.title} (${response.answerBox.link})\n\n`;
      }
      
      // Add knowledge graph if available
      if (response.knowledgeGraph?.description) {
        formattedResults += `Knowledge Graph: ${response.knowledgeGraph.description}\n`;
        formattedResults += `Source: ${response.knowledgeGraph.descriptionSource}\n\n`;
      }
      
      // Add organic results
      if (response.organic?.length > 0) {
        formattedResults += 'Search Results:\n';
        response.organic.forEach((result, index) => {
          formattedResults += `${index + 1}. ${result.title}\n`;
          formattedResults += `   ${result.snippet}\n`;
          formattedResults += `   Source: ${result.link}\n\n`;
        });
      }
      
      // Add related searches if available
      if (response.relatedSearches && response.relatedSearches.length > 0) {
        formattedResults += 'Related Searches:\n';
        response.relatedSearches.slice(0, 3).forEach(related => {
          formattedResults += `- ${related.query}\n`;
        });
      }
      
      return formattedResults.trim();
      
    } catch (error) {
      console.error('WebSearchTool: Failed to search for AI:', error);
      return `Failed to search for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Check if the search tool is properly configured
   * @returns boolean - True if API key is available
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set the API key
   * @param apiKey - Serper API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
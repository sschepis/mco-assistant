/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ParsedContent {
  title: string;
  content: string;
  summary: string;
  url: string;
  author?: string;
  publishedDate?: string;
  description?: string;
  keywords?: string[];
  images?: string[];
  links?: Array<{
    text: string;
    url: string;
  }>;
  wordCount: number;
  readingTime: number; // in minutes
}

export interface ParsingOptions {
  maxContentLength?: number; // Maximum content length in characters
  includeImages?: boolean;
  includeLinks?: boolean;
  removeAds?: boolean;
  timeout?: number; // Request timeout in milliseconds
  userAgent?: string;
  followRedirects?: boolean;
}

/**
 * WebContentParser extracts and parses content from web pages
 */
export class WebContentParser {
  private defaultOptions: ParsingOptions = {
    maxContentLength: 50000,
    includeImages: true,
    includeLinks: true,
    removeAds: true,
    timeout: 15000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    followRedirects: true
  };

  constructor(options?: Partial<ParsingOptions>) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Parse content from a URL
   * @param url - URL to parse
   * @param options - Parsing options
   * @returns Promise<ParsedContent> - Parsed content
   */
  async parseUrl(url: string, options?: ParsingOptions): Promise<ParsedContent> {
    const opts = { ...this.defaultOptions, ...options };
    
    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    try {
      console.log(`WebContentParser: Parsing content from ${url}`);
      
      const response = await axios.get(url, {
        timeout: opts.timeout,
        headers: {
          'User-Agent': opts.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
        },
        maxRedirects: opts.followRedirects ? 5 : 0,
        validateStatus: (status) => status < 400, // Accept all status codes < 400
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Remove unwanted elements
      if (opts.removeAds) {
        this.removeUnwantedElements($);
      }

      const parsedContent = this.extractContent($, url, opts);
      
      console.log(`WebContentParser: Successfully parsed ${parsedContent.wordCount} words from ${url}`);
      return parsedContent;

    } catch (error: any) {
      console.error(`WebContentParser: Failed to parse ${url}:`, error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout for ${url}`);
      } else if (error.response) {
        const status = error.response.status;
        throw new Error(`HTTP ${status} error for ${url}: ${error.response.statusText}`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`URL not found: ${url}`);
      } else {
        throw new Error(`Failed to parse ${url}: ${error.message}`);
      }
    }
  }

  /**
   * Parse content from HTML string
   * @param html - HTML content
   * @param url - Source URL (for reference)
   * @param options - Parsing options
   * @returns ParsedContent - Parsed content
   */
  parseHtml(html: string, url: string = '', options?: ParsingOptions): ParsedContent {
    const opts = { ...this.defaultOptions, ...options };
    const $ = cheerio.load(html);

    if (opts.removeAds) {
      this.removeUnwantedElements($);
    }

    return this.extractContent($, url, opts);
  }

  /**
   * Extract structured content from a Cheerio object
   * @param $ - Cheerio object
   * @param url - Source URL
   * @param options - Parsing options
   * @returns ParsedContent - Extracted content
   */
  private extractContent($: any, url: string, options: ParsingOptions): ParsedContent {
    // Extract title
    const title = this.extractTitle($);
    
    // Extract meta information
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    const author = $('meta[name="author"]').attr('content') || 
                  $('meta[property="article:author"]').attr('content') || '';
    
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="date"]').attr('content') || '';
    
    const keywords = this.extractKeywords($);

    // Extract main content
    const content = this.extractMainContent($, options.maxContentLength || 50000);
    
    // Generate summary (first 300 characters of content)
    const summary = this.generateSummary(content);
    
    // Extract images and links if requested
    const images = options.includeImages ? this.extractImages($, url) : [];
    const links = options.includeLinks ? this.extractLinks($, url) : [];
    
    // Calculate reading metrics
    const wordCount = this.countWords(content);
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

    return {
      title,
      content,
      summary,
      url,
      author: author || undefined,
      publishedDate: publishedDate || undefined,
      description: description || undefined,
      keywords,
      images,
      links,
      wordCount,
      readingTime
    };
  }

  /**
   * Extract the page title
   * @param $ - Cheerio object
   * @returns string - Page title
   */
  private extractTitle($: any): string {
    return $('title').text().trim() ||
           $('meta[property="og:title"]').attr('content') ||
           $('h1').first().text().trim() ||
           'Untitled';
  }

  /**
   * Extract main content from the page
   * @param $ - Cheerio object
   * @param maxLength - Maximum content length
   * @returns string - Main content
   */
  private extractMainContent($: any, maxLength: number): string {
    // Try to find the main content area
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.main-content',
      '#content',
      '#main',
      '.container .row .col',
      'main'
    ];

    let content = '';
    
    // Try each selector to find the best content
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) { // Minimum threshold for meaningful content
          break;
        }
      }
    }

    // Fallback to body content if no specific content area found
    if (!content || content.length < 200) {
      content = $('body').text().trim();
    }

    // Clean up the content
    content = this.cleanContent(content);
    
    // Truncate if too long
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return content;
  }

  /**
   * Extract keywords from meta tags
   * @param $ - Cheerio object
   * @returns string[] - Array of keywords
   */
  private extractKeywords($: any): string[] {
    const keywordString = $('meta[name="keywords"]').attr('content') || '';
    return keywordString
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);
  }

  /**
   * Extract images from the page
   * @param $ - Cheerio object
   * @param baseUrl - Base URL for resolving relative URLs
   * @returns string[] - Array of image URLs
   */
  private extractImages($: any, baseUrl: string): string[] {
    const images: string[] = [];
    
    $('img').each((_: any, element: any) => {
      const src = $(element).attr('src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    });

    return images.slice(0, 10); // Limit to 10 images
  }

  /**
   * Extract links from the page
   * @param $ - Cheerio object
   * @param baseUrl - Base URL for resolving relative URLs
   * @returns Array of link objects
   */
  private extractLinks($: any, baseUrl: string): Array<{ text: string; url: string }> {
    const links: Array<{ text: string; url: string }> = [];
    
    $('a[href]').each((_: any, element: any) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (href && text && text.length > 0 && text.length < 100) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl && !links.some(link => link.url === absoluteUrl)) {
          links.push({ text, url: absoluteUrl });
        }
      }
    });

    return links.slice(0, 20); // Limit to 20 links
  }

  /**
   * Remove unwanted elements from the page
   * @param $ - Cheerio object
   */
  private removeUnwantedElements($: any): void {
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.advertisement',
      '.ads',
      '.banner',
      '.popup',
      '.modal',
      '.sidebar',
      '.social-share',
      '.comments',
      '.comment',
      '.related-posts',
      '[id*="ad"]',
      '[class*="ad"]',
      '[id*="banner"]',
      '[class*="banner"]',
      'iframe[src*="ads"]',
      'iframe[src*="google"]'
    ];

    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
  }

  /**
   * Clean and normalize content text
   * @param content - Raw content text
   * @returns string - Cleaned content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters except newlines
      .trim();
  }

  /**
   * Generate a summary from content
   * @param content - Full content text
   * @returns string - Summary
   */
  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return content.substring(0, 300) + (content.length > 300 ? '...' : '');
    }
    
    let summary = '';
    for (const sentence of sentences) {
      if (summary.length + sentence.length > 300) {
        break;
      }
      summary += sentence.trim() + '. ';
    }
    
    return summary.trim() || content.substring(0, 300) + (content.length > 300 ? '...' : '');
  }

  /**
   * Count words in text
   * @param text - Text to count words in
   * @returns number - Word count
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate if a URL is valid
   * @param url - URL to validate
   * @returns boolean - True if valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   * @param url - URL to resolve
   * @param baseUrl - Base URL
   * @returns string | null - Resolved URL or null if invalid
   */
  private resolveUrl(url: string, baseUrl: string): string | null {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (url.startsWith('//')) {
        return 'https:' + url;
      }
      if (baseUrl) {
        return new URL(url, baseUrl).href;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse content optimized for AI consumption
   * @param url - URL to parse
   * @param maxLength - Maximum content length
   * @returns Promise<string> - Formatted content for AI
   */
  async parseForAI(url: string, maxLength: number = 5000): Promise<string> {
    try {
      const parsed = await this.parseUrl(url, { maxContentLength: maxLength });
      
      let formatted = `Content from: ${url}\n\n`;
      formatted += `Title: ${parsed.title}\n\n`;
      
      if (parsed.author) {
        formatted += `Author: ${parsed.author}\n`;
      }
      
      if (parsed.publishedDate) {
        formatted += `Published: ${parsed.publishedDate}\n`;
      }
      
      if (parsed.description) {
        formatted += `Description: ${parsed.description}\n\n`;
      }
      
      formatted += `Content:\n${parsed.content}\n\n`;
      formatted += `Word Count: ${parsed.wordCount} | Reading Time: ${parsed.readingTime} minutes`;
      
      return formatted;
      
    } catch (error) {
      console.error('WebContentParser: Failed to parse for AI:', error);
      return `Failed to parse content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
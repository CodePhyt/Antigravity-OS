/**
 * Browser Skill - Web Content Fetching & Parsing
 * 
 * Lightweight web scraping using axios + cheerio (no headless browser).
 * Implements SSRF protection and resource limits for security.
 * 
 * @module skills/browser
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { ISkill, SkillExecutionError } from './core/types.js';

/**
 * Browser input schema
 */
export interface BrowserInput {
  url: string;
  timeout?: number; // milliseconds (default: 5000)
  maxSize?: number; // bytes (default: 10MB)
}

/**
 * Browser output
 */
export interface BrowserOutput {
  url: string;
  title: string;
  content: string; // Cleaned text content
  html: string; // Raw HTML
  links: string[]; // Extracted links
  success: boolean;
}

/**
 * Browser Skill - Fetch and Parse Web Content
 * 
 * Security Features:
 * - SSRF protection (blocks local IPs)
 * - Timeout limits (default 5s)
 * - Size limits (default 10MB)
 * - Real User-Agent to avoid bot detection
 * 
 * @example
 * ```typescript
 * const browser = new BrowserSkill();
 * 
 * const result = await browser.execute({
 *   url: 'https://example.com',
 *   timeout: 5000
 * });
 * 
 * console.log(result.content);
 * ```
 */
export class BrowserSkill implements ISkill<BrowserInput, BrowserOutput> {
  name = 'browser';
  description = 'Fetch and parse web content with security protections';

  schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch',
        minLength: 1,
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        minimum: 1000,
        maximum: 30000,
      },
      maxSize: {
        type: 'number',
        description: 'Maximum response size in bytes',
        minimum: 1024,
        maximum: 10485760, // 10MB
      },
    },
    required: ['url'],
  };

  /**
   * Execute browser fetch operation
   */
  async execute(input: BrowserInput): Promise<BrowserOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // SSRF protection
      this.validateUrl(input.url);

      // Fetch content
      const html = await this.fetchContent(input);

      // Parse with cheerio
      const parsed = this.parseContent(html, input.url);

      return {
        ...parsed,
        success: true,
      };
    } catch (error) {
      throw new SkillExecutionError(
        `Browser execution failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        input,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: BrowserInput): void {
    if (!input.url || input.url.trim().length === 0) {
      throw new Error('URL is required and cannot be empty');
    }

    if (input.timeout && (input.timeout < 1000 || input.timeout > 30000)) {
      throw new Error('Timeout must be between 1000ms and 30000ms');
    }

    if (input.maxSize && (input.maxSize < 1024 || input.maxSize > 10485760)) {
      throw new Error('Max size must be between 1KB and 10MB');
    }
  }

  /**
   * SSRF Protection - Block local/private IPs
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);

      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
      }

      // Block local IPs
      const hostname = parsed.hostname.toLowerCase();
      const blockedPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '169.254.', // Link-local
        '10.', // Private Class A
        '172.16.', '172.17.', '172.18.', '172.19.', // Private Class B
        '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.',
        '172.28.', '172.29.', '172.30.', '172.31.',
        '192.168.', // Private Class C
      ];

      for (const pattern of blockedPatterns) {
        if (hostname.includes(pattern)) {
          throw new Error(`SSRF protection: Cannot access local/private IP: ${hostname}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('SSRF')) {
        throw error;
      }
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  /**
   * Fetch content with axios
   */
  private async fetchContent(input: BrowserInput): Promise<string> {
    const config: AxiosRequestConfig = {
      timeout: input.timeout || 5000,
      maxContentLength: input.maxSize || 10485760, // 10MB
      maxBodyLength: input.maxSize || 10485760,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    const response = await axios.get(input.url, config);
    return response.data;
  }

  /**
   * Parse HTML with cheerio
   */
  private parseContent(html: string, url: string): Omit<BrowserOutput, 'success'> {
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, footer, header, aside, iframe').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

    // Extract clean text content
    const content = $('body').text()
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
      .substring(0, 50000); // Limit to 50KB of text

    // Extract links
    const links: string[] = [];
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    });

    return {
      url,
      title,
      content,
      html,
      links: [...new Set(links)].slice(0, 50), // Dedupe and limit
    };
  }
}

/**
 * Singleton instance
 */
export const browser = new BrowserSkill();

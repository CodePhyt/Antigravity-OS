/**
 * Researcher Skill - Web Search & Research Capabilities
 * 
 * Enables autonomous agents to search the web and gather information.
 * 
 * NOTE: Real web scraping is blocked by CAPTCHAs. For production, use paid APIs.
 * 
 * @module skills/researcher
 */

import { ISkill, SkillExecutionError } from './core/types.js';

/**
 * Researcher input schema
 */
export interface ResearcherInput {
  query: string;
  depth: number; // 1 = quick search, 2 = deep search, 3 = comprehensive
}

/**
 * Researcher output
 */
export interface ResearcherOutput {
  query: string;
  results: ResearchResult[];
  summary: string;
  sources: string[];
  depth: number;
}

/**
 * Individual research result
 */
export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number; // 0-100
}

/**
 * Researcher Skill - Web Search & Information Gathering
 * 
 * Capabilities:
 * - Google search via Basic Version (gbv=1)
 * - Content extraction from top results
 * - Automatic summarization
 * - Citation management
 * 
 * @example
 * ```typescript
 * const researcher = new ResearcherSkill();
 * 
 * const results = await researcher.execute({
 *   query: 'TypeScript best practices 2024',
 *   depth: 2
 * });
 * 
 * console.log(results.summary);
 * ```
 */
export class ResearcherSkill implements ISkill<ResearcherInput, ResearcherOutput> {
  name = 'researcher';
  description = 'Web search and research capabilities for autonomous agents';

  schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
        minLength: 1,
      },
      depth: {
        type: 'number',
        description: 'Search depth (1=quick, 2=deep, 3=comprehensive)',
        minimum: 1,
        maximum: 3,
      },
    },
    required: ['query', 'depth'],
  };

  /**
   * Execute research operation
   */
  async execute(input: ResearcherInput): Promise<ResearcherOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Perform Google search
      const results = await this.performGoogleSearch(input);

      return results;
    } catch (error) {
      throw new SkillExecutionError(
        `Researcher execution failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        input,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: ResearcherInput): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new Error('Query is required and cannot be empty');
    }

    if (!input.depth || input.depth < 1 || input.depth > 3) {
      throw new Error('Depth must be between 1 and 3');
    }
  }

  /**
   * Perform web search
   * 
   * NOTE: Real web scraping is blocked by CAPTCHAs from Google/DuckDuckGo.
   * For production, use:
   * - Paid APIs (Tavily, SerpAPI, Google Custom Search)
   * - Proxy rotation services
   * - Browser automation with CAPTCHA solving
   * 
   * For now, returns mock results to demonstrate the architecture.
   */
  private async performGoogleSearch(input: ResearcherInput): Promise<ResearcherOutput> {
    // Mock results for demo (real implementation would use paid APIs)
    const mockResults: ResearchResult[] = [
      {
        title: `How to Install ${input.query.includes('cheerio') ? 'Cheerio' : 'Packages'} - npm Documentation`,
        url: 'https://www.npmjs.com/package/cheerio',
        snippet: input.query.includes('cheerio') 
          ? 'Install cheerio using npm: npm install cheerio. Cheerio is a fast, flexible implementation of jQuery for the server.'
          : 'Use npm install to add packages to your project. Run npm install <package-name> to install a package.',
        relevance: 100,
      },
      {
        title: `${input.query} - Stack Overflow`,
        url: 'https://stackoverflow.com/questions/tagged/cheerio',
        snippet: 'Community answers and discussions about your query. Find solutions from developers worldwide.',
        relevance: 90,
      },
      {
        title: `${input.query} - GitHub`,
        url: 'https://github.com/cheeriojs/cheerio',
        snippet: 'Official repository and documentation. Check the README for installation instructions and examples.',
        relevance: 85,
      },
    ];

    // Add more results based on depth
    if (input.depth >= 2) {
      mockResults.push({
        title: `${input.query} - Medium Tutorial`,
        url: 'https://medium.com/search?q=' + encodeURIComponent(input.query),
        snippet: 'Step-by-step tutorial with code examples and best practices.',
        relevance: 75,
      });
    }

    if (input.depth >= 3) {
      mockResults.push({
        title: `${input.query} - Dev.to Community`,
        url: 'https://dev.to/search?q=' + encodeURIComponent(input.query),
        snippet: 'Community articles and discussions from developers.',
        relevance: 70,
      });
      mockResults.push({
        title: `${input.query} - Official Documentation`,
        url: 'https://docs.npmjs.com/',
        snippet: 'Official documentation with comprehensive guides.',
        relevance: 65,
      });
    }

    const summary = this.generateSummary(mockResults, input.query);

    return {
      query: input.query,
      results: mockResults,
      summary: `⚠️  DEMO MODE: Real web scraping blocked by CAPTCHAs.\n\n${summary}\n\n💡 For production: Use Tavily API, SerpAPI, or Google Custom Search API.`,
      sources: mockResults.map((r) => r.url),
      depth: input.depth,
    };
  }

  /**
   * Generate summary from results
   */
  private generateSummary(results: ResearchResult[], query: string): string {
    if (results.length === 0) {
      return `No results found for "${query}". Try a different search query.`;
    }

    const topResult = results[0];
    if (!topResult) {
      return `No results found for "${query}". Try a different search query.`;
    }

    const summary = `Found ${results.length} results for "${query}". 

Top result: ${topResult.title}
${topResult.snippet}

Source: ${topResult.url}`;

    return summary;
  }
}

/**
 * Singleton instance
 */
export const researcher = new ResearcherSkill();

/**
 * n8n Client (Execution Layer)
 * Provides deterministic HTTP calls to n8n workflows
 *
 * This is a pure execution script with no AI decision-making.
 * All logic is deterministic and testable.
 */

/**
 * n8n configuration
 */
export interface N8nConfig {
  /** Base URL for n8n instance */
  baseUrl: string;

  /** Webhook secret for authentication */
  webhookSecret?: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Number of retry attempts */
  retryAttempts: number;

  /** Delay between retries in milliseconds */
  retryDelay: number;
}

/**
 * Deep research payload
 */
export interface DeepResearchPayload {
  taskId: string;
  errorMessage: string;
  stackTrace: string;
  specPath: string;
  attemptNumber: number;
  context?: {
    language?: string;
    framework?: string;
    libraries?: string[];
  };
}

/**
 * Deep research result
 */
export interface DeepResearchResult {
  rootCause: string;
  recommendedSolutions: Array<{
    approach: string;
    code: string;
    confidence: number;
    source: string;
  }>;
  specUpdates: Array<{
    file: string;
    section: string;
    content: string;
  }>;
  learnings: string[];
}

/**
 * Spec validation payload
 */
export interface SpecValidationPayload {
  specPath: string;
  requirementsPath: string;
  designPath: string;
  tasksPath: string;
}

/**
 * Spec validation result
 */
export interface SpecValidationResult {
  isValid: boolean;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    section: string;
    description: string;
    suggestion: string;
  }>;
  suggestions: Array<{
    type: 'missing_requirement' | 'ambiguous_property' | 'incomplete_task';
    content: string;
    reasoning: string;
  }>;
  confidence: number;
}

/**
 * Code review payload
 */
export interface CodeReviewPayload {
  taskId: string;
  changedFiles: string[];
  testFiles: string[];
  specPath: string;
}

/**
 * Code review result
 */
export interface CodeReviewResult {
  approved: boolean;
  reviews: {
    security: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
    performance: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
    testCoverage: {
      passed: boolean;
      coverage: number;
      missingTests: string[];
    };
    documentation: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
  };
  overallScore: number;
}

/**
 * Continuous learning payload
 */
export interface ContinuousLearningPayload {
  errorType: string;
  targetFile: string;
  correction: string;
  attemptNumber: number;
  success: boolean;
  timestamp: string;
}

/**
 * Continuous learning result
 */
export interface ContinuousLearningResult {
  pattern: {
    name: string;
    description: string;
    category: 'success' | 'failure' | 'meta';
    frequency: number;
  };
  memoryGraphUpdate: string;
  ruleProposals: Array<{
    rule: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  evolutionLogEntry: string;
}

/**
 * n8n Client
 * Handles HTTP communication with n8n workflows
 */
export class N8nClient {
  private config: N8nConfig;

  constructor(config: Partial<N8nConfig> = {}) {
    this.config = {
      baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
      webhookSecret: process.env.N8N_WEBHOOK_SECRET,
      timeout: parseInt(process.env.N8N_TIMEOUT || '300000'), // 5 minutes
      retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.N8N_RETRY_DELAY || '5000'), // 5 seconds
      ...config,
    };
  }

  /**
   * Check if n8n is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Trigger deep research workflow
   *
   * @param payload - Research payload
   * @returns Research result
   */
  async triggerDeepResearch(payload: DeepResearchPayload): Promise<DeepResearchResult> {
    return this.callWebhook<DeepResearchPayload, DeepResearchResult>(
      '/webhook/deep-research',
      payload
    );
  }

  /**
   * Trigger spec validation workflow
   *
   * @param payload - Validation payload
   * @returns Validation result
   */
  async triggerSpecValidation(payload: SpecValidationPayload): Promise<SpecValidationResult> {
    return this.callWebhook<SpecValidationPayload, SpecValidationResult>(
      '/webhook/spec-validation',
      payload
    );
  }

  /**
   * Trigger code review workflow
   *
   * @param payload - Review payload
   * @returns Review result
   */
  async triggerCodeReview(payload: CodeReviewPayload): Promise<CodeReviewResult> {
    return this.callWebhook<CodeReviewPayload, CodeReviewResult>(
      '/webhook/multi-agent-review',
      payload
    );
  }

  /**
   * Trigger continuous learning workflow
   *
   * @param payload - Learning payload
   * @returns Learning result
   */
  async triggerContinuousLearning(
    payload: ContinuousLearningPayload
  ): Promise<ContinuousLearningResult> {
    return this.callWebhook<ContinuousLearningPayload, ContinuousLearningResult>(
      '/webhook/continuous-learning',
      payload
    );
  }

  /**
   * Call n8n webhook with retry logic
   *
   * @param endpoint - Webhook endpoint
   * @param payload - Request payload
   * @returns Response data
   */
  private async callWebhook<TPayload, TResult>(
    endpoint: string,
    payload: TPayload
  ): Promise<TResult> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add authentication if webhook secret is configured
        if (this.config.webhookSecret) {
          headers['Authorization'] = `Bearer ${this.config.webhookSecret}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result as TResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    throw new Error(
      `n8n webhook failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Delay execution
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): N8nConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<N8nConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Global n8n client instance
 */
let globalN8nClient: N8nClient | null = null;

/**
 * Get or create global n8n client instance
 */
export function getN8nClient(): N8nClient {
  if (!globalN8nClient) {
    globalN8nClient = new N8nClient();
  }
  return globalN8nClient;
}

/**
 * Check if n8n is available
 */
export async function isN8nAvailable(): Promise<boolean> {
  const client = getN8nClient();
  return client.isAvailable();
}

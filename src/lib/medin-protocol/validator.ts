/**
 * Validator Component
 * 
 * Performs real system checks to verify task completion claims.
 * Provides validation for Docker containers, network ports, API endpoints, and files.
 * 
 * Requirements: 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import net from 'net';
import { ValidationResult } from './types';

const execAsync = promisify(exec);

// Performance threshold in milliseconds
const PERFORMANCE_THRESHOLD = 100;

// Default timeout for validations
const DEFAULT_TIMEOUT = 5000;

// Cache for validation results (5 second TTL)
interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5000; // 5 seconds

export class Validator {
  /**
   * Validate that a Docker container is running
   * @param name - Container name or ID
   * @returns Validation result with evidence
   */
  async validateDockerContainer(name: string): Promise<ValidationResult> {
    const cacheKey = `docker:${name}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    
    try {
      const { stdout } = await this.withTimeout(
        execAsync(`docker ps --filter name=${name} --format json`),
        DEFAULT_TIMEOUT
      );

      const duration = Date.now() - startTime;
      this.logPerformanceWarning('validateDockerContainer', duration);

      if (!stdout.trim()) {
        const result: ValidationResult = {
          passed: false,
          evidence: `Container '${name}' is not running`,
          confidence: 100,
          duration,
          timestamp: new Date().toISOString(),
          error: 'Container not found in running containers',
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      const result: ValidationResult = {
        passed: true,
        evidence: `Container '${name}' is running`,
        confidence: 100,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.cacheResult(cacheKey, result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ValidationResult = {
        passed: false,
        evidence: `Failed to check Docker container '${name}'`,
        confidence: 0,
        duration,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.cacheResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Validate that a network port is listening
   * @param port - Port number
   * @param host - Host address (default: localhost)
   * @returns Validation result with evidence
   */
  async validateNetworkPort(port: number, host: string = 'localhost'): Promise<ValidationResult> {
    const cacheKey = `port:${host}:${port}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        const duration = Date.now() - startTime;
        const result: ValidationResult = {
          passed: false,
          evidence: `Port ${port} on ${host} is not listening (timeout)`,
          confidence: 90,
          duration,
          timestamp: new Date().toISOString(),
          error: 'Connection timeout',
        };
        this.cacheResult(cacheKey, result);
        resolve(result);
      }, DEFAULT_TIMEOUT);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        const duration = Date.now() - startTime;
        this.logPerformanceWarning('validateNetworkPort', duration);
        const result: ValidationResult = {
          passed: true,
          evidence: `Port ${port} on ${host} is listening`,
          confidence: 100,
          duration,
          timestamp: new Date().toISOString(),
        };
        this.cacheResult(cacheKey, result);
        resolve(result);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        socket.destroy();
        const duration = Date.now() - startTime;
        const result: ValidationResult = {
          passed: false,
          evidence: `Port ${port} on ${host} is not listening`,
          confidence: 100,
          duration,
          timestamp: new Date().toISOString(),
          error: error.message,
        };
        this.cacheResult(cacheKey, result);
        resolve(result);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Validate that an API endpoint responds successfully
   * @param url - API endpoint URL
   * @param expectedStatus - Expected HTTP status code (default: 200)
   * @returns Validation result with evidence
   */
  async validateAPIEndpoint(url: string, expectedStatus: number = 200): Promise<ValidationResult> {
    const cacheKey = `api:${url}:${expectedStatus}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      this.logPerformanceWarning('validateAPIEndpoint', duration);

      if (response.status === expectedStatus) {
        const result: ValidationResult = {
          passed: true,
          evidence: `API endpoint ${url} responded with status ${response.status}`,
          confidence: 100,
          duration,
          timestamp: new Date().toISOString(),
        };
        this.cacheResult(cacheKey, result);
        return result;
      } else {
        const result: ValidationResult = {
          passed: false,
          evidence: `API endpoint ${url} responded with status ${response.status}, expected ${expectedStatus}`,
          confidence: 100,
          duration,
          timestamp: new Date().toISOString(),
          error: `Expected status ${expectedStatus}, got ${response.status}`,
        };
        this.cacheResult(cacheKey, result);
        return result;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ValidationResult = {
        passed: false,
        evidence: `Failed to reach API endpoint ${url}`,
        confidence: 100,
        duration,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.cacheResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Validate that a file exists and is readable
   * @param path - File path
   * @returns Validation result with evidence
   */
  async validateFileExists(path: string): Promise<ValidationResult> {
    const cacheKey = `file:${path}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    try {
      await fs.access(path, fs.constants.R_OK);
      const duration = Date.now() - startTime;
      this.logPerformanceWarning('validateFileExists', duration);

      const result: ValidationResult = {
        passed: true,
        evidence: `File '${path}' exists and is readable`,
        confidence: 100,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.cacheResult(cacheKey, result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ValidationResult = {
        passed: false,
        evidence: `File '${path}' does not exist or is not readable`,
        confidence: 100,
        duration,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.cacheResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Execute custom validation function
   * @param validator - Custom validation function
   * @returns Validation result
   */
  async validateCustom(validator: () => Promise<boolean>): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const passed = await this.withTimeout(validator(), DEFAULT_TIMEOUT);
      const duration = Date.now() - startTime;
      this.logPerformanceWarning('validateCustom', duration);

      return {
        passed,
        evidence: passed ? 'Custom validation passed' : 'Custom validation failed',
        confidence: 100,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        passed: false,
        evidence: 'Custom validation threw an error',
        confidence: 0,
        duration,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute multiple validations in parallel
   * @param validations - Array of validation functions
   * @returns Array of validation results
   */
  async validateParallel(
    validations: Array<() => Promise<ValidationResult>>
  ): Promise<ValidationResult[]> {
    return Promise.all(validations.map(v => v()));
  }

  /**
   * Get cached validation result if available and not expired
   */
  private getCachedResult(key: string): ValidationResult | null {
    const cached = validationCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
      validationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache validation result
   */
  private cacheResult(key: string, result: ValidationResult): void {
    validationCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Log performance warning if validation exceeds threshold
   */
  private logPerformanceWarning(operation: string, duration: number): void {
    if (duration > PERFORMANCE_THRESHOLD) {
      console.warn(
        `[Validator] Performance warning: ${operation} took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLD}ms)`
      );
    }
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Validation timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Clear validation cache (useful for testing)
   */
  clearCache(): void {
    validationCache.clear();
  }
}

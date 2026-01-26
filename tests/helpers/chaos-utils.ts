/**
 * Chaos Testing Utilities
 * 
 * Provides utilities for introducing controlled chaos to test system resilience
 */

export interface ChaosOptions {
  maxConcurrency?: number;
  delayBetweenMs?: number;
  failureRate?: number; // 0-1, probability of injected failure
}

export class ChaosEngine {
  /**
   * Execute operations concurrently with controlled timing
   */
  async executeConcurrently<T>(
    operations: Array<() => Promise<T>>,
    options: ChaosOptions = {}
  ): Promise<Array<T | Error>> {
    const {
      maxConcurrency = operations.length,
      delayBetweenMs = 0,
      failureRate = 0
    } = options;

    // Pre-allocate results array with correct length
    const results: Array<T | Error> = new Array(operations.length);
    const executing: Array<Promise<void>> = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (!operation) {
        results[i] = new Error('Operation is undefined');
        continue;
      }

      // Inject random failure
      const shouldFail = Math.random() < failureRate;
      
      const promise = (async () => {
        try {
          if (shouldFail) {
            throw new Error('Injected chaos failure');
          }
          
          if (delayBetweenMs > 0) {
            await this.delay(Math.random() * delayBetweenMs);
          }
          
          const result = await operation();
          results[i] = result;
        } catch (error) {
          results[i] = error as Error;
        }
      })();

      executing.push(promise);

      // Limit concurrency
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const completedIndices: number[] = [];
        for (let j = 0; j < executing.length; j++) {
          const p = executing[j];
          if (p) {
            // Check if promise is settled by racing with a resolved promise
            const settled = await Promise.race([
              p.then(() => true).catch(() => true),
              Promise.resolve(false)
            ]);
            if (settled) {
              completedIndices.push(j);
            }
          }
        }
        // Remove from end to start to maintain indices
        for (let j = completedIndices.length - 1; j >= 0; j--) {
          const idx = completedIndices[j];
          if (idx !== undefined) {
            executing.splice(idx, 1);
          }
        }
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Simulate resource exhaustion
   */
  async exhaustResource(
    resourceType: 'memory' | 'fileHandles' | 'cpu',
    durationMs: number
  ): Promise<void> {
    const startTime = Date.now();

    switch (resourceType) {
      case 'memory': {
        // Allocate large arrays to consume memory
        const arrays: number[][] = [];
        while (Date.now() - startTime < durationMs) {
          try {
            arrays.push(new Array(1024 * 1024).fill(0)); // 1MB chunks
            await this.delay(10);
          } catch {
            // Out of memory - expected
            break;
          }
        }
        // Cleanup
        arrays.length = 0;
        break;
      }

      case 'fileHandles': {
        // This would require actual file operations
        // For testing, we simulate the delay
        await this.delay(durationMs);
        break;
      }

      case 'cpu': {
        // CPU-intensive operation
        const endTime = Date.now() + durationMs;
        while (Date.now() < endTime) {
          // Busy loop
          Math.sqrt(Math.random());
        }
        break;
      }
    }
  }

  /**
   * Inject random delays to expose race conditions
   */
  async withRandomDelays<T>(
    operation: () => Promise<T>,
    minDelayMs: number,
    maxDelayMs: number
  ): Promise<T> {
    const delay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
    await this.delay(delay);
    return await operation();
  }

  /**
   * Simulate file system failures
   */
  async withFileSystemChaos<T>(
    operation: () => Promise<T>,
    failureTypes: Array<'ENOENT' | 'EACCES' | 'EMFILE' | 'ENOSPC'>
  ): Promise<T> {
    // Randomly inject a failure
    if (Math.random() < 0.3 && failureTypes.length > 0) {
      const errorCode = failureTypes[Math.floor(Math.random() * failureTypes.length)];
      const error: NodeJS.ErrnoException = new Error(`Simulated file system error: ${errorCode}`);
      error.code = errorCode;
      throw error;
    }

    return await operation();
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

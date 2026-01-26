/**
 * Performance Monitoring Utilities
 * 
 * Provides utilities for measuring and tracking performance metrics
 */

export interface PerformanceBaseline {
  avgDurationMs: number;
  stdDeviation: number;
  p95DurationMs: number;
  avgMemoryMB: number;
}

export interface PerformanceMetrics {
  durationMs: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
}

export interface RegressionReport {
  hasRegression: boolean;
  durationRegressionPercent?: number;
  memoryRegressionPercent?: number;
  details: string;
}

export class PerformanceMonitor {
  /**
   * Measure execution time
   */
  async measureTime<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; durationMs: number }> {
    const startTime = Date.now();
    const result = await operation();
    const durationMs = Date.now() - startTime;

    console.log(`[${label}] Duration: ${durationMs}ms`);

    return { result, durationMs };
  }

  /**
   * Monitor memory usage during operation
   */
  async monitorMemory<T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T;
    peakMemoryMB: number;
    memoryLeakDetected: boolean;
  }> {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    let peakMemory = initialMemory;

    // Monitor memory every 100ms
    const interval = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }, 100);

    const result = await operation();

    clearInterval(interval);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    await this.delay(100); // Wait for GC

    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryLeakDetected = finalMemory > initialMemory * 1.1; // 10% threshold

    return {
      result,
      peakMemoryMB: peakMemory,
      memoryLeakDetected
    };
  }

  /**
   * Track CPU usage
   */
  async monitorCPU<T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T;
    avgCpuPercent: number;
    peakCpuPercent: number;
  }> {
    const cpuSamples: number[] = [];
    let peakCpu = 0;

    const startUsage = process.cpuUsage();

    // Sample CPU every 100ms
    const interval = setInterval(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const cpuPercent = (currentUsage.user + currentUsage.system) / 1000 / 100; // Convert to percentage
      cpuSamples.push(cpuPercent);
      if (cpuPercent > peakCpu) {
        peakCpu = cpuPercent;
      }
    }, 100);

    const result = await operation();

    clearInterval(interval);

    const avgCpu = cpuSamples.length > 0
      ? cpuSamples.reduce((sum, val) => sum + val, 0) / cpuSamples.length
      : 0;

    return {
      result,
      avgCpuPercent: avgCpu,
      peakCpuPercent: peakCpu
    };
  }

  /**
   * Establish performance baseline
   */
  async establishBaseline(
    operation: () => Promise<void>,
    iterations: number
  ): Promise<PerformanceBaseline> {
    const durations: number[] = [];
    const memoryUsages: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      await operation();

      const duration = Date.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

      durations.push(duration);
      memoryUsages.push(memoryUsage - startMemory);
    }

    // Calculate statistics
    const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const avgMemory = memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length;

    // Calculate standard deviation
    const variance = durations.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / durations.length;
    const stdDeviation = Math.sqrt(variance);

    // Calculate 95th percentile
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = sortedDurations[p95Index] || avgDuration;

    return {
      avgDurationMs: avgDuration,
      stdDeviation,
      p95DurationMs: p95Duration,
      avgMemoryMB: avgMemory
    };
  }

  /**
   * Compare against baseline
   */
  detectRegression(
    current: PerformanceMetrics,
    baseline: PerformanceBaseline
  ): RegressionReport {
    const durationRegressionPercent = ((current.durationMs - baseline.avgDurationMs) / baseline.avgDurationMs) * 100;
    const memoryRegressionPercent = ((current.memoryUsageMB - baseline.avgMemoryMB) / baseline.avgMemoryMB) * 100;

    const hasRegression = durationRegressionPercent > 20 || memoryRegressionPercent > 20; // 20% threshold

    let details = '';
    if (durationRegressionPercent > 20) {
      details += `Duration regression: ${durationRegressionPercent.toFixed(1)}% slower. `;
    }
    if (memoryRegressionPercent > 20) {
      details += `Memory regression: ${memoryRegressionPercent.toFixed(1)}% more memory. `;
    }
    if (!hasRegression) {
      details = 'No significant regression detected.';
    }

    return {
      hasRegression,
      durationRegressionPercent: durationRegressionPercent > 0 ? durationRegressionPercent : undefined,
      memoryRegressionPercent: memoryRegressionPercent > 0 ? memoryRegressionPercent : undefined,
      details
    };
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

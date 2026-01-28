/**
 * Researcher Skill - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ResearcherSkill } from '../../../src/skills/researcher';

describe('Researcher Skill - Unit Tests', () => {
  const researcher = new ResearcherSkill();

  describe('Skill Interface', () => {
    it('should implement ISkill interface', () => {
      expect(researcher.name).toBe('researcher');
      expect(researcher.description).toContain('Web search');
      expect(researcher.schema).toBeDefined();
      expect(typeof researcher.execute).toBe('function');
    });

    it('should have correct schema', () => {
      expect(researcher.schema.type).toBe('object');
      expect(researcher.schema.properties).toHaveProperty('query');
      expect(researcher.schema.properties).toHaveProperty('depth');
      expect(researcher.schema.required).toContain('query');
      expect(researcher.schema.required).toContain('depth');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty query', async () => {
      await expect(
        researcher.execute({ query: '', depth: 1 })
      ).rejects.toThrow('Query is required');
    });

    it('should reject invalid depth (too low)', async () => {
      await expect(
        researcher.execute({ query: 'test', depth: 0 })
      ).rejects.toThrow('Depth must be between 1 and 3');
    });

    it('should reject invalid depth (too high)', async () => {
      await expect(
        researcher.execute({ query: 'test', depth: 4 })
      ).rejects.toThrow('Depth must be between 1 and 3');
    });

    it('should accept valid input (depth 1)', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });
      expect(result).toBeDefined();
      expect(result.query).toBe('test');
      expect(result.depth).toBe(1);
    });

    it('should accept valid input (depth 2)', async () => {
      const result = await researcher.execute({ query: 'test', depth: 2 });
      expect(result).toBeDefined();
      expect(result.depth).toBe(2);
    });

    it('should accept valid input (depth 3)', async () => {
      const result = await researcher.execute({ query: 'test', depth: 3 });
      expect(result).toBeDefined();
      expect(result.depth).toBe(3);
    });
  });

  describe('Demo Mode Response', () => {
    it('should return demo results', async () => {
      const result = await researcher.execute({ query: 'TypeScript', depth: 1 });

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].title).toBeDefined();
    });

    it('should return more results for higher depth', async () => {
      const depth1 = await researcher.execute({ query: 'test', depth: 1 });
      const depth3 = await researcher.execute({ query: 'test', depth: 3 });

      expect(depth3.results.length).toBeGreaterThan(depth1.results.length);
    });

    it('should include summary', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });

      expect(result.summary).toBeDefined();
      expect(result.summary).toContain('DEMO MODE');
    });

    it('should include sources', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });

      expect(result.sources).toBeDefined();
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.sources[0]).toContain('http');
    });
  });

  describe('Output Structure', () => {
    it('should return correct output structure', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('depth');
    });

    it('should have correct result structure', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });
      const firstResult = result.results[0];

      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('url');
      expect(firstResult).toHaveProperty('snippet');
      expect(firstResult).toHaveProperty('relevance');
    });

    it('should have relevance scores between 0-100', async () => {
      const result = await researcher.execute({ query: 'test', depth: 1 });

      result.results.forEach((r) => {
        expect(r.relevance).toBeGreaterThanOrEqual(0);
        expect(r.relevance).toBeLessThanOrEqual(100);
      });
    });
  });
});

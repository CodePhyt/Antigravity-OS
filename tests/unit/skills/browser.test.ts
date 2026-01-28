/**
 * Browser Skill - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BrowserSkill } from '../../../src/skills/browser.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as { get: Mock };

describe('BrowserSkill', () => {
  let browser: BrowserSkill;

  beforeEach(() => {
    browser = new BrowserSkill();
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have correct name and description', () => {
      expect(browser.name).toBe('browser');
      expect(browser.description).toContain('Fetch and parse');
    });

    it('should have valid schema', () => {
      expect(browser.schema).toHaveProperty('type', 'object');
      expect(browser.schema).toHaveProperty('properties');
      expect(browser.schema).toHaveProperty('required');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty URL', async () => {
      await expect(browser.execute({ url: '' })).rejects.toThrow('URL is required');
    });

    it('should reject invalid timeout', async () => {
      await expect(browser.execute({ url: 'https://example.com', timeout: 500 })).rejects.toThrow(
        'Timeout must be between'
      );
    });

    it('should reject invalid maxSize', async () => {
      await expect(browser.execute({ url: 'https://example.com', maxSize: 500 })).rejects.toThrow(
        'Max size must be between'
      );
    });
  });

  describe('SSRF Protection', () => {
    it('should block localhost', async () => {
      await expect(browser.execute({ url: 'http://localhost:3000' })).rejects.toThrow('SSRF protection');
    });

    it('should block 127.0.0.1', async () => {
      await expect(browser.execute({ url: 'http://127.0.0.1:8080' })).rejects.toThrow('SSRF protection');
    });

    it('should block private IP 192.168.x.x', async () => {
      await expect(browser.execute({ url: 'http://192.168.1.1' })).rejects.toThrow('SSRF protection');
    });

    it('should block private IP 10.x.x.x', async () => {
      await expect(browser.execute({ url: 'http://10.0.0.1' })).rejects.toThrow('SSRF protection');
    });

    it('should block private IP 172.16-31.x.x', async () => {
      await expect(browser.execute({ url: 'http://172.16.0.1' })).rejects.toThrow('SSRF protection');
    });

    it('should reject non-HTTP protocols', async () => {
      await expect(browser.execute({ url: 'file:///etc/passwd' })).rejects.toThrow('Invalid URL');
    });

    it('should allow valid public URLs', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><head><title>Test</title></head><body><p>Content</p></body></html>',
      });

      const result = await browser.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
    });
  });

  describe('Content Fetching', () => {
    it('should fetch and parse HTML', async () => {
      const mockHtml = '<html><head><title>Test Page</title></head><body><h1>Hello</h1><p>World</p></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await browser.execute({ url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test Page');
      expect(result.content).toContain('Hello');
      expect(result.content).toContain('World');
      expect(result.html).toBe(mockHtml);
    });

    it('should extract links', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="https://example.com/page1">Link 1</a>
            <a href="/page2">Link 2</a>
            <a href="https://example.com/page3">Link 3</a>
          </body>
        </html>
      `;
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await browser.execute({ url: 'https://example.com' });

      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://example.com/page2');
      expect(result.links).toContain('https://example.com/page3');
    });

    it('should remove script and style tags', async () => {
      const mockHtml = `
        <html>
          <head>
            <style>body { color: red; }</style>
          </head>
          <body>
            <p>Visible content</p>
            <script>alert('test');</script>
          </body>
        </html>
      `;
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await browser.execute({ url: 'https://example.com' });

      expect(result.content).toContain('Visible content');
      expect(result.content).not.toContain('alert');
      expect(result.content).not.toContain('color: red');
    });

    it('should use custom timeout', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<html><body>Test</body></html>' });

      await browser.execute({ url: 'https://example.com', timeout: 10000 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should set User-Agent header', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<html><body>Test</body></html>' });

      await browser.execute({ url: 'https://example.com' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Chrome'),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw SkillExecutionError on network failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(browser.execute({ url: 'https://example.com' })).rejects.toThrow('Browser execution failed');
    });

    it('should handle invalid HTML gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: 'Not valid HTML <<>>' });

      const result = await browser.execute({ url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });
  });
});

/**
 * Property 16: Authentication Integration
 * 
 * For any request to the Brain_API, if the user is not authenticated, the request should be rejected
 * with a 401 status code, and if authenticated, the request should proceed normally.
 * 
 * **Validates: Requirements 10.3**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';

describe('Property 16: Authentication Integration', () => {
  const apiUrl = 'http://localhost:3000/api/system/brain';
  
  // Store original env var
  let originalApiKey: string | undefined;
  
  beforeAll(() => {
    originalApiKey = process.env.BRAIN_API_KEY;
  });
  
  afterAll(() => {
    // Restore original env var
    if (originalApiKey) {
      process.env.BRAIN_API_KEY = originalApiKey;
    } else {
      delete process.env.BRAIN_API_KEY;
    }
  });

  it('should reject unauthenticated requests when API key is configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // Random API key
        async (apiKey) => {
          // Set API key requirement
          process.env.BRAIN_API_KEY = apiKey;
          
          // Make request without authentication
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
            },
          });
          
          // Should return 401 Unauthorized
          expect(response.status).toBe(401);
          
          // Should have WWW-Authenticate header
          const wwwAuth = response.headers.get('www-authenticate');
          expect(wwwAuth).toBeTruthy();
          expect(wwwAuth).toContain('Bearer');
          
          // Should return JSON error
          const contentType = response.headers.get('content-type');
          expect(contentType).toContain('application/json');
          
          const body = await response.json();
          expect(body.error).toBe('Unauthorized');
          expect(body.code).toBe('AUTH_REQUIRED');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept authenticated requests with valid API key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // Random API key
        async (apiKey) => {
          // Set API key requirement
          process.env.BRAIN_API_KEY = apiKey;
          
          // Make request with valid authentication
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Authorization': `Bearer ${apiKey}`,
            },
          });
          
          // Should return 200 OK (or start streaming)
          expect(response.status).toBe(200);
          
          // Should have SSE content type
          const contentType = response.headers.get('content-type');
          expect(contentType).toContain('text/event-stream');
          
          // Close the stream
          await response.body?.cancel();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject requests with invalid API key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // Valid API key
        fc.string({ minLength: 16, maxLength: 64 }), // Invalid API key
        async (validKey, invalidKey) => {
          // Ensure keys are different
          fc.pre(validKey !== invalidKey);
          
          // Set API key requirement
          process.env.BRAIN_API_KEY = validKey;
          
          // Make request with invalid authentication
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Authorization': `Bearer ${invalidKey}`,
            },
          });
          
          // Should return 401 Unauthorized
          expect(response.status).toBe(401);
          
          const body = await response.json();
          expect(body.error).toBe('Unauthorized');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow access when no API key is configured (development mode)', async () => {
    // Remove API key requirement
    delete process.env.BRAIN_API_KEY;
    
    // Make request without authentication
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });
    
    // Should return 200 OK (development mode allows access)
    expect(response.status).toBe(200);
    
    // Should have SSE content type
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('text/event-stream');
    
    // Close the stream
    await response.body?.cancel();
  });

  it('should support both Bearer and direct token formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // API key
        fc.boolean(), // Use Bearer prefix or not
        async (apiKey, useBearer) => {
          // Set API key requirement
          process.env.BRAIN_API_KEY = apiKey;
          
          // Make request with authentication
          const authHeader = useBearer ? `Bearer ${apiKey}` : apiKey;
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Authorization': authHeader,
            },
          });
          
          // Should return 200 OK for both formats
          expect(response.status).toBe(200);
          
          // Close the stream
          await response.body?.cancel();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consistently reject unauthenticated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // API key
        fc.integer({ min: 1, max: 5 }), // Number of attempts
        async (apiKey, attempts) => {
          // Set API key requirement
          process.env.BRAIN_API_KEY = apiKey;
          
          // Make multiple unauthenticated requests
          const responses = await Promise.all(
            Array.from({ length: attempts }, () =>
              fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'text/event-stream',
                },
              })
            )
          );
          
          // All should return 401
          responses.forEach(response => {
            expect(response.status).toBe(401);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify authentication before streaming data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 16, maxLength: 64 }), // API key
        async (apiKey) => {
          // Set API key requirement
          process.env.BRAIN_API_KEY = apiKey;
          
          // Make unauthenticated request
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
            },
          });
          
          // Should reject immediately (not start streaming)
          expect(response.status).toBe(401);
          
          // Should return JSON error (not SSE stream)
          const contentType = response.headers.get('content-type');
          expect(contentType).toContain('application/json');
          expect(contentType).not.toContain('text/event-stream');
        }
      ),
      { numRuns: 100 }
    );
  });
});

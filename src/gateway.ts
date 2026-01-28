#!/usr/bin/env node
/**
 * Antigravity OS - High-Performance Gateway
 * 
 * Persistent Node.js process that keeps test workers warm and provides
 * sub-5s feedback loops for autonomous iteration.
 * 
 * Architecture: Lightweight HTTP server with command execution endpoints.
 * Fallback: CLI can execute directly if Gateway unavailable.
 * 
 * @module gateway
 */

import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const DEFAULT_PORT = 3000;
const FALLBACK_PORT = 3001;
const STARTUP_TIME = Date.now();

// Server state
let server: http.Server | null = null;
let currentPort: number = DEFAULT_PORT;

/**
 * Health check response
 */
interface HealthResponse {
  status: 'active';
  uptime: number;
  port: number;
  version: string;
}

/**
 * Test command request
 */
interface TestCommandRequest {
  targetFile?: string;
  mode?: 'quick' | 'full';
}

/**
 * Test command response
 */
interface TestCommandResponse {
  success: boolean;
  output: string;
  duration: number;
  exitCode: number;
}

/**
 * Error response
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Parse JSON body from request
 */
function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJSON(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Handle health check endpoint
 * GET /health
 */
function handleHealth(
  _req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  const uptime = Date.now() - STARTUP_TIME;
  const response: HealthResponse = {
    status: 'active',
    uptime,
    port: currentPort,
    version: '1.0.0',
  };
  sendJSON(res, 200, response);
}

/**
 * Handle test command endpoint
 * POST /cmd/test
 */
async function handleTestCommand(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  try {
    const body = (await parseBody(req)) as TestCommandRequest;
    const startTime = Date.now();

    // Build vitest command
    let command = 'npm test';
    if (body.targetFile) {
      command = `npx vitest run ${body.targetFile}`;
    } else if (body.mode === 'quick') {
      // Quick mode: run only unit tests
      command = 'npx vitest run tests/unit';
    }

    // Execute command
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    const duration = Date.now() - startTime;
    const response: TestCommandResponse = {
      success: true,
      output: stdout + stderr,
      duration,
      exitCode: 0,
    };

    sendJSON(res, 200, response);
  } catch (error) {
    const duration = Date.now() - Date.now();
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    
    const response: TestCommandResponse = {
      success: false,
      output: (execError.stdout || '') + (execError.stderr || ''),
      duration,
      exitCode: execError.code || 1,
    };

    sendJSON(res, 200, response); // Still 200, but success: false
  }
}

/**
 * Handle status endpoint
 * GET /status
 */
function handleStatus(
  _req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  const response = {
    gateway: 'active',
    uptime: Date.now() - STARTUP_TIME,
    endpoints: [
      'GET /health',
      'GET /status',
      'POST /cmd/test',
    ],
  };
  sendJSON(res, 200, response);
}

/**
 * Main request handler
 */
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const { method, url } = req;

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  if (method === 'GET' && url === '/health') {
    handleHealth(req, res);
  } else if (method === 'GET' && url === '/status') {
    handleStatus(req, res);
  } else if (method === 'POST' && url === '/cmd/test') {
    await handleTestCommand(req, res);
  } else {
    const error: ErrorResponse = {
      error: 'Not Found',
      details: `${method} ${url} is not a valid endpoint`,
    };
    sendJSON(res, 404, error);
  }
}

/**
 * Start the Gateway server
 */
function startGateway(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      handleRequest(req, res).catch((error) => {
        console.error('Request handler error:', error);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          details: error instanceof Error ? error.message : String(error),
        };
        sendJSON(res, 500, errorResponse);
      });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        if (port === DEFAULT_PORT) {
          console.log(`Trying fallback port ${FALLBACK_PORT}...`);
          currentPort = FALLBACK_PORT;
          startGateway(FALLBACK_PORT).then(resolve).catch(reject);
        } else {
          reject(new Error('Both default and fallback ports are in use'));
        }
      } else {
        reject(error);
      }
    });

    server.listen(port, () => {
      currentPort = port;
      console.log(`🚀 Antigravity Gateway ACTIVE on port ${port}`);
      console.log(`   Health: http://localhost:${port}/health`);
      console.log(`   Status: http://localhost:${port}/status`);
      console.log(`   Test:   POST http://localhost:${port}/cmd/test`);
      resolve();
    });
  });
}

/**
 * Graceful shutdown
 */
function shutdown(): void {
  console.log('\n🛑 Shutting down Gateway...');
  if (server) {
    server.close(() => {
      console.log('✅ Gateway stopped');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the Gateway
if (require.main === module) {
  startGateway(DEFAULT_PORT).catch((error) => {
    console.error('Failed to start Gateway:', error);
    process.exit(1);
  });
}

// Export for testing
export { startGateway, handleRequest };

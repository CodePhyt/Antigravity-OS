/**
 * Brain API Route - Server-Sent Events Endpoint
 * 
 * Streams real-time agent activity and PRD status updates to connected clients.
 * Implements Requirements 1.1, 1.2, 1.4, 10.3 from Ralph's Brain View spec.
 * 
 * Architecture: Tools Layer (A.N.T. Framework)
 * - Provides SSE streaming capability
 * - Integrates with FileWatcherService for real-time updates
 * - Manages connection lifecycle and cleanup
 * - Implements authentication middleware (Requirement 10.3)
 */

import { NextRequest } from 'next/server';
import { FileWatcherService } from '@/lib/services/file-watcher';
import { ActivityLogParser, ActivityEntry } from '@/lib/parsers/activity-log-parser';
import { PRDParser, PRDStatus } from '@/lib/parsers/prd-parser';
import { join } from 'path';

// Force dynamic rendering for SSE endpoint
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check authentication for Brain API access
 * 
 * Implements Requirement 10.3: Authentication Integration
 * 
 * Current implementation: Optional API key check
 * Future: Integrate with existing auth mechanisms (JWT, session, etc.)
 * 
 * @param request - Next.js request object
 * @returns true if authenticated, false otherwise
 */
function checkAuthentication(request: NextRequest): boolean {
  // Check for API key in environment (optional for development)
  const requiredApiKey = process.env.BRAIN_API_KEY;
  
  // If no API key is configured, allow access (development mode)
  if (!requiredApiKey) {
    return true;
  }
  
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer <token>" and direct token formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;
  
  // Validate token matches configured API key
  return token === requiredApiKey;
}

/**
 * Brain event types for SSE streaming
 */
type BrainEventType = 'activity' | 'prd_update' | 'correction' | 'heartbeat' | 'initial_state';

/**
 * Brain event structure sent via SSE
 */
interface BrainEvent {
  type: BrainEventType;
  timestamp: string;
  data: ActivityEntry[] | PRDStatus | null;
}

/**
 * Initial brain state sent on connection
 */
interface BrainState {
  activities: ActivityEntry[];
  prdStatus: PRDStatus;
}

/**
 * Get current brain state by parsing both files
 * 
 * @returns Current state with activities and PRD status
 */
async function getBrainState(): Promise<BrainState> {
  const activityLogPath = join(process.cwd(), 'docs', 'ACTIVITY_LOG.md');
  const prdPath = join(process.cwd(), 'docs', 'PRD.md');

  try {
    const [activities, prdStatus] = await Promise.all([
      ActivityLogParser.parse(activityLogPath),
      PRDParser.parse(prdPath),
    ]);

    return { activities, prdStatus };
  } catch (error) {
    // Graceful error handling - return empty state if files don't exist
    console.error('[Brain API] Error getting brain state:', error);
    return {
      activities: [],
      prdStatus: {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        completionPercentage: 0,
        tasks: [],
      },
    };
  }
}

/**
 * Format SSE message according to spec
 * 
 * @param event - Brain event to format
 * @returns Formatted SSE message string
 */
function formatSSEMessage(event: BrainEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * GET /api/system/brain
 * 
 * Server-Sent Events endpoint that streams real-time brain activity.
 * 
 * Authentication: Checks for optional API key (Requirement 10.3)
 * - Returns 401 if authentication fails
 * - Allows access if no API key is configured (development mode)
 * 
 * Response Format: text/event-stream
 * Events:
 * - initial_state: Sent immediately on connection
 * - activity: New activity log entries
 * - prd_update: PRD status changes
 * - heartbeat: Keep-alive every 30 seconds
 * 
 * Connection Management:
 * - Automatic cleanup on client disconnect
 * - File watcher cleanup on abort
 * - Heartbeat to prevent timeout
 * 
 * @param request - Next.js request object
 * @returns ReadableStream with SSE format or 401 Unauthorized
 */
export async function GET(request: NextRequest): Promise<Response> {
  // Check authentication (Requirement 10.3)
  if (!checkAuthentication(request)) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required to access Brain API',
        code: 'AUTH_REQUIRED',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="Brain API"',
        },
      }
    );
  }

  const encoder = new TextEncoder();

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let watcher: FileWatcherService | null = null;

      try {
        // Send initial state immediately
        const initialState = await getBrainState();
        const initialEvent: BrainEvent = {
          type: 'initial_state',
          timestamp: new Date().toISOString(),
          data: initialState as any, // Combined state
        };
        controller.enqueue(encoder.encode(formatSSEMessage(initialEvent)));

        // Set up file watchers for real-time updates
        const activityLogPath = join(process.cwd(), 'docs', 'ACTIVITY_LOG.md');
        const prdPath = join(process.cwd(), 'docs', 'PRD.md');
        
        watcher = new FileWatcherService(activityLogPath, prdPath);

        // Listen for activity log changes
        watcher.on('activity', (activities: ActivityEntry[]) => {
          const event: BrainEvent = {
            type: 'activity',
            timestamp: new Date().toISOString(),
            data: activities,
          };
          controller.enqueue(encoder.encode(formatSSEMessage(event)));
        });

        // Listen for PRD changes
        watcher.on('prd', (prdStatus: PRDStatus) => {
          const event: BrainEvent = {
            type: 'prd_update',
            timestamp: new Date().toISOString(),
            data: prdStatus,
          };
          controller.enqueue(encoder.encode(formatSSEMessage(event)));
        });

        // Listen for errors
        watcher.on('error', (error: any) => {
          console.error('[Brain API] File watcher error:', error);
          // Don't close connection on watcher errors, just log them
        });

        // Start watching
        watcher.start();

        // Set up heartbeat every 30 seconds
        heartbeatInterval = setInterval(() => {
          try {
            const heartbeatEvent: BrainEvent = {
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
              data: null,
            };
            controller.enqueue(encoder.encode(formatSSEMessage(heartbeatEvent)));
          } catch (error) {
            // Client disconnected, cleanup will happen in abort handler
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }
        }, 30000);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('[Brain API] Client disconnected, cleaning up resources');
          
          // Clear heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          // Close file watcher
          if (watcher) {
            watcher.close();
            watcher = null;
          }

          // Close stream
          try {
            controller.close();
          } catch (error) {
            // Stream already closed
          }
        });

      } catch (error) {
        console.error('[Brain API] Error in stream setup:', error);
        
        // Cleanup on error
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        if (watcher) {
          watcher.close();
        }

        // Send error event
        const errorEvent: BrainEvent = {
          type: 'activity',
          timestamp: new Date().toISOString(),
          data: [{
            id: 'error',
            timestamp: new Date().toISOString(),
            message: 'Brain API error: ' + (error as Error).message,
            level: 'error',
          }],
        };
        controller.enqueue(encoder.encode(formatSSEMessage(errorEvent)));
        controller.close();
      }
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

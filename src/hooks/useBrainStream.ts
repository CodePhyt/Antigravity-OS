/**
 * useBrainStream Hook
 * 
 * React hook for consuming the Brain API's Server-Sent Events stream.
 * Implements Requirements 1.1, 1.2, 8.3 from Ralph's Brain View spec.
 * 
 * Features:
 * - Real-time activity stream from ACTIVITY_LOG.md
 * - PRD task status updates
 * - Auto-reconnection with exponential backoff
 * - Graceful error handling
 * - Resource cleanup on unmount
 * - Memory bounds: Limits activity storage to 100 entries (Requirement 7.1)
 */

import { useEffect, useReducer, useRef } from 'react';

/** Maximum number of activities to store in memory (Requirement 7.1) */
const MAX_ACTIVITIES = 100;

/**
 * Activity entry from ACTIVITY_LOG.md
 */
export interface ActivityEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error' | 'correction';
}

/**
 * Task from PRD
 */
export interface Task {
  id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: number;
  dependencies: string[];
}

/**
 * PRD task status
 */
export interface PRDStatus {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
  tasks: Task[];
}

/**
 * Brain stream state
 */
export interface BrainStreamState {
  activities: ActivityEntry[];
  prdStatus: PRDStatus | null;
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Brain stream actions
 */
type BrainStreamAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'ERROR'; payload: string }
  | { type: 'ACTIVITY'; payload: ActivityEntry[] }
  | { type: 'PRD_UPDATE'; payload: PRDStatus }
  | { type: 'CORRECTION'; payload: ActivityEntry }
  | { type: 'RECONNECT_ATTEMPT'; payload: number };

/**
 * Initial state
 */
const initialState: BrainStreamState = {
  activities: [],
  prdStatus: null,
  isConnected: false,
  error: null,
  reconnectAttempts: 0,
};

/**
 * Reducer for brain stream state management
 */
function brainStreamReducer(
  state: BrainStreamState,
  action: BrainStreamAction
): BrainStreamState {
  switch (action.type) {
    case 'CONNECTED':
      return {
        ...state,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

    case 'DISCONNECTED':
      return {
        ...state,
        isConnected: false,
      };

    case 'ERROR':
      return {
        ...state,
        isConnected: false,
        error: action.payload,
      };

    case 'ACTIVITY':
      // Apply memory bounds: limit to MAX_ACTIVITIES (100) most recent
      return {
        ...state,
        activities: action.payload.slice(-MAX_ACTIVITIES),
      };

    case 'PRD_UPDATE':
      return {
        ...state,
        prdStatus: action.payload,
      };

    case 'CORRECTION':
      // Add correction event to activities with memory bounds
      const updatedActivities = [...state.activities, action.payload];
      return {
        ...state,
        activities: updatedActivities.slice(-MAX_ACTIVITIES),
      };

    case 'RECONNECT_ATTEMPT':
      return {
        ...state,
        reconnectAttempts: action.payload,
      };

    default:
      return state;
  }
}

/**
 * Calculate exponential backoff delay
 * 
 * @param attempt - Current reconnection attempt number
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay;
}

/**
 * useBrainStream Hook
 * 
 * Connects to the Brain API and streams real-time updates.
 * Implements auto-reconnection with exponential backoff.
 * 
 * @returns Brain stream state and connection status
 */
export function useBrainStream(): BrainStreamState {
  const [state, dispatch] = useReducer(brainStreamReducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    function connect() {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      try {
        // Create new EventSource connection
        const eventSource = new EventSource('/api/system/brain');
        eventSourceRef.current = eventSource;

        // Connection opened
        eventSource.onopen = () => {
          if (isMountedRef.current) {
            dispatch({ type: 'CONNECTED' });
          }
        };

        // Handle activity events
        eventSource.addEventListener('activity', (event) => {
          if (isMountedRef.current) {
            try {
              const activities = JSON.parse(event.data) as ActivityEntry[];
              dispatch({ type: 'ACTIVITY', payload: activities });
            } catch (error) {
              console.error('[useBrainStream] Failed to parse activity event:', error);
            }
          }
        });

        // Handle PRD update events
        eventSource.addEventListener('prd_update', (event) => {
          if (isMountedRef.current) {
            try {
              const prdStatus = JSON.parse(event.data) as PRDStatus;
              dispatch({ type: 'PRD_UPDATE', payload: prdStatus });
            } catch (error) {
              console.error('[useBrainStream] Failed to parse prd_update event:', error);
            }
          }
        });

        // Handle correction events
        eventSource.addEventListener('correction', (event) => {
          if (isMountedRef.current) {
            try {
              const correction = JSON.parse(event.data) as ActivityEntry;
              dispatch({ type: 'CORRECTION', payload: correction });
            } catch (error) {
              console.error('[useBrainStream] Failed to parse correction event:', error);
            }
          }
        });

        // Handle errors
        eventSource.onerror = (error) => {
          console.error('[useBrainStream] EventSource error:', error);
          
          if (isMountedRef.current) {
            dispatch({ type: 'DISCONNECTED' });

            // Attempt reconnection with exponential backoff
            const nextAttempt = state.reconnectAttempts + 1;
            const delay = calculateBackoffDelay(nextAttempt);

            dispatch({ type: 'RECONNECT_ATTEMPT', payload: nextAttempt });

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                console.log(`[useBrainStream] Reconnecting (attempt ${nextAttempt})...`);
                connect();
              }
            }, delay);
          }

          // Close the failed connection
          eventSource.close();
        };
      } catch (error) {
        console.error('[useBrainStream] Failed to create EventSource:', error);
        if (isMountedRef.current) {
          dispatch({
            type: 'ERROR',
            payload: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - connect once on mount

  return state;
}

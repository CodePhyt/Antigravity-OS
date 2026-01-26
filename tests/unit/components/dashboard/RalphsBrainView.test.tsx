/**
 * Unit Tests for RalphsBrainView Component
 * 
 * Tests the dashboard component rendering and layout.
 * Validates: Requirements 6.1, 8.5
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RalphsBrainView } from '@/components/dashboard/RalphsBrainView';
import type { BrainStreamState } from '@/hooks/useBrainStream';

// Mock the useBrainStream hook
vi.mock('@/hooks/useBrainStream', () => ({
  useBrainStream: vi.fn(),
}));

import { useBrainStream } from '@/hooks/useBrainStream';

describe('RalphsBrainView - Unit Tests', () => {
  const mockUseBrainStream = useBrainStream as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without errors', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: false,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      const { container } = render(<RalphsBrainView />);
      expect(container).toBeTruthy();
    });

    it('should display the title', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: false,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText("Ralph's Brain View")).toBeTruthy();
    });

    it('should display connection status indicator', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('CONNECTED')).toBeTruthy();
    });

    it('should display disconnected status when not connected', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: false,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('DISCONNECTED')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: false,
        error: 'Connection failed',
        reconnectAttempts: 1,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText(/Connection Error/)).toBeTruthy();
      expect(screen.getByText(/Connection failed/)).toBeTruthy();
    });

    it('should not display error message when no error', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.queryByText(/Connection Error/)).toBeNull();
    });
  });

  describe('Layout Structure', () => {
    it('should have Thinking Stream section', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Thinking Stream')).toBeTruthy();
    });

    it('should have Task Progress section', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Task Progress')).toBeTruthy();
    });

    it('should display waiting message when no activities', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Waiting for activity...')).toBeTruthy();
    });

    it('should display loading message when no PRD status', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Loading task status...')).toBeTruthy();
    });
  });

  describe('Activity Display', () => {
    it('should display activities when present', () => {
      const mockState: BrainStreamState = {
        activities: [
          {
            id: '1',
            timestamp: '2026-01-22T10:00:00Z',
            message: 'Test activity message',
            level: 'info',
          },
        ],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Test activity message')).toBeTruthy();
    });

    it('should display multiple activities', () => {
      const mockState: BrainStreamState = {
        activities: [
          {
            id: '1',
            timestamp: '2026-01-22T10:00:00Z',
            message: 'First activity',
            level: 'info',
          },
          {
            id: '2',
            timestamp: '2026-01-22T10:01:00Z',
            message: 'Second activity',
            level: 'success',
          },
        ],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('First activity')).toBeTruthy();
      expect(screen.getByText('Second activity')).toBeTruthy();
    });
  });

  describe('PRD Status Display', () => {
    it('should display PRD statistics when available', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: {
          totalTasks: 10,
          completedTasks: 5,
          inProgressTasks: 2,
          completionPercentage: 50,
          tasks: [],
        },
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy(); // Total tasks
      expect(screen.getByText('5')).toBeTruthy(); // Completed
      expect(screen.getByText('2')).toBeTruthy(); // In progress
    });

    it('should calculate remaining tasks correctly', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: {
          totalTasks: 10,
          completedTasks: 5,
          inProgressTasks: 2,
          completionPercentage: 50,
          tasks: [],
        },
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      // Remaining = 10 - 5 - 2 = 3
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('should display completion message when 100% complete', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: {
          totalTasks: 10,
          completedTasks: 10,
          inProgressTasks: 0,
          completionPercentage: 100,
          tasks: [],
        },
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('All tasks complete!')).toBeTruthy();
    });

    it('should display executing message when tasks in progress', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: {
          totalTasks: 10,
          completedTasks: 5,
          inProgressTasks: 2,
          completionPercentage: 50,
          tasks: [],
        },
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      render(<RalphsBrainView />);
      expect(screen.getByText('Executing tasks...')).toBeTruthy();
    });
  });

  describe('Glassmorphism Styles', () => {
    it('should apply glassmorphism design', () => {
      const mockState: BrainStreamState = {
        activities: [],
        prdStatus: null,
        isConnected: true,
        error: null,
        reconnectAttempts: 0,
      };

      mockUseBrainStream.mockReturnValue(mockState);

      const { container } = render(<RalphsBrainView />);
      
      // Check for gradient background
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('bg-gradient-to-br');
    });
  });
});

'use client';

import React, { useEffect, useRef } from 'react';
import type { ActivityEntry } from '@/hooks/useBrainStream';

interface ThinkingStreamProps {
  activities: ActivityEntry[];
}

/**
 * ThinkingStream Component
 * 
 * Terminal-style scrolling area that displays activity entries from Ralph's Brain.
 * Features:
 * - Auto-scroll to latest entry with smooth animation
 * - Color-coded entries by level (cyan, emerald, rose)
 * - JetBrains Mono font for terminal aesthetic
 * - Glassmorphism styling
 * - Optimized with React.memo to prevent unnecessary re-renders
 * 
 * **Validates: Requirements 3.1, 3.2, 7.5**
 */
export const ThinkingStream = React.memo(function ThinkingStream({ activities }: ThinkingStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevActivitiesLengthRef = useRef(activities.length);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (activities.length > prevActivitiesLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevActivitiesLengthRef.current = activities.length;
  }, [activities]);

  /**
   * Get color class based on activity level
   */
  const getLevelColor = (level: ActivityEntry['level']): string => {
    switch (level) {
      case 'info':
        return 'text-cyan-400'; // Cyan for info
      case 'success':
        return 'text-emerald-400'; // Emerald for success
      case 'error':
        return 'text-rose-400'; // Rose for error
      case 'correction':
        return 'text-amber-400'; // Amber for correction
      default:
        return 'text-gray-400';
    }
  };

  /**
   * Get icon based on activity level
   */
  const getLevelIcon = (level: ActivityEntry['level']): string => {
    switch (level) {
      case 'info':
        return '→';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'correction':
        return '⚡';
      default:
        return '•';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Thinking Stream</h3>
        <span className="text-xs text-gray-400">
          {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Terminal-style scrolling area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-black/30 rounded-lg p-4 backdrop-blur-sm border border-white/10"
        style={{
          fontFamily: '"JetBrains Mono", "Courier New", monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        role="log"
        aria-live="polite"
        aria-label="Activity stream"
      >
        {activities.length === 0 ? (
          <div className="text-gray-500 italic">
            Waiting for activity...
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-start gap-2 ${getLevelColor(activity.level)}`}
              >
                {/* Icon */}
                <span className="flex-shrink-0 w-4 text-center" aria-hidden="true">
                  {getLevelIcon(activity.level)}
                </span>

                {/* Timestamp */}
                <span className="flex-shrink-0 text-gray-500 text-xs">
                  {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </span>

                {/* Message */}
                <span className="flex-1 break-words">
                  {activity.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

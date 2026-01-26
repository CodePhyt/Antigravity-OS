'use client';

import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type IndicatorStatus = 'idle' | 'thinking' | 'success' | 'error' | 'correction';

interface NeonIndicatorProps {
  status: IndicatorStatus;
}

/**
 * NeonIndicator Component
 * 
 * Displays color-coded status indicator with pulsing animation.
 * Features:
 * - Cyan for thinking state
 * - Emerald for success state
 * - Rose for error state
 * - Amber for correction state
 * - Gray for idle state
 * - Pulsing animation for active states (respects prefers-reduced-motion)
 * - Text label for accessibility
 * - Optimized with React.memo to prevent unnecessary re-renders
 * 
 * **Validates: Requirements 3.4, 7.5, 9.3, 9.4**
 */
export const NeonIndicator = React.memo(function NeonIndicator({ status }: NeonIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  /**
   * Get color classes based on status
   */
  const getColorClasses = (): string => {
    switch (status) {
      case 'thinking':
        return 'bg-cyan-400 shadow-cyan-400/50';
      case 'success':
        return 'bg-emerald-400 shadow-emerald-400/50';
      case 'error':
        return 'bg-rose-400 shadow-rose-400/50';
      case 'correction':
        return 'bg-amber-400 shadow-amber-400/50';
      case 'idle':
      default:
        return 'bg-slate-500 shadow-slate-500/50';
    }
  };

  /**
   * Get text color based on status
   */
  const getTextColor = (): string => {
    switch (status) {
      case 'thinking':
        return 'text-cyan-400';
      case 'success':
        return 'text-emerald-400';
      case 'error':
        return 'text-rose-400';
      case 'correction':
        return 'text-amber-400';
      case 'idle':
      default:
        return 'text-slate-400';
    }
  };

  /**
   * Get status label text
   */
  const getStatusLabel = (): string => {
    switch (status) {
      case 'thinking':
        return 'Thinking';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'correction':
        return 'Correcting';
      case 'idle':
      default:
        return 'Idle';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (): string => {
    switch (status) {
      case 'thinking':
        return '◉';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'correction':
        return '⚡';
      case 'idle':
      default:
        return '○';
    }
  };

  /**
   * Determine if status should pulse
   * Respects prefers-reduced-motion setting
   */
  const shouldPulse = (): boolean => {
    if (prefersReducedMotion) return false;
    return status === 'thinking' || status === 'correction';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Neon indicator dot */}
      <div className="relative">
        <div
          className={`
            w-3 h-3 rounded-full
            ${getColorClasses()}
            ${shouldPulse() ? 'animate-pulse' : ''}
            shadow-lg
          `}
          role="status"
          aria-label={`Status: ${getStatusLabel()}`}
        />
        
        {/* Outer glow ring for active states */}
        {shouldPulse() && (
          <div
            className={`
              absolute inset-0 w-3 h-3 rounded-full
              ${getColorClasses()}
              animate-ping opacity-75
            `}
          />
        )}
      </div>

      {/* Status label with icon */}
      <div className={`flex items-center gap-2 ${getTextColor()} font-medium text-sm`}>
        <span aria-hidden="true">{getStatusIcon()}</span>
        <span>{getStatusLabel()}</span>
      </div>
    </div>
  );
});

'use client';

import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ProgressBarProps {
  percentage: number;
  completed: number;
  total: number;
}

/**
 * ProgressBar Component
 * 
 * Displays task completion progress with animated progress bar.
 * Features:
 * - Animated progress bar fill with neon emerald color (respects prefers-reduced-motion)
 * - Displays completion percentage
 * - Shows completed/total task counts
 * - Glassmorphism styling
 * - Optimized with React.memo to prevent unnecessary re-renders
 * 
 * **Validates: Requirements 3.3, 7.5, 9.4**
 */
export const ProgressBar = React.memo(function ProgressBar({ percentage, completed, total }: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className="space-y-3">
      {/* Progress stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300 font-medium">
          {completed} of {total} tasks completed
        </span>
        <span className="text-emerald-400 font-bold text-lg">
          {percentage}%
        </span>
      </div>

      {/* Progress bar container */}
      <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
        {/* Progress bar fill */}
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-500 ease-out'}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Task completion: ${percentage}%`}
        >
          {/* Animated glow effect */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Milestone indicators */}
      {percentage === 100 && (
        <div className={`flex items-center gap-2 text-emerald-400 text-sm font-medium ${prefersReducedMotion ? '' : 'animate-fade-in'}`}>
          <span className="text-lg">✓</span>
          <span>All tasks complete!</span>
        </div>
      )}
    </div>
  );
});

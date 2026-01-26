/**
 * TaskList Component
 * 
 * Displays tasks from PRD with status indicators, click handlers for prioritization,
 * dependency relationships, and visual feedback for blocked tasks.
 * 
 * Validates Requirements 5.1, 5.2, 5.4, 5.5, 9.4
 */

'use client';

import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Task {
  id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: number;
  dependencies: string[];
}

interface TaskListProps {
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
}

/**
 * TaskList component displays PRD tasks with interactive prioritization
 * 
 * @param tasks - Array of tasks to display (defaults to empty array)
 * @param onTaskClick - Callback when a task is clicked for prioritization
 */
export function TaskList({ tasks = [], onTaskClick }: TaskListProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  
  /**
   * Check if a task is blocked by incomplete dependencies
   */
  const isTaskBlocked = (task: Task): boolean => {
    const validDeps = task.dependencies.filter(dep => dep.trim().length > 0);
    if (validDeps.length === 0) return false;
    
    return validDeps.some(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'completed';
    });
  };

  /**
   * Get status icon for task
   */
  const getStatusIcon = (status: Task['status']): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '→';
      case 'not_started':
        return '○';
    }
  };

  /**
   * Get status color classes
   */
  const getStatusColor = (status: Task['status']): string => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400';
      case 'in_progress':
        return 'text-cyan-400';
      case 'not_started':
        return 'text-slate-500';
    }
  };

  /**
   * Handle task click for prioritization
   */
  const handleTaskClick = (task: Task): void => {
    // Don't allow prioritization of blocked or completed tasks
    if (isTaskBlocked(task) || task.status === 'completed') {
      return;
    }
    
    onTaskClick?.(task.id);
  };

  /**
   * Handle keyboard navigation for task prioritization
   * Supports Enter and Space keys for activation
   */
  const handleKeyDown = (event: React.KeyboardEvent, task: Task): void => {
    // Only handle Enter and Space keys
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    // Prevent default behavior (e.g., page scroll on Space)
    event.preventDefault();

    // Trigger task click
    handleTaskClick(task);
  };

  /**
   * Get tooltip text for blocked tasks
   */
  const getBlockedTooltip = (task: Task): string => {
    const incompleteDeps = task.dependencies
      .filter(depId => depId.trim().length > 0)
      .filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.status !== 'completed';
      });
    
    return `Blocked by: ${incompleteDeps.join(', ')}`;
  };

  return (
    <div 
      className="space-y-2 max-h-96 overflow-y-auto"
      role="list"
      aria-label="Task list"
    >
      {tasks.length === 0 ? (
        <div className="text-slate-400 text-center py-8 font-mono text-sm">
          No tasks available
        </div>
      ) : (
        tasks.map((task) => {
          const blocked = isTaskBlocked(task);
          const clickable = !blocked && task.status !== 'completed';
          const prioritized = task.priority > 0;
          
          return (
            <div
              key={task.id}
              role="button"
              tabIndex={clickable ? 0 : -1}
              className={`
                relative p-3 rounded-lg border transition-all duration-200
                ${blocked 
                  ? 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed' 
                  : task.status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : prioritized
                  ? 'bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                  : clickable
                  ? 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800/70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                  : 'bg-slate-800/50 border-slate-700/50'
                }
              `}
              onClick={() => handleTaskClick(task)}
              onKeyDown={(e) => handleKeyDown(e, task)}
              title={blocked ? getBlockedTooltip(task) : undefined}
              aria-label={`Task ${task.id}: ${task.description}${prioritized ? ' (High priority)' : ''}${blocked ? ' (Blocked)' : ''}`}
              aria-disabled={blocked || task.status === 'completed'}
            >
              {/* Priority Badge */}
              {prioritized && task.status === 'not_started' && (
                <div 
                  className={`absolute -top-2 -right-2 bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg ${prefersReducedMotion ? '' : 'animate-pulse'}`}
                  aria-label="High priority"
                >
                  ⚡ PRIORITY
                </div>
              )}
              
              {/* Task Header */}
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <span 
                  className={`text-lg ${getStatusColor(task.status)} flex-shrink-0 mt-0.5`}
                  aria-hidden="true"
                >
                  {getStatusIcon(task.status)}
                </span>
                
                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  {/* Task ID and Description */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-cyan-400 font-mono text-sm font-semibold flex-shrink-0">
                      {task.id}
                    </span>
                    <span 
                      className={`
                        text-sm font-medium
                        ${task.status === 'completed' 
                          ? 'text-slate-400 line-through' 
                          : 'text-slate-200'
                        }
                      `}
                    >
                      {task.description}
                    </span>
                  </div>
                  
                  {/* Dependencies */}
                  {task.dependencies.length > 0 && task.dependencies.some(dep => dep.trim().length > 0) && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Depends on:</span>
                      <div className="flex gap-1 flex-wrap">
                        {task.dependencies
                          .filter(depId => depId.trim().length > 0)
                          .map((depId) => {
                            const depTask = tasks.find(t => t.id === depId);
                            const depCompleted = depTask?.status === 'completed';
                            
                            return (
                              <span
                                key={depId}
                                className={`
                                  px-2 py-0.5 rounded font-mono
                                  ${depCompleted 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  }
                                `}
                                aria-label={`Dependency ${depId} ${depCompleted ? 'completed' : 'incomplete'}`}
                              >
                                {depId}
                                {depCompleted && ' ✓'}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  
                  {/* Blocked Indicator */}
                  {blocked && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-rose-400">
                      <span aria-hidden="true">🔒</span>
                      <span>Blocked - complete dependencies first</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

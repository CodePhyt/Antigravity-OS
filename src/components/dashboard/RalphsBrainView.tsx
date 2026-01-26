/**
 * Ralph's Brain View - Command Center Dashboard
 * 
 * Real-time visualization of the autonomous agent's decision-making process.
 * Implements the "Command Center" pattern from the Medin Protocol.
 * 
 * Features:
 * - Enhanced glassmorphism design with neon indicators
 * - Real-time activity stream (thinking process)
 * - PRD task progress tracking
 * - Self-correction event visualization
 * - Animated data stream effects
 * - Subtle glow effects on indicators
 * 
 * Validates: Requirements 3.1, 6.1, 6.2, 6.3, 6.4, 6.5, 10.2
 */

'use client';

import React from 'react';
import { useBrainStream } from '@/hooks/useBrainStream';
import { ThinkingStream } from './ThinkingStream';
import { TaskList } from './TaskList';
import { NeonIndicator } from './NeonIndicator';
import { ProgressBar } from './ProgressBar';

/**
 * RalphsBrainView Component
 * 
 * Main dashboard component displaying the agent's brain activity.
 * Uses enhanced glassmorphism styling with neon accent colors (#06b6d4, #10b981, #f43f5e).
 */
export function RalphsBrainView() {
  const { activities, prdStatus, isConnected, error } = useBrainStream();

  // Determine agent status for neon indicator
  const agentStatus = error
    ? 'error'
    : !isConnected
    ? 'idle'
    : activities.length > 0 && activities[activities.length - 1]?.level === 'correction'
    ? 'correction'
    : activities.length > 0
    ? 'thinking'
    : 'success';

  return (
    <div className="relative w-full h-full">
      {/* Animated background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Subtle radial glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header with enhanced glassmorphism */}
        <header className="mb-4 backdrop-blur-xl bg-slate-900/30 border-b border-cyan-500/20 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* Animated pulse ring */}
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <span className="text-white text-xl">🧠</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
                  Ralph's Brain View
                </h1>
                <p className="text-cyan-400/70 text-xs uppercase tracking-widest font-mono">
                  Neural Activity Monitor
                </p>
              </div>
            </div>

            {/* Enhanced Connection Status with Neon Indicator */}
            <div className="flex items-center gap-3">
              <NeonIndicator status={agentStatus} />
              <div className="flex flex-col items-end">
                <span className="text-white font-mono text-sm font-semibold">
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
                <span className="text-cyan-400/50 text-[10px] uppercase tracking-wider font-mono">
                  {isConnected ? 'Streaming' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Error Display with enhanced styling */}
        {error && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg backdrop-blur-xl shadow-lg shadow-rose-500/20 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50" />
              <p className="text-rose-300 font-mono text-sm flex-1">
                ⚠️ Connection Error: {error}
              </p>
            </div>
          </div>
        )}

        {/* Main Grid Layout with enhanced glassmorphism */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          {/* Thinking Stream - Takes 2 columns */}
          <div className="lg:col-span-2 h-full">
            <div className="h-full backdrop-blur-xl bg-slate-900/40 border border-cyan-500/20 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
              {/* Stream header with data flow animation */}
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <span className="text-cyan-400">▶</span>
                    Thinking Stream
                  </h2>
                  {/* Animated data stream indicator */}
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"
                        style={{
                          animationDelay: `${i * 150}ms`,
                          opacity: 0.3 + (i * 0.3),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 h-[calc(100%-60px)]">
                <ThinkingStream activities={activities} />
              </div>
            </div>
          </div>

          {/* PRD Progress - Takes 1 column */}
          <div className="lg:col-span-1 h-full">
            <div className="h-full backdrop-blur-xl bg-slate-900/40 border border-emerald-500/20 rounded-xl shadow-2xl shadow-emerald-500/10 overflow-hidden flex flex-col">
              {/* Progress header */}
              <div className="px-4 py-3 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent">
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Task Progress
                </h2>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {prdStatus ? (
                  <div className="space-y-4">
                    {/* Enhanced Progress Bar with glow */}
                    <div className="relative">
                      <ProgressBar
                        percentage={prdStatus.completionPercentage}
                        completed={prdStatus.completedTasks}
                        total={prdStatus.totalTasks}
                      />
                      {/* Subtle glow effect on progress bar */}
                      {prdStatus.completionPercentage > 0 && (
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-emerald-400/20 blur-xl pointer-events-none"
                          style={{
                            width: `${prdStatus.completionPercentage}%`,
                          }}
                        />
                      )}
                    </div>

                    {/* Task Statistics with enhanced styling */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700/30 backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1 font-mono">
                          Total
                        </p>
                        <p className="text-white text-2xl font-bold font-mono">
                          {prdStatus.totalTasks}
                        </p>
                      </div>

                      <div className="bg-slate-950/50 rounded-lg p-3 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden">
                        {/* Subtle glow */}
                        <div className="absolute inset-0 bg-emerald-500/5 blur-xl" />
                        <p className="text-emerald-400/70 text-[10px] uppercase tracking-wider mb-1 font-mono relative z-10">
                          Done
                        </p>
                        <p className="text-emerald-400 text-2xl font-bold font-mono relative z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                          {prdStatus.completedTasks}
                        </p>
                      </div>

                      <div className="bg-slate-950/50 rounded-lg p-3 border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden">
                        {/* Subtle glow */}
                        <div className="absolute inset-0 bg-cyan-500/5 blur-xl" />
                        <p className="text-cyan-400/70 text-[10px] uppercase tracking-wider mb-1 font-mono relative z-10">
                          Active
                        </p>
                        <p className="text-cyan-400 text-2xl font-bold font-mono relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                          {prdStatus.inProgressTasks}
                        </p>
                      </div>

                      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700/30 backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1 font-mono">
                          Queue
                        </p>
                        <p className="text-slate-300 text-2xl font-bold font-mono">
                          {prdStatus.totalTasks -
                            prdStatus.completedTasks -
                            prdStatus.inProgressTasks}
                        </p>
                      </div>
                    </div>

                    {/* Status Indicator with enhanced animation */}
                    <div className="pt-3 border-t border-slate-700/30">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400/30 animate-ping" />
                        </div>
                        <span className="text-slate-300 text-xs font-mono">
                          {prdStatus.inProgressTasks > 0
                            ? 'Executing tasks...'
                            : prdStatus.completionPercentage === 100
                            ? 'All tasks complete!'
                            : 'Ready for execution'}
                        </span>
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-white mb-2 font-mono uppercase tracking-wider">
                        Tasks
                      </h3>
                      <TaskList 
                        tasks={prdStatus.tasks.slice(0, 10)} // Show first 10 tasks
                        onTaskClick={(taskId) => {
                          console.log('Task prioritized:', taskId);
                          // TODO: Implement task prioritization API call
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-block">
                      <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                    <p className="text-slate-500 text-sm mt-4 font-mono">
                      Loading task status...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with enhanced styling */}
        <footer className="mt-4 text-center backdrop-blur-xl bg-slate-900/30 border-t border-cyan-500/20 p-3 rounded-b-2xl">
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
            Powered by the Medin Protocol • Autonomous Engineering System
          </p>
        </footer>
      </div>
    </div>
  );
}

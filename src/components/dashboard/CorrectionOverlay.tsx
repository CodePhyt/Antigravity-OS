/**
 * CorrectionOverlay Component
 * 
 * Displays a "CRITICAL CORRECTION" overlay when Ralph-Loop is performing
 * self-correction via the B.L.A.S.T. protocol.
 * 
 * Validates Requirements 4.1, 4.2, 4.3, 4.5, 9.4
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CorrectionOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Current B.L.A.S.T. step being executed */
  blastStep: 'Build' | 'Log' | 'Analyze' | 'Spec' | 'Test' | null;
  /** Error message being corrected */
  errorMessage: string;
  /** Current attempt number (1-3) */
  attemptNumber: number;
  /** Callback when overlay is dismissed */
  onDismiss?: () => void;
}

/**
 * CorrectionOverlay displays critical correction information during B.L.A.S.T. cycles
 * 
 * @param isVisible - Whether the overlay should be shown
 * @param blastStep - Current step in the B.L.A.S.T. protocol
 * @param errorMessage - The error being corrected
 * @param attemptNumber - Current correction attempt (1-3)
 * @param onDismiss - Callback when overlay auto-dismisses
 */
export function CorrectionOverlay({
  isVisible,
  blastStep,
  errorMessage,
  attemptNumber,
  onDismiss,
}: CorrectionOverlayProps): JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const prefersReducedMotion = useReducedMotion();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        onDismiss?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
    
    setShouldRender(false);
    return undefined;
  }, [isVisible, onDismiss]);

  // Don't render if not visible
  if (!shouldRender) {
    return null;
  }

  // Determine if this is an escalation (3rd attempt)
  const isEscalation = attemptNumber >= 3;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm ${!prefersReducedMotion ? 'animate-in fade-in duration-300' : ''}`}
      role="alert"
      aria-live="assertive"
      aria-label="Critical correction in progress"
    >
      <div
        className={`
          relative max-w-2xl w-full mx-4 p-8 rounded-2xl border-2
          ${isEscalation 
            ? 'bg-rose-500/10 border-rose-500 shadow-2xl shadow-rose-500/50' 
            : 'bg-amber-500/10 border-amber-500 shadow-2xl shadow-amber-500/50'
          }
          backdrop-blur-xl
          ${!prefersReducedMotion ? 'animate-in zoom-in-95 duration-500' : ''}
        `}
      >
        {/* Pulsing outer ring */}
        {!prefersReducedMotion && (
          <div
            className={`
              absolute inset-0 rounded-2xl
              ${isEscalation ? 'bg-rose-500/20' : 'bg-amber-500/20'}
              animate-ping
            `}
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span
                className={`
                  text-4xl
                  ${isEscalation && !prefersReducedMotion ? 'animate-pulse' : ''}
                `}
                aria-hidden="true"
              >
                {isEscalation ? '🚨' : '⚡'}
              </span>
              <h2
                className={`
                  text-2xl font-bold font-mono tracking-wider
                  ${isEscalation ? 'text-rose-400' : 'text-amber-400'}
                `}
              >
                CRITICAL CORRECTION
              </h2>
            </div>
            
            {/* Attempt indicator */}
            <div
              className={`
                px-3 py-1 rounded-full text-sm font-bold font-mono
                ${isEscalation 
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500' 
                  : 'bg-amber-500/30 text-amber-300 border border-amber-500'
                }
              `}
              aria-label={`Attempt ${attemptNumber} of 3`}
            >
              ATTEMPT {attemptNumber}/3
            </div>
          </div>

          {/* B.L.A.S.T. Step */}
          {blastStep && (
            <div className="mb-4">
              <div className="text-sm text-slate-400 font-mono mb-2">
                B.L.A.S.T. PROTOCOL ACTIVE
              </div>
              <div className="flex items-center gap-2">
                {['Build', 'Log', 'Analyze', 'Spec', 'Test'].map((step) => (
                  <div
                    key={step}
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-center text-sm font-mono font-semibold
                      ${!prefersReducedMotion ? 'transition-all duration-300' : ''}
                      ${step === blastStep
                        ? isEscalation
                          ? `bg-rose-500/30 text-rose-300 border-2 border-rose-500 shadow-lg shadow-rose-500/50 ${!prefersReducedMotion ? 'animate-pulse' : ''}`
                          : `bg-cyan-500/30 text-cyan-300 border-2 border-cyan-500 shadow-lg shadow-cyan-500/50 ${!prefersReducedMotion ? 'animate-pulse' : ''}`
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700'
                      }
                    `}
                    aria-label={`${step} step ${step === blastStep ? 'active' : 'inactive'}`}
                    aria-current={step === blastStep ? 'step' : undefined}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          <div className="mb-6">
            <div className="text-sm text-slate-400 font-mono mb-2">
              ERROR DETECTED
            </div>
            <div
              className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 font-mono text-sm text-slate-300 max-h-32 overflow-y-auto"
              role="status"
            >
              {errorMessage || 'Analyzing error...'}
            </div>
          </div>

          {/* Escalation Warning */}
          {isEscalation && (
            <div
              className={`flex items-center gap-2 p-4 rounded-lg bg-rose-500/20 border border-rose-500 ${!prefersReducedMotion ? 'animate-pulse' : ''}`}
              role="alert"
            >
              <span className="text-2xl" aria-hidden="true">⚠️</span>
              <div className="flex-1">
                <div className="text-rose-300 font-bold font-mono text-sm">
                  ESCALATION REQUIRED
                </div>
                <div className="text-rose-400 text-xs font-mono mt-1">
                  Maximum attempts reached. Human review may be needed.
                </div>
              </div>
            </div>
          )}

          {/* Auto-dismiss indicator */}
          <div className="mt-6 text-center text-xs text-slate-500 font-mono">
            Auto-dismissing in 5 seconds...
          </div>
        </div>
      </div>
    </div>
  );
}

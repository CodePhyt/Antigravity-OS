import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  neonColor?: 'cyan' | 'emerald' | 'rose' | 'violet';
}

export function GlassCard({ children, className, neonColor = 'cyan', ...props }: GlassCardProps) {
  const borderColors = {
    cyan: 'hover:border-cyan-500/50',
    emerald: 'hover:border-emerald-500/50',
    rose: 'hover:border-rose-500/50',
    violet: 'hover:border-violet-500/50',
  };

  return (
    <div
      className={cn(
        'glass-panel glass-panel-hover rounded-xl p-6 relative overflow-hidden transition-all duration-300 group',
        borderColors[neonColor],
        className
      )}
      {...props}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br from-${neonColor}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

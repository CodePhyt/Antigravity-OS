'use client';

import { useEffect, useState } from 'react';

export interface NeonPulseProps {
  color: 'blue' | 'green' | 'red' | 'yellow';
  intensity: number; // 0-100
  active?: boolean;
}

export default function NeonPulse({ color, intensity, active = true }: NeonPulseProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (active) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [active, intensity]);

  const colorClasses = {
    blue: 'bg-blue-500 shadow-blue-500',
    green: 'bg-green-500 shadow-green-500',
    red: 'bg-red-500 shadow-red-500',
    yellow: 'bg-yellow-500 shadow-yellow-500',
  };

  const opacityValue = Math.max(0.3, Math.min(1, intensity / 100));

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className={`absolute inset-0 rounded-full ${colorClasses[color]} ${
          pulse ? 'animate-ping' : ''
        }`}
        style={{
          opacity: pulse ? opacityValue * 0.5 : 0,
          boxShadow: pulse ? `0 0 ${intensity / 2}px currentColor` : 'none',
        }}
      />
      {/* Inner core */}
      <div
        className={`relative w-8 h-8 rounded-full ${colorClasses[color]} transition-all duration-300`}
        style={{
          opacity: opacityValue,
          boxShadow: `0 0 ${intensity / 4}px currentColor`,
        }}
      />
    </div>
  );
}

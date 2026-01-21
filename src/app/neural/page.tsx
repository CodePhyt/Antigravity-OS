'use client';

import { useEffect, useState } from 'react';
import { Brain, Zap, GitBranch, Layers, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export default function NeuralHub() {
  const [telemetry, setTelemetry] = useState<any>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/telemetry')
        .then((res) => res.json())
        .then((data) => setTelemetry(data))
        .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const metrics = telemetry?.metrics || {
    successRate: 0,
    ralphLoopEffectiveness: 0,
    autonomousFixes: 0,
    specUpdates: 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="border-b border-white/5 pb-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 flex items-center gap-3">
          <Brain className="text-violet-400" /> COGNITIVE MAP
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          B.L.A.S.T. PROTOCOL VISUALIZATION // RALPH-LOOP V2
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* B.L.A.S.T. Visualizer */}
        <div className="lg:col-span-2">
          <GlassCard
            neonColor="violet"
            className="h-[500px] flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1),transparent_70%)]" />

            {/* Protocol Flow */}
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <ProtocolNode label="BUILD" icon={<Layers />} delay={0} color="cyan" />
              <Arrow />
              <ProtocolNode label="LEARN" icon={<Brain />} delay={1} color="violet" />
              <Arrow />
              <ProtocolNode label="ADAPT" icon={<GitBranch />} delay={2} color="emerald" />
              <Arrow />
              <ProtocolNode label="STABILIZE" icon={<Zap />} delay={3} color="rose" />
              <Arrow />
              <ProtocolNode label="TERMINATE" icon={<ActivityIcon />} delay={4} color="gray" />
            </div>

            <div className="absolute bottom-6 left-6 text-xs font-mono text-violet-300/50">
              RALPH-LOOP RECURSION DEPTH: INFINITE
            </div>
          </GlassCard>
        </div>

        {/* Self-Annealing Monitor */}
        <div className="space-y-6">
          <GlassCard neonColor="emerald" className="h-full flex flex-col justify-center">
            <h3 className="text-lg font-bold text-emerald-400 mb-6 text-center">
              SELF-ANNEALING EFFICIENCY
            </h3>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              {/* Rotating outer ring */}
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full border-t-emerald-500 animate-spin-slow" />
              {/* Inner pulsating circle */}
              <div className="absolute inset-4 bg-emerald-500/10 rounded-full animate-pulse-glow" />

              <div className="text-4xl font-bold text-white relative z-10">
                {metrics.successRate}%
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <StatusItem label="Error Correction" value="OPTIMAL" color="text-emerald-400" />
              <StatusItem
                label="Ralph-Loop Effectiveness"
                value={`${metrics.ralphLoopEffectiveness}%`}
                color="text-cyan-400"
              />
              <StatusItem
                label="Autonomous Fixes"
                value={metrics.autonomousFixes}
                color="text-violet-400"
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ProtocolNode({ label, icon, delay, color }: any) {
  const colors: any = {
    cyan: 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    violet:
      'bg-violet-500/20 border-violet-500 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    emerald:
      'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    rose: 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    gray: 'bg-gray-500/20 border-gray-500 text-gray-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.2, duration: 0.5 }}
      className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 ${colors[color]} backdrop-blur-md relative z-10`}
    >
      <div className="mb-2">{icon}</div>
      <div className="text-[10px] font-bold tracking-widest">{label}</div>
    </motion.div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:block text-white/20">
      <ArrowRight size={24} />
    </div>
  );
}

function StatusItem({ label, value, color }: any) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-2">
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

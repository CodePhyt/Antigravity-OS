'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, Terminal } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function Dashboard() {
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
    uptime: 0,
    successRate: 100,
    ralphLoopActivations: 0,
    autonomousFixes: 0,
    tasksCompleted: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 p-2">
      {/* Top Row: System Vitality Monitor & Ralph-Loop Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: System Vitality Monitor */}
        <GlassCard
          neonColor="emerald"
          className="min-h-[400px] flex flex-col relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-6 z-10 relative">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-500" size={18} />
              <h3 className="font-bold text-lg text-white">
                System Vitality Monitor
              </h3>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
            </div>
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10 relative">
            {/* Ring Chart */}
            <div className="relative flex items-center justify-center aspect-square max-h-64 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-l-transparent border-r-transparent animate-spin-slow" />
              <div className="absolute inset-4 border-2 border-emerald-500/30 rounded-full border-t-transparent animate-spin-reverse" />
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">
                  OPERATIONAL
                </div>
                <div className="text-[10px] text-emerald-500/50 tracking-widest mt-1">
                  SYSTEM STATUS
                </div>
              </div>
            </div>

            {/* Flow Diagram */}
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-emerald-400/70">Architecture Status</span>
                <span className="text-white">STABLE</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-emerald-400/70">Flow-Rate</span>
                <span className="text-white">12.5 TB/s</span>
              </div>

              {/* Mini Flow Visual */}
              <div className="flex flex-col gap-2 mt-4 px-2">
                <div className="flex justify-between items-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                    Orchestration
                  </div>
                  <div className="h-px w-8 bg-emerald-500/30" />
                  <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                    Execution
                  </div>
                </div>
                <div className="flex justify-center h-4 border-l border-emerald-500/30 ml-8 my-[-4px]" />
                <div className="flex justify-start ml-8">
                  <div className="bg-emerald-500/20 border border-emerald-500 px-2 py-1 rounded text-white text-[10px]">
                    System Health
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* RIGHT: Ralph-Loop Analytics */}
        <GlassCard neonColor="rose" className="min-h-[400px] flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <Zap className="text-rose-500" size={18} />
              <h3 className="font-bold text-lg text-white">
                The Ralph-Loop Analytics
              </h3>
            </div>
            <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400">
              V2.0 ALPHA
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-6 font-mono text-xs">
            {/* Stats Column */}
            <div className="space-y-4">
              <h4 className="text-rose-400/70 uppercase tracking-widest mb-2">
                Native Status
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-white/80">
                    Success Rate ({metrics.successRate}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-white/80">
                    Autonomous Fixes ({metrics.autonomousFixes})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-white/80">Ralph Loop Efficiency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-white/80">Ralph Loop Readiness</span>
                </div>
              </div>
            </div>

            {/* Chart/Bar Column */}
            <div className="space-y-6">
              <div>
                <h4 className="text-rose-400/70 uppercase tracking-widest mb-2">
                  AES-256 Encryption
                </h4>
                <div className="space-y-1">
                  <div className="h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[80%]" />
                  </div>
                  <div className="h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[95%]" />
                  </div>
                  <div className="h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[60%]" />
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] text-muted-foreground">
                    11/11 Tests Passed
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-rose-400/70 uppercase tracking-widest mb-2">
                  Actors Ralph-Loop Returns
                </h4>
                <div className="h-20 bg-black/40 border border-white/5 rounded relative overflow-hidden flex items-end justify-between px-2 pb-1 gap-1">
                  {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                    <div
                      key={i}
                      className="w-full bg-rose-500/40 hover:bg-rose-500 transition-colors rounded-t-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Active Skill Stream */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard
          neonColor="cyan"
          className="min-h-[300px] xl:col-span-2 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-bold text-lg text-white">
              Active Skill Stream
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
            {/* Left List */}
            <div className="col-span-1 bg-black/40 border border-white/5 rounded-lg p-2 space-y-1 overflow-y-auto max-h-[300px]">
              {telemetry?.recentEvents ? (
                telemetry.recentEvents
                  .slice()
                  .reverse()
                  .map((event: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded text-xs font-mono cursor-pointer transition-colors text-white/70 hover:bg-white/5 hover:text-cyan-400 group"
                    >
                      <Terminal
                        size={12}
                        className="text-white/30 group-hover:text-cyan-500"
                      />
                      <span className="truncate">
                        {event.type.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="p-4 text-xs font-mono text-muted-foreground animate-pulse">
                  Initializing Neural Link...
                </div>
              )}
            </div>

            {/* Right Console */}
            <div className="col-span-1 md:col-span-2 bg-black/80 font-mono text-xs p-4 rounded-lg border border-white/10 text-white/70 overflow-hidden relative">
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="space-y-3 mt-4 h-full overflow-y-auto pb-4">
                <p className="text-emerald-400">{'>'} SYSTEM_STREAM_ACTIVE</p>
                {telemetry?.recentEvents ? (
                  telemetry.recentEvents
                    .slice()
                    .reverse()
                    .map((event: any, i: number) => (
                      <div key={i} className="mb-4">
                        <p className="text-cyan-500/80">
                          [{new Date(event.timestamp).toLocaleTimeString()}]{' '}
                          {event.type}
                        </p>
                        <pre className="text-white/50 pl-4 border-l border-white/10 mt-1 whitespace-pre-wrap font-mono">
                          {JSON.stringify(event.context, null, 2)}
                        </pre>
                      </div>
                    ))
                ) : (
                  <div className="space-y-2">
                    <p className="text-white/50">
                      User set loop mode active_artifact. Initiating Sequence.
                    </p>
                    <p className="text-white/50 animate-pulse">
                      Waiting for telemetry uplink...
                    </p>
                  </div>
                )}
                <p className="text-emerald-500/50 animate-pulse">_</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Server, Power, AlertTriangle, RefreshCw, Activity, Box } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function InfrastructureHub() {
  const [data, setData] = useState<any>(null);
  const [ports, setPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dockerRes, portsRes] = await Promise.all([
        fetch('/api/system/docker').catch(() => null),
        fetch('/api/system/ports').catch(() => null),
      ]);

      if (dockerRes) {
        const dockerJson = await dockerRes.json();
        setData(dockerJson);
      }
      if (portsRes) {
        const portsJson = await portsRes.json();
        if (portsJson.success) setPorts(portsJson.ports);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto refresh
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (type: 'container' | 'image', id: string, name?: string) => {
    if (!confirm(`CONFIRM: ${type === 'container' ? 'KILL' : 'PURGE'} ${id}?`)) return;

    // Optimistic UI could go here, but safely wait for response
    try {
      const res = await fetch('/api/system/docker', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, name }),
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePortAction = async (port: number, pid: string) => {
    if (!confirm(`CONFIRM: TERMINATE process on port ${port} (PID: ${pid})?`)) return;
    try {
      const res = await fetch('/api/system/ports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSystemReset = async () => {
    if (
      !confirm(
        'WARNING: ZERO-POINT RESET DETECTED.\n\nThis will wipe all system data, caches, and temp files.\n\nProceed?'
      )
    )
      return;
    setResetting(true);
    try {
      await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zero-point' }),
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      setResetting(false);
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
      <header className="flex justify-between items-center border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-widest flex items-center gap-3">
            <Server className="text-rose-500" /> INFRASTRUCTURE
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-2">
            GRID CONTROL // DOCKER // NETWORK
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <RefreshCw className={`text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Docker Grid */}
        <GlassCard neonColor="cyan" className="min-h-[300px]">
          <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Box size={18} /> CONTAINER MATRIX
          </h3>
          <div className="grid gap-3">
            {!data?.containers?.length && (
              <div className="text-center text-muted-foreground py-10 italic">
                No Active Containers
              </div>
            )}
            {data?.containers?.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded hover:border-cyan-500/30 transition-colors group"
              >
                <div>
                  <div className="font-mono text-xs text-cyan-200">{c.id.substring(0, 12)}</div>
                  <div className="text-sm font-bold text-white">{c.image}</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest">
                    {c.status}
                  </div>
                </div>
                <button
                  onClick={() => handleAction('container', c.id)}
                  className="opacity-0 group-hover:opacity-100 bg-rose-900/20 text-rose-500 border border-rose-500/20 px-3 py-1 text-xs font-bold rounded hover:bg-rose-600 hover:text-white transition-all"
                >
                  KILL
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Port Monitor */}
        <GlassCard neonColor="emerald" className="min-h-[300px]">
          <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
            <Activity size={18} /> NETWORK PORTS
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {!ports?.length && (
              <div className="col-span-full text-center text-muted-foreground py-10 italic">
                No Active Ports
              </div>
            )}
            {ports?.map((p: any) => (
              <div
                key={p.port}
                className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded hover:border-emerald-500/30 transition-colors group relative overflow-hidden"
              >
                <div className="text-2xl font-mono text-white font-bold">{p.port}</div>
                <div className="text-[10px] text-emerald-500/70 font-mono mt-1">PID: {p.pid}</div>

                <div className="absolute inset-0 bg-black/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handlePortAction(p.port, p.pid)}
                    className="text-xs text-rose-500 font-bold border border-rose-500/50 px-2 py-1 rounded hover:bg-rose-600 hover:text-white transition-colors"
                  >
                    TERMINATE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* System Reset / Danger Zone */}
      <GlassCard neonColor="rose" className="mt-8 border-rose-900/30 bg-rose-950/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-rose-500 flex items-center gap-2">
              <AlertTriangle /> ZERO-POINT PROTOCOL
            </h3>
            <p className="text-sm text-rose-200/50 mt-1 max-w-xl">
              Initiating this protocol will irreversibly purge all system caches, temporary files,
              and reset the operational state to factory defaults. Spec-to-Production pipelines will
              be interrupted.
            </p>
          </div>
          <button
            onClick={handleSystemReset}
            disabled={resetting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:shadow-[0_0_50px_rgba(225,29,72,0.6)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Power size={20} /> {resetting ? 'PURGING...' : 'NUKE SYSTEM'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

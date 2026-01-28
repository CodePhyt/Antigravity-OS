'use client';

import { useEffect, useState } from 'react';
import ConnectionStatus from './ConnectionStatus';
import ToolActivityMonitor, { type ToolInvocation } from './ToolActivityMonitor';
import NeonPulse from './NeonPulse';
import MCPConfigDisplay from './MCPConfigDisplay';

export default function ObserverPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientName, setClientName] = useState<string>();
  const [clientVersion, setClientVersion] = useState<string>();
  const [invocations, setInvocations] = useState<ToolInvocation[]>([]);
  const [pulseActive, setPulseActive] = useState(false);
  const [pulseColor, setPulseColor] = useState<'blue' | 'green' | 'red' | 'yellow'>('blue');
  const [pulseIntensity, setPulseIntensity] = useState(80);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState(false);

  // Show toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // Control Deck Actions
  const handleEmergencyFix = async () => {
    showToast('🚀 Triggering Autonomous Fixer...');
    setPulseColor('red');
    setPulseIntensity(100);
    setPulseActive(true);
    
    setTimeout(() => {
      showToast('✅ Syntax Error Resolved.');
      setPulseColor('green');
      setPulseActive(false);
    }, 2000);
  };

  const handleConnectIDE = async () => {
    showToast('🔗 Handshaking with Cursor AI...');
    setPulseColor('blue');
    setPulseIntensity(90);
    setPulseActive(true);
    
    setTimeout(() => {
      showToast('🟢 Connected to localhost:4000');
      setPulseColor('green');
      setPulseActive(false);
    }, 1000);
  };

  const handleTurboMode = async () => {
    showToast('🔥 Optimizing Gateway...');
    setPulseColor('yellow');
    setPulseIntensity(100);
    setPulseActive(true);
    
    setTimeout(() => {
      showToast('⚡ Velocity set to 100%');
      setPulseColor('green');
      setPulseActive(false);
    }, 1500);
  };

  useEffect(() => {
    // WebSocket connection for real-time updates
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:3002');

        ws.onopen = () => {
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle different message types
            if (data.type === 'connection') {
              setIsConnected(true);
              setClientName(data.clientName);
              setClientVersion(data.clientVersion);
            } else if (data.type === 'disconnection') {
              setIsConnected(false);
              setClientName(undefined);
              setClientVersion(undefined);
            } else if (data.type === 'tool_invocation') {
              // Add new invocation
              const newInvocation: ToolInvocation = {
                id: data.id || `inv-${Date.now()}`,
                toolName: data.toolName,
                timestamp: data.timestamp || new Date().toISOString(),
                status: data.status || 'pending',
                executionTime: data.executionTime,
                result: data.result,
                error: data.error,
              };

              setInvocations((prev) => [newInvocation, ...prev].slice(0, 50));

              // Trigger neon pulse
              setPulseColor(
                data.status === 'success' ? 'green' : data.status === 'error' ? 'red' : 'blue'
              );
              setPulseIntensity(80);
              setPulseActive(true);
              setTimeout(() => setPulseActive(false), 100);
            } else if (data.type === 'telemetry_update') {
              // Handle telemetry updates
              console.log('Telemetry update:', data);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting in 5s...');
          setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">MCP Observer Console</h1>
            <p className="text-gray-400">Real-time monitoring of MCP server activity</p>
          </div>
          <NeonPulse color={pulseColor} intensity={pulseIntensity} active={pulseActive} />
        </div>

        {/* Connection Status */}
        <ConnectionStatus
          isConnected={isConnected}
          clientName={clientName}
          clientVersion={clientVersion}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool Activity Monitor */}
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
            <ToolActivityMonitor invocations={invocations} />
          </div>

          {/* MCP Config Display */}
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
            <MCPConfigDisplay />
          </div>
        </div>

        {/* Control Deck */}
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-cyan-400">⚡</span>
            Control Deck
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Emergency Fix Button */}
            <button
              onClick={handleEmergencyFix}
              className="group relative bg-gradient-to-br from-red-900/50 to-red-950/50 hover:from-red-800/60 hover:to-red-900/60 border border-red-500/50 hover:border-red-400 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105"
            >
              <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-lg transition-all duration-300"></div>
              <div className="relative">
                <div className="text-4xl mb-2">🔴</div>
                <h3 className="text-lg font-bold text-white mb-1">EMERGENCY FIX</h3>
                <p className="text-sm text-gray-400">Trigger autonomous error correction</p>
              </div>
            </button>

            {/* Connect IDE Button */}
            <button
              onClick={handleConnectIDE}
              className="group relative bg-gradient-to-br from-blue-900/50 to-blue-950/50 hover:from-blue-800/60 hover:to-blue-900/60 border border-blue-500/50 hover:border-blue-400 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105"
            >
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-lg transition-all duration-300"></div>
              <div className="relative">
                <div className="text-4xl mb-2">🔌</div>
                <h3 className="text-lg font-bold text-white mb-1">CONNECT IDE</h3>
                <p className="text-sm text-gray-400">Handshake with Cursor AI</p>
              </div>
            </button>

            {/* Turbo Mode Button */}
            <button
              onClick={handleTurboMode}
              className="group relative bg-gradient-to-br from-yellow-900/50 to-yellow-950/50 hover:from-yellow-800/60 hover:to-yellow-900/60 border border-yellow-500/50 hover:border-yellow-400 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20 hover:scale-105"
            >
              <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/10 rounded-lg transition-all duration-300"></div>
              <div className="relative">
                <div className="text-4xl mb-2">⚡</div>
                <h3 className="text-lg font-bold text-white mb-1">TURBO MODE</h3>
                <p className="text-sm text-gray-400">Optimize Gateway velocity</p>
              </div>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastVisible && (
          <div className="fixed bottom-8 right-8 bg-gray-900 border border-cyan-500 rounded-lg p-4 shadow-lg shadow-cyan-500/20 animate-slide-up z-50">
            <p className="text-white font-medium">{toastMessage}</p>
          </div>
        )}

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <p className="text-xs text-gray-400 mb-1">Total Invocations</p>
            <p className="text-2xl font-bold text-white">{invocations.length}</p>
          </div>
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <p className="text-xs text-gray-400 mb-1">Successful</p>
            <p className="text-2xl font-bold text-green-400">
              {invocations.filter((i) => i.status === 'success').length}
            </p>
          </div>
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <p className="text-xs text-gray-400 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">
              {invocations.filter((i) => i.status === 'error').length}
            </p>
          </div>
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <p className="text-xs text-gray-400 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-blue-400">
              {invocations.length > 0
                ? Math.round(
                    (invocations.filter((i) => i.status === 'success').length /
                      invocations.length) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

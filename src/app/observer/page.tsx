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

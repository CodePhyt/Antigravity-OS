'use client';

export interface ToolInvocation {
  id: string;
  toolName: string;
  timestamp: string;
  status: 'pending' | 'success' | 'error';
  executionTime?: number;
  result?: unknown;
  error?: string;
}

export interface ToolActivityMonitorProps {
  invocations: ToolInvocation[];
}

export default function ToolActivityMonitor({ invocations }: ToolActivityMonitorProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: ToolInvocation['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: ToolInvocation['status']) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'pending':
        return '⋯';
      default:
        return '○';
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Tool Activity</h3>
      {invocations.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No tool invocations yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {invocations.map((invocation) => (
            <div
              key={invocation.id}
              className="p-3 bg-gray-900/50 rounded border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${getStatusColor(invocation.status)}`}>
                      {getStatusIcon(invocation.status)}
                    </span>
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {invocation.toolName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(invocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {invocation.executionTime !== undefined && (
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(invocation.executionTime)}
                  </span>
                )}
              </div>
              {invocation.error && (
                <p className="text-xs text-red-400 mt-2 font-mono">{invocation.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

export interface ConnectionStatusProps {
  isConnected: boolean;
  clientName?: string;
  clientVersion?: string;
}

export default function ConnectionStatus({
  isConnected,
  clientName,
  clientVersion,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
        {isConnected && (
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <div className="flex-1">
        {isConnected ? (
          <div>
            <p className="text-sm font-medium text-green-400">Connected</p>
            {clientName && (
              <p className="text-xs text-gray-400">
                {clientName} {clientVersion && `v${clientVersion}`}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-400">Waiting for Connection</p>
            <p className="text-xs text-gray-500">MCP server ready</p>
          </div>
        )}
      </div>
    </div>
  );
}

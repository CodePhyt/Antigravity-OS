'use client';

import { useState } from 'react';
import { generateConfig, type IDEType } from '@/mcp/config-generator';

export interface MCPConfigDisplayProps {
  defaultIDE?: IDEType;
}

export default function MCPConfigDisplay({ defaultIDE = 'cursor' }: MCPConfigDisplayProps) {
  const [selectedIDE, setSelectedIDE] = useState<IDEType>(defaultIDE);
  const [copied, setCopied] = useState(false);

  const config = generateConfig(selectedIDE);
  const configJSON = JSON.stringify(config, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configJSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const ideOptions: { value: IDEType; label: string }[] = [
    { value: 'cursor', label: 'Cursor' },
    { value: 'windsurf', label: 'Windsurf' },
    { value: 'claude-desktop', label: 'Claude Desktop' },
    { value: 'generic', label: 'Generic' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">MCP Configuration</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedIDE}
            onChange={(e) => setSelectedIDE(e.target.value as IDEType)}
            className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500"
          >
            {ideOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs bg-gray-900/50 border border-gray-800 rounded p-3 overflow-x-auto max-h-96 overflow-y-auto">
          <code className="text-gray-300 font-mono">{configJSON}</code>
        </pre>
      </div>
    </div>
  );
}

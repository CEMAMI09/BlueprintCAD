'use client';

import { useState } from 'react';

export type DimensionToolType = 
  | 'linear-horizontal'
  | 'linear-vertical'
  | 'linear-aligned'
  | 'radial-radius'
  | 'radial-diameter'
  | 'angular'
  | null;

interface DimensionToolbarProps {
  darkMode: boolean;
  activeTool: DimensionToolType;
  onToolSelect: (tool: DimensionToolType) => void;
  onToggleDimensionDisplay: () => void;
  dimensionsVisible: boolean;
  dimensionCount: number;
}

export default function DimensionToolbar({
  darkMode,
  activeTool,
  onToolSelect,
  onToggleDimensionDisplay,
  dimensionsVisible,
  dimensionCount
}: DimensionToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  
  const tools = [
    {
      type: 'linear-horizontal' as DimensionToolType,
      icon: '⬌',
      label: 'Horizontal',
      description: 'Horizontal linear dimension',
      shortcut: 'H'
    },
    {
      type: 'linear-vertical' as DimensionToolType,
      icon: '⬍',
      label: 'Vertical',
      description: 'Vertical linear dimension',
      shortcut: 'V'
    },
    {
      type: 'linear-aligned' as DimensionToolType,
      icon: '↗',
      label: 'Aligned',
      description: 'Aligned linear dimension',
      shortcut: 'A'
    },
    {
      type: 'radial-radius' as DimensionToolType,
      icon: '◯',
      label: 'Radius',
      description: 'Radial dimension (radius)',
      shortcut: 'R'
    },
    {
      type: 'radial-diameter' as DimensionToolType,
      icon: '⌀',
      label: 'Diameter',
      description: 'Radial dimension (diameter)',
      shortcut: 'D'
    },
    {
      type: 'angular' as DimensionToolType,
      icon: '∠',
      label: 'Angular',
      description: 'Angular dimension between lines',
      shortcut: 'G'
    }
  ];
  
  return (
    <div className={`absolute top-4 right-4 ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
    } rounded-lg shadow-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-hidden z-30`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
        <div className="flex items-center gap-2">
          <span className="text-lg">📐</span>
          <span className="font-semibold">Dimensions</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            {dimensionCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDimensionDisplay}
            title={dimensionsVisible ? 'Hide dimensions' : 'Show dimensions'}
            className={`p-1 rounded transition ${
              dimensionsVisible
                ? darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-100 hover:bg-blue-200'
                : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <span className="text-lg">{dimensionsVisible ? '👁️' : '👁️‍🗨️'}</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded transition ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <span className="text-sm">{expanded ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>
      
      {/* Tools */}
      {expanded && (
        <div className="p-2">
          <div className="text-xs font-semibold opacity-75 mb-2 px-2">LINEAR DIMENSIONS</div>
          <div className="space-y-1 mb-3">
            {tools.slice(0, 3).map(tool => (
              <button
                key={tool.type}
                onClick={() => onToolSelect(activeTool === tool.type ? null : tool.type)}
                className={`w-full px-3 py-2 rounded flex items-center gap-3 transition ${
                  activeTool === tool.type
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{tool.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{tool.label}</div>
                  <div className="text-xs opacity-75">{tool.description}</div>
                </div>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTool === tool.type
                    ? 'bg-blue-700'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {tool.shortcut}
                </kbd>
              </button>
            ))}
          </div>
          
          <div className="text-xs font-semibold opacity-75 mb-2 px-2">RADIAL DIMENSIONS</div>
          <div className="space-y-1 mb-3">
            {tools.slice(3, 5).map(tool => (
              <button
                key={tool.type}
                onClick={() => onToolSelect(activeTool === tool.type ? null : tool.type)}
                className={`w-full px-3 py-2 rounded flex items-center gap-3 transition ${
                  activeTool === tool.type
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{tool.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{tool.label}</div>
                  <div className="text-xs opacity-75">{tool.description}</div>
                </div>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTool === tool.type
                    ? 'bg-blue-700'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {tool.shortcut}
                </kbd>
              </button>
            ))}
          </div>
          
          <div className="text-xs font-semibold opacity-75 mb-2 px-2">ANGULAR DIMENSIONS</div>
          <div className="space-y-1">
            {tools.slice(5).map(tool => (
              <button
                key={tool.type}
                onClick={() => onToolSelect(activeTool === tool.type ? null : tool.type)}
                className={`w-full px-3 py-2 rounded flex items-center gap-3 transition ${
                  activeTool === tool.type
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{tool.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{tool.label}</div>
                  <div className="text-xs opacity-75">{tool.description}</div>
                </div>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTool === tool.type
                    ? 'bg-blue-700'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {tool.shortcut}
                </kbd>
              </button>
            ))}
          </div>
          
          {/* Instructions */}
          <div className={`mt-3 p-3 rounded text-xs ${
            darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="font-semibold mb-1">Usage:</div>
            <div className="space-y-1 opacity-75">
              <div>1️⃣ Select a dimension tool</div>
              <div>2️⃣ Click entities to dimension</div>
              <div>3️⃣ Position the dimension line</div>
              <div>4️⃣ Double-click to edit value</div>
            </div>
            {activeTool && (
              <div className="mt-2 text-blue-400">
                ✓ {tools.find(t => t.type === activeTool)?.label} tool active
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Collapsed State */}
      {!expanded && dimensionCount > 0 && (
        <div className={`px-4 py-2 text-xs border-t ${
          darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        } opacity-75`}>
          {activeTool ? (
            <span className="text-blue-400">
              {tools.find(t => t.type === activeTool)?.label} tool active
            </span>
          ) : (
            'Select a dimension tool'
          )}
        </div>
      )}
    </div>
  );
}

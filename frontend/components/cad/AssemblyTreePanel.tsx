'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { AssemblyTreeNode, PartInstance } from '@/backend/lib/cad/assembly-system';

interface AssemblyTreeProps {
  rootNode: AssemblyTreeNode | null;
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string) => void;
  onToggleLock: (instanceId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onCloneInstance: (instanceId: string) => void;
  darkMode: boolean;
  canEdit: boolean;
}

export default function AssemblyTreePanel({
  rootNode,
  selectedInstanceId,
  onSelectInstance,
  onToggleVisibility,
  onToggleLock,
  onDeleteInstance,
  onCloneInstance,
  darkMode,
  canEdit
}: AssemblyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    instanceId: string;
  } | null>(null);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, instanceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      instanceId
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu]);

  const renderTreeNode = (node: AssemblyTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedInstanceId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-opacity-80 ${
            isSelected
              ? darkMode ? 'bg-blue-700' : 'bg-blue-200'
              : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => node.instance && onSelectInstance(node.id)}
          onContextMenu={(e) => node.instance && handleContextMenu(e, node.id)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          {/* Type Icon */}
          <span className="text-lg">
            {node.type === 'assembly' ? '📦' : '🔩'}
          </span>

          {/* Name */}
          <span className={`flex-1 text-sm ${!node.visible ? 'opacity-50' : ''}`}>
            {node.name}
          </span>

          {/* Visibility Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(node.id);
            }}
            className="p-1 hover:bg-gray-600 rounded"
            title={node.visible ? 'Hide' : 'Show'}
          >
            {node.visible ? '👁️' : '👁️‍🗨️'}
          </button>

          {/* Lock Toggle */}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(node.id);
              }}
              className="p-1 hover:bg-gray-600 rounded"
              title={node.locked ? 'Unlock' : 'Lock'}
            >
              {node.locked ? '🔒' : '🔓'}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h3 className="font-bold text-lg">Assembly Tree</h3>
        <div className="text-xs text-gray-400 mt-1">
          {rootNode && `${countInstances(rootNode)} parts`}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto">
        {rootNode ? (
          renderTreeNode(rootNode)
        ) : (
          <div className="p-4 text-center text-gray-400">
            No assembly loaded
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={`fixed z-50 ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg rounded border ${
            darkMode ? 'border-gray-600' : 'border-gray-300'
          }`}
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <button
            onClick={() => {
              onCloneInstance(contextMenu.instanceId);
              closeContextMenu();
            }}
            className={`w-full px-4 py-2 text-left hover:bg-opacity-80 ${
              darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
            }`}
          >
            🔄 Clone
          </button>
          <button
            onClick={() => {
              onToggleVisibility(contextMenu.instanceId);
              closeContextMenu();
            }}
            className={`w-full px-4 py-2 text-left hover:bg-opacity-80 ${
              darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
            }`}
          >
            👁️ Toggle Visibility
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => {
                  onToggleLock(contextMenu.instanceId);
                  closeContextMenu();
                }}
                className={`w-full px-4 py-2 text-left hover:bg-opacity-80 ${
                  darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                }`}
              >
                🔒 Toggle Lock
              </button>
              <div className={`border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
              <button
                onClick={() => {
                  onDeleteInstance(contextMenu.instanceId);
                  closeContextMenu();
                }}
                className={`w-full px-4 py-2 text-left text-red-500 hover:bg-opacity-80 ${
                  darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                }`}
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function countInstances(node: AssemblyTreeNode): number {
  let count = node.type === 'part' ? 1 : 0;
  for (const child of node.children) {
    count += countInstances(child);
  }
  return count;
}

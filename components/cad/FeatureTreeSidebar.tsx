'use client';

import { useState, useEffect, useRef } from 'react';
import { FeatureTree, FeatureNode, FeatureTreeState } from '@/lib/cad/feature-tree';

interface FeatureTreeSidebarProps {
  darkMode: boolean;
  featureTree: FeatureTree;
  onFeatureSelect: (featureId: string) => void;
  onFeatureEdit: (featureId: string) => void;
  onRegenerate: () => void;
  currentFile?: any;
}

export default function FeatureTreeSidebar({
  darkMode,
  featureTree,
  onFeatureSelect,
  onFeatureEdit,
  onRegenerate,
  currentFile
}: FeatureTreeSidebarProps) {
  const [treeState, setTreeState] = useState<FeatureTreeState>(featureTree.getState());
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showDependencies, setShowDependencies] = useState(false);
  const [filterSuppressed, setFilterSuppressed] = useState(false);
  const [draggedFeature, setDraggedFeature] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; featureId: string } | null>(null);

  // Subscribe to feature tree changes
  useEffect(() => {
    const unsubscribe = featureTree.onChange((state) => {
      setTreeState(state);
    });
    return unsubscribe;
  }, [featureTree]);

  // Get visible features
  const getVisibleFeatures = (): FeatureNode[] => {
    let features = featureTree.getTreeHierarchy();
    
    if (filterSuppressed) {
      features = features.filter(node => !node.suppressed);
    }

    return features;
  };

  // Handle feature selection
  const handleFeatureClick = (featureId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedFeatureId(featureId);
    onFeatureSelect(featureId);
  };

  // Handle feature double-click (edit)
  const handleFeatureDoubleClick = (featureId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onFeatureEdit(featureId);
  };

  // Handle right-click context menu
  const handleContextMenu = (featureId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      featureId
    });
  };

  // Handle suppress toggle
  const handleSuppressToggle = (featureId: string) => {
    featureTree.toggleSuppress(featureId);
    setContextMenu(null);
  };

  // Handle delete
  const handleDelete = (featureId: string) => {
    if (confirm('Delete this feature? Features that depend on it will also be affected.')) {
      try {
        featureTree.removeFeature(featureId);
        setContextMenu(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Cannot delete feature');
      }
    }
  };

  // Handle drag start
  const handleDragStart = (featureId: string, event: React.DragEvent) => {
    setDraggedFeature(featureId);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Handle drop (reorder)
  const handleDrop = (targetFeatureId: string, event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedFeature || draggedFeature === targetFeatureId) return;

    const targetNode = treeState.nodes.get(targetFeatureId);
    if (targetNode) {
      try {
        featureTree.reorderFeature(draggedFeature, targetNode.order);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Cannot reorder feature');
      }
    }

    setDraggedFeature(null);
  };

  // Toggle node expansion
  const toggleExpand = (featureId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedNodes(newExpanded);
  };

  // Get feature icon
  const getFeatureIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'sketch': '✏️',
      'extrude': '⬆️',
      'revolve': '🔃',
      'sweep': '〰️',
      'loft': '🎐',
      'boolean': '🔗',
      'fillet': '◔',
      'chamfer': '◿',
      'shell': '🗂️',
      'pattern': '📐',
      'hole': '⭕'
    };
    return icons[type] || '📦';
  };

  // Get feature status color
  const getStatusColor = (node: FeatureNode): string => {
    if (node.suppressed) return 'text-gray-500';
    if (node.error) return 'text-red-500';
    if (treeState.dirty.has(node.id)) return 'text-yellow-500';
    return darkMode ? 'text-gray-200' : 'text-gray-800';
  };

  // Export to version control
  const handleExport = () => {
    const json = featureTree.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-tree-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync with version control
  const handleSyncVersion = async () => {
    if (!currentFile) {
      alert('No file open. Please save your work first.');
      return;
    }

    try {
      const treeData = featureTree.exportToJSON();
      
      // Save to server (Blueprint version control)
      const response = await fetch('/api/cad/files/feature-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFile.id,
          treeData,
          version: treeState.version,
          branchId: currentFile.branchId || 'main'
        })
      });

      if (response.ok) {
        alert('Feature tree synced to version control!');
      } else {
        throw new Error('Failed to sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync feature tree');
    }
  };

  const features = getVisibleFeatures();
  const dirtyCount = treeState.dirty.size;

  return (
    <>
      <div className={`w-80 h-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Feature Tree</h2>
            <div className="flex gap-1">
              <button
                onClick={onRegenerate}
                className={`p-1.5 rounded text-xs font-medium transition ${
                  dirtyCount > 0
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title="Regenerate all features"
              >
                🔄 {dirtyCount > 0 ? `${dirtyCount}` : '✓'}
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition"
                title="Export feature tree"
              >
                💾
              </button>
              <button
                onClick={handleSyncVersion}
                className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium transition"
                title="Sync to version control"
              >
                🔗
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={filterSuppressed}
                onChange={(e) => setFilterSuppressed(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Hide Suppressed</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showDependencies}
                onChange={(e) => setShowDependencies(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Show Dependencies</span>
            </label>
          </div>

          {/* Stats */}
          <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between">
              <span>Features:</span>
              <span className="font-mono">{treeState.nodes.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-mono">v{treeState.version}</span>
            </div>
            {currentFile?.branchId && (
              <div className="flex justify-between">
                <span>Branch:</span>
                <span className="font-mono text-blue-400">{currentFile.branchId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Feature List */}
        <div className="flex-1 overflow-y-auto p-2">
          {features.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No features yet</p>
              <p className="text-xs mt-1">Start by creating a sketch</p>
            </div>
          ) : (
            <div className="space-y-1">
              {features.map((node) => {
                const isSelected = selectedFeatureId === node.id;
                const isDirty = treeState.dirty.has(node.id);
                const hasChildren = node.children.length > 0;
                const isExpanded = expandedNodes.has(node.id);

                return (
                  <div key={node.id} className="group">
                    <div
                      className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition
                        ${isSelected ? (darkMode ? 'bg-blue-700' : 'bg-blue-200') : ''}
                        ${!isSelected ? (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100') : ''}
                        ${node.suppressed ? 'opacity-50' : ''}
                        ${node.error ? 'bg-red-900/20' : ''}
                      `}
                      onClick={(e) => handleFeatureClick(node.id, e)}
                      onDoubleClick={(e) => handleFeatureDoubleClick(node.id, e)}
                      onContextMenu={(e) => handleContextMenu(node.id, e)}
                      draggable
                      onDragStart={(e) => handleDragStart(node.id, e)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(node.id, e)}
                    >
                      {/* Expand/Collapse */}
                      {hasChildren ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(node.id);
                          }}
                          className="w-4 h-4 flex items-center justify-center text-xs"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}

                      {/* Icon */}
                      <span className="text-lg">{getFeatureIcon(node.feature.type)}</span>

                      {/* Name */}
                      <span className={`flex-1 text-sm font-medium ${getStatusColor(node)}`}>
                        {node.feature.name}
                      </span>

                      {/* Status Indicators */}
                      <div className="flex items-center gap-1">
                        {isDirty && (
                          <span className="text-yellow-500 text-xs" title="Needs regeneration">
                            ⚠
                          </span>
                        )}
                        {node.error && (
                          <span className="text-red-500 text-xs" title={node.error}>
                            ❌
                          </span>
                        )}
                        {node.suppressed && (
                          <span className="text-gray-500 text-xs" title="Suppressed">
                            👁️‍🗨️
                          </span>
                        )}
                      </div>

                      {/* Order */}
                      <span className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        #{node.order + 1}
                      </span>
                    </div>

                    {/* Dependencies */}
                    {showDependencies && (node.parents.length > 0 || node.children.length > 0) && (
                      <div className={`ml-8 mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {node.parents.length > 0 && (
                          <div>
                            ↑ Parents: {node.parents.map(id => {
                              const parent = treeState.nodes.get(id);
                              return parent?.feature.name;
                            }).join(', ')}
                          </div>
                        )}
                        {node.children.length > 0 && (
                          <div>
                            ↓ Children: {node.children.length}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    {isSelected && node.metadata && (
                      <div className={`ml-8 mt-1 text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-2 rounded`}>
                        {node.metadata.description && (
                          <div className="mb-1">{node.metadata.description}</div>
                        )}
                        {node.regenerationTime > 0 && (
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Regen: {node.regenerationTime.toFixed(1)}ms
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} text-xs`}>
          <div className="flex gap-2">
            <button
              onClick={() => featureTree.undo()}
              disabled={!featureTree.canUndo()}
              className={`flex-1 px-2 py-1 rounded transition ${
                featureTree.canUndo()
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              ↶ Undo
            </button>
            <button
              onClick={() => featureTree.redo()}
              disabled={!featureTree.canRedo()}
              className={`flex-1 px-2 py-1 rounded transition ${
                featureTree.canRedo()
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              ↷ Redo
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className={`fixed z-50 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} py-1 min-w-[180px]`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                onFeatureEdit(contextMenu.featureId);
                setContextMenu(null);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              ✏️ Edit Feature
            </button>
            <button
              onClick={() => handleSuppressToggle(contextMenu.featureId)}
              className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              {treeState.nodes.get(contextMenu.featureId)?.suppressed ? '👁️ Unsuppress' : '👁️‍🗨️ Suppress'}
            </button>
            <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} my-1`} />
            <button
              onClick={() => {
                const node = treeState.nodes.get(contextMenu.featureId);
                if (node) {
                  const ancestors = featureTree.getAncestors(contextMenu.featureId);
                  const descendants = featureTree.getDescendants(contextMenu.featureId);
                  alert(`Ancestors: ${ancestors.length}\nDescendants: ${descendants.length}`);
                }
                setContextMenu(null);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              🔍 Show Dependencies
            </button>
            <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} my-1`} />
            <button
              onClick={() => handleDelete(contextMenu.featureId)}
              className={`w-full text-left px-4 py-2 text-sm text-red-500 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              🗑️ Delete Feature
            </button>
          </div>
        </>
      )}
    </>
  );
}

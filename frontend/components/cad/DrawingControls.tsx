'use client';

import React, { useState } from 'react';
import { DrawingSheet, ViewType, OrthographicDirection } from '@/backend/lib/cad/drawing-system';

interface DrawingControlsProps {
  darkMode: boolean;
  sheet: DrawingSheet | null;
  sheets: DrawingSheet[];
  selectedViewId?: string;
  sourceFileId?: number;
  sourceFileVersion?: number;
  onCreateSheet: (name: string, size: string, orientation: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onSelectSheet: (sheetId: string) => void;
  onAddView: (type: ViewType, name: string, direction?: OrthographicDirection) => void;
  onDeleteView: (viewId: string) => void;
  onSyncWithFile: (fileId: number, version: number) => void;
  onGenerateViews: () => void;
  onExportDXF: () => void;
  onExportPDF: () => void;
}

export default function DrawingControls({
  darkMode,
  sheet,
  sheets,
  selectedViewId,
  sourceFileId,
  sourceFileVersion,
  onCreateSheet,
  onDeleteSheet,
  onSelectSheet,
  onAddView,
  onDeleteView,
  onSyncWithFile,
  onGenerateViews,
  onExportDXF,
  onExportPDF
}: DrawingControlsProps) {
  const [showNewSheetDialog, setShowNewSheetDialog] = useState(false);
  const [showAddViewDialog, setShowAddViewDialog] = useState(false);
  const [newSheetName, setNewSheetName] = useState('Sheet 1');
  const [newSheetSize, setNewSheetSize] = useState('A3');
  const [newSheetOrientation, setNewSheetOrientation] = useState('landscape');
  const [newViewType, setNewViewType] = useState<ViewType>('orthographic');
  const [newViewName, setNewViewName] = useState('Front View');
  const [newViewDirection, setNewViewDirection] = useState<OrthographicDirection>('front');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['sheets', 'views']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCreateSheet = () => {
    onCreateSheet(newSheetName, newSheetSize, newSheetOrientation);
    setShowNewSheetDialog(false);
    setNewSheetName('Sheet 1');
  };

  const handleAddView = () => {
    onAddView(newViewType, newViewName, newViewType === 'orthographic' ? newViewDirection : undefined);
    setShowAddViewDialog(false);
    setNewViewName('View');
  };

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h2 className="text-lg font-semibold">📐 Drawing Editor</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Sheets Section */}
        <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <button
            onClick={() => toggleSection('sheets')}
            className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <span>📄 Sheets ({sheets.length})</span>
            <span>{expandedSections.has('sheets') ? '▼' : '▶'}</span>
          </button>
          
          {expandedSections.has('sheets') && (
            <div className="p-4 space-y-3">
              {/* Create Sheet Button */}
              <button
                onClick={() => setShowNewSheetDialog(true)}
                className={`w-full px-4 py-2 rounded border-2 border-dashed font-medium ${
                  darkMode
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                + New Sheet
              </button>

              {/* Sheet List */}
              {sheets.length === 0 ? (
                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No sheets yet. Create one to get started!
                </p>
              ) : (
                sheets.map(s => (
                  <div
                    key={s.id}
                    className={`p-3 rounded border cursor-pointer ${
                      sheet?.id === s.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => onSelectSheet(s.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{s.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSheet(s.id);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          darkMode
                            ? 'hover:bg-red-900/50 text-red-400'
                            : 'hover:bg-red-100 text-red-600'
                        }`}
                        title="Delete Sheet"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {s.size} • {s.orientation} • {s.views.length} view{s.views.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Views Section */}
        {sheet && (
          <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button
              onClick={() => toggleSection('views')}
              className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>👁️ Views ({sheet.views.length})</span>
              <span>{expandedSections.has('views') ? '▼' : '▶'}</span>
            </button>
            
            {expandedSections.has('views') && (
              <div className="p-4 space-y-3">
                {/* Add View Button */}
                <button
                  onClick={() => setShowAddViewDialog(true)}
                  className={`w-full px-4 py-2 rounded border-2 border-dashed font-medium ${
                    darkMode
                      ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  + Add View
                </button>

                {/* Auto-generate Views */}
                <button
                  onClick={onGenerateViews}
                  className="w-full px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  ⚡ Auto-Generate Views
                </button>

                {/* View List */}
                {sheet.views.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No views yet. Add or auto-generate views!
                  </p>
                ) : (
                  sheet.views.map(view => (
                    <div
                      key={view.id}
                      className={`p-3 rounded border ${
                        selectedViewId === view.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : darkMode
                          ? 'border-gray-600 bg-gray-700/50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{view.name}</span>
                        <button
                          onClick={() => onDeleteView(view.id)}
                          className={`px-2 py-1 text-xs rounded ${
                            darkMode
                              ? 'hover:bg-red-900/50 text-red-400'
                              : 'hover:bg-red-100 text-red-600'
                          }`}
                          title="Delete View"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {view.type}
                        {view.orthographicDirection && ` • ${view.orthographicDirection}`}
                        {` • Scale: ${view.scale}:1`}
                        <br />
                        {view.edges.length} edges • {view.dimensions.length} dims
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* File Sync Section */}
        {sheet && (
          <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button
              onClick={() => toggleSection('sync')}
              className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>🔄 File Sync</span>
              <span>{expandedSections.has('sync') ? '▼' : '▶'}</span>
            </button>
            
            {expandedSections.has('sync') && (
              <div className="p-4 space-y-3">
                {sourceFileId ? (
                  <>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div>File ID: {sourceFileId}</div>
                      <div>Version: {sourceFileVersion || 'N/A'}</div>
                      <div className={sheet.sourceFileVersion === sourceFileVersion ? 'text-green-500' : 'text-orange-500'}>
                        {sheet.sourceFileVersion === sourceFileVersion ? '✓ In Sync' : '⚠ Out of Sync'}
                      </div>
                    </div>
                    <button
                      onClick={() => sourceFileVersion && onSyncWithFile(sourceFileId, sourceFileVersion)}
                      disabled={sheet.sourceFileVersion === sourceFileVersion}
                      className={`w-full px-4 py-2 rounded font-medium ${
                        sheet.sourceFileVersion === sourceFileVersion
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {sheet.sourceFileVersion === sourceFileVersion ? '✓ Up to Date' : '🔄 Sync to Latest'}
                    </button>
                  </>
                ) : (
                  <p className={`text-sm text-center py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No source file linked
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export Section */}
        {sheet && (
          <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button
              onClick={() => toggleSection('export')}
              className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>💾 Export</span>
              <span>{expandedSections.has('export') ? '▼' : '▶'}</span>
            </button>
            
            {expandedSections.has('export') && (
              <div className="p-4 space-y-2">
                <button
                  onClick={onExportPDF}
                  className="w-full px-4 py-2 rounded font-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={onExportDXF}
                  className="w-full px-4 py-2 rounded font-medium bg-purple-600 hover:bg-purple-700 text-white"
                >
                  📐 Export DXF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Sheet Dialog */}
      {showNewSheetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewSheetDialog(false)}>
          <div
            className={`w-96 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <h3 className="text-lg font-semibold">Create New Sheet</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sheet Name</label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sheet Size</label>
                <select
                  value={newSheetSize}
                  onChange={(e) => setNewSheetSize(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="A4">A4 (210 × 297mm)</option>
                  <option value="A3">A3 (297 × 420mm)</option>
                  <option value="A2">A2 (420 × 594mm)</option>
                  <option value="A1">A1 (594 × 841mm)</option>
                  <option value="A0">A0 (841 × 1189mm)</option>
                  <option value="B">ANSI B (11×17)</option>
                  <option value="C">ANSI C (17×22)</option>
                  <option value="D">ANSI D (22×34)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Orientation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewSheetOrientation('portrait')}
                    className={`flex-1 px-4 py-2 rounded ${
                      newSheetOrientation === 'portrait'
                        ? 'bg-blue-600 text-white'
                        : darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setNewSheetOrientation('landscape')}
                    className={`flex-1 px-4 py-2 rounded ${
                      newSheetOrientation === 'landscape'
                        ? 'bg-blue-600 text-white'
                        : darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex gap-3`}>
              <button
                onClick={() => setShowNewSheetDialog(false)}
                className={`flex-1 px-4 py-2 rounded font-medium ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSheet}
                className="flex-1 px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add View Dialog */}
      {showAddViewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddViewDialog(false)}>
          <div
            className={`w-96 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <h3 className="text-lg font-semibold">Add View</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">View Type</label>
                <select
                  value={newViewType}
                  onChange={(e) => setNewViewType(e.target.value as ViewType)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="orthographic">Orthographic</option>
                  <option value="isometric">Isometric</option>
                  <option value="section">Section</option>
                  <option value="detail">Detail</option>
                  <option value="auxiliary">Auxiliary</option>
                </select>
              </div>
              {newViewType === 'orthographic' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Direction</label>
                  <select
                    value={newViewDirection}
                    onChange={(e) => setNewViewDirection(e.target.value as OrthographicDirection)}
                    className={`w-full px-3 py-2 rounded border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">View Name</label>
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex gap-3`}>
              <button
                onClick={() => setShowAddViewDialog(false)}
                className={`flex-1 px-4 py-2 rounded font-medium ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddView}
                className="flex-1 px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

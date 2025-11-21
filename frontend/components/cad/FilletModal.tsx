'use client';

import { useState } from 'react';

interface FilletModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onApply: (edgeIndices: number[], radius: number, variableRadii?: Map<number, number>) => void;
  availableEdges: number; // Total number of edges in selected feature
}

export default function FilletModal({
  isOpen,
  darkMode,
  onClose,
  onApply,
  availableEdges
}: FilletModalProps) {
  if (!isOpen) return null;
  const [radius, setRadius] = useState(2);
  const [selectedEdges, setSelectedEdges] = useState<number[]>([]);
  const [variableRadius, setVariableRadius] = useState(false);
  const [edgeRadii, setEdgeRadii] = useState<Map<number, number>>(new Map());
  const [blendType, setBlendType] = useState<'rolling-ball' | 'constant-radius'>('rolling-ball');

  const handleApply = () => {
    if (selectedEdges.length === 0) {
      alert('Please select at least one edge');
      return;
    }

    const radiiMap = variableRadius && edgeRadii.size > 0 ? edgeRadii : undefined;
    onApply(selectedEdges, radius, radiiMap);
    onClose();
  };

  const handleEdgeToggle = (edgeIndex: number) => {
    setSelectedEdges(prev => {
      if (prev.includes(edgeIndex)) {
        // Remove edge
        const newEdges = prev.filter(e => e !== edgeIndex);
        // Remove from variable radii
        if (edgeRadii.has(edgeIndex)) {
          const newRadii = new Map(edgeRadii);
          newRadii.delete(edgeIndex);
          setEdgeRadii(newRadii);
        }
        return newEdges;
      } else {
        // Add edge
        return [...prev, edgeIndex];
      }
    });
  };

  const handleEdgeRadiusChange = (edgeIndex: number, value: number) => {
    const newRadii = new Map(edgeRadii);
    newRadii.set(edgeIndex, value);
    setEdgeRadii(newRadii);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Fillet Edges</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Blend Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Blend Type</label>
            <select
              value={blendType}
              onChange={(e) => setBlendType(e.target.value as any)}
              className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <option value="rolling-ball">Rolling Ball (Smooth)</option>
              <option value="constant-radius">Constant Radius</option>
            </select>
          </div>

          {/* Default Radius */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Radius: {radius.toFixed(2)} mm
            </label>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value) || 0.1)}
              className={`w-full mt-2 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              step="0.1"
              min="0.1"
            />
          </div>

          {/* Variable Radius Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="variableRadius"
              checked={variableRadius}
              onChange={(e) => setVariableRadius(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="variableRadius" className="text-sm">
              Variable radius per edge
            </label>
          </div>

          {/* Edge Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Select Edges ({selectedEdges.length} selected)
              </label>
              <button
                onClick={() => {
                  if (selectedEdges.length === availableEdges) {
                    // Deselect all
                    setSelectedEdges([]);
                    setEdgeRadii(new Map());
                  } else {
                    // Select all
                    setSelectedEdges(Array.from({ length: availableEdges }, (_, i) => i));
                  }
                }}
                className={`px-3 py-1 text-xs rounded font-medium transition ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-black'
                }`}
                disabled={availableEdges === 0}
              >
                {selectedEdges.length === availableEdges ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className={`border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded p-3 max-h-[200px] overflow-y-auto`}>
              {availableEdges === 0 ? (
                <p className="text-sm text-gray-500">
                  No edges available. Please select a feature with BREP topology.
                </p>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: availableEdges }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edge-${i}`}
                        checked={selectedEdges.includes(i)}
                        onChange={() => handleEdgeToggle(i)}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`edge-${i}`} className="flex-1 text-sm">
                        Edge {i + 1}
                      </label>
                      
                      {variableRadius && selectedEdges.includes(i) && (
                        <input
                          type="number"
                          value={edgeRadii.get(i) ?? radius}
                          onChange={(e) => handleEdgeRadiusChange(i, parseFloat(e.target.value) || 0.1)}
                          className={`w-20 px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                          step="0.1"
                          min="0.1"
                          placeholder="Radius"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className={`text-xs p-3 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            <strong>💡 Tip:</strong> Select edges in the viewport by clicking them while in fillet mode.
            Rolling ball method creates smooth G1 continuous blends.
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition"
              disabled={selectedEdges.length === 0}
            >
              Apply Fillet
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded font-medium transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-black'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

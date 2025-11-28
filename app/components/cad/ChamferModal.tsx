'use client';

import { useState } from 'react';

interface ChamferModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onApply: (edgeIndices: number[], distance1: number, distance2?: number, angle?: number) => void;
  availableEdges: number; // Total number of edges in selected feature
}

export default function ChamferModal({
  isOpen,
  darkMode,
  onClose,
  onApply,
  availableEdges
}: ChamferModalProps) {
  if (!isOpen) return null;
  const [selectedEdges, setSelectedEdges] = useState<number[]>([]);
  const [chamferType, setChamferType] = useState<'distance-distance' | 'distance-angle'>('distance-distance');
  const [distance1, setDistance1] = useState(2);
  const [distance2, setDistance2] = useState(2);
  const [angle, setAngle] = useState(45);

  const handleApply = () => {
    if (selectedEdges.length === 0) {
      alert('Please select at least one edge');
      return;
    }

    if (chamferType === 'distance-distance') {
      onApply(selectedEdges, distance1, distance2, undefined);
    } else {
      onApply(selectedEdges, distance1, undefined, angle);
    }
    onClose();
  };

  const handleEdgeToggle = (edgeIndex: number) => {
    setSelectedEdges(prev => {
      if (prev.includes(edgeIndex)) {
        return prev.filter(e => e !== edgeIndex);
      } else {
        return [...prev, edgeIndex];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEdges.length === availableEdges) {
      setSelectedEdges([]);
    } else {
      setSelectedEdges(Array.from({ length: availableEdges }, (_, i) => i));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Chamfer Edges</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Chamfer Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Chamfer Type</label>
            <select
              value={chamferType}
              onChange={(e) => setChamferType(e.target.value as any)}
              className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <option value="distance-distance">Distance-Distance (Symmetric/Asymmetric)</option>
              <option value="distance-angle">Distance-Angle</option>
            </select>
          </div>

          {/* Distance/Angle Parameters */}
          {chamferType === 'distance-distance' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Distance 1: {distance1.toFixed(2)} mm
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={distance1}
                  onChange={(e) => setDistance1(parseFloat(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  value={distance1}
                  onChange={(e) => setDistance1(parseFloat(e.target.value) || 0.1)}
                  className={`w-full mt-2 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                  min="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Distance 2: {distance2.toFixed(2)} mm
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={distance2}
                  onChange={(e) => setDistance2(parseFloat(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  value={distance2}
                  onChange={(e) => setDistance2(parseFloat(e.target.value) || 0.1)}
                  className={`w-full mt-2 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                  min="0.1"
                />
              </div>

              <div className={`text-xs p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {distance1 === distance2 ? (
                  <span>✓ Symmetric chamfer ({distance1.toFixed(2)} mm)</span>
                ) : (
                  <span>⚠ Asymmetric chamfer ({distance1.toFixed(2)} mm × {distance2.toFixed(2)} mm)</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Distance: {distance1.toFixed(2)} mm
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={distance1}
                  onChange={(e) => setDistance1(parseFloat(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  value={distance1}
                  onChange={(e) => setDistance1(parseFloat(e.target.value) || 0.1)}
                  className={`w-full mt-2 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                  min="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Angle: {angle.toFixed(1)}°
                </label>
                <input
                  type="range"
                  min="1"
                  max="89"
                  step="1"
                  value={angle}
                  onChange={(e) => setAngle(parseFloat(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  value={angle}
                  onChange={(e) => setAngle(parseFloat(e.target.value) || 45)}
                  className={`w-full mt-2 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="1"
                  min="1"
                  max="89"
                />
              </div>

              <div className={`text-xs p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                Effective Distance 2: {(distance1 * Math.tan(angle * Math.PI / 180)).toFixed(2)} mm
              </div>
            </>
          )}

          {/* Edge Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">
                Select Edges ({selectedEdges.length} selected)
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-500 hover:text-blue-400"
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
                      <label htmlFor={`edge-${i}`} className="flex-1 text-sm cursor-pointer">
                        Edge {i + 1}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className={`text-xs p-3 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            <strong>💡 Tip:</strong> Chamfers create flat beveled edges. 
            {chamferType === 'distance-distance' 
              ? ' Use equal distances for 45° chamfer, or different distances for asymmetric chamfers.'
              : ' Distance-angle mode calculates the second distance automatically.'}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition"
              disabled={selectedEdges.length === 0}
            >
              Apply Chamfer
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

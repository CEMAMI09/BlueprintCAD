'use client';

import { useState } from 'react';
import * as THREE from 'three';

interface FaceOperationsModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  selectedFaces: number[];
  operationType: 'offset' | 'delete' | 'replace' | 'mirror';
  onApply: (operation: string, params: any) => void;
}

export default function FaceOperationsModal({
  isOpen,
  darkMode,
  onClose,
  selectedFaces,
  operationType,
  onApply
}: FaceOperationsModalProps) {
  // Offset Face
  const [offsetDistance, setOffsetDistance] = useState(5);
  const [extendAdjacent, setExtendAdjacent] = useState(true);
  const [createShell, setCreateShell] = useState(false);

  // Delete Face
  const [healGeometry, setHealGeometry] = useState(true);
  const [healTolerance, setHealTolerance] = useState(0.01);

  // Replace Face
  const [replacementType, setReplacementType] = useState<'sphere' | 'cylinder' | 'plane'>('plane');
  const [blendEdges, setBlendEdges] = useState(true);
  const [replaceTolerance, setReplaceTolerance] = useState(0.01);

  // Mirror
  const [mirrorPlane, setMirrorPlane] = useState<'xy' | 'xz' | 'yz' | 'custom'>('xy');
  const [mirrorHeight, setMirrorHeight] = useState(0);
  const [mergeMirrored, setMergeMirrored] = useState(true);

  const handleApply = () => {
    switch (operationType) {
      case 'offset':
        onApply('offset', {
          faceIndices: selectedFaces,
          offsetDistance,
          extendAdjacent,
          createShell
        });
        break;

      case 'delete':
        onApply('delete', {
          faceIndices: selectedFaces,
          healGeometry,
          tolerance: healTolerance
        });
        break;

      case 'replace':
        onApply('replace', {
          faceIndex: selectedFaces[0],
          replacementType,
          blendEdges,
          tolerance: replaceTolerance
        });
        break;

      case 'mirror':
        onApply('mirror', {
          plane: mirrorPlane,
          height: mirrorHeight,
          mergeMirrored
        });
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto`}>
        <h2 className="text-2xl font-bold mb-4">
          {operationType === 'offset' && 'Offset Face'}
          {operationType === 'delete' && 'Delete Face'}
          {operationType === 'replace' && 'Replace Face'}
          {operationType === 'mirror' && 'Mirror Geometry'}
        </h2>

        {/* Selected Faces Info */}
        <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <div className="text-sm">
            <strong>Selected Faces:</strong> {selectedFaces.length}
          </div>
        </div>

        {/* Offset Face Options */}
        {operationType === 'offset' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Offset Distance: {offsetDistance.toFixed(2)} mm
              </label>
              <input
                type="range"
                min="-50"
                max="50"
                step="0.5"
                value={offsetDistance}
                onChange={(e) => setOffsetDistance(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                value={offsetDistance}
                onChange={(e) => setOffsetDistance(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                step="0.1"
              />
              <div className="flex justify-between text-xs mt-1">
                <span>Inset (-50mm)</span>
                <span>Outset (+50mm)</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extendAdjacent}
                  onChange={(e) => setExtendAdjacent(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Extend Adjacent Faces</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Automatically extend neighboring faces to meet offset surface
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createShell}
                  onChange={(e) => setCreateShell(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Create Shell/Walls</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Connect original faces to offset faces with walls
              </p>
            </div>
          </>
        )}

        {/* Delete Face Options */}
        {operationType === 'delete' && (
          <>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={healGeometry}
                  onChange={(e) => setHealGeometry(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Heal Geometry</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Automatically fill holes created by deletion
              </p>
            </div>

            {healGeometry && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Healing Tolerance: {healTolerance.toFixed(3)} mm
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={healTolerance}
                  onChange={(e) => setHealTolerance(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <div className={`p-3 rounded ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border ${darkMode ? 'border-yellow-700' : 'border-yellow-300'}`}>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ <strong>Warning:</strong> Deleting faces may create invalid geometry.
                Enable healing to automatically patch holes.
              </div>
            </div>
          </>
        )}

        {/* Replace Face Options */}
        {operationType === 'replace' && (
          <>
            {selectedFaces.length !== 1 && (
              <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border ${darkMode ? 'border-red-700' : 'border-red-300'}`}>
                <div className="text-sm text-red-600 dark:text-red-400">
                  ⚠️ Replace Face requires exactly 1 face to be selected.
                  Currently selected: {selectedFaces.length}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Replacement Geometry</label>
              <select
                value={replacementType}
                onChange={(e) => setReplacementType(e.target.value as any)}
                className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <option value="plane">Flat Plane</option>
                <option value="sphere">Spherical Surface</option>
                <option value="cylinder">Cylindrical Surface</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blendEdges}
                  onChange={(e) => setBlendEdges(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Blend Edges</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Smooth transition between replacement and adjacent faces
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Tolerance: {replaceTolerance.toFixed(3)} mm
              </label>
              <input
                type="range"
                min="0.001"
                max="1"
                step="0.001"
                value={replaceTolerance}
                onChange={(e) => setReplaceTolerance(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Mirror Options */}
        {operationType === 'mirror' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Mirror Plane</label>
              <select
                value={mirrorPlane}
                onChange={(e) => setMirrorPlane(e.target.value as any)}
                className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <option value="xy">XY Plane (Mirror along Z)</option>
                <option value="xz">XZ Plane (Mirror along Y)</option>
                <option value="yz">YZ Plane (Mirror along X)</option>
                <option value="custom">Custom Plane</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Plane Height: {mirrorHeight.toFixed(2)} mm
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={mirrorHeight}
                onChange={(e) => setMirrorHeight(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                value={mirrorHeight}
                onChange={(e) => setMirrorHeight(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                step="0.1"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeMirrored}
                  onChange={(e) => setMergeMirrored(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Merge with Original</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Combine mirrored geometry with original (creates symmetric part)
              </p>
            </div>

            <div className={`p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border ${darkMode ? 'border-blue-700' : 'border-blue-300'}`}>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                ℹ️ <strong>Tip:</strong> Mirror operations preserve all downstream features
                and update the feature tree automatically.
              </div>
            </div>
          </>
        )}

        {/* Feature Tree Notice */}
        <div className={`mt-4 p-3 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="font-medium mb-1">✓ Feature Tree Integration</div>
          <div className="text-xs text-gray-400">
            This operation will be recorded in the feature tree and all downstream
            features will be automatically regenerated.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleApply}
            disabled={operationType === 'replace' && selectedFaces.length !== 1}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Apply Operation
          </button>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import * as THREE from 'three';

interface PatternModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  patternType: 'linear' | 'circular' | 'curve' | 'fill';
  onApply: (params: any) => void;
}

export default function PatternModal({
  isOpen,
  darkMode,
  onClose,
  patternType,
  onApply
}: PatternModalProps) {
  // Linear pattern state
  const [linearDirection, setLinearDirection] = useState<'x' | 'y' | 'z'>('x');
  const [linearDistance, setLinearDistance] = useState(10);
  const [linearCount, setLinearCount] = useState(5);

  // Circular pattern state
  const [circularAxis, setCircularAxis] = useState<'x' | 'y' | 'z'>('z');
  const [circularCenter, setCircularCenter] = useState({ x: 0, y: 0, z: 0 });
  const [circularAngle, setCircularAngle] = useState(360);
  const [circularCount, setCircularCount] = useState(8);
  const [equalSpacing, setEqualSpacing] = useState(true);

  // Curve pattern state
  const [curveCount, setCurveCount] = useState(10);
  const [alignToTangent, setAlignToTangent] = useState(true);
  const [curveOffset, setCurveOffset] = useState(0);
  const [curvePoints, setCurvePoints] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(25, 25, 0),
    new THREE.Vector3(50, 0, 0)
  ]);

  // Fill pattern state
  const [fillSpacing, setFillSpacing] = useState(10);
  const [fillType, setFillType] = useState<'rectangular' | 'hexagonal' | 'circular'>('rectangular');
  const [fillBounds, setFillBounds] = useState({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
  const [fillRotation, setFillRotation] = useState(0);

  // Common state
  const [suppressedInstances, setSuppressedInstances] = useState<number[]>([]);
  const [featurePattern, setFeaturePattern] = useState(false);
  const [useNonUniformSpacing, setUseNonUniformSpacing] = useState(false);
  const [spacingType, setSpacingType] = useState<'increasing' | 'decreasing' | 'exponential'>('increasing');

  const count = patternType === 'linear' ? linearCount : 
                patternType === 'circular' ? circularCount :
                patternType === 'curve' ? curveCount : 10;

  const handleToggleInstance = (index: number) => {
    setSuppressedInstances(prev => {
      const set = new Set(prev);
      if (set.has(index)) {
        set.delete(index);
      } else {
        set.add(index);
      }
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  const handleSelectAll = () => {
    setSuppressedInstances([]);
  };

  const handleSelectNone = () => {
    setSuppressedInstances(Array.from({ length: count }, (_, i) => i));
  };

  const handleSelectOdd = () => {
    const odd = Array.from({ length: count }, (_, i) => i).filter(i => i % 2 === 1);
    setSuppressedInstances(odd);
  };

  const handleSelectEven = () => {
    const even = Array.from({ length: count }, (_, i) => i).filter(i => i % 2 === 0);
    setSuppressedInstances(even);
  };

  const handleApply = () => {
    if (patternType === 'linear') {
      const direction = {
        x: new THREE.Vector3(1, 0, 0),
        y: new THREE.Vector3(0, 1, 0),
        z: new THREE.Vector3(0, 0, 1)
      }[linearDirection];

      onApply({
        type: 'linear',
        direction,
        distance: linearDistance,
        count: linearCount,
        suppressedInstances,
        patternType: featurePattern ? 'feature' : 'geometry',
        spacing: useNonUniformSpacing ? 'non-uniform' : 'uniform',
        spacingType: useNonUniformSpacing ? spacingType : undefined
      });
    } else if (patternType === 'circular') {
      const axis = {
        x: new THREE.Vector3(1, 0, 0),
        y: new THREE.Vector3(0, 1, 0),
        z: new THREE.Vector3(0, 0, 1)
      }[circularAxis];

      const center = new THREE.Vector3(
        circularCenter.x,
        circularCenter.y,
        circularCenter.z
      );

      onApply({
        type: 'circular',
        axis,
        center,
        angle: circularAngle,
        count: circularCount,
        suppressedInstances,
        equalSpacing,
        patternType: featurePattern ? 'feature' : 'geometry'
      });
    } else if (patternType === 'curve') {
      onApply({
        type: 'curve',
        curvePoints,
        count: curveCount,
        suppressedInstances,
        alignToTangent,
        offset: curveOffset,
        patternType: featurePattern ? 'feature' : 'geometry',
        spacing: useNonUniformSpacing ? 'non-uniform' : 'uniform',
        spacingType: useNonUniformSpacing ? spacingType : undefined
      });
    } else if (patternType === 'fill') {
      const bounds = new THREE.Box3(
        new THREE.Vector3(fillBounds.minX, fillBounds.minY, 0),
        new THREE.Vector3(fillBounds.maxX, fillBounds.maxY, 0)
      );

      onApply({
        type: 'fill',
        bounds,
        fillType,
        spacing: fillSpacing,
        rotation: fillRotation,
        suppressedInstances,
        patternType: featurePattern ? 'feature' : 'geometry'
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto`}>
        <h2 className="text-2xl font-bold mb-4">
          {patternType === 'linear' ? 'Linear Pattern' : 'Circular Pattern'}
        </h2>

        {/* Linear Pattern Options */}
        {patternType === 'linear' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setLinearDirection('x')}
                  className={`px-4 py-2 rounded ${
                    linearDirection === 'x'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  X Axis
                </button>
                <button
                  onClick={() => setLinearDirection('y')}
                  className={`px-4 py-2 rounded ${
                    linearDirection === 'y'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Y Axis
                </button>
                <button
                  onClick={() => setLinearDirection('z')}
                  className={`px-4 py-2 rounded ${
                    linearDirection === 'z'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Z Axis
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Distance: {linearDistance} mm
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={linearDistance}
                onChange={(e) => setLinearDistance(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                value={linearDistance}
                onChange={(e) => setLinearDistance(parseFloat(e.target.value) || 1)}
                className={`w-full px-3 py-2 rounded mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                step="0.1"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Count: {linearCount} instances
              </label>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={linearCount}
                onChange={(e) => setLinearCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Curve Pattern Options */}
        {patternType === 'curve' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Count: {curveCount} instances
              </label>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={curveCount}
                onChange={(e) => setCurveCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alignToTangent}
                  onChange={(e) => setAlignToTangent(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Align to Curve Tangent</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                Orient instances along curve direction
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Perpendicular Offset: {curveOffset} mm
              </label>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={curveOffset}
                onChange={(e) => setCurveOffset(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Positive values offset outward from curve
              </p>
            </div>

            <div className={`p-3 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <strong>Curve Pattern</strong> distributes instances along a path.
              The curve is defined by the selected edge or sketch.
            </div>
          </>
        )}

        {/* Fill Pattern Options */}
        {patternType === 'fill' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fill Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFillType('rectangular')}
                  className={`px-4 py-2 rounded ${
                    fillType === 'rectangular'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Rectangular
                </button>
                <button
                  onClick={() => setFillType('hexagonal')}
                  className={`px-4 py-2 rounded ${
                    fillType === 'hexagonal'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Hexagonal
                </button>
                <button
                  onClick={() => setFillType('circular')}
                  className={`px-4 py-2 rounded ${
                    fillType === 'circular'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Circular
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Spacing: {fillSpacing} mm
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={fillSpacing}
                onChange={(e) => setFillSpacing(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fill Bounds</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min X"
                  value={fillBounds.minX}
                  onChange={(e) => setFillBounds({ ...fillBounds, minX: parseFloat(e.target.value) || 0 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                />
                <input
                  type="number"
                  placeholder="Min Y"
                  value={fillBounds.minY}
                  onChange={(e) => setFillBounds({ ...fillBounds, minY: parseFloat(e.target.value) || 0 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                />
                <input
                  type="number"
                  placeholder="Max X"
                  value={fillBounds.maxX}
                  onChange={(e) => setFillBounds({ ...fillBounds, maxX: parseFloat(e.target.value) || 100 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                />
                <input
                  type="number"
                  placeholder="Max Y"
                  value={fillBounds.maxY}
                  onChange={(e) => setFillBounds({ ...fillBounds, maxY: parseFloat(e.target.value) || 100 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Rotation: {fillRotation}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={fillRotation}
                onChange={(e) => setFillRotation(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className={`p-3 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <strong>Fill Pattern</strong> fills a region with instances.
              Estimated instances: {Math.ceil((fillBounds.maxX - fillBounds.minX) / fillSpacing) * Math.ceil((fillBounds.maxY - fillBounds.minY) / fillSpacing)}
            </div>
          </>
        )}

        {/* Circular Pattern Options */}
        {patternType === 'circular' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rotation Axis</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCircularAxis('x')}
                  className={`px-4 py-2 rounded ${
                    circularAxis === 'x'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  X Axis
                </button>
                <button
                  onClick={() => setCircularAxis('y')}
                  className={`px-4 py-2 rounded ${
                    circularAxis === 'y'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Y Axis
                </button>
                <button
                  onClick={() => setCircularAxis('z')}
                  className={`px-4 py-2 rounded ${
                    circularAxis === 'z'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Z Axis
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Center Point</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="X"
                  value={circularCenter.x}
                  onChange={(e) => setCircularCenter({ ...circularCenter, x: parseFloat(e.target.value) || 0 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={circularCenter.y}
                  onChange={(e) => setCircularCenter({ ...circularCenter, y: parseFloat(e.target.value) || 0 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={circularCenter.z}
                  onChange={(e) => setCircularCenter({ ...circularCenter, z: parseFloat(e.target.value) || 0 })}
                  className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  step="0.1"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Angle: {circularAngle}°
              </label>
              <input
                type="range"
                min="1"
                max="360"
                step="1"
                value={circularAngle}
                onChange={(e) => setCircularAngle(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1">
                <span>1°</span>
                <span>360° (Full Circle)</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Count: {circularCount} instances
              </label>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={circularCount}
                onChange={(e) => setCircularCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={equalSpacing}
                  onChange={(e) => setEqualSpacing(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Equal Spacing</span>
              </label>
              <p className="text-xs text-gray-400 ml-6 mt-1">
                {equalSpacing 
                  ? `Distribute ${circularCount} instances evenly over ${circularAngle}°`
                  : `Space instances ${circularAngle}° apart`
                }
              </p>
            </div>
          </>
        )}

        {/* Pattern Type */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={featurePattern}
              onChange={(e) => setFeaturePattern(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Pattern Full Feature (includes history)</span>
          </label>
          <p className="text-xs text-gray-400 ml-6 mt-1">
            {featurePattern
              ? 'Each instance will replay the full feature history'
              : 'Pattern only the final geometry (faster)'
            }
          </p>
        </div>

        {/* Non-Uniform Spacing */}
        {(patternType === 'linear' || patternType === 'curve') && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useNonUniformSpacing}
                onChange={(e) => setUseNonUniformSpacing(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Non-Uniform Spacing</span>
            </label>
            
            {useNonUniformSpacing && (
              <div className="ml-6 mt-2">
                <label className="block text-sm font-medium mb-2">Spacing Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSpacingType('increasing')}
                    className={`px-3 py-2 rounded text-sm ${
                      spacingType === 'increasing'
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  >
                    Increasing
                  </button>
                  <button
                    onClick={() => setSpacingType('decreasing')}
                    className={`px-3 py-2 rounded text-sm ${
                      spacingType === 'decreasing'
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  >
                    Decreasing
                  </button>
                  <button
                    onClick={() => setSpacingType('exponential')}
                    className={`px-3 py-2 rounded text-sm ${
                      spacingType === 'exponential'
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  >
                    Exponential
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {spacingType === 'increasing' && 'Spacing increases linearly (1, 2, 3, 4...)'}
                  {spacingType === 'decreasing' && 'Spacing decreases linearly (n, n-1, n-2...)'}
                  {spacingType === 'exponential' && 'Spacing increases exponentially (1, 2, 4, 8...)'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instance Suppression */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              Instance Selection ({count - suppressedInstances.length}/{count} active)
            </label>
            <div className="flex gap-1">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
              >
                All
              </button>
              <button
                onClick={handleSelectNone}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
              >
                None
              </button>
              <button
                onClick={handleSelectOdd}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              >
                Odd
              </button>
              <button
                onClick={handleSelectEven}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              >
                Even
              </button>
            </div>
          </div>

          <div className={`p-3 rounded max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleToggleInstance(i)}
                  className={`w-10 h-10 rounded text-sm font-medium transition ${
                    suppressedInstances.includes(i)
                      ? darkMode ? 'bg-gray-600 text-gray-400 line-through' : 'bg-gray-300 text-gray-500 line-through'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={suppressedInstances.includes(i) ? 'Suppressed - Click to enable' : 'Active - Click to suppress'}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Click instances to suppress/unsuppress. Suppressed instances won't be created.
          </p>
        </div>

        {/* Statistics */}
        <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span>Total Instances:</span>
              <span className="font-medium">{count}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Active Instances:</span>
              <span className="font-medium text-green-500">{count - suppressedInstances.length}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Suppressed Instances:</span>
              <span className="font-medium text-red-500">{suppressedInstances.length}</span>
            </div>
            {patternType === 'linear' && (
              <div className="flex justify-between">
                <span>Total Length:</span>
                <span className="font-medium">{(linearDistance * (linearCount - 1)).toFixed(1)} mm</span>
              </div>
            )}
            {patternType === 'circular' && (
              <div className="flex justify-between">
                <span>Angular Spacing:</span>
                <span className="font-medium">
                  {equalSpacing 
                    ? (circularAngle / (circularCount - 1)).toFixed(1)
                    : circularAngle
                  }° per instance
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Pattern
          </button>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
        </div>

        {/* Help Text */}
        <div className={`mt-4 p-3 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <strong>Pattern Features</strong> create repeated copies of geometry or full features.
          Suppressed instances are stored in the feature tree and can be re-enabled later.
        </div>
      </div>
    </div>
  );
}

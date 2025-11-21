'use client';

import { useState } from 'react';
import { MateType, GeometryType, GeometryReference } from '@/backend/lib/cad/mate-system';

interface MateEditorProps {
  darkMode: boolean;
  onCreateMate: (
    name: string,
    type: MateType,
    geometry1: GeometryReference | null,
    geometry2: GeometryReference | null,
    options?: {
      offset?: number;
      angle?: number;
      limits?: { min?: number; max?: number };
    }
  ) => void;
  onPickGeometry: (slotIndex: 1 | 2) => void;
  geometry1: GeometryReference | null;
  geometry2: GeometryReference | null;
  pickingSlot: 1 | 2 | null;
}

const MATE_TYPES = [
  { value: MateType.FIXED, label: 'Fixed', icon: '🔒', dof: 0, desc: 'Completely locked' },
  { value: MateType.REVOLUTE, label: 'Revolute', icon: '🔄', dof: 1, desc: 'Rotation around axis' },
  { value: MateType.SLIDER, label: 'Slider', icon: '↔️', dof: 1, desc: 'Translation along axis' },
  { value: MateType.PLANAR, label: 'Planar', icon: '📐', dof: 3, desc: 'Move in plane' },
  { value: MateType.CYLINDRICAL, label: 'Cylindrical', icon: '🔩', dof: 2, desc: 'Rotate + slide' },
  { value: MateType.BALL, label: 'Ball', icon: '⚽', dof: 3, desc: 'Rotate around point' }
];

const GEOMETRY_TYPES = [
  { value: GeometryType.FACE, label: 'Face', icon: '▭' },
  { value: GeometryType.EDGE, label: 'Edge', icon: '⎯' },
  { value: GeometryType.VERTEX, label: 'Vertex', icon: '•' },
  { value: GeometryType.POINT, label: 'Point', icon: '·' },
  { value: GeometryType.AXIS, label: 'Axis', icon: '⎯' },
  { value: GeometryType.PLANE, label: 'Plane', icon: '▭' }
];

export default function MateEditor({
  darkMode,
  onCreateMate,
  onPickGeometry,
  geometry1,
  geometry2,
  pickingSlot
}: MateEditorProps) {
  const [mateName, setMateName] = useState('Mate 1');
  const [mateType, setMateType] = useState<MateType>(MateType.FIXED);
  const [offset, setOffset] = useState<number>(0);
  const [angle, setAngle] = useState<number>(0);
  const [hasLimits, setHasLimits] = useState(false);
  const [limitMin, setLimitMin] = useState<number>(0);
  const [limitMax, setLimitMax] = useState<number>(100);
  const [pickMode, setPickMode] = useState<GeometryType>(GeometryType.FACE);

  const handleCreate = () => {
    if (!geometry1 || !geometry2) {
      alert('Please select both geometries');
      return;
    }

    onCreateMate(
      mateName,
      mateType,
      geometry1,
      geometry2,
      {
        offset: offset !== 0 ? offset : undefined,
        angle: angle !== 0 ? angle : undefined,
        limits: hasLimits ? { min: limitMin, max: limitMax } : undefined
      }
    );

    // Reset form
    setMateName(`Mate ${Date.now() % 1000}`);
    setOffset(0);
    setAngle(0);
    setHasLimits(false);
  };

  const formatGeometry = (geo: GeometryReference | null): string => {
    if (!geo) return 'Not selected';
    const typeLabel = GEOMETRY_TYPES.find(t => t.value === geo.type)?.label || geo.type;
    return `${typeLabel} on Instance ${geo.instanceId.substring(0, 8)}...`;
  };

  const selectedMateInfo = MATE_TYPES.find(m => m.value === mateType);

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <h3 className="font-semibold text-lg">Create Mate</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Mate Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={mateName}
            onChange={(e) => setMateName(e.target.value)}
            className={`w-full px-3 py-2 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border`}
            placeholder="Mate name"
          />
        </div>

        {/* Mate Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Mate Type</label>
          <div className="grid grid-cols-2 gap-2">
            {MATE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setMateType(type.value)}
                className={`px-3 py-2 rounded text-sm font-medium transition border ${
                  mateType === type.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                }`}
                title={type.desc}
              >
                <div className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-70">{type.dof} DOF</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {selectedMateInfo && (
            <div className={`mt-2 text-xs p-2 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              {selectedMateInfo.desc} • {selectedMateInfo.dof} degrees of freedom
            </div>
          )}
        </div>

        {/* Pick Mode */}
        <div>
          <label className="block text-sm font-medium mb-2">Geometry Type</label>
          <div className="grid grid-cols-3 gap-2">
            {GEOMETRY_TYPES.slice(0, 3).map((type) => (
              <button
                key={type.value}
                onClick={() => setPickMode(type.value)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition border ${
                  pickMode === type.value
                    ? 'bg-green-600 border-green-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Geometry Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Geometry Selection</label>
          
          {/* Geometry 1 */}
          <div className={`p-3 rounded border ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-300 bg-gray-50'} ${pickingSlot === 1 ? 'ring-2 ring-green-500' : ''}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">Geometry 1</span>
              <button
                onClick={() => onPickGeometry(1)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  pickingSlot === 1
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {pickingSlot === 1 ? '🎯 Picking...' : '🖱️ Pick'}
              </button>
            </div>
            <div className="text-xs opacity-70">
              {formatGeometry(geometry1)}
            </div>
          </div>

          {/* Geometry 2 */}
          <div className={`p-3 rounded border ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-300 bg-gray-50'} ${pickingSlot === 2 ? 'ring-2 ring-green-500' : ''}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">Geometry 2</span>
              <button
                onClick={() => onPickGeometry(2)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  pickingSlot === 2
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {pickingSlot === 2 ? '🎯 Picking...' : '🖱️ Pick'}
              </button>
            </div>
            <div className="text-xs opacity-70">
              {formatGeometry(geometry2)}
            </div>
          </div>
        </div>

        {/* Offset (for slider, planar, cylindrical) */}
        {(mateType === MateType.SLIDER || mateType === MateType.PLANAR || mateType === MateType.CYLINDRICAL) && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Offset: {offset.toFixed(2)} mm
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.5"
              value={offset}
              onChange={(e) => setOffset(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
              className={`w-full mt-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border`}
              step="0.5"
            />
          </div>
        )}

        {/* Angle (for revolute) */}
        {mateType === MateType.REVOLUTE && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Angle: {(angle * 180 / Math.PI).toFixed(1)}°
            </label>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.01"
              value={angle}
              onChange={(e) => setAngle(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              value={(angle * 180 / Math.PI).toFixed(1)}
              onChange={(e) => setAngle((parseFloat(e.target.value) || 0) * Math.PI / 180)}
              className={`w-full mt-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border`}
              step="1"
            />
          </div>
        )}

        {/* Limits */}
        {(mateType === MateType.REVOLUTE || mateType === MateType.SLIDER) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="hasLimits"
                checked={hasLimits}
                onChange={(e) => setHasLimits(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="hasLimits" className="text-sm font-medium">
                Motion Limits
              </label>
            </div>
            
            {hasLimits && (
              <div className="space-y-2 pl-6">
                <div>
                  <label className="block text-xs mb-1">Minimum: {limitMin.toFixed(2)}</label>
                  <input
                    type="number"
                    value={limitMin}
                    onChange={(e) => setLimitMin(parseFloat(e.target.value) || 0)}
                    className={`w-full px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border`}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Maximum: {limitMax.toFixed(2)}</label>
                  <input
                    type="number"
                    value={limitMax}
                    onChange={(e) => setLimitMax(parseFloat(e.target.value) || 0)}
                    className={`w-full px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} border`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={!geometry1 || !geometry2}
          className={`w-full px-4 py-2 rounded font-medium transition ${
            !geometry1 || !geometry2
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          Create Mate
        </button>

        {/* Instructions */}
        <div className={`text-xs p-3 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
          <strong>💡 How to use:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Select mate type and geometry type</li>
            <li>Click "Pick" to select geometries in viewport</li>
            <li>Adjust parameters if needed</li>
            <li>Click "Create Mate" to apply</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

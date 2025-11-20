'use client';

import { useState, useEffect } from 'react';
import { Dimension } from '@/lib/cad/dimension-annotations';

interface DimensionEditorProps {
  isOpen: boolean;
  dimension: Dimension | null;
  darkMode: boolean;
  onClose: () => void;
  onSave: (dimensionId: string, newValue: number, options?: DimensionEditOptions) => void;
}

export interface DimensionEditOptions {
  precision?: number;
  units?: string;
  isDriving?: boolean;
  locked?: boolean;
  label?: string;
  tolerance?: { upper: number; lower: number } | null;
}

export default function DimensionEditor({
  isOpen,
  dimension,
  darkMode,
  onClose,
  onSave
}: DimensionEditorProps) {
  const [value, setValue] = useState<string>('');
  const [isDriving, setIsDriving] = useState(true);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState('');
  const [precision, setPrecision] = useState(2);
  const [units, setUnits] = useState('mm');
  const [toleranceEnabled, setToleranceEnabled] = useState(false);
  const [toleranceUpper, setToleranceUpper] = useState('0.1');
  const [toleranceLower, setToleranceLower] = useState('0.1');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (dimension) {
      setValue(dimension.isDriving ? (dimension.nominalValue ?? dimension.value).toString() : dimension.value.toString());
      setIsDriving(dimension.isDriving);
      setLocked(dimension.locked ?? false);
      setLabel(dimension.label ?? '');
      setPrecision(dimension.precision ?? 2);
      setUnits(dimension.units ?? 'mm');
      setToleranceEnabled(!!dimension.tolerance);
      if (dimension.tolerance) {
        setToleranceUpper(dimension.tolerance.upper.toString());
        setToleranceLower(dimension.tolerance.lower.toString());
      }
      setError(null);
    }
  }, [dimension]);
  
  const handleSave = () => {
    if (!dimension) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Invalid number');
      return;
    }
    
    if (numValue <= 0 && dimension.type !== 'angular') {
      setError('Value must be positive');
      return;
    }
    
    if (dimension.type === 'angular' && (numValue < 0 || numValue > 360)) {
      setError('Angle must be between 0 and 360 degrees');
      return;
    }
    
    const options: DimensionEditOptions = {
      precision,
      units,
      isDriving,
      locked,
      label: label || undefined,
      tolerance: toleranceEnabled 
        ? { 
            upper: parseFloat(toleranceUpper) || 0, 
            lower: parseFloat(toleranceLower) || 0 
          }
        : null
    };
    
    onSave(dimension.id, numValue, options);
    onClose();
  };
  
  const handleCancel = () => {
    setError(null);
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  if (!isOpen || !dimension) return null;
  
  const dimensionTypeName = dimension.type === 'linear' 
    ? `Linear (${dimension.subtype})`
    : dimension.type === 'radial'
    ? `${dimension.subtype === 'radius' ? 'Radius' : 'Diameter'}`
    : 'Angular';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCancel}>
      <div
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-bold">Edit Dimension</h2>
          <p className="text-sm opacity-75 mt-1">{dimensionTypeName}</p>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Value Input */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Dimension Value {dimension.type === 'angular' ? '(degrees)' : `(${units})`}
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`w-full px-4 py-2 rounded border text-lg font-mono ${
                error
                  ? 'border-red-500'
                  : darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            {!isDriving && (
              <p className="text-yellow-500 text-sm mt-1">
                ⚠️ This is a reference dimension (driven by geometry)
              </p>
            )}
          </div>
          
          {/* Dimension Type Toggle */}
          <div className={`p-4 rounded border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Dimension Type</label>
              <button
                onClick={() => setIsDriving(!isDriving)}
                className={`px-3 py-1 rounded text-sm transition ${
                  isDriving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isDriving ? 'Driving' : 'Reference'}
              </button>
            </div>
            <p className="text-xs opacity-75">
              {isDriving
                ? '📐 Driving dimension: Controls geometry (adds constraint)'
                : '📏 Reference dimension: Displays measurement only (no constraint)'}
            </p>
          </div>
          
          {/* Label */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Width, Height, Diameter"
              className={`w-full px-4 py-2 rounded border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          
          {/* Precision and Units */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Precision
              </label>
              <select
                value={precision}
                onChange={(e) => setPrecision(parseInt(e.target.value))}
                className={`w-full px-4 py-2 rounded border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <option value="0">0 decimals (1)</option>
                <option value="1">1 decimal (1.0)</option>
                <option value="2">2 decimals (1.00)</option>
                <option value="3">3 decimals (1.000)</option>
                <option value="4">4 decimals (1.0000)</option>
              </select>
            </div>
            
            {dimension.type !== 'angular' && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Units
                </label>
                <select
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className={`w-full px-4 py-2 rounded border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="mm">Millimeters (mm)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="m">Meters (m)</option>
                  <option value="in">Inches (in)</option>
                  <option value="ft">Feet (ft)</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Tolerance */}
          <div className={`p-4 rounded border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Tolerance</label>
              <button
                onClick={() => setToleranceEnabled(!toleranceEnabled)}
                className={`px-3 py-1 rounded text-sm transition ${
                  toleranceEnabled
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {toleranceEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {toleranceEnabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs mb-1">Upper (+)</label>
                  <input
                    type="number"
                    step="any"
                    value={toleranceUpper}
                    onChange={(e) => setToleranceUpper(e.target.value)}
                    className={`w-full px-3 py-1 rounded border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Lower (-)</label>
                  <input
                    type="number"
                    step="any"
                    value={toleranceLower}
                    onChange={(e) => setToleranceLower(e.target.value)}
                    className={`w-full px-3 py-1 rounded border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Lock Dimension */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="locked"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="locked" className="text-sm cursor-pointer">
              🔒 Lock dimension (prevent automatic updates)
            </label>
          </div>
        </div>
        
        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
          <div className="text-xs opacity-75">
            {dimension.constraintId && (
              <span>🔗 Linked to constraint: {dimension.constraintId.slice(0, 8)}...</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded transition ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

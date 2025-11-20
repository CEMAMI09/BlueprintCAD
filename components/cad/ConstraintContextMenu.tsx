'use client';

import { useState } from 'react';
import { ConstraintType } from '@/lib/cad/constraint-solver';

interface ConstraintContextMenuProps {
  x: number;
  y: number;
  selectedEntityIds: string[];
  darkMode: boolean;
  onConstraintAdd: (type: ConstraintType, value?: number) => void;
  onClose: () => void;
}

export default function ConstraintContextMenu({
  x,
  y,
  selectedEntityIds,
  darkMode,
  onConstraintAdd,
  onClose
}: ConstraintContextMenuProps) {
  const [showValueInput, setShowValueInput] = useState<ConstraintType | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  
  const numSelected = selectedEntityIds.length;
  
  // Geometric constraints (no value needed)
  const geometricConstraints: Array<{ type: ConstraintType; label: string; icon: string; requiredEntities: number }> = [
    { type: 'horizontal', label: 'Horizontal', icon: '⬌', requiredEntities: 1 },
    { type: 'vertical', label: 'Vertical', icon: '⬍', requiredEntities: 1 },
    { type: 'parallel', label: 'Parallel', icon: '∥', requiredEntities: 2 },
    { type: 'perpendicular', label: 'Perpendicular', icon: '⊥', requiredEntities: 2 },
    { type: 'tangent', label: 'Tangent', icon: '⌒', requiredEntities: 2 },
    { type: 'coincident', label: 'Coincident', icon: '●', requiredEntities: 2 },
    { type: 'concentric', label: 'Concentric', icon: '⊚', requiredEntities: 2 },
    { type: 'midpoint', label: 'Midpoint', icon: '◐', requiredEntities: 2 },
    { type: 'equal', label: 'Equal', icon: '≈', requiredEntities: 2 },
    { type: 'symmetric', label: 'Symmetric', icon: '⇋', requiredEntities: 2 },
    { type: 'collinear', label: 'Collinear', icon: '⋯', requiredEntities: 2 }
  ];
  
  // Dimensional constraints (value required)
  const dimensionalConstraints: Array<{ type: ConstraintType; label: string; icon: string; requiredEntities: number }> = [
    { type: 'distance', label: 'Distance', icon: '↔️', requiredEntities: 2 },
    { type: 'angle', label: 'Angle', icon: '∠', requiredEntities: 2 },
    { type: 'radius', label: 'Radius', icon: '◯', requiredEntities: 1 },
    { type: 'length', label: 'Length', icon: '📏', requiredEntities: 1 },
    { type: 'diameter', label: 'Diameter', icon: '⌀', requiredEntities: 1 }
  ];
  
  const handleGeometricConstraint = (type: ConstraintType) => {
    onConstraintAdd(type);
    onClose();
  };
  
  const handleDimensionalConstraint = (type: ConstraintType) => {
    setShowValueInput(type);
  };
  
  const handleValueSubmit = () => {
    if (showValueInput && inputValue) {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        onConstraintAdd(showValueInput, value);
        onClose();
      }
    }
  };
  
  const availableGeometric = geometricConstraints.filter(c => c.requiredEntities === numSelected);
  const availableDimensional = dimensionalConstraints.filter(c => c.requiredEntities === numSelected);
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`fixed z-50 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-2xl border ${
          darkMode ? 'border-gray-700' : 'border-gray-300'
        } overflow-hidden`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          minWidth: '250px',
          maxWidth: '300px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showValueInput ? (
          <>
            {/* Header */}
            <div className={`px-4 py-2 text-sm font-semibold border-b ${
              darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
            }`}>
              Add Constraint
              <div className="text-xs font-normal opacity-75 mt-1">
                {numSelected} entit{numSelected !== 1 ? 'ies' : 'y'} selected
              </div>
            </div>
            
            {/* Geometric Constraints */}
            {availableGeometric.length > 0 && (
              <div className="py-1">
                <div className="px-4 py-1 text-xs font-semibold opacity-75">GEOMETRIC</div>
                {availableGeometric.map(constraint => (
                  <button
                    key={constraint.type}
                    onClick={() => handleGeometricConstraint(constraint.type)}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{constraint.icon}</span>
                    <span>{constraint.label}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Dimensional Constraints */}
            {availableDimensional.length > 0 && (
              <div className={`py-1 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="px-4 py-1 text-xs font-semibold opacity-75">DIMENSIONAL</div>
                {availableDimensional.map(constraint => (
                  <button
                    key={constraint.type}
                    onClick={() => handleDimensionalConstraint(constraint.type)}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{constraint.icon}</span>
                    <span>{constraint.label}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* No constraints available */}
            {availableGeometric.length === 0 && availableDimensional.length === 0 && (
              <div className="px-4 py-8 text-center text-sm opacity-75">
                <div className="text-2xl mb-2">📐</div>
                <div>
                  {numSelected === 0 
                    ? 'Select entities first'
                    : numSelected === 1
                    ? 'Single entity constraints available in toolbar'
                    : 'No constraints available for this selection'}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Value Input */}
            <div className={`px-4 py-2 text-sm font-semibold border-b ${
              darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={() => setShowValueInput(null)}
                className="text-blue-400 hover:text-blue-300 mr-2"
              >
                ← Back
              </button>
              {showValueInput.charAt(0).toUpperCase() + showValueInput.slice(1)}
            </div>
            
            <div className="p-4">
              <label className="block text-sm mb-2">
                Enter value:
              </label>
              <input
                type="number"
                step="any"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleValueSubmit();
                  if (e.key === 'Escape') onClose();
                }}
                autoFocus
                placeholder={getPlaceholder(showValueInput)}
                className={`w-full px-3 py-2 rounded border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <div className="text-xs opacity-75 mt-2">
                {getHint(showValueInput)}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleValueSubmit}
                  disabled={!inputValue}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition"
                >
                  Apply
                </button>
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded transition ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function getPlaceholder(type: ConstraintType): string {
  switch (type) {
    case 'distance':
      return '10.0';
    case 'angle':
      return '90 (degrees)';
    case 'radius':
    case 'diameter':
      return '5.0';
    case 'length':
      return '15.0';
    default:
      return '0';
  }
}

function getHint(type: ConstraintType): string {
  switch (type) {
    case 'distance':
      return 'Distance between entities in current units';
    case 'angle':
      return 'Angle in degrees (0-360)';
    case 'radius':
      return 'Radius of circle or arc';
    case 'diameter':
      return 'Diameter of circle (2 × radius)';
    case 'length':
      return 'Length of line segment';
    default:
      return '';
  }
}

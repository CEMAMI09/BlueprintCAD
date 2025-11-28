'use client';

import { useState } from 'react';

interface ConstraintToolbarProps {
  darkMode: boolean;
  onShowConstraintManager: () => void;
  onAutoInfer: () => void;
  onSolve: () => void;
  onToggleConstraintDisplay: () => void;
  constraintsVisible: boolean;
  solving: boolean;
  degreesOfFreedom: number;
  constraintCount: number;
  conflictCount: number;
}

export default function ConstraintToolbar({
  darkMode,
  onShowConstraintManager,
  onAutoInfer,
  onSolve,
  onToggleConstraintDisplay,
  constraintsVisible,
  solving,
  degreesOfFreedom,
  constraintCount,
  conflictCount
}: ConstraintToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  
  const dofColor = degreesOfFreedom < 0 ? 'text-red-400' : degreesOfFreedom === 0 ? 'text-green-400' : 'text-yellow-400';
  const conflictColor = conflictCount > 0 ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
    } rounded-lg shadow-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-hidden z-30 transition-all`}>
      {/* Main Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse' : 'Expand'}
          className={`px-2 py-1 rounded transition ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <span className="text-lg">{expanded ? '◀' : '▶'}</span>
        </button>
        
        <div className={`h-6 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        
        {/* Constraint Manager */}
        <button
          onClick={onShowConstraintManager}
          title="Open Constraint Manager"
          className={`px-3 py-1 rounded transition ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          } flex items-center gap-2`}
        >
          <span className="text-lg">📐</span>
          {expanded && <span className="text-sm">Constraints</span>}
        </button>
        
        {/* Auto-Infer */}
        <button
          onClick={onAutoInfer}
          title="Auto-infer constraints from geometry"
          className={`px-3 py-1 rounded transition ${
            darkMode ? 'hover:bg-blue-900 bg-blue-700' : 'hover:bg-blue-100 bg-blue-50'
          } flex items-center gap-2 text-blue-${darkMode ? '200' : '600'}`}
        >
          <span className="text-lg">🔍</span>
          {expanded && <span className="text-sm">Auto-Infer</span>}
        </button>
        
        {/* Solve */}
        <button
          onClick={onSolve}
          disabled={solving}
          title="Solve constraints"
          className={`px-3 py-1 rounded transition ${
            solving
              ? 'bg-gray-600 cursor-not-allowed'
              : darkMode 
                ? 'hover:bg-green-900 bg-green-700' 
                : 'hover:bg-green-100 bg-green-50'
          } flex items-center gap-2 text-green-${darkMode ? '200' : '600'}`}
        >
          <span className="text-lg">{solving ? '⏳' : '⚡'}</span>
          {expanded && <span className="text-sm">{solving ? 'Solving...' : 'Solve'}</span>}
        </button>
        
        <div className={`h-6 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        
        {/* Toggle Constraint Display */}
        <button
          onClick={onToggleConstraintDisplay}
          title={constraintsVisible ? 'Hide constraints' : 'Show constraints'}
          className={`px-3 py-1 rounded transition ${
            constraintsVisible
              ? darkMode ? 'bg-purple-700 hover:bg-purple-600' : 'bg-purple-100 hover:bg-purple-200'
              : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          } flex items-center gap-2`}
        >
          <span className="text-lg">{constraintsVisible ? '👁️' : '👁️‍🗨️'}</span>
          {expanded && <span className="text-sm">{constraintsVisible ? 'Hide' : 'Show'}</span>}
        </button>
        
        {/* Statistics */}
        {expanded && (
          <>
            <div className={`h-6 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
            
            <div className="flex items-center gap-3 px-2">
              {/* Constraint Count */}
              <div className="flex items-center gap-1" title="Total constraints">
                <span className="text-xs opacity-75">📏</span>
                <span className="text-sm font-mono">{constraintCount}</span>
              </div>
              
              {/* DOF */}
              <div className="flex items-center gap-1" title="Degrees of Freedom">
                <span className="text-xs opacity-75">🔓</span>
                <span className={`text-sm font-mono font-bold ${dofColor}`}>
                  {degreesOfFreedom}
                </span>
              </div>
              
              {/* Conflicts */}
              {conflictCount > 0 && (
                <div className="flex items-center gap-1" title="Conflicts detected">
                  <span className="text-xs">⚠️</span>
                  <span className={`text-sm font-mono font-bold ${conflictColor}`}>
                    {conflictCount}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Help Text (when collapsed) */}
      {!expanded && (
        <div className={`px-4 py-1 text-xs text-center border-t ${
          darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        } opacity-75`}>
          Constraint Tools
        </div>
      )}
      
      {/* Expanded Help */}
      {expanded && (
        <div className={`px-4 py-2 text-xs border-t ${
          darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        } opacity-75 space-y-1`}>
          <div>💡 Right-click entities to add constraints</div>
          <div>💡 Auto-infer detects parallel, perpendicular, coincident</div>
          {degreesOfFreedom < 0 && (
            <div className="text-red-400">⚠️ System is over-constrained (DOF &lt; 0)</div>
          )}
          {degreesOfFreedom === 0 && (
            <div className="text-green-400">✓ System is fully constrained (DOF = 0)</div>
          )}
          {degreesOfFreedom > 0 && (
            <div className="text-yellow-400">⚠ System is under-constrained (DOF &gt; 0)</div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Constraint, ConstraintType, ConstraintSolver, Conflict } from '@/lib/cad/constraint-solver';

interface ConstraintManagerProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  solver: ConstraintSolver;
  onSolve: () => void;
  onConstraintSelect: (constraintId: string) => void;
  onConstraintDelete: (constraintId: string) => void;
  onAutoInfer: () => void;
}

export default function ConstraintManager({
  isOpen,
  onClose,
  darkMode,
  solver,
  onSolve,
  onConstraintSelect,
  onConstraintDelete,
  onAutoInfer
}: ConstraintManagerProps) {
  const [stats, setStats] = useState(solver.getStatistics());
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [filter, setFilter] = useState<'all' | 'geometric' | 'dimensional' | 'unsatisfied' | 'auto'>('all');
  const [sortBy, setSortBy] = useState<'type' | 'priority' | 'error'>('type');
  
  useEffect(() => {
    if (isOpen) {
      updateData();
    }
  }, [isOpen, solver]);
  
  const updateData = () => {
    setStats(solver.getStatistics());
    const state = solver.exportState();
    setConstraints(state.constraints || []);
    setConflicts(state.conflicts || []);
  };
  
  if (!isOpen) return null;
  
  const getFilteredConstraints = () => {
    let filtered = [...constraints];
    
    switch (filter) {
      case 'geometric':
        filtered = filtered.filter(c => !c.value);
        break;
      case 'dimensional':
        filtered = filtered.filter(c => c.value !== undefined);
        break;
      case 'unsatisfied':
        filtered = filtered.filter(c => !c.satisfied);
        break;
      case 'auto':
        filtered = filtered.filter(c => c.autoInferred);
        break;
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return (b.priority || 0) - (a.priority || 0);
        case 'error':
          return (b.error || 0) - (a.error || 0);
        default:
          return a.type.localeCompare(b.type);
      }
    });
    
    return filtered;
  };
  
  const filteredConstraints = getFilteredConstraints();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">Constraint Manager</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Manage sketch constraints and resolve conflicts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Statistics */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-xs opacity-75">Total</div>
              <div className="text-xl font-bold">{stats.totalConstraints}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Satisfied</div>
              <div className="text-xl font-bold text-green-500">{stats.satisfiedConstraints}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Geometric</div>
              <div className="text-xl font-bold text-blue-500">{stats.geometricConstraints}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Dimensional</div>
              <div className="text-xl font-bold text-purple-500">{stats.dimensionalConstraints}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Conflicts</div>
              <div className={`text-xl font-bold ${stats.conflicts > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {stats.conflicts}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-75">DOF</div>
              <div className={`text-xl font-bold ${stats.degreesOfFreedom < 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                {stats.degreesOfFreedom}
              </div>
            </div>
          </div>
        </div>
        
        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="p-4 border-b border-gray-700 bg-red-900 bg-opacity-20">
            <div className="text-sm font-semibold mb-2">⚠️ Conflicts Detected</div>
            {conflicts.map(conflict => (
              <div key={conflict.id} className={`p-2 rounded mb-2 ${
                conflict.severity === 'error' ? 'bg-red-900 bg-opacity-40' : 'bg-yellow-900 bg-opacity-40'
              }`}>
                <div className="font-semibold">{conflict.message}</div>
                {conflict.suggestions.length > 0 && (
                  <div className="text-xs mt-1 opacity-75">
                    💡 {conflict.suggestions.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Controls */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <option value="all">All Constraints</option>
              <option value="geometric">Geometric Only</option>
              <option value="dimensional">Dimensional Only</option>
              <option value="unsatisfied">Unsatisfied</option>
              <option value="auto">Auto-Inferred</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <option value="type">Sort by Type</option>
              <option value="priority">Sort by Priority</option>
              <option value="error">Sort by Error</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { onAutoInfer(); updateData(); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              🔍 Auto-Infer
            </button>
            <button
              onClick={() => { onSolve(); updateData(); }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
            >
              ⚡ Solve
            </button>
          </div>
        </div>
        
        {/* Constraint List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredConstraints.length === 0 ? (
            <div className="text-center py-12 opacity-50">
              <div className="text-4xl mb-2">📐</div>
              <div>No constraints found</div>
              <div className="text-sm mt-2">Click "Auto-Infer" to detect constraints</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConstraints.map(constraint => (
                <div
                  key={constraint.id}
                  onClick={() => onConstraintSelect(constraint.id)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } ${!constraint.satisfied ? 'border-2 border-orange-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getConstraintIcon(constraint.type)}</div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {formatConstraintType(constraint.type)}
                          {constraint.autoInferred && (
                            <span className="text-xs px-2 py-0.5 bg-blue-600 rounded">AUTO</span>
                          )}
                          {constraint.locked && (
                            <span className="text-xs">🔒</span>
                          )}
                        </div>
                        <div className="text-xs opacity-75">
                          Entities: {constraint.entityIds.length}
                          {constraint.value !== undefined && ` | Value: ${constraint.value.toFixed(2)}`}
                          {constraint.error !== undefined && ` | Error: ${constraint.error.toFixed(4)}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        constraint.satisfied ? 'bg-green-500' : 'bg-orange-500'
                      }`} title={constraint.satisfied ? 'Satisfied' : 'Unsatisfied'} />
                      
                      {constraint.priority && (
                        <div className="text-xs px-2 py-1 bg-gray-600 rounded">
                          P{constraint.priority}
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConstraintDelete(constraint.id);
                          updateData();
                        }}
                        className="text-red-400 hover:text-red-300 px-2"
                        title="Delete constraint"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="text-xs opacity-75">
            💡 <strong>Tips:</strong> Right-click entities to add constraints | Auto-infer detects parallel, perpendicular, and coincident
          </div>
        </div>
      </div>
    </div>
  );
}

function getConstraintIcon(type: ConstraintType): string {
  const icons: Record<ConstraintType, string> = {
    horizontal: '⬌',
    vertical: '⬍',
    parallel: '∥',
    perpendicular: '⊥',
    tangent: '⌒',
    coincident: '●',
    concentric: '⊚',
    midpoint: '◐',
    equal: '≈',
    symmetric: '⇋',
    collinear: '⋯',
    distance: '↔️',
    angle: '∠',
    radius: '◯',
    length: '📏',
    diameter: '⌀'
  };
  return icons[type] || '📐';
}

function formatConstraintType(type: ConstraintType): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
}

'use client';

import { DOFAnalysis, InstanceDOF } from '@/lib/cad/mate-solver';
import { useState } from 'react';

interface DOFDisplayProps {
  darkMode: boolean;
  dofAnalysis: DOFAnalysis | null;
  onHighlightInstance?: (instanceId: string | null) => void;
}

export default function DOFDisplay({
  darkMode,
  dofAnalysis,
  onHighlightInstance
}: DOFDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!dofAnalysis) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} p-4`}>
        <div className="text-sm opacity-70">No DOF analysis available</div>
      </div>
    );
  }

  const dofPercentage = (dofAnalysis.constrainedDOF / dofAnalysis.totalDOF) * 100;

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${
      dofAnalysis.isOverConstrained 
        ? 'border-red-500' 
        : dofAnalysis.isUnderConstrained 
        ? 'border-yellow-500' 
        : 'border-green-500'
    } overflow-hidden`}>
      {/* Header */}
      <div 
        className={`px-4 py-3 cursor-pointer ${darkMode ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} transition`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {dofAnalysis.isOverConstrained ? '⚠️' : dofAnalysis.isUnderConstrained ? '🔓' : '✅'}
            </span>
            <div>
              <div className="font-semibold text-sm">Degrees of Freedom</div>
              <div className="text-xs opacity-70">
                {dofAnalysis.remainingDOF} / {dofAnalysis.totalDOF} remaining
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold">
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Status Badge */}
          <div className={`p-3 rounded text-sm ${
            dofAnalysis.isOverConstrained
              ? darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
              : dofAnalysis.isUnderConstrained
              ? darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
              : darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
          }`}>
            {dofAnalysis.isOverConstrained && (
              <div>
                <strong>⚠️ Over-Constrained System</strong>
                <div className="text-xs mt-1">
                  Too many constraints applied. Some mates may conflict.
                </div>
              </div>
            )}
            {dofAnalysis.isUnderConstrained && !dofAnalysis.isOverConstrained && (
              <div>
                <strong>🔓 Under-Constrained System</strong>
                <div className="text-xs mt-1">
                  Parts can still move freely. Add more mates to fully constrain.
                </div>
              </div>
            )}
            {!dofAnalysis.isOverConstrained && !dofAnalysis.isUnderConstrained && (
              <div>
                <strong>✅ Properly Constrained</strong>
                <div className="text-xs mt-1">
                  All mates are satisfied without conflicts.
                </div>
              </div>
            )}
          </div>

          {/* DOF Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Constrained</span>
              <span>{dofAnalysis.constrainedDOF} DOF ({dofPercentage.toFixed(0)}%)</span>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className={`h-full transition-all duration-300 ${
                  dofAnalysis.isOverConstrained 
                    ? 'bg-red-500' 
                    : dofAnalysis.isUnderConstrained 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, dofPercentage)}%` }}
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
              <div className="text-xs opacity-70">Total</div>
              <div className="text-lg font-bold">{dofAnalysis.totalDOF}</div>
            </div>
            <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
              <div className="text-xs opacity-70">Constrained</div>
              <div className="text-lg font-bold">{dofAnalysis.constrainedDOF}</div>
            </div>
            <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
              <div className="text-xs opacity-70">Free</div>
              <div className="text-lg font-bold">{dofAnalysis.remainingDOF}</div>
            </div>
          </div>

          {/* Conflicting Mates */}
          {dofAnalysis.conflictingMates.length > 0 && (
            <div className={`p-3 rounded ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-sm font-semibold mb-2 text-red-500">
                ⚠️ Conflicting Mates ({dofAnalysis.conflictingMates.length})
              </div>
              <div className="space-y-1">
                {dofAnalysis.conflictingMates.slice(0, 5).map((mateId) => (
                  <div key={mateId} className="text-xs opacity-70 truncate">
                    {mateId}
                  </div>
                ))}
                {dofAnalysis.conflictingMates.length > 5 && (
                  <div className="text-xs opacity-50 italic">
                    +{dofAnalysis.conflictingMates.length - 5} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instance DOF Breakdown */}
          <div>
            <div className="text-sm font-semibold mb-2">Instance DOF Breakdown</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Array.from(dofAnalysis.instances.values()).map((instanceDOF) => (
                <div
                  key={instanceDOF.instanceId}
                  className={`p-2 rounded cursor-pointer transition ${
                    darkMode 
                      ? 'bg-gray-750 hover:bg-gray-700' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onMouseEnter={() => onHighlightInstance?.(instanceDOF.instanceId)}
                  onMouseLeave={() => onHighlightInstance?.(null)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {instanceDOF.instanceId.substring(0, 16)}...
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {instanceDOF.constrainedBy.length} mate{instanceDOF.constrainedBy.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className={`text-sm font-bold ${
                        instanceDOF.totalDOF === 0 
                          ? 'text-red-500' 
                          : instanceDOF.totalDOF === 6 
                          ? 'text-green-500' 
                          : 'text-yellow-500'
                      }`}>
                        {instanceDOF.totalDOF} DOF
                      </div>
                      <div className="text-xs opacity-70">
                        T:{instanceDOF.translationDOF} R:{instanceDOF.rotationDOF}
                      </div>
                    </div>
                  </div>

                  {/* DOF Visual */}
                  <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`t${i}`}
                        className={`flex-1 h-1 rounded ${
                          i < instanceDOF.translationDOF 
                            ? 'bg-blue-500' 
                            : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                        title={`Translation ${['X', 'Y', 'Z'][i]}`}
                      />
                    ))}
                    <div className="w-px" />
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`r${i}`}
                        className={`flex-1 h-1 rounded ${
                          i < instanceDOF.rotationDOF 
                            ? 'bg-purple-500' 
                            : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                        title={`Rotation ${['X', 'Y', 'Z'][i]}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className={`p-3 rounded text-xs ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
            <div className="font-semibold mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Translation DOF (X, Y, Z)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Rotation DOF (X, Y, Z)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                <span>Constrained (0 DOF on axis)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

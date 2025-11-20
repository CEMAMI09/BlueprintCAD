'use client';

import { Mate, MateType } from '@/lib/cad/mate-system';

interface MateListProps {
  darkMode: boolean;
  mates: Mate[];
  onToggleSuppressed: (mateId: string) => void;
  onDeleteMate: (mateId: string) => void;
  onSelectMate?: (mateId: string) => void;
  selectedMateId?: string | null;
}

const MATE_ICONS: Record<MateType, string> = {
  [MateType.FIXED]: '🔒',
  [MateType.REVOLUTE]: '🔄',
  [MateType.SLIDER]: '↔️',
  [MateType.PLANAR]: '📐',
  [MateType.CYLINDRICAL]: '🔩',
  [MateType.BALL]: '⚽'
};

const MATE_LABELS: Record<MateType, string> = {
  [MateType.FIXED]: 'Fixed',
  [MateType.REVOLUTE]: 'Revolute',
  [MateType.SLIDER]: 'Slider',
  [MateType.PLANAR]: 'Planar',
  [MateType.CYLINDRICAL]: 'Cylindrical',
  [MateType.BALL]: 'Ball'
};

export default function MateList({
  darkMode,
  mates,
  onToggleSuppressed,
  onDeleteMate,
  onSelectMate,
  selectedMateId
}: MateListProps) {
  if (mates.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} p-8 text-center`}>
        <div className="text-4xl mb-2">🔗</div>
        <div className="text-sm opacity-70">No mates created yet</div>
        <div className="text-xs opacity-50 mt-1">Use the mate editor to constrain parts</div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Mates ({mates.length})</h3>
          <div className="text-xs opacity-70">
            {mates.filter(m => m.solved).length} solved
          </div>
        </div>
      </div>

      {/* Mate List */}
      <div className="divide-y divide-gray-700">
        {mates.map((mate) => (
          <div
            key={mate.id}
            className={`p-3 transition cursor-pointer ${
              selectedMateId === mate.id
                ? darkMode ? 'bg-blue-900/40' : 'bg-blue-100'
                : darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
            } ${mate.suppressed ? 'opacity-50' : ''}`}
            onClick={() => onSelectMate?.(mate.id)}
          >
            <div className="flex items-start gap-3">
              {/* Mate Icon & Type */}
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded flex items-center justify-center text-xl ${
                  mate.solved 
                    ? darkMode ? 'bg-green-900/30' : 'bg-green-100'
                    : darkMode ? 'bg-red-900/30' : 'bg-red-100'
                }`}>
                  {MATE_ICONS[mate.type]}
                </div>
              </div>

              {/* Mate Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{mate.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {MATE_LABELS[mate.type]}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                    mate.solved
                      ? darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                      : darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>
                    {mate.solved ? '✓ Solved' : '✗ Unsolved'}
                  </div>
                </div>

                {/* Geometry Info */}
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex items-center gap-1 opacity-70">
                    <span>📍</span>
                    <span className="truncate">
                      {mate.geometry1.type} on {mate.geometry1.instanceId.substring(0, 12)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-70">
                    <span>📍</span>
                    <span className="truncate">
                      {mate.geometry2.type} on {mate.geometry2.instanceId.substring(0, 12)}...
                    </span>
                  </div>
                </div>

                {/* Parameters */}
                {(mate.offset !== undefined || mate.angle !== undefined) && (
                  <div className="mt-2 flex gap-2 text-xs">
                    {mate.offset !== undefined && (
                      <div className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        Offset: {mate.offset.toFixed(2)}mm
                      </div>
                    )}
                    {mate.angle !== undefined && (
                      <div className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        Angle: {(mate.angle * 180 / Math.PI).toFixed(1)}°
                      </div>
                    )}
                  </div>
                )}

                {/* Limits */}
                {mate.limits && (
                  <div className="mt-1 text-xs opacity-70">
                    Limits: {mate.limits.min?.toFixed(1) ?? '−∞'} to {mate.limits.max?.toFixed(1) ?? '∞'}
                  </div>
                )}

                {/* Error */}
                {mate.error && (
                  <div className={`mt-2 text-xs p-2 rounded ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
                    ⚠️ {mate.error}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSuppressed(mate.id);
                }}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${
                  mate.suppressed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={mate.suppressed ? 'Unsuppress mate' : 'Suppress mate'}
              >
                {mate.suppressed ? '👁️ Show' : '🚫 Hide'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete mate "${mate.name}"?`)) {
                    onDeleteMate(mate.id);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  darkMode 
                    ? 'bg-red-900/50 hover:bg-red-900/70 text-red-300' 
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
                title="Delete mate"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className={`px-4 py-2 ${darkMode ? 'bg-gray-750' : 'bg-gray-50'} border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-xs`}>
        <div className="flex justify-between">
          <span className="opacity-70">Total DOF reduced:</span>
          <span className="font-medium">
            {mates
              .filter(m => !m.suppressed && m.solved)
              .reduce((sum, m) => {
                const dof = {
                  [MateType.FIXED]: 6,
                  [MateType.REVOLUTE]: 5,
                  [MateType.SLIDER]: 5,
                  [MateType.PLANAR]: 3,
                  [MateType.CYLINDRICAL]: 4,
                  [MateType.BALL]: 3
                };
                return sum + (dof[m.type] || 0);
              }, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

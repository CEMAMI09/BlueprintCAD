'use client';

import { CollisionInfo } from '@/lib/cad/mate-solver';

interface CollisionDisplayProps {
  darkMode: boolean;
  collisions: CollisionInfo[];
  onHighlightCollision?: (collision: CollisionInfo | null) => void;
}

export default function CollisionDisplay({
  darkMode,
  collisions,
  onHighlightCollision
}: CollisionDisplayProps) {
  if (collisions.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} p-4`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-sm">No Collisions</div>
            <div className="text-xs opacity-70">All parts are clear</div>
          </div>
        </div>
      </div>
    );
  }

  // Sort by penetration depth (worst first)
  const sortedCollisions = [...collisions].sort((a, b) => b.penetrationDepth - a.penetrationDepth);
  const maxPenetration = sortedCollisions[0].penetrationDepth;

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg border border-red-500 overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-100'} border-b ${darkMode ? 'border-red-800' : 'border-red-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-sm text-red-500">
              {collisions.length} Collision{collisions.length !== 1 ? 's' : ''} Detected
            </div>
            <div className="text-xs opacity-70">
              Max penetration: {maxPenetration.toFixed(2)}mm
            </div>
          </div>
        </div>
      </div>

      {/* Collision List */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {sortedCollisions.map((collision, index) => (
          <div
            key={`${collision.instance1Id}-${collision.instance2Id}`}
            className={`p-3 rounded border transition cursor-pointer ${
              darkMode 
                ? 'bg-gray-750 border-red-800 hover:bg-gray-700' 
                : 'bg-red-50 border-red-200 hover:bg-red-100'
            }`}
            onMouseEnter={() => onHighlightCollision?.(collision)}
            onMouseLeave={() => onHighlightCollision?.(null)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500 font-bold text-sm">#{index + 1}</span>
                  <div className={`flex-1 h-1.5 rounded ${
                    collision.penetrationDepth > maxPenetration * 0.7
                      ? 'bg-red-500'
                      : collision.penetrationDepth > maxPenetration * 0.4
                      ? 'bg-orange-500'
                      : 'bg-yellow-500'
                  }`} style={{ 
                    width: `${(collision.penetrationDepth / maxPenetration) * 100}%` 
                  }} />
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">Instance 1:</span>
                    <span className="font-mono truncate">
                      {collision.instance1Id.substring(0, 12)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">Instance 2:</span>
                    <span className="font-mono truncate">
                      {collision.instance2Id.substring(0, 12)}...
                    </span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-1.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="opacity-70">Penetration</div>
                    <div className="font-bold text-red-500">
                      {collision.penetrationDepth.toFixed(2)}mm
                    </div>
                  </div>
                  <div className={`p-1.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="opacity-70">Contact Point</div>
                    <div className="font-mono text-[10px]">
                      ({collision.contactPoint.x.toFixed(1)}, {collision.contactPoint.y.toFixed(1)}, {collision.contactPoint.z.toFixed(1)})
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
                  <span>Normal:</span>
                  <span className="font-mono text-[10px]">
                    ({collision.contactNormal.x.toFixed(2)}, {collision.contactNormal.y.toFixed(2)}, {collision.contactNormal.z.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className={`px-2 py-1 rounded text-xs font-bold ${
                collision.penetrationDepth > maxPenetration * 0.7
                  ? 'bg-red-500 text-white'
                  : collision.penetrationDepth > maxPenetration * 0.4
                  ? 'bg-orange-500 text-white'
                  : 'bg-yellow-500 text-black'
              }`}>
                {collision.penetrationDepth > maxPenetration * 0.7 
                  ? 'SEVERE' 
                  : collision.penetrationDepth > maxPenetration * 0.4 
                  ? 'MODERATE' 
                  : 'MINOR'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={`px-4 py-3 ${darkMode ? 'bg-gray-750' : 'bg-gray-50'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-xs`}>
        <div className="flex justify-between">
          <span className="opacity-70">Total Interference Volume:</span>
          <span className="font-bold">
            ~{collisions.reduce((sum, c) => sum + (c.penetrationDepth ** 3), 0).toFixed(2)}mm³
          </span>
        </div>
      </div>
    </div>
  );
}

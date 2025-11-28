interface SidebarRightProps {
  darkMode: boolean;
  selectedObjects: any[];
  units: 'mm' | 'cm' | 'in';
  onUnitsChange: (units: 'mm' | 'cm' | 'in') => void;
  onExport: (format: string) => void;
  tierLimits: any;
  onPositionChange?: (axis: 'x' | 'y' | 'z', value: number) => void;
  onRotationChange?: (axis: 'x' | 'y' | 'z', value: number) => void;
  onScaleChange?: (axis: 'x' | 'y' | 'z', value: number) => void;
  onColorChange?: (color: string) => void;
  objectPosition?: { x: number; y: number; z: number };
  objectRotation?: { x: number; y: number; z: number };
  objectScale?: { x: number; y: number; z: number };
  objectColor?: string;
}

export default function SidebarRight({
  darkMode,
  selectedObjects,
  units,
  onUnitsChange,
  onExport,
  tierLimits,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  onColorChange,
  objectPosition = { x: 0, y: 0, z: 0 },
  objectRotation = { x: 0, y: 0, z: 0 },
  objectScale = { x: 1, y: 1, z: 1 },
  objectColor = '#3b82f6'
}: SidebarRightProps) {
  return (
    <div className={`w-72 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border-l flex flex-col`}>
      {/* Properties Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-sm mb-3">Properties</h3>
        
        {selectedObjects.length > 0 ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Position (X, Y, Z)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={objectPosition.x.toFixed(2)}
                  onChange={(e) => onPositionChange?.('x', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="X"
                  step="0.1"
                />
                <input
                  type="number"
                  value={objectPosition.y.toFixed(2)}
                  onChange={(e) => onPositionChange?.('y', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Y"
                  step="0.1"
                />
                <input
                  type="number"
                  value={objectPosition.z.toFixed(2)}
                  onChange={(e) => onPositionChange?.('z', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Z"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rotation (X, Y, Z)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={objectRotation.x.toFixed(1)}
                  onChange={(e) => onRotationChange?.('x', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="X°"
                  step="1"
                />
                <input
                  type="number"
                  value={objectRotation.y.toFixed(1)}
                  onChange={(e) => onRotationChange?.('y', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Y°"
                  step="1"
                />
                <input
                  type="number"
                  value={objectRotation.z.toFixed(1)}
                  onChange={(e) => onRotationChange?.('z', parseFloat(e.target.value) || 0)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Z°"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Scale</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={objectScale.x.toFixed(2)}
                  onChange={(e) => onScaleChange?.('x', parseFloat(e.target.value) || 1)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="X"
                  step="0.1"
                  min="0.01"
                />
                <input
                  type="number"
                  value={objectScale.y.toFixed(2)}
                  onChange={(e) => onScaleChange?.('y', parseFloat(e.target.value) || 1)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Y"
                  step="0.1"
                  min="0.01"
                />
                <input
                  type="number"
                  value={objectScale.z.toFixed(2)}
                  onChange={(e) => onScaleChange?.('z', parseFloat(e.target.value) || 1)}
                  className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  placeholder="Z"
                  step="0.1"
                  min="0.01"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-xs text-center py-4">
            Select an object to edit properties
          </div>
        )}
      </div>

      {/* Measurements Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-sm mb-3">Measurements</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Units:</span>
            <select
              value={units}
              onChange={(e) => onUnitsChange(e.target.value as 'mm' | 'cm' | 'in')}
              className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="in">inches</option>
            </select>
          </div>

          {selectedObjects.length > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bounding Box:</span>
                <span>100 × 100 × 50 {units}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Volume:</span>
                <span>500,000 {units}³</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Surface Area:</span>
                <span>50,000 {units}²</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Est. Print Cost:</span>
                <span className="text-green-400">$12.50</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Materials Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-sm mb-3">Material</h3>
        
        {tierLimits.features.includes('advanced') ? (
          <div className="space-y-2">
            <select className={`w-full px-2 py-1.5 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <option>PLA</option>
              <option>ABS</option>
              <option>PETG</option>
              <option>Nylon</option>
              <option>TPU</option>
              <option>Metal</option>
              <option>Resin</option>
            </select>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">Color</label>
              <input
                type="color"
                value={objectColor}
                onChange={(e) => onColorChange?.(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-xs text-center py-4">
            Material selection requires Enterprise tier
            <div className="mt-2">
              <button className="text-blue-400 text-xs hover:underline">
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-3">Export</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => onExport('stl')}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
            title="Export current model as STL file"
          >
            Export as STL
          </button>
          {tierLimits.features.includes('parametric') ? (
            <>
              <button 
                onClick={() => onExport('step')}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
                title="Export as STEP file (preserves parametric data)"
              >
                Export as STEP
              </button>
              <button 
                onClick={() => onExport('obj')}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
                title="Export as OBJ file"
              >
                Export as OBJ
              </button>
            </>
          ) : (
            <div className="text-gray-500 text-xs text-center py-2">
              STEP & OBJ export requires Pro tier
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

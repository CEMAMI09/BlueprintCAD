interface BottomBarProps {
  darkMode: boolean;
  gridEnabled: boolean;
  snapEnabled: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onViewChange: (view: string) => void;
  currentFile: any;
  selectedObjects: any[];
}

export default function BottomBar({
  darkMode,
  gridEnabled,
  snapEnabled,
  onToggleGrid,
  onToggleSnap,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onViewChange,
  currentFile,
  selectedObjects
}: BottomBarProps) {
  return (
    <div className={`h-10 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border-t flex items-center px-4 gap-4 text-sm`}>
      {/* Viewport Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleGrid}
          className={`px-2 py-1 rounded transition ${
            gridEnabled ? 'bg-blue-600' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          title="Toggle Grid"
        >
          #️⃣ Grid
        </button>
        <button
          onClick={onToggleSnap}
          className={`px-2 py-1 rounded transition ${
            snapEnabled ? 'bg-blue-600' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          title="Toggle Snap"
        >
          🧲 Snap
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600"></div>

      {/* View Controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onViewChange('top')}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Top View"
        >
          📐 Top
        </button>
        <button 
          onClick={() => onViewChange('front')}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Front View"
        >
          📐 Front
        </button>
        <button 
          onClick={() => onViewChange('right')}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Right View"
        >
          📐 Right
        </button>
        <button 
          onClick={() => onViewChange('perspective')}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Perspective View"
        >
          📦 Perspective
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600"></div>

      {/* Sidebar Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLeftSidebar}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Toggle Left Sidebar"
        >
          ◧ Left
        </button>
        <button
          onClick={onToggleRightSidebar}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-xs"
          title="Toggle Right Sidebar"
        >
          ◨ Right
        </button>
      </div>

      {/* Center Status */}
      <div className="flex-1 flex items-center justify-center gap-4 text-xs text-gray-400">
        {currentFile && (
          <>
            <span>Version: {currentFile.version}</span>
            <span>•</span>
            <span>Last saved: {new Date(currentFile.updated_at).toLocaleTimeString()}</span>
            {selectedObjects.length > 0 && (
              <>
                <span>•</span>
                <span>{selectedObjects.length} object(s) selected</span>
              </>
            )}
          </>
        )}
      </div>

      {/* Right Side Info */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>FPS: 60</span>
        <span>•</span>
        <span>Vertices: 12,450</span>
        <span>•</span>
        <span>Faces: 8,300</span>
      </div>
    </div>
  );
}

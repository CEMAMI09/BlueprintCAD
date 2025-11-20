interface SidebarLeftProps {
  darkMode: boolean;
  layers: any[];
  onLayersChange: (layers: any[]) => void;
  selectedObjects: any[];
  currentFile: any;
  user: any;
}

export default function SidebarLeft({
  darkMode,
  layers,
  onLayersChange,
  selectedObjects,
  currentFile,
  user
}: SidebarLeftProps) {
  const toggleLayerVisibility = (layerId: number) => {
    onLayersChange(
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const toggleLayerLock = (layerId: number) => {
    onLayersChange(
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
      )
    );
  };

  const addLayer = () => {
    const newLayer = {
      id: Date.now(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false
    };
    onLayersChange([...layers, newLayer]);
  };

  return (
    <div className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border-r flex flex-col`}>
      {/* File Tree Section */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">File Tree</h3>
          <button className="p-1 hover:bg-gray-700 rounded text-xs">+</button>
        </div>
        
        {currentFile ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded cursor-pointer">
              <span className="text-blue-400">📄</span>
              <span className="text-sm truncate">{currentFile.filename}</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-xs text-center py-4">
            No file loaded
          </div>
        )}
      </div>

      {/* Layers Section */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Layers</h3>
          <button
            onClick={addLayer}
            className="p-1 hover:bg-gray-700 rounded text-xs"
            title="Add Layer"
          >
            +
          </button>
        </div>

        <div className="space-y-1">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`p-2 rounded flex items-center gap-2 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => toggleLayerVisibility(layer.id)}
                className="text-sm"
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? '👁️' : '👁️‍🗨️'}
              </button>
              <button
                onClick={() => toggleLayerLock(layer.id)}
                className="text-sm"
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
              <span className="text-sm flex-1 truncate">{layer.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Objects Section */}
      <div className="p-4 border-t border-gray-700">
        <h3 className="font-semibold text-sm mb-3">Objects</h3>
        {selectedObjects.length > 0 ? (
          <div className="space-y-1">
            {selectedObjects.map((obj, idx) => (
              <div
                key={idx}
                className="p-2 bg-blue-900 rounded text-sm"
              >
                Object {idx + 1}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xs text-center py-2">
            No objects selected
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className={`p-3 border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-gray-50'}`}>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Tier:</span>
            <span className="font-semibold text-blue-400">{user?.tier || 'free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Files:</span>
            <span>1 / {user?.tier === 'enterprise' ? '∞' : user?.tier === 'team' ? '50' : user?.tier === 'pro' ? '25' : '5'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

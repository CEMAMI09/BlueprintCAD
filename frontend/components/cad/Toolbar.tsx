interface ToolbarProps {
  darkMode: boolean;
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: (format: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleDarkMode: () => void;
  currentFile: any;
  user: any;
}

export default function Toolbar({
  darkMode,
  selectedTool,
  onToolSelect,
  onNew,
  onSave,
  onOpen,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleDarkMode,
  currentFile,
  user
}: ToolbarProps) {
  const tools = [
    { id: 'select', name: 'Select', icon: '↖️' },
    { id: 'move', name: 'Move', icon: '✋' },
    { id: 'rotate', name: 'Rotate', icon: '🔄' },
    { id: 'scale', name: 'Scale', icon: '📏' },
    { id: 'sketch', name: 'Sketch', icon: '✏️', tier: 'pro' },
    { id: 'extrude', name: 'Extrude', icon: '⬆️', tier: 'pro' },
    { id: 'revolve', name: 'Revolve', icon: '🔃', tier: 'pro' },
    { id: 'shell', name: 'Shell', icon: '🥚', tier: 'pro' },
    { id: 'fillet', name: 'Fillet', icon: '◝', tier: 'pro' },
    { id: 'chamfer', name: 'Chamfer', icon: '◿', tier: 'pro' },
    { id: 'cut', name: 'Cut', icon: '✂️', tier: 'pro' },
    { id: 'draft-analysis', name: 'Draft', icon: '📐', tier: 'pro' },
    { id: 'offset-face', name: 'Offset Face', icon: '⬆️', tier: 'pro' },
    { id: 'delete-face', name: 'Delete Face', icon: '🗑️', tier: 'pro' },
    { id: 'replace-face', name: 'Replace Face', icon: '🔄', tier: 'pro' },
    { id: 'mirror-face', name: 'Mirror', icon: '🪞', tier: 'pro' },
    { id: 'linear-pattern', name: 'Linear Pattern', icon: '⚡', tier: 'pro' },
    { id: 'circular-pattern', name: 'Circular Pattern', icon: '🔁', tier: 'pro' },
    { id: 'curve-pattern', name: 'Curve Pattern', icon: '〰️', tier: 'pro' },
    { id: 'fill-pattern', name: 'Fill Pattern', icon: '⬢', tier: 'pro' },
  ];

  const canUseTool = (tool: any) => {
    if (!tool.tier) return true;
    const tierOrder = ['free', 'pro', 'team', 'enterprise'];
    return tierOrder.indexOf(user?.tier || 'free') >= tierOrder.indexOf(tool.tier);
  };

  return (
    <div className={`h-14 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border-b flex items-center px-4 gap-4`}>
      {/* Logo/Home */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg"></div>
        <span className="font-bold text-lg">CAD Editor</span>
      </div>

      <div className="h-8 w-px bg-gray-600"></div>

      {/* File Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onNew}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition"
          title="Create new file"
        >
          ➕ New
        </button>
        <button
          onClick={onSave}
          disabled={!currentFile}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition"
          title={currentFile ? "Save current file" : "No file to save"}
        >
          💾 Save
        </button>
        <button 
          onClick={onOpen}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          title="Open CAD file (STL, OBJ, STEP, IGES)"
        >
          📁 Open
        </button>
        <a
          href="/assembly-editor"
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition text-white no-underline"
          title="Open Assembly Editor"
        >
          📦 Assembly
        </a>
        <button 
          onClick={() => onExport('stl')}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          title="Export as STL"
        >
          📤 Export
        </button>
      </div>

      <div className="h-8 w-px bg-gray-600"></div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
          title="Undo"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
          title="Redo"
        >
          ↷
        </button>
      </div>

      <div className="h-8 w-px bg-gray-600"></div>

      {/* Tools - Organized in Dropdowns */}
      <div className="flex items-center gap-2 flex-1">
        {/* Basic Tools - Always Visible */}
        {tools.slice(0, 4).map((tool) => {
          const isLocked = !canUseTool(tool);
          return (
            <button
              key={tool.id}
              onClick={() => !isLocked && onToolSelect(tool.id)}
              disabled={isLocked}
              className={`
                px-2 py-1.5 rounded text-xs font-medium transition relative
                ${selectedTool === tool.id ? 'bg-blue-600' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
                ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={isLocked ? `${tool.name} - Requires ${tool.tier} tier` : tool.name}
            >
              <span>{tool.icon}</span>
            </button>
          );
        })}

        <div className="h-6 w-px bg-gray-600"></div>

        {/* Modeling Tools Dropdown */}
        <div className="relative group">
          <button className={`px-2 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
            <span>✏️</span>
            <span className="text-[10px]">▼</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 w-44 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1`}>
            {tools.slice(4, 8).map((tool) => {
              const isLocked = !canUseTool(tool);
              return (
                <button
                  key={tool.id}
                  onClick={() => !isLocked && onToolSelect(tool.id)}
                  disabled={isLocked}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs transition flex items-center gap-2
                    ${selectedTool === tool.id ? 'bg-blue-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={isLocked ? `${tool.name} - Requires ${tool.tier} tier` : tool.name}
                >
                  <span>{tool.icon}</span>
                  <span>{tool.name}</span>
                  {isLocked && <span className="ml-auto text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modify Tools Dropdown */}
        <div className="relative group">
          <button className={`px-2 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
            <span>◝</span>
            <span className="text-[10px]">▼</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 w-44 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1`}>
            {tools.slice(8, 12).map((tool) => {
              const isLocked = !canUseTool(tool);
              return (
                <button
                  key={tool.id}
                  onClick={() => !isLocked && onToolSelect(tool.id)}
                  disabled={isLocked}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs transition flex items-center gap-2
                    ${selectedTool === tool.id ? 'bg-blue-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={isLocked ? `${tool.name} - Requires ${tool.tier} tier` : tool.name}
                >
                  <span>{tool.icon}</span>
                  <span>{tool.name}</span>
                  {isLocked && <span className="ml-auto text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Face Tools Dropdown */}
        <div className="relative group">
          <button className={`px-2 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
            <span>🗑️</span>
            <span className="text-[10px]">▼</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 w-44 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1`}>
            {tools.slice(12, 16).map((tool) => {
              const isLocked = !canUseTool(tool);
              return (
                <button
                  key={tool.id}
                  onClick={() => !isLocked && onToolSelect(tool.id)}
                  disabled={isLocked}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs transition flex items-center gap-2
                    ${selectedTool === tool.id ? 'bg-blue-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={isLocked ? `${tool.name} - Requires ${tool.tier} tier` : tool.name}
                >
                  <span>{tool.icon}</span>
                  <span>{tool.name}</span>
                  {isLocked && <span className="ml-auto text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pattern Tools Dropdown */}
        <div className="relative group">
          <button className={`px-2 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
            <span>⚡</span>
            <span className="text-[10px]">▼</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 w-44 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1`}>
            {tools.slice(16).map((tool) => {
              const isLocked = !canUseTool(tool);
              return (
                <button
                  key={tool.id}
                  onClick={() => !isLocked && onToolSelect(tool.id)}
                  disabled={isLocked}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs transition flex items-center gap-2
                    ${selectedTool === tool.id ? 'bg-blue-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={isLocked ? `${tool.name} - Requires ${tool.tier} tier` : tool.name}
                >
                  <span>{tool.icon}</span>
                  <span>{tool.name}</span>
                  {isLocked && <span className="ml-auto text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDarkMode}
          className="p-2 hover:bg-gray-700 rounded transition"
          title="Toggle Dark Mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {currentFile && (
          <div className="text-sm text-gray-400">
            v{currentFile.version} • {currentFile.filename}
          </div>
        )}

        {user && (
          <div className="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded text-xs font-bold uppercase">
            {user.tier}
          </div>
        )}
      </div>
    </div>
  );
}

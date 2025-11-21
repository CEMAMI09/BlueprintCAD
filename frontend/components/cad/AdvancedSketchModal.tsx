'use client';

import { useState } from 'react';

interface AdvancedSketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: string, subtype?: string) => void;
  darkMode: boolean;
}

interface SketchTool {
  id: string;
  name: string;
  icon: string;
  desc: string;
  category: 'basic' | 'arcs' | 'curves' | 'shapes' | 'operations';
  subtypes?: { id: string; name: string; desc: string }[];
}

export default function AdvancedSketchModal({ 
  isOpen, 
  onClose, 
  onSelectTool, 
  darkMode 
}: AdvancedSketchModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<SketchTool | null>(null);

  if (!isOpen) return null;

  const tools: SketchTool[] = [
    // Basic tools
    { 
      id: 'line', 
      name: 'Line', 
      icon: '📏', 
      desc: 'Draw straight lines',
      category: 'basic'
    },
    { 
      id: 'point', 
      name: 'Point', 
      icon: '•', 
      desc: 'Create construction points',
      category: 'basic'
    },
    { 
      id: 'polyline', 
      name: 'Polyline', 
      icon: '⚡', 
      desc: 'Draw connected line segments',
      category: 'basic'
    },
    
    // Arc variants
    { 
      id: 'arc', 
      name: 'Arc', 
      icon: '◠', 
      desc: 'Draw circular arcs',
      category: 'arcs',
      subtypes: [
        { id: 'center-start-end', name: 'Center-Start-End', desc: 'Define arc by center, start point, and end point' },
        { id: '3-point', name: '3-Point Arc', desc: 'Define arc through three points' },
        { id: 'tangent', name: 'Tangent Arc', desc: 'Create arc tangent to two curves' }
      ]
    },
    { 
      id: 'circle', 
      name: 'Circle', 
      icon: '⭕', 
      desc: 'Draw circles',
      category: 'arcs',
      subtypes: [
        { id: 'center-radius', name: 'Center-Radius', desc: 'Define circle by center and radius' },
        { id: '2-point', name: '2-Point', desc: 'Define circle by diameter' },
        { id: '3-point', name: '3-Point', desc: 'Define circle through three points' }
      ]
    },
    
    // Curves
    { 
      id: 'spline', 
      name: 'Spline', 
      icon: '〰️', 
      desc: 'Draw smooth curves',
      category: 'curves',
      subtypes: [
        { id: 'interpolated', name: 'Interpolated', desc: 'Curve passes through all points' },
        { id: 'control-points', name: 'Control Points', desc: 'Define curve with control points' }
      ]
    },
    { 
      id: 'bspline', 
      name: 'B-Spline', 
      icon: '∿', 
      desc: 'Draw B-spline curves',
      category: 'curves',
      subtypes: [
        { id: 'degree-2', name: 'Degree 2 (Quadratic)', desc: 'Quadratic B-spline' },
        { id: 'degree-3', name: 'Degree 3 (Cubic)', desc: 'Cubic B-spline (default)' },
        { id: 'degree-4', name: 'Degree 4 (Quartic)', desc: 'Quartic B-spline' }
      ]
    },
    { 
      id: 'nurbs', 
      name: 'NURBS', 
      icon: '∾', 
      desc: 'Non-uniform rational B-splines',
      category: 'curves'
    },
    { 
      id: 'ellipse', 
      name: 'Ellipse', 
      icon: '⬭', 
      desc: 'Draw ellipses',
      category: 'curves',
      subtypes: [
        { id: 'center-axes', name: 'Center-Axes', desc: 'Define by center and two axes' },
        { id: '3-point', name: '3-Point', desc: 'Define through three points' },
        { id: 'arc', name: 'Elliptical Arc', desc: 'Partial ellipse' }
      ]
    },
    
    // Shapes
    { 
      id: 'rectangle', 
      name: 'Rectangle', 
      icon: '▭', 
      desc: 'Draw rectangles',
      category: 'shapes',
      subtypes: [
        { id: '2-point', name: '2-Point', desc: 'Corner to corner' },
        { id: 'center', name: 'Center', desc: 'From center point' }
      ]
    },
    { 
      id: 'polygon', 
      name: 'Polygon', 
      icon: '⬡', 
      desc: 'Draw regular polygons',
      category: 'shapes',
      subtypes: [
        { id: 'inscribed', name: 'Inscribed', desc: 'Vertices on circle' },
        { id: 'circumscribed', name: 'Circumscribed', desc: 'Edges tangent to circle' }
      ]
    },
    
    // Operations
    { 
      id: 'offset', 
      name: 'Offset', 
      icon: '⇄', 
      desc: 'Offset curves by distance',
      category: 'operations'
    },
    { 
      id: 'trim', 
      name: 'Trim', 
      icon: '✂️', 
      desc: 'Trim curves at intersections',
      category: 'operations'
    },
    { 
      id: 'extend', 
      name: 'Extend', 
      icon: '↔️', 
      desc: 'Extend curves to boundaries',
      category: 'operations'
    },
    { 
      id: 'mirror', 
      name: 'Mirror', 
      icon: '⇆', 
      desc: 'Mirror geometry across axis',
      category: 'operations'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: '🔧' },
    { id: 'basic', name: 'Basic', icon: '📐' },
    { id: 'arcs', name: 'Arcs & Circles', icon: '◠' },
    { id: 'curves', name: 'Curves', icon: '〰️' },
    { id: 'shapes', name: 'Shapes', icon: '▭' },
    { id: 'operations', name: 'Operations', icon: '✂️' }
  ];

  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(t => t.category === selectedCategory);

  const handleToolClick = (tool: SketchTool) => {
    if (tool.subtypes && tool.subtypes.length > 0) {
      setSelectedTool(tool);
    } else {
      onSelectTool(tool.id);
      onClose();
    }
  };

  const handleSubtypeClick = (toolId: string, subtypeId: string) => {
    onSelectTool(toolId, subtypeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">Advanced Sketch Tools</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Parametric 2D geometry with version control
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className={`w-48 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-y-auto`}>
            <div className="text-xs font-semibold text-gray-400 mb-2">CATEGORIES</div>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition ${
                  selectedCategory === cat.id
                    ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {!selectedTool ? (
              // Tool Grid
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool)}
                      className={`${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      } rounded-lg p-4 transition text-center group relative`}
                    >
                      <div className="text-4xl mb-2">{tool.icon}</div>
                      <div className="font-semibold mb-1">{tool.name}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {tool.desc}
                      </div>
                      {tool.subtypes && (
                        <div className="absolute top-2 right-2 text-xs text-blue-400">
                          {tool.subtypes.length} variants
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Subtype Selection
              <div className="p-6">
                <button
                  onClick={() => setSelectedTool(null)}
                  className="text-blue-400 hover:text-blue-300 mb-4 flex items-center"
                >
                  ← Back to tools
                </button>
                
                <div className="flex items-center mb-6">
                  <span className="text-4xl mr-4">{selectedTool.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{selectedTool.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedTool.desc}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTool.subtypes?.map(subtype => (
                    <button
                      key={subtype.id}
                      onClick={() => handleSubtypeClick(selectedTool.id, subtype.id)}
                      className={`w-full text-left p-4 rounded-lg transition ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-semibold mb-1">{subtype.name}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {subtype.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-start space-x-6 text-sm">
            <div>
              <span className="font-semibold">💡 Tips:</span>
              <ul className="mt-1 space-y-1 text-xs opacity-75">
                <li>• All geometry is parametric and editable</li>
                <li>• Use constraints to lock dimensions</li>
                <li>• Press ESC to finish current operation</li>
              </ul>
            </div>
            <div>
              <span className="font-semibold">⌨️ Shortcuts:</span>
              <ul className="mt-1 space-y-1 text-xs opacity-75">
                <li>• <kbd className="px-1 bg-gray-700 rounded">L</kbd> Line</li>
                <li>• <kbd className="px-1 bg-gray-700 rounded">C</kbd> Circle</li>
                <li>• <kbd className="px-1 bg-gray-700 rounded">A</kbd> Arc</li>
                <li>• <kbd className="px-1 bg-gray-700 rounded">S</kbd> Spline</li>
              </ul>
            </div>
            <div>
              <span className="font-semibold">🔄 Version Control:</span>
              <ul className="mt-1 space-y-1 text-xs opacity-75">
                <li>• Changes tracked automatically</li>
                <li>• Sync to save current state</li>
                <li>• Branch for parallel designs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

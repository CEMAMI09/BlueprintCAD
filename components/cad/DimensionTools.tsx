'use client';

import { useState } from 'react';
import {
  GDTSymbolType,
  GDT_SYMBOLS,
  DATUM_LABELS,
  GDTFeatureControlFrame,
  DatumFeature,
  SurfaceFinishSymbol
} from '@/lib/cad/gdt-symbols';
import {
  AnnotationStyle,
  STANDARD_ANNOTATION_STYLES,
  createCustomStyle,
  validateStyle
} from '@/lib/cad/annotation-styles';

interface DimensionToolsProps {
  darkMode: boolean;
  activeStyle: AnnotationStyle;
  onStyleChange: (style: AnnotationStyle) => void;
  onAddLinearDimension: () => void;
  onAddAngularDimension: () => void;
  onAddRadialDimension: () => void;
  onAddDiameterDimension: () => void;
  onAddGDTSymbol: (symbol: GDTSymbolType) => void;
  onAddDatum: (label: string) => void;
  onAddSurfaceFinish: (roughness: number) => void;
  onAddAnnotation: (type: 'text' | 'leader' | 'note') => void;
}

export default function DimensionTools({
  darkMode,
  activeStyle,
  onStyleChange,
  onAddLinearDimension,
  onAddAngularDimension,
  onAddRadialDimension,
  onAddDiameterDimension,
  onAddGDTSymbol,
  onAddDatum,
  onAddSurfaceFinish,
  onAddAnnotation
}: DimensionToolsProps) {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'gdt' | 'annotations' | 'styles'>('dimensions');
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [editingStyle, setEditingStyle] = useState<AnnotationStyle>(activeStyle);
  const [selectedGDTSymbol, setSelectedGDTSymbol] = useState<GDTSymbolType>('position');
  const [selectedDatum, setSelectedDatum] = useState('A');
  const [surfaceRoughness, setSurfaceRoughness] = useState(3.2);

  const handleSaveStyle = () => {
    const errors = validateStyle(editingStyle);
    if (errors.length > 0) {
      alert(`Style validation errors:\n${errors.join('\n')}`);
      return;
    }
    onStyleChange(editingStyle);
    setShowStyleEditor(false);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = STANDARD_ANNOTATION_STYLES[presetId];
    if (preset) {
      setEditingStyle(preset);
      onStyleChange(preset);
    }
  };

  return (
    <div className={`w-80 border-l ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} overflow-y-auto`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h3 className="font-bold text-lg">📏 Dimension Tools</h3>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        {[
          { id: 'dimensions', label: '📐 Dims', title: 'Dimensions' },
          { id: 'gdt', label: '⊕ GD&T', title: 'GD&T' },
          { id: 'annotations', label: '💬 Notes', title: 'Annotations' },
          { id: 'styles', label: '🎨 Style', title: 'Styles' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              activeTab === tab.id
                ? darkMode
                  ? 'bg-blue-900 text-blue-300 border-b-2 border-blue-500'
                  : 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                : darkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={tab.title}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Dimensions Tab */}
        {activeTab === 'dimensions' && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Standard Dimensions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onAddLinearDimension}
                  className={`p-3 rounded ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } text-sm`}
                >
                  <div className="text-2xl mb-1">↔️</div>
                  <div className="text-xs">Linear</div>
                </button>

                <button
                  onClick={onAddAngularDimension}
                  className={`p-3 rounded ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } text-sm`}
                >
                  <div className="text-2xl mb-1">📐</div>
                  <div className="text-xs">Angular</div>
                </button>

                <button
                  onClick={onAddRadialDimension}
                  className={`p-3 rounded ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } text-sm`}
                >
                  <div className="text-2xl mb-1">R</div>
                  <div className="text-xs">Radius</div>
                </button>

                <button
                  onClick={onAddDiameterDimension}
                  className={`p-3 rounded ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } text-sm`}
                >
                  <div className="text-2xl mb-1">Ø</div>
                  <div className="text-xs">Diameter</div>
                </button>
              </div>
            </div>

            <div className={`p-3 rounded text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
              <div className="font-semibold mb-1">💡 How to use:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Click dimension type</li>
                <li>Click start point on drawing</li>
                <li>Click end point</li>
                <li>Click to place dimension line</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Active Style</h4>
              <div className={`p-3 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="font-medium">{activeStyle.name}</div>
                <div className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activeStyle.fontSize}pt • {activeStyle.arrowStyle} arrows
                </div>
                <div className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activeStyle.decimalPlaces} decimals • {activeStyle.units}
                </div>
              </div>
            </div>
          </>
        )}

        {/* GD&T Tab */}
        {activeTab === 'gdt' && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Form Controls</h4>
              <div className="grid grid-cols-2 gap-2">
                {(['straightness', 'flatness', 'circularity', 'cylindricity'] as const).map(symbol => {
                  const symbolData = GDT_SYMBOLS[symbol];
                  return (
                    <button
                      key={symbol}
                      onClick={() => {
                        setSelectedGDTSymbol(symbol);
                        onAddGDTSymbol(symbol);
                      }}
                      className={`p-2 rounded text-left ${
                        selectedGDTSymbol === symbol
                          ? 'ring-2 ring-blue-500'
                          : ''
                      } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title={symbolData.description}
                    >
                      <div className="text-lg">{symbolData.unicode}</div>
                      <div className="text-xs mt-1 capitalize">{symbol.replace('_', ' ')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Orientation Controls</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['angularity', 'perpendicularity', 'parallelism'] as const).map(symbol => {
                  const symbolData = GDT_SYMBOLS[symbol];
                  return (
                    <button
                      key={symbol}
                      onClick={() => {
                        setSelectedGDTSymbol(symbol);
                        onAddGDTSymbol(symbol);
                      }}
                      className={`p-2 rounded text-center ${
                        selectedGDTSymbol === symbol
                          ? 'ring-2 ring-blue-500'
                          : ''
                      } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title={symbolData.description}
                    >
                      <div className="text-lg">{symbolData.unicode}</div>
                      <div className="text-xs mt-1 capitalize truncate">{symbol}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Location Controls</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['position', 'concentricity', 'symmetry'] as const).map(symbol => {
                  const symbolData = GDT_SYMBOLS[symbol];
                  return (
                    <button
                      key={symbol}
                      onClick={() => {
                        setSelectedGDTSymbol(symbol);
                        onAddGDTSymbol(symbol);
                      }}
                      className={`p-2 rounded text-center ${
                        selectedGDTSymbol === symbol
                          ? 'ring-2 ring-blue-500'
                          : ''
                      } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title={symbolData.description}
                    >
                      <div className="text-lg">{symbolData.unicode}</div>
                      <div className="text-xs mt-1 capitalize truncate">{symbol}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Datum Features</h4>
              <div className="grid grid-cols-6 gap-1">
                {DATUM_LABELS.slice(0, 12).map(label => (
                  <button
                    key={label}
                    onClick={() => {
                      setSelectedDatum(label);
                      onAddDatum(label);
                    }}
                    className={`p-2 rounded text-center font-bold ${
                      selectedDatum === label
                        ? 'ring-2 ring-blue-500'
                        : ''
                    } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Surface Finish</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm flex-1">Ra (μm):</label>
                  <input
                    type="number"
                    value={surfaceRoughness}
                    onChange={(e) => setSurfaceRoughness(parseFloat(e.target.value))}
                    step="0.1"
                    min="0.1"
                    max="50"
                    className={`w-20 px-2 py-1 rounded text-sm ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
                <button
                  onClick={() => onAddSurfaceFinish(surfaceRoughness)}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  Add Surface Finish
                </button>
              </div>
            </div>
          </>
        )}

        {/* Annotations Tab */}
        {activeTab === 'annotations' && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Annotation Types</h4>
              <div className="space-y-2">
                <button
                  onClick={() => onAddAnnotation('text')}
                  className={`w-full p-3 rounded text-left ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm">📝 Text</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Simple text annotation
                  </div>
                </button>

                <button
                  onClick={() => onAddAnnotation('leader')}
                  className={`w-full p-3 rounded text-left ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm">➡️ Leader</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Text with arrow leader
                  </div>
                </button>

                <button
                  onClick={() => onAddAnnotation('note')}
                  className={`w-full p-3 rounded text-left ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm">📋 Note</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Multi-line note box
                  </div>
                </button>
              </div>
            </div>

            <div className={`p-3 rounded text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
              <div className="font-semibold mb-2">Common Annotations:</div>
              <div className="space-y-1">
                <div>• MATERIAL: [Specify]</div>
                <div>• FINISH: [Specify]</div>
                <div>• SCALE: [Ratio]</div>
                <div>• TOLERANCE: ±[Value]</div>
                <div>• NOTES: [Details]</div>
              </div>
            </div>
          </>
        )}

        {/* Styles Tab */}
        {activeTab === 'styles' && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Standard Presets</h4>
              <div className="space-y-2">
                {Object.values(STANDARD_ANNOTATION_STYLES).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset.id)}
                    className={`w-full p-3 rounded text-left ${
                      activeStyle.id === preset.id
                        ? 'ring-2 ring-blue-500'
                        : ''
                    } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {preset.fontSize}pt • {preset.units} • {preset.toleranceFormat}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowStyleEditor(true)}
              className={`w-full px-4 py-2 rounded text-sm ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              🎨 Edit Current Style
            </button>

            <div className={`p-3 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="font-semibold mb-2">Current Style Settings:</div>
              <div className="space-y-1">
                <div>Font: {activeStyle.fontSize}pt {activeStyle.fontFamily}</div>
                <div>Line: {activeStyle.lineWidth}mm {activeStyle.lineColor}</div>
                <div>Arrow: {activeStyle.arrowStyle} ({activeStyle.arrowSize}mm)</div>
                <div>Decimals: {activeStyle.decimalPlaces}</div>
                <div>Units: {activeStyle.units}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Style Editor Modal */}
      {showStyleEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-[500px] max-h-[80vh] overflow-auto`}>
            <h3 className="text-lg font-bold mb-4">Edit Annotation Style</h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Style Name</label>
                <input
                  type="text"
                  value={editingStyle.name}
                  onChange={(e) => setEditingStyle({...editingStyle, name: e.target.value})}
                  className={`w-full px-3 py-2 rounded ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                  }`}
                />
              </div>

              {/* Font Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size (pt)</label>
                  <input
                    type="number"
                    value={editingStyle.fontSize}
                    onChange={(e) => setEditingStyle({...editingStyle, fontSize: parseFloat(e.target.value)})}
                    step="0.5"
                    min="1"
                    max="20"
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Font Weight</label>
                  <select
                    value={editingStyle.fontWeight}
                    onChange={(e) => setEditingStyle({...editingStyle, fontWeight: e.target.value as 'normal' | 'bold'})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>

              {/* Line Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Line Width (mm)</label>
                  <input
                    type="number"
                    value={editingStyle.lineWidth}
                    onChange={(e) => setEditingStyle({...editingStyle, lineWidth: parseFloat(e.target.value)})}
                    step="0.05"
                    min="0.1"
                    max="5"
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Arrow Style</label>
                  <select
                    value={editingStyle.arrowStyle}
                    onChange={(e) => setEditingStyle({...editingStyle, arrowStyle: e.target.value as any})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  >
                    <option value="filled">Filled</option>
                    <option value="open">Open</option>
                    <option value="dot">Dot</option>
                    <option value="slash">Slash</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              {/* Dimension Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Decimal Places</label>
                  <input
                    type="number"
                    value={editingStyle.decimalPlaces}
                    onChange={(e) => setEditingStyle({...editingStyle, decimalPlaces: parseInt(e.target.value)})}
                    min="0"
                    max="6"
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Units</label>
                  <select
                    value={editingStyle.units}
                    onChange={(e) => setEditingStyle({...editingStyle, units: e.target.value as any})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  >
                    <option value="mm">mm</option>
                    <option value="in">inches</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingStyle.showUnits}
                  onChange={(e) => setEditingStyle({...editingStyle, showUnits: e.target.checked})}
                  className="w-4 h-4"
                />
                <label className="text-sm">Show units in dimensions</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowStyleEditor(false)}
                className={`px-4 py-2 rounded ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStyle}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Style
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

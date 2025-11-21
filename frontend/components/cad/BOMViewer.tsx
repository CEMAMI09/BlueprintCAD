'use client';

import { useState, useEffect } from 'react';
import { BOMGenerator, BOMDocument, BOMItem, BOMColumn, BOMTitleBlock, BOMSheetSettings } from '@/backend/lib/cad/bom-generator';
import { BOMPDFExporter, BOMSVGExporter, BOMDXFExporter } from '@/backend/lib/cad/bom-exporters';

interface BOMViewerProps {
  darkMode: boolean;
  bomDocument?: BOMDocument;
  onDocumentChange?: (doc: BOMDocument) => void;
  editable?: boolean;
}

export default function BOMViewer({
  darkMode,
  bomDocument,
  onDocumentChange,
  editable = true
}: BOMViewerProps) {
  const [bomDoc, setBomDoc] = useState<BOMDocument | null>(bomDocument || null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showTitleBlockEditor, setShowTitleBlockEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);

  useEffect(() => {
    if (bomDocument) {
      setBomDoc(bomDocument);
    }
  }, [bomDocument]);

  const handleExportPDF = () => {
    if (bomDoc) {
      BOMPDFExporter.exportToPDF(bomDoc);
    }
  };

  const handleExportSVG = () => {
    if (bomDoc) {
      BOMSVGExporter.exportToSVG(bomDoc);
    }
  };

  const handleExportDXF = () => {
    if (bomDoc) {
      BOMDXFExporter.exportToDXF(bomDoc);
    }
  };

  const handleExportCSV = () => {
    if (!bomDoc) return;
    
    const generator = new BOMGenerator();
    generator.fromJSON(JSON.stringify(bomDoc));
    const csv = generator.toCSV();
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${bomDoc.titleBlock.assemblyName}_BOM_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleItemSelect = (itemId: string, isCtrlKey: boolean) => {
    if (isCtrlKey) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(new Set([itemId]));
    }
  };

  const handleEditItem = (item: BOMItem) => {
    setEditingItem({ ...item });
  };

  const handleSaveItem = () => {
    if (!bomDoc || !editingItem) return;

    const updatedItems = bomDoc.items.map(item =>
      item.id === editingItem.id ? editingItem : item
    );

    const updatedDoc = { ...bomDoc, items: updatedItems };
    setBomDoc(updatedDoc);
    onDocumentChange?.(updatedDoc);
    setEditingItem(null);
  };

  const handleDeleteItems = () => {
    if (!bomDoc || selectedItems.size === 0) return;

    const updatedItems = bomDoc.items.filter(item => !selectedItems.has(item.id));
    const updatedDoc = { ...bomDoc, items: updatedItems };
    setBomDoc(updatedDoc);
    onDocumentChange?.(updatedDoc);
    setSelectedItems(new Set());
  };

  const formatValue = (value: any, column: BOMColumn): string => {
    if (column.format) {
      return column.format(value);
    }
    if (value === undefined || value === null) return '';
    return String(value);
  }

  if (!bomDoc) {
    return (
      <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-center">
          <p className="text-lg mb-2">No BOM document loaded</p>
          <p className="text-sm">Generate a BOM from an assembly first</p>
        </div>
      </div>
    );
  }

  const visibleColumns = bomDoc.columns.filter(col => col.visible);
  const { summary } = bomDoc;

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between p-3 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">📋 Bill of Materials</h3>
          <span className={`text-sm px-2 py-1 rounded ${
            darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            {bomDoc.titleBlock.assemblyName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {editable && selectedItems.size > 0 && (
            <button
              onClick={handleDeleteItems}
              className={`px-3 py-1 rounded text-sm ${
                darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              🗑️ Delete ({selectedItems.size})
            </button>
          )}

          <button
            onClick={() => setShowTitleBlockEditor(true)}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            📝 Title Block
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            ⚙️ Settings
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <button
            onClick={handleExportPDF}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            title="Export to PDF"
          >
            📄 PDF
          </button>

          <button
            onClick={handleExportSVG}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
            title="Export to SVG"
          >
            🖼️ SVG
          </button>

          <button
            onClick={handleExportDXF}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
            title="Export to DXF"
          >
            📐 DXF
          </button>

          <button
            onClick={handleExportCSV}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Export to CSV"
          >
            📊 CSV
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className={`flex items-center justify-between px-4 py-2 text-sm border-b ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex gap-4">
          <span>📦 Total Parts: <strong>{summary.totalParts}</strong></span>
          <span>🔧 Unique Parts: <strong>{summary.uniqueParts}</strong></span>
          {summary.totalWeight && (
            <span>⚖️ Total Weight: <strong>{summary.totalWeight.toFixed(2)} kg</strong></span>
          )}
          {summary.totalCost && (
            <span>💰 Total Cost: <strong>${summary.totalCost.toFixed(2)}</strong></span>
          )}
        </div>
        <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Rev {bomDoc.titleBlock.revision} • {bomDoc.titleBlock.date}
        </div>
      </div>

      {/* BOM Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className={`sticky top-0 z-10 ${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <tr>
              {editable && (
                <th className="w-10 p-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === bomDoc.items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(new Set(bomDoc.items.map(item => item.id)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
              )}
              {visibleColumns.map(column => (
                <th
                  key={column.id}
                  className={`p-3 text-${column.align} font-semibold border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}
                  style={{ width: `${column.width}%` }}
                >
                  {column.label}
                </th>
              ))}
              {editable && (
                <th className={`w-20 p-3 text-center border-b ${
                  darkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {bomDoc.items.map((item, index) => (
              <tr
                key={item.id}
                className={`
                  ${selectedItems.has(item.id) ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}
                  ${index % 2 === 1 ? (darkMode ? 'bg-gray-800/30' : 'bg-gray-50/50') : ''}
                  ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}
                  border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                `}
              >
                {editable && (
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemSelect(item.id, false)}
                      onClick={(e) => handleItemSelect(item.id, e.ctrlKey || e.metaKey)}
                      className="w-4 h-4"
                    />
                  </td>
                )}
                {visibleColumns.map(column => (
                  <td
                    key={column.id}
                    className={`p-3 text-${column.align}`}
                    style={{ paddingLeft: column.field === 'description' ? `${8 + item.level * 20}px` : undefined }}
                  >
                    {formatValue(item[column.field as keyof BOMItem], column)}
                  </td>
                ))}
                {editable && (
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleEditItem(item)}
                      className={`px-2 py-1 rounded text-xs ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white`}
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto`}>
            <h3 className="text-lg font-bold mb-4">Edit Item</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Part Number</label>
                  <input
                    type="text"
                    value={editingItem.partNumber}
                    onChange={(e) => setEditingItem({...editingItem, partNumber: e.target.value})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({...editingItem, quantity: parseInt(e.target.value)})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  className={`w-full px-3 py-2 rounded ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Material</label>
                  <input
                    type="text"
                    value={editingItem.material || ''}
                    onChange={(e) => setEditingItem({...editingItem, material: e.target.value})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Finish</label>
                  <input
                    type="text"
                    value={editingItem.finish || ''}
                    onChange={(e) => setEditingItem({...editingItem, finish: e.target.value})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.weight || ''}
                    onChange={(e) => setEditingItem({...editingItem, weight: parseFloat(e.target.value)})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.unitCost || ''}
                    onChange={(e) => setEditingItem({...editingItem, unitCost: parseFloat(e.target.value)})}
                    className={`w-full px-3 py-2 rounded ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <input
                  type="text"
                  value={editingItem.vendor || ''}
                  onChange={(e) => setEditingItem({...editingItem, vendor: e.target.value})}
                  className={`w-full px-3 py-2 rounded ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})}
                  rows={3}
                  className={`w-full px-3 py-2 rounded ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white border border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className={`px-4 py-2 rounded ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

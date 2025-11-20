'use client';

import { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, options: any) => void;
  darkMode: boolean;
  userTier: string;
}

export default function ExportModal({ isOpen, onClose, onExport, darkMode, userTier }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState('stl');
  const [quality, setQuality] = useState('high');
  const [units, setUnits] = useState('mm');

  if (!isOpen) return null;

  const formats = [
    { id: 'stl', name: 'STL', desc: 'For 3D printing', icon: '🖨️', tier: 'free' },
    { id: 'obj', name: 'OBJ', desc: 'With materials', icon: '📦', tier: 'pro' },
    { id: 'step', name: 'STEP', desc: 'CAD interchange', icon: '⚙️', tier: 'pro' },
    { id: 'iges', name: 'IGES', desc: 'Legacy CAD', icon: '📐', tier: 'pro' },
    { id: 'gltf', name: 'glTF', desc: 'Web 3D', icon: '🌐', tier: 'team' },
    { id: 'fbx', name: 'FBX', desc: 'Animation', icon: '🎬', tier: 'team' },
  ];

  const tierOrder = ['free', 'pro', 'team', 'enterprise'];
  const userTierIndex = tierOrder.indexOf(userTier);

  const canUseFormat = (formatTier: string) => {
    return userTierIndex >= tierOrder.indexOf(formatTier);
  };

  const handleExport = () => {
    onExport(selectedFormat, { quality, units });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Export Model</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {formats.map((format) => {
            const canUse = canUseFormat(format.tier);
            return (
              <button
                key={format.id}
                onClick={() => canUse && setSelectedFormat(format.id)}
                disabled={!canUse}
                className={`p-4 rounded-lg transition text-center relative ${
                  selectedFormat === format.id
                    ? 'bg-blue-600 text-white'
                    : canUse
                    ? darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    : 'bg-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl mb-1">{format.icon}</div>
                <div className="font-semibold">{format.name}</div>
                <div className="text-xs opacity-75">{format.desc}</div>
                {!canUse && (
                  <div className="absolute top-2 right-2 text-xs bg-yellow-600 px-2 py-1 rounded">
                    🔒 {format.tier}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="low">Low (Fast)</option>
              <option value="medium">Medium</option>
              <option value="high">High (Best Quality)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Units</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="mm">Millimeters</option>
              <option value="cm">Centimeters</option>
              <option value="in">Inches</option>
              <option value="m">Meters</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            } transition`}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Export {selectedFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

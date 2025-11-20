'use client';

import { useState } from 'react';

interface ExtrudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtrude: (distance: number, direction: 'positive' | 'negative' | 'symmetric') => void;
  darkMode: boolean;
}

export default function ExtrudeModal({ isOpen, onClose, onExtrude, darkMode }: ExtrudeModalProps) {
  const [distance, setDistance] = useState(20);
  const [direction, setDirection] = useState<'positive' | 'negative' | 'symmetric'>('positive');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onExtrude(distance, direction);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-2xl p-6 max-w-md w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Extrude</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Distance</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className={`flex-1 px-3 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              <span className="text-sm text-gray-400">mm</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Direction</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDirection('positive')}
                className={`px-3 py-2 rounded-lg transition ${
                  direction === 'positive'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ⬆️ Up
              </button>
              <button
                onClick={() => setDirection('negative')}
                className={`px-3 py-2 rounded-lg transition ${
                  direction === 'negative'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ⬇️ Down
              </button>
              <button
                onClick={() => setDirection('symmetric')}
                className={`px-3 py-2 rounded-lg transition ${
                  direction === 'symmetric'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ↕️ Both
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
            Preview: Extrude {direction} by {distance}mm
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
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Create Extrude
          </button>
        </div>
      </div>
    </div>
  );
}

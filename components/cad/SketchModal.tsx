'use client';

import { useState } from 'react';

interface SketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shape: string) => void;
  darkMode: boolean;
}

export default function SketchModal({ isOpen, onClose, onSelectShape, darkMode }: SketchModalProps) {
  if (!isOpen) return null;

  const shapes = [
    { id: 'line', name: 'Line', icon: '📏', desc: 'Draw straight lines' },
    { id: 'rectangle', name: 'Rectangle', icon: '▭', desc: 'Draw rectangles' },
    { id: 'circle', name: 'Circle', icon: '⭕', desc: 'Draw circles' },
    { id: 'arc', name: 'Arc', icon: '◠', desc: 'Draw arcs' },
    { id: 'polygon', name: 'Polygon', icon: '⬡', desc: 'Draw polygons' },
    { id: 'spline', name: 'Spline', icon: '〰️', desc: 'Draw curves' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Start Sketch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          Select a shape to start sketching on the XY plane
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {shapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => {
                onSelectShape(shape.id);
                onClose();
              }}
              className={`${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              } rounded-lg p-4 transition text-center group`}
            >
              <div className="text-4xl mb-2">{shape.icon}</div>
              <div className="font-semibold mb-1">{shape.name}</div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {shape.desc}
              </div>
            </button>
          ))}
        </div>

        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <div className="text-sm">
            <span className="font-semibold">💡 Tips:</span>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Click points in the viewport to draw</li>
              <li>Press <kbd className="px-2 py-1 bg-gray-600 rounded text-xs">ESC</kbd> to finish sketch</li>
              <li>Use constraints after drawing shapes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

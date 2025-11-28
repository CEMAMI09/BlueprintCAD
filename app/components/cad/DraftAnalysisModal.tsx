'use client';

import { useState, useEffect } from 'react';
import { DraftAnalysisResult } from '@/lib/cad/draft-analysis';

interface DraftAnalysisModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onApply: (options: {
    minDraftAngle: number;
    neutralPlaneHeight: number;
    direction: 'z' | '-z' | 'x' | '-x' | 'y' | '-y';
    colorScheme: 'traffic-light' | 'heat-map' | 'binary';
    tolerance: number;
  }) => void;
  result?: DraftAnalysisResult;
  onUpdateMinAngle?: (angle: number) => void;
  onUpdatePlane?: (height: number) => void;
  onUpdateColorScheme?: (scheme: 'traffic-light' | 'heat-map' | 'binary') => void;
  onExportMetadata?: () => void;
}

export default function DraftAnalysisModal({
  isOpen,
  darkMode,
  onClose,
  onApply,
  result,
  onUpdateMinAngle,
  onUpdatePlane,
  onUpdateColorScheme,
  onExportMetadata
}: DraftAnalysisModalProps) {
  const [minDraftAngle, setMinDraftAngle] = useState(2);
  const [neutralPlaneHeight, setNeutralPlaneHeight] = useState(0);
  const [direction, setDirection] = useState<'z' | '-z' | 'x' | '-x' | 'y' | '-y'>('z');
  const [colorScheme, setColorScheme] = useState<'traffic-light' | 'heat-map' | 'binary'>('traffic-light');
  const [tolerance, setTolerance] = useState(0.5);
  const [process, setProcess] = useState<'injection-molding' | 'die-casting' | 'sand-casting'>('injection-molding');

  useEffect(() => {
    // Update defaults based on process
    if (process === 'injection-molding') {
      setMinDraftAngle(2);
      setTolerance(0.5);
    } else if (process === 'die-casting') {
      setMinDraftAngle(3);
      setTolerance(1);
    } else if (process === 'sand-casting') {
      setMinDraftAngle(5);
      setTolerance(2);
    }
  }, [process]);

  const handleApply = () => {
    onApply({
      minDraftAngle,
      neutralPlaneHeight,
      direction,
      colorScheme,
      tolerance
    });
  };

  const handleMinAngleChange = (value: number) => {
    setMinDraftAngle(value);
    if (result && onUpdateMinAngle) {
      onUpdateMinAngle(value);
    }
  };

  const handlePlaneChange = (value: number) => {
    setNeutralPlaneHeight(value);
    if (result && onUpdatePlane) {
      onUpdatePlane(value);
    }
  };

  const handleColorSchemeChange = (scheme: 'traffic-light' | 'heat-map' | 'binary') => {
    setColorScheme(scheme);
    if (result && onUpdateColorScheme) {
      onUpdateColorScheme(scheme);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto`}>
        <h2 className="text-2xl font-bold mb-4">Draft Analysis</h2>

        {/* Process Preset */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Manufacturing Process</label>
          <select
            value={process}
            onChange={(e) => setProcess(e.target.value as any)}
            className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <option value="injection-molding">Injection Molding (2° min)</option>
            <option value="die-casting">Die Casting (3° min)</option>
            <option value="sand-casting">Sand Casting (5° min)</option>
          </select>
        </div>

        {/* Minimum Draft Angle */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Minimum Draft Angle: {minDraftAngle.toFixed(1)}°
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={minDraftAngle}
            onChange={(e) => handleMinAngleChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1">
            <span>0°</span>
            <span>10°</span>
          </div>
        </div>

        {/* Tolerance */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Tolerance: ±{tolerance.toFixed(1)}°
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={tolerance}
            onChange={(e) => setTolerance(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Neutral Plane */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Neutral Plane Height: {neutralPlaneHeight.toFixed(2)} mm
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={neutralPlaneHeight}
            onChange={(e) => handlePlaneChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <input
            type="number"
            value={neutralPlaneHeight}
            onChange={(e) => handlePlaneChange(parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 rounded mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            step="0.1"
          />
        </div>

        {/* Pull Direction */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Pull Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            className={`w-full px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <option value="z">+Z (Up)</option>
            <option value="-z">-Z (Down)</option>
            <option value="x">+X (Right)</option>
            <option value="-x">-X (Left)</option>
            <option value="y">+Y (Forward)</option>
            <option value="-y">-Y (Back)</option>
          </select>
        </div>

        {/* Color Scheme */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Color Scheme</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleColorSchemeChange('traffic-light')}
              className={`px-4 py-2 rounded ${
                colorScheme === 'traffic-light'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              Traffic Light
            </button>
            <button
              onClick={() => handleColorSchemeChange('heat-map')}
              className={`px-4 py-2 rounded ${
                colorScheme === 'heat-map'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              Heat Map
            </button>
            <button
              onClick={() => handleColorSchemeChange('binary')}
              className={`px-4 py-2 rounded ${
                colorScheme === 'binary'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              Pass/Fail
            </button>
          </div>

          {/* Color Legend */}
          <div className="mt-4 space-y-2">
            {colorScheme === 'traffic-light' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span className="text-sm">Adequate Draft (&gt; {minDraftAngle + tolerance}°)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  <span className="text-sm">Marginal Draft (~{minDraftAngle}°)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                  <span className="text-sm">Insufficient Draft (&lt; {minDraftAngle - tolerance}°)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="text-sm">Undercut (negative draft)</span>
                </div>
              </>
            )}
            {colorScheme === 'heat-map' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span className="text-sm">Adequate (cool)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-cyan-500 rounded"></div>
                  <span className="text-sm">Marginal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  <span className="text-sm">Insufficient</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="text-sm">Undercut (hot)</span>
                </div>
              </>
            )}
            {colorScheme === 'binary' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span className="text-sm">Pass (adequate/marginal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="text-sm">Fail (insufficient/undercut)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {result && result.success && (
          <div className={`mb-6 p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-semibold mb-3">Analysis Results</h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <div className="font-medium">Total Faces</div>
                <div>{result.statistics.totalFaces}</div>
              </div>
              <div>
                <div className="font-medium">Total Area</div>
                <div>{result.statistics.totalArea.toFixed(2)} mm²</div>
              </div>
              <div>
                <div className="font-medium">Average Draft</div>
                <div>{result.statistics.averageDraftAngle.toFixed(2)}°</div>
              </div>
              <div>
                <div className="font-medium">Range</div>
                <div>
                  {result.statistics.minDraftAngle.toFixed(1)}° to{' '}
                  {result.statistics.maxDraftAngle.toFixed(1)}°
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-500">✓ Adequate:</span>
                <span>
                  {result.statistics.adequateFaces} faces ({(result.statistics.adequateArea / result.statistics.totalArea * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-500">⚠ Marginal:</span>
                <span>
                  {result.statistics.marginalFaces} faces ({(result.statistics.marginalArea / result.statistics.totalArea * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-500">⚠ Insufficient:</span>
                <span>
                  {result.statistics.insufficientFaces} faces ({(result.statistics.insufficientArea / result.statistics.totalArea * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-500">✗ Undercut:</span>
                <span>
                  {result.statistics.undercutFaces} faces ({(result.statistics.undercutArea / result.statistics.totalArea * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="font-medium mb-2">Warnings:</div>
                <ul className="text-sm space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx} className="text-yellow-500">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {result ? 'Update Analysis' : 'Run Analysis'}
          </button>
          
          {result && onExportMetadata && (
            <button
              onClick={onExportMetadata}
              className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Export Results
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Close
          </button>
        </div>

        {/* Help Text */}
        <div className={`mt-4 p-3 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <strong>Draft Analysis</strong> visualizes whether surfaces have adequate draft angles for manufacturing.
          Adjust the neutral plane to match your parting line, and set the pull direction to match mold ejection.
          Results are saved as display-only metadata in your CAD file.
        </div>
      </div>
    </div>
  );
}

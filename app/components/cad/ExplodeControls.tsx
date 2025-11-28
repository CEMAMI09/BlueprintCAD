'use client';

import React, { useState } from 'react';
import { ExplodeAnimation, ExplodeStep } from '@/lib/cad/exploded-view';

interface ExplodeControlsProps {
  darkMode: boolean;
  explodeFactor: number;
  isExploded: boolean;
  autoDirection: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical';
  autoDistance: number;
  animations: ExplodeAnimation[];
  currentAnimation?: string;
  isPlaying: boolean;
  currentTime: number;
  loop: boolean;
  playbackSpeed: number;
  onToggleExplode: () => void;
  onSetExplodeFactor: (factor: number) => void;
  onSetAutoDirection: (direction: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical') => void;
  onSetAutoDistance: (distance: number) => void;
  onCreateAnimation: (name: string, duration: number) => void;
  onPlayAnimation: (animationId: string) => void;
  onPauseAnimation: () => void;
  onStopAnimation: () => void;
  onSeekAnimation: (time: number) => void;
  onDeleteAnimation: (animationId: string) => void;
  onToggleLoop: () => void;
  onSetPlaybackSpeed: (speed: number) => void;
  onExportVideo: () => void;
}

export default function ExplodeControls({
  darkMode,
  explodeFactor,
  isExploded,
  autoDirection,
  autoDistance,
  animations,
  currentAnimation,
  isPlaying,
  currentTime,
  loop,
  playbackSpeed,
  onToggleExplode,
  onSetExplodeFactor,
  onSetAutoDirection,
  onSetAutoDistance,
  onCreateAnimation,
  onPlayAnimation,
  onPauseAnimation,
  onStopAnimation,
  onSeekAnimation,
  onDeleteAnimation,
  onToggleLoop,
  onSetPlaybackSpeed,
  onExportVideo
}: ExplodeControlsProps) {
  const [showAnimationDialog, setShowAnimationDialog] = useState(false);
  const [newAnimName, setNewAnimName] = useState('Explode Animation');
  const [newAnimDuration, setNewAnimDuration] = useState(5);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['controls']));

  const currentAnim = animations.find(a => a.id === currentAnimation);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCreateAnimation = () => {
    if (newAnimName.trim()) {
      onCreateAnimation(newAnimName, newAnimDuration);
      setShowAnimationDialog(false);
      setNewAnimName('Explode Animation');
      setNewAnimDuration(5);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h2 className="text-lg font-semibold">💥 Exploded View</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Basic Controls */}
        <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <button
            onClick={() => toggleSection('controls')}
            className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <span>⚙️ Controls</span>
            <span>{expandedSections.has('controls') ? '▼' : '▶'}</span>
          </button>
          
          {expandedSections.has('controls') && (
            <div className="p-4 space-y-4">
              {/* Toggle Explode */}
              <button
                onClick={onToggleExplode}
                className={`w-full px-4 py-2 rounded font-medium ${
                  isExploded
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {isExploded ? '⊗ Collapse Assembly' : '💥 Explode Assembly'}
              </button>

              {/* Explode Factor Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Explode Factor: {(explodeFactor * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explodeFactor * 100}
                  onChange={(e) => onSetExplodeFactor(parseFloat(e.target.value) / 100)}
                  className="w-full"
                />
              </div>

              {/* Auto Direction */}
              <div>
                <label className="block text-sm font-medium mb-2">Auto Direction</label>
                <select
                  value={autoDirection}
                  onChange={(e) => onSetAutoDirection(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="xyz">XYZ (All Directions)</option>
                  <option value="x">X Axis</option>
                  <option value="y">Y Axis</option>
                  <option value="z">Z Axis</option>
                  <option value="radial">Radial (XZ Plane)</option>
                  <option value="hierarchical">Hierarchical</option>
                </select>
              </div>

              {/* Auto Distance */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Distance: {autoDistance} mm
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={autoDistance}
                  onChange={(e) => onSetAutoDistance(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Animations */}
        <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <button
            onClick={() => toggleSection('animations')}
            className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <span>🎬 Animations ({animations.length})</span>
            <span>{expandedSections.has('animations') ? '▼' : '▶'}</span>
          </button>
          
          {expandedSections.has('animations') && (
            <div className="p-4 space-y-3">
              {/* Create Animation Button */}
              <button
                onClick={() => setShowAnimationDialog(true)}
                className={`w-full px-4 py-2 rounded border-2 border-dashed font-medium ${
                  darkMode
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                + Create Animation
              </button>

              {/* Animation List */}
              {animations.length === 0 ? (
                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No animations yet. Create one from your current exploded view!
                </p>
              ) : (
                animations.map(anim => (
                  <div
                    key={anim.id}
                    className={`p-3 rounded border ${
                      currentAnimation === anim.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : darkMode
                        ? 'border-gray-600 bg-gray-700/50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{anim.name}</span>
                      <button
                        onClick={() => onDeleteAnimation(anim.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          darkMode
                            ? 'hover:bg-red-900/50 text-red-400'
                            : 'hover:bg-red-100 text-red-600'
                        }`}
                        title="Delete Animation"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {anim.steps.length} step{anim.steps.length !== 1 ? 's' : ''} • {anim.totalDuration.toFixed(1)}s
                    </div>
                    <button
                      onClick={() => onPlayAnimation(anim.id)}
                      disabled={isPlaying && currentAnimation === anim.id}
                      className={`w-full px-3 py-1 rounded text-sm font-medium ${
                        isPlaying && currentAnimation === anim.id
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {currentAnimation === anim.id && isPlaying ? '▶️ Playing...' : '▶️ Play'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Playback Controls */}
        {currentAnim && (
          <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button
              onClick={() => toggleSection('playback')}
              className={`w-full px-4 py-2 flex items-center justify-between font-medium ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>⏯️ Playback</span>
              <span>{expandedSections.has('playback') ? '▼' : '▶'}</span>
            </button>
            
            {expandedSections.has('playback') && (
              <div className="p-4 space-y-4">
                {/* Current Animation Name */}
                <div className="text-center font-medium">{currentAnim.name}</div>

                {/* Timeline */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(currentAnim.totalDuration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={currentAnim.totalDuration * 100}
                    value={currentTime * 100}
                    onChange={(e) => onSeekAnimation(parseFloat(e.target.value) / 100)}
                    className="w-full"
                  />
                  <div className={`h-1 bg-gray-300 dark:bg-gray-700 rounded mt-1`}>
                    <div
                      className="h-full bg-blue-600 rounded"
                      style={{ width: `${(currentTime / currentAnim.totalDuration) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Playback Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={onStopAnimation}
                    className={`flex-1 px-4 py-2 rounded font-medium ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    ⏹️ Stop
                  </button>
                  <button
                    onClick={isPlaying ? onPauseAnimation : () => onPlayAnimation(currentAnim.id)}
                    className="flex-1 px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                  </button>
                </div>

                {/* Speed Control */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Speed: {playbackSpeed}x
                  </label>
                  <div className="flex gap-2">
                    {[0.5, 1, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={() => onSetPlaybackSpeed(speed)}
                        className={`flex-1 px-3 py-1 rounded text-sm ${
                          playbackSpeed === speed
                            ? 'bg-blue-600 text-white'
                            : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loop Toggle */}
                <button
                  onClick={onToggleLoop}
                  className={`w-full px-4 py-2 rounded font-medium ${
                    loop
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : darkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {loop ? '🔁 Loop: ON' : '➡️ Loop: OFF'}
                </button>

                {/* Export Video */}
                <button
                  onClick={onExportVideo}
                  className="w-full px-4 py-2 rounded font-medium bg-purple-600 hover:bg-purple-700 text-white"
                >
                  🎥 Export to MP4
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Animation Dialog */}
      {showAnimationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAnimationDialog(false)}>
          <div
            className={`w-96 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <h3 className="text-lg font-semibold">Create Animation</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Animation Name</label>
                <input
                  type="text"
                  value={newAnimName}
                  onChange={(e) => setNewAnimName(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter animation name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration: {newAnimDuration}s
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={newAnimDuration}
                  onChange={(e) => setNewAnimDuration(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex gap-3`}>
              <button
                onClick={() => setShowAnimationDialog(false)}
                className={`flex-1 px-4 py-2 rounded font-medium ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnimation}
                className="flex-1 px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { SweepOptions, LoftOptions, SweepOperation, LoftOperation } from '@/lib/cad/sweep-loft';

interface SweepLoftModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'sweep' | 'loft';
  darkMode: boolean;
  availableProfiles: Array<{ id: string; name: string; geometry: any }>;
  availablePaths: Array<{ id: string; name: string; curve: THREE.Curve<THREE.Vector3> }>;
  onConfirm: (config: SweepConfig | LoftConfig) => void;
}

interface SweepConfig {
  type: 'sweep';
  profileId: string;
  pathId: string;
  options: SweepOptions;
}

interface LoftConfig {
  type: 'loft';
  profileIds: string[];
  guideCurveIds?: string[];
  options: LoftOptions;
}

export default function SweepLoftModal({
  isOpen,
  onClose,
  mode,
  darkMode,
  availableProfiles,
  availablePaths,
  onConfirm
}: SweepLoftModalProps) {
  // Sweep state
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [segments, setSegments] = useState(64);
  const [twistAngle, setTwistAngle] = useState(0);
  const [scaleEnd, setScaleEnd] = useState(1);
  const [capped, setCapped] = useState(true);
  const [followPath, setFollowPath] = useState(true);
  const [preserveArea, setPreserveArea] = useState(false);

  // Loft state
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedGuideCurves, setSelectedGuideCurves] = useState<string[]>([]);
  const [loftSegments, setLoftSegments] = useState(32);
  const [closed, setClosed] = useState(false);
  const [loftCapped, setLoftCapped] = useState(true);
  const [smoothness, setSmoothness] = useState(0.5);
  const [loftTwist, setLoftTwist] = useState(0);
  const [uniformScale, setUniformScale] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [stats, setStats] = useState<any>(null);

  if (!isOpen) return null;

  const handleProfileToggle = (profileId: string) => {
    if (selectedProfiles.includes(profileId)) {
      setSelectedProfiles(selectedProfiles.filter(id => id !== profileId));
    } else {
      setSelectedProfiles([...selectedProfiles, profileId]);
    }
  };

  const handleGuideCurveToggle = (curveId: string) => {
    if (selectedGuideCurves.includes(curveId)) {
      setSelectedGuideCurves(selectedGuideCurves.filter(id => id !== curveId));
    } else {
      setSelectedGuideCurves([...selectedGuideCurves, curveId]);
    }
  };

  const generatePreview = () => {
    try {
      if (mode === 'sweep') {
        if (!selectedProfile || !selectedPath) {
          setPreviewError('Select profile and path');
          return;
        }

        const profile = availableProfiles.find(p => p.id === selectedProfile);
        const path = availablePaths.find(p => p.id === selectedPath);

        if (!profile || !path) return;

        const options: SweepOptions = {
          profile: profile.geometry,
          path: path.curve,
          segments,
          twistAngle: (twistAngle * Math.PI) / 180,
          scaleEnd,
          capped,
          followPath,
          preserveArea
        };

        const result = SweepOperation.create(options);
        
        if (result.success) {
          setPreviewError('');
          setStats(result.stats);
        } else {
          setPreviewError(result.error || 'Failed to generate sweep');
          setStats(null);
        }

        if (result.warnings.length > 0) {
          setPreviewError(result.warnings.join(', '));
        }
      } else {
        if (selectedProfiles.length < 2) {
          setPreviewError('Select at least 2 profiles');
          return;
        }

        const profiles = selectedProfiles
          .map(id => availableProfiles.find(p => p.id === id))
          .filter(p => p)
          .map(p => p!.geometry);

        const guideCurves = selectedGuideCurves
          .map(id => availablePaths.find(p => p.id === id))
          .filter(p => p)
          .map(p => p!.curve);

        const options: LoftOptions = {
          profiles,
          guideCurves: guideCurves.length > 0 ? guideCurves : undefined,
          segments: loftSegments,
          closed,
          capped: loftCapped,
          smoothness,
          twistAngle: (loftTwist * Math.PI) / 180,
          uniformScale
        };

        const result = LoftOperation.create(options);
        
        if (result.success) {
          setPreviewError('');
          setStats(result.stats);
        } else {
          setPreviewError(result.error || 'Failed to generate loft');
          setStats(null);
        }

        if (result.warnings.length > 0) {
          setPreviewError(result.warnings.join(', '));
        }
      }
    } catch (error: any) {
      setPreviewError(error.message);
      setStats(null);
    }
  };

  const handleConfirm = () => {
    if (mode === 'sweep') {
      if (!selectedProfile || !selectedPath) return;

      const profile = availableProfiles.find(p => p.id === selectedProfile);
      const path = availablePaths.find(p => p.id === selectedPath);

      if (!profile || !path) return;

      const config: SweepConfig = {
        type: 'sweep',
        profileId: selectedProfile,
        pathId: selectedPath,
        options: {
          profile: profile.geometry,
          path: path.curve,
          segments,
          twistAngle: (twistAngle * Math.PI) / 180,
          scaleEnd,
          capped,
          followPath,
          preserveArea
        }
      };

      onConfirm(config);
    } else {
      if (selectedProfiles.length < 2) return;

      const profiles = selectedProfiles
        .map(id => availableProfiles.find(p => p.id === id))
        .filter(p => p)
        .map(p => p!.geometry);

      const guideCurves = selectedGuideCurves
        .map(id => availablePaths.find(p => p.id === id))
        .filter(p => p)
        .map(p => p!.curve);

      const config: LoftConfig = {
        type: 'loft',
        profileIds: selectedProfiles,
        guideCurveIds: selectedGuideCurves.length > 0 ? selectedGuideCurves : undefined,
        options: {
          profiles,
          guideCurves: guideCurves.length > 0 ? guideCurves : undefined,
          segments: loftSegments,
          closed,
          capped: loftCapped,
          smoothness,
          twistAngle: (loftTwist * Math.PI) / 180,
          uniformScale
        }
      };

      onConfirm(config);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold">
            {mode === 'sweep' ? '🌀 Sweep' : '🎭 Loft'}
          </h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            ✕ Close
          </button>
        </div>

        <div className="p-6 space-y-6">
          {mode === 'sweep' ? (
            // Sweep Controls
            <>
              {/* Profile Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select profile...</option>
                  {availableProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Path Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Path</label>
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select path...</option>
                  {availablePaths.map(path => (
                    <option key={path.id} value={path.id}>
                      {path.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segments */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Segments: {segments}
                </label>
                <input
                  type="range"
                  min="3"
                  max="256"
                  value={segments}
                  onChange={(e) => setSegments(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Twist Angle */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Twist Angle: {twistAngle}°
                </label>
                <input
                  type="range"
                  min="-720"
                  max="720"
                  value={twistAngle}
                  onChange={(e) => setTwistAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Scale End */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Scale: {scaleEnd.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={scaleEnd}
                  onChange={(e) => setScaleEnd(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={capped}
                    onChange={(e) => setCapped(e.target.checked)}
                  />
                  <span>Capped ends</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={followPath}
                    onChange={(e) => setFollowPath(e.target.checked)}
                  />
                  <span>Follow path orientation</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preserveArea}
                    onChange={(e) => setPreserveArea(e.target.checked)}
                  />
                  <span>Preserve cross-section area</span>
                </label>
              </div>
            </>
          ) : (
            // Loft Controls
            <>
              {/* Profile Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Profiles (select 2+)
                </label>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {availableProfiles.map(profile => (
                    <label key={profile.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedProfiles.includes(profile.id)}
                        onChange={() => handleProfileToggle(profile.id)}
                      />
                      <span>{profile.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Guide Curves */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Guide Curves (optional)
                </label>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {availablePaths.map(path => (
                    <label key={path.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedGuideCurves.includes(path.id)}
                        onChange={() => handleGuideCurveToggle(path.id)}
                      />
                      <span>{path.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Segments */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Segments: {loftSegments}
                </label>
                <input
                  type="range"
                  min="1"
                  max="128"
                  value={loftSegments}
                  onChange={(e) => setLoftSegments(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Smoothness */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Smoothness: {smoothness.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={smoothness}
                  onChange={(e) => setSmoothness(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Twist */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Twist Angle: {loftTwist}°
                </label>
                <input
                  type="range"
                  min="-720"
                  max="720"
                  value={loftTwist}
                  onChange={(e) => setLoftTwist(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => setClosed(e.target.checked)}
                  />
                  <span>Closed loft (connect first and last)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={loftCapped}
                    onChange={(e) => setLoftCapped(e.target.checked)}
                  />
                  <span>Capped ends</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={uniformScale}
                    onChange={(e) => setUniformScale(e.target.checked)}
                  />
                  <span>Uniform profile scaling</span>
                </label>
              </div>
            </>
          )}

          {/* Preview Button */}
          <button
            onClick={generatePreview}
            className={`w-full px-4 py-2 rounded-lg font-medium transition ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            🔄 Generate Preview
          </button>

          {/* Preview Error */}
          {previewError && (
            <div className={`p-3 rounded-lg ${
              darkMode ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
            }`}>
              ⚠️ {previewError}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <h3 className="font-semibold mb-2">Preview Statistics</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Vertices: {stats.vertices}</div>
                <div>Faces: {stats.faces}</div>
                {stats.segments && <div>Segments: {stats.segments}</div>}
                {stats.profiles && <div>Profiles: {stats.profiles}</div>}
                {stats.volume && (
                  <div>Volume: {stats.volume.toFixed(2)} units³</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 flex justify-end gap-3 p-6 border-t ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg transition ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              mode === 'sweep' 
                ? !selectedProfile || !selectedPath
                : selectedProfiles.length < 2
            }
            className={`px-6 py-2 rounded-lg font-medium transition ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
            } text-white disabled:cursor-not-allowed`}
          >
            ✓ Create {mode === 'sweep' ? 'Sweep' : 'Loft'}
          </button>
        </div>
      </div>
    </div>
  );
}

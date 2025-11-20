'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ShellOptions, ShellOperation, FaceInfo } from '@/lib/cad/shell-operation';

interface ShellModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  sourceGeometry: THREE.BufferGeometry | null;
  sourceGeometryId: string;
  onConfirm: (config: ShellConfig) => void;
}

export interface ShellConfig {
  sourceGeometryId: string;
  options: ShellOptions;
}

export default function ShellModal({
  isOpen,
  onClose,
  darkMode,
  sourceGeometry,
  sourceGeometryId,
  onConfirm
}: ShellModalProps) {
  // Shell parameters
  const [thickness, setThickness] = useState(1);
  const [inward, setInward] = useState(true);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [preserveEdges, setPreserveEdges] = useState(true);
  const [tolerance, setTolerance] = useState(0.001);

  // Face selection
  const [availableFaces, setAvailableFaces] = useState<FaceInfo[]>([]);
  const [selectedFaces, setSelectedFaces] = useState<Set<number>>(new Set());
  const [faceSelectionMode, setFaceSelectionMode] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(true);
  const [previewMesh, setPreviewMesh] = useState<THREE.Mesh | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Canvas for face preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();

  // Initialize face information
  useEffect(() => {
    if (sourceGeometry && isOpen) {
      const faces = ShellOperation.getFaceInfo(sourceGeometry);
      setAvailableFaces(faces);
    }
  }, [sourceGeometry, isOpen]);

  // Initialize preview scene
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, [isOpen, darkMode]);

  // Update preview when parameters change
  useEffect(() => {
    if (!showPreview || !sourceGeometry || !sceneRef.current) return;

    generatePreview();
  }, [thickness, inward, selectedFaces, quality, preserveEdges, showPreview]);

  const generatePreview = async () => {
    if (!sourceGeometry || !sceneRef.current) return;

    setIsGenerating(true);
    setPreviewError('');

    try {
      // Remove old preview
      if (previewMesh) {
        sceneRef.current.remove(previewMesh);
        previewMesh.geometry.dispose();
        if (previewMesh.material instanceof THREE.Material) {
          previewMesh.material.dispose();
        }
      }

      // Generate shell
      const options: ShellOptions = {
        thickness,
        removedFaces: Array.from(selectedFaces),
        inward,
        quality,
        preserveEdges,
        tolerance
      };

      const result = ShellOperation.create(sourceGeometry, options);

      if (result.success) {
        const material = new THREE.MeshPhongMaterial({
          color: 0xFFC107,
          opacity: 0.8,
          transparent: true,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(result.geometry, material);
        sceneRef.current.add(mesh);
        setPreviewMesh(mesh);
        setStats(result.stats);
        setPreviewError('');

        if (result.warnings.length > 0) {
          setPreviewError(result.warnings.join(', '));
        }
      } else {
        setPreviewError(result.error || 'Failed to generate shell');
        setStats(null);
      }
    } catch (error: any) {
      setPreviewError(error.message);
      setStats(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFaceSelection = (faceIndex: number) => {
    const newSelection = new Set(selectedFaces);
    if (newSelection.has(faceIndex)) {
      newSelection.delete(faceIndex);
    } else {
      newSelection.add(faceIndex);
    }
    setSelectedFaces(newSelection);
  };

  const clearFaceSelection = () => {
    setSelectedFaces(new Set());
  };

  const handleConfirm = () => {
    if (!sourceGeometry) return;

    const config: ShellConfig = {
      sourceGeometryId,
      options: {
        thickness,
        removedFaces: Array.from(selectedFaces),
        inward,
        quality,
        preserveEdges,
        tolerance
      }
    };

    onConfirm(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-6xl max-h-[90vh] overflow-auto rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold">🐚 Shell Tool</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Panel: Controls */}
          <div className="space-y-6">
            {/* Wall Thickness */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Wall Thickness: {thickness.toFixed(3)} units
              </label>
              <input
                type="range"
                min="0.01"
                max="10"
                step="0.01"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2 mt-2">
                {[0.5, 1, 2, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => setThickness(val)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInward(true)}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    inward
                      ? darkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  ⬇️ Inward
                </button>
                <button
                  onClick={() => setInward(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    !inward
                      ? darkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  ⬆️ Outward
                </button>
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium mb-2">Quality</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 px-4 py-2 rounded-lg transition capitalize ${
                      quality === q
                        ? darkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 text-white'
                        : darkMode
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preserveEdges}
                  onChange={(e) => setPreserveEdges(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Preserve sharp edges</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showPreview}
                  onChange={(e) => setShowPreview(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Live preview</span>
              </label>
            </div>

            {/* Tolerance */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tolerance: {tolerance.toFixed(4)}
              </label>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Face Removal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Remove Faces ({selectedFaces.size} selected)
                </label>
                <button
                  onClick={clearFaceSelection}
                  disabled={selectedFaces.size === 0}
                  className={`px-3 py-1 text-xs rounded transition ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800' 
                      : 'bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100'
                  } disabled:cursor-not-allowed`}
                >
                  Clear
                </button>
              </div>
              
              <div className={`max-h-48 overflow-auto rounded-lg border ${
                darkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                {availableFaces.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No faces available
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {availableFaces.map((face, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                          selectedFaces.has(idx)
                            ? darkMode
                              ? 'bg-blue-900/50'
                              : 'bg-blue-100'
                            : darkMode
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedFaces.has(idx)}
                            onChange={() => toggleFaceSelection(idx)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Face {idx}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {face.area.toFixed(2)} units²
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePreview}
              disabled={isGenerating || !sourceGeometry}
              className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300'
              } text-white disabled:cursor-not-allowed`}
            >
              {isGenerating ? '⏳ Generating...' : '🔄 Update Preview'}
            </button>

            {/* Error Display */}
            {previewError && (
              <div className={`p-3 rounded-lg text-sm ${
                darkMode ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
              }`}>
                ⚠️ {previewError}
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <h3 className="font-semibold mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Shell Vertices:</div>
                  <div>{stats.shellVertices}</div>
                  
                  <div>Shell Faces:</div>
                  <div>{stats.shellFaces}</div>
                  
                  <div>Removed Faces:</div>
                  <div>{stats.removedFaces}</div>
                  
                  <div>Wall Thickness:</div>
                  <div>{stats.wallThickness.toFixed(3)}</div>
                  
                  <div>Volume:</div>
                  <div>{stats.volume.toFixed(2)} units³</div>
                  
                  <div>Surface Area:</div>
                  <div>{stats.surfaceArea.toFixed(2)} units²</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Preview */}
          <div className="space-y-4">
            <div className={`rounded-lg overflow-hidden border ${
              darkMode ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: '500px' }}
              />
            </div>

            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <h3 className="font-semibold mb-2">Preview Controls</h3>
              <div className="text-sm space-y-1 text-gray-500">
                <div>• Live preview updates as you adjust parameters</div>
                <div>• Orange color indicates shell geometry</div>
                <div>• Removed faces create openings in the shell</div>
                <div>• Scroll to zoom, drag to rotate</div>
              </div>
            </div>
          </div>
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
            disabled={!sourceGeometry || isGenerating}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
            } text-white disabled:cursor-not-allowed`}
          >
            ✓ Create Shell
          </button>
        </div>
      </div>
    </div>
  );
}

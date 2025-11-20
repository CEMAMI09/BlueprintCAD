'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { BOMGenerator, BOMDocument, BOMTitleBlock } from '@/lib/cad/bom-generator';
import BOMViewer from '@/components/cad/BOMViewer';

export default function BOMEditorPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [bomDocument, setBomDocument] = useState<BOMDocument | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [generatorSettings, setGeneratorSettings] = useState({
    includeSubassemblies: true,
    flattenHierarchy: false,
    includeWeight: true,
    includeCost: false,
    includeVendor: false
  });

  const assemblyRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    fetchAvailableFiles();
    loadSavedBOM();
  }, []);

  const fetchAvailableFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/cad/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const files = await response.json();
        setAvailableFiles(files);
      }
    } catch (error) {
      console.error('Failed to fetch CAD files:', error);
    }
  };

  const loadSavedBOM = () => {
    const saved = localStorage.getItem('bom-document');
    if (saved) {
      try {
        const doc = JSON.parse(saved);
        setBomDocument(doc);
      } catch (error) {
        console.error('Failed to load saved BOM:', error);
      }
    }
  };

  const handleLoadFile = async (fileId: number) => {
    setLoadingFile(true);
    try {
      const file = availableFiles.find(f => f.id === fileId);
      if (!file) {
        alert('File not found');
        return;
      }

      const response = await fetch(`/api/files/${file.filename}`);
      if (!response.ok) throw new Error('Failed to load file');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const extension = file.filename.split('.').pop()?.toLowerCase();

      let geometry: THREE.BufferGeometry | null = null;

      if (extension === 'stl') {
        const loader = new STLLoader();
        geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
      } else if (extension === 'obj') {
        const loader = new OBJLoader();
        const object = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
        const mesh = object.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
        if (mesh) geometry = mesh.geometry as THREE.BufferGeometry;
      }

      URL.revokeObjectURL(url);

      if (!geometry) {
        throw new Error('Failed to load geometry');
      }

      // Create assembly group
      const material = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add metadata
      mesh.userData = {
        partNumber: file.partNumber || `PART-${file.id}`,
        description: file.name,
        material: file.material || 'Steel',
        quantity: 1
      };

      const assembly = new THREE.Group();
      assembly.add(mesh);
      assemblyRef.current = assembly;

      setSelectedFile(fileId);
      alert(`Loaded ${file.name} successfully!`);
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleGenerateBOM = () => {
    if (!assemblyRef.current) {
      alert('Please load an assembly first');
      return;
    }

    const titleBlock: Partial<BOMTitleBlock> = {
      projectName: 'CAD Project',
      assemblyName: availableFiles.find(f => f.id === selectedFile)?.name || 'Assembly',
      assemblyNumber: `ASM-${selectedFile}`,
      revision: 'A',
      author: 'User',
      date: new Date().toISOString().split('T')[0],
      company: 'Blueprint CAD'
    };

    const generator = new BOMGenerator(titleBlock, undefined, generatorSettings);
    generator.extractFromAssembly(assemblyRef.current);

    const doc = generator.generateDocument();
    setBomDocument(doc);
    setShowGenerator(false);

    // Auto-save
    localStorage.setItem('bom-document', JSON.stringify(doc));
  };

  const handleDocumentChange = (doc: BOMDocument) => {
    setBomDocument(doc);
    localStorage.setItem('bom-document', JSON.stringify(doc));
  };

  const handleNewBOM = () => {
    setShowGenerator(true);
  };

  const handleClearBOM = () => {
    if (confirm('Are you sure you want to clear the current BOM?')) {
      setBomDocument(null);
      assemblyRef.current = null;
      setSelectedFile(null);
      localStorage.removeItem('bom-document');
    }
  };

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">📋 BOM Editor</h1>
          {bomDocument && (
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {bomDocument.summary.totalParts} parts
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewBOM}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            ➕ New BOM
          </button>

          {bomDocument && (
            <button
              onClick={handleClearBOM}
              className={`px-3 py-1 rounded text-sm ${
                darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              🗑️ Clear
            </button>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 rounded ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {bomDocument ? (
          <BOMViewer
            darkMode={darkMode}
            bomDocument={bomDocument}
            onDocumentChange={handleDocumentChange}
            editable={true}
          />
        ) : (
          <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl mb-4">No BOM Document</p>
              <p className="text-sm mb-6">
                Generate a Bill of Materials from an assembly or load a saved BOM
              </p>
              <button
                onClick={handleNewBOM}
                className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Generate New BOM
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOM Generator Dialog */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto`}>
            <h3 className="text-lg font-bold mb-4">Generate Bill of Materials</h3>

            {/* File Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Assembly File</label>
              {loadingFile ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm">Loading file...</p>
                </div>
              ) : availableFiles.length === 0 ? (
                <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p>No CAD files available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleLoadFile(file.id)}
                      className={`w-full text-left p-3 rounded ${
                        selectedFile === file.id
                          ? 'ring-2 ring-blue-500'
                          : ''
                      } ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <div className="font-medium">{file.name}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {file.filename}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generator Settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">BOM Settings</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generatorSettings.includeSubassemblies}
                    onChange={(e) => setGeneratorSettings({
                      ...generatorSettings,
                      includeSubassemblies: e.target.checked
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include Subassemblies</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generatorSettings.flattenHierarchy}
                    onChange={(e) => setGeneratorSettings({
                      ...generatorSettings,
                      flattenHierarchy: e.target.checked
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Flatten Hierarchy (consolidate duplicates)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generatorSettings.includeWeight}
                    onChange={(e) => setGeneratorSettings({
                      ...generatorSettings,
                      includeWeight: e.target.checked
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include Weight Information</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generatorSettings.includeCost}
                    onChange={(e) => setGeneratorSettings({
                      ...generatorSettings,
                      includeCost: e.target.checked
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include Cost Information</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generatorSettings.includeVendor}
                    onChange={(e) => setGeneratorSettings({
                      ...generatorSettings,
                      includeVendor: e.target.checked
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include Vendor Information</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowGenerator(false)}
                className={`px-4 py-2 rounded ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateBOM}
                disabled={!selectedFile}
                className={`px-4 py-2 rounded ${
                  selectedFile
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-500 cursor-not-allowed'
                } text-white`}
              >
                Generate BOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

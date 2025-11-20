'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DrawingSystem, DrawingSheet, ViewType, OrthographicDirection } from '@/lib/cad/drawing-system';
import DrawingSheetViewer from '@/components/cad/DrawingSheetViewer';
import DrawingControls from '@/components/cad/DrawingControls';
import DimensionTools from '@/components/cad/DimensionTools';
import { PDFExporter, DXFExporter } from '@/lib/cad/drawing-exporters';
import { AnnotationStyle, STANDARD_ANNOTATION_STYLES } from '@/lib/cad/annotation-styles';
import { GDTSymbolType } from '@/lib/cad/gdt-symbols';

export default function DrawingEditor() {
  const [darkMode, setDarkMode] = useState(true);
  const [sheets, setSheets] = useState<DrawingSheet[]>([]);
  const [currentSheet, setCurrentSheet] = useState<DrawingSheet | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const [sourceFileId, setSourceFileId] = useState<number | undefined>(undefined);
  const [sourceFileVersion, setSourceFileVersion] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  
  // Dimension tool state
  const [activeTool, setActiveTool] = useState<'select' | 'linear' | 'angular' | 'radial' | 'diameter' | 'gdt' | 'annotation'>('select');
  const [dimensionPoints, setDimensionPoints] = useState<Array<{x: number; y: number}>>([]);
  const [activeAnnotationStyle, setActiveAnnotationStyle] = useState<AnnotationStyle>(STANDARD_ANNOTATION_STYLES['iso']);
  const [showDimensionTools, setShowDimensionTools] = useState(true);

  const drawingSystemRef = useRef<DrawingSystem | null>(null);
  const sourceMeshRef = useRef<THREE.Mesh | null>(null);

  // Initialize drawing system
  useEffect(() => {
    drawingSystemRef.current = new DrawingSystem();

    // Create a test mesh for demonstration (fallback)
    const geometry = new THREE.BoxGeometry(50, 30, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
    sourceMeshRef.current = new THREE.Mesh(geometry, material);
    sourceMeshRef.current.updateMatrixWorld();

    // Load saved drawings (from localStorage for demo)
    const saved = localStorage.getItem('drawings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        drawingSystemRef.current.fromJSON(data);
        setSheets(drawingSystemRef.current.getAllSheets());
        if (data.sheets.length > 0) {
          setCurrentSheet(data.sheets[0]);
        }
      } catch (error) {
        console.error('Failed to load drawings:', error);
      }
    }

    // Fetch available CAD files
    fetchAvailableFiles();
  }, []);

  // Fetch available CAD files
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

  // Auto-save
  useEffect(() => {
    if (!drawingSystemRef.current) return;

    const timer = setTimeout(() => {
      const data = drawingSystemRef.current!.toJSON();
      localStorage.setItem('drawings', JSON.stringify(data));
    }, 1000);

    return () => clearTimeout(timer);
  }, [sheets, currentSheet]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('select');
        setDimensionPoints([]);
      }
      
      // Quick tool access
      if (e.ctrlKey || e.metaKey) return; // Don't override browser shortcuts
      
      switch (e.key.toLowerCase()) {
        case 'l':
          if (activeTool === 'select') handleAddLinearDimension();
          break;
        case 'a':
          if (activeTool === 'select') handleAddAngularDimension();
          break;
        case 'r':
          if (activeTool === 'select') handleAddRadialDimension();
          break;
        case 'd':
          if (activeTool === 'select') handleAddDiameterDimension();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  const handleCreateSheet = (name: string, size: string, orientation: string) => {
    if (!drawingSystemRef.current) return;

    const sheet = drawingSystemRef.current.createSheet(
      name,
      size as any,
      orientation as 'portrait' | 'landscape'
    );

    setSheets(drawingSystemRef.current.getAllSheets());
    setCurrentSheet(sheet);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (!drawingSystemRef.current) return;

    drawingSystemRef.current.deleteSheet(sheetId);
    setSheets(drawingSystemRef.current.getAllSheets());

    if (currentSheet?.id === sheetId) {
      const remaining = drawingSystemRef.current.getAllSheets();
      setCurrentSheet(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleSelectSheet = (sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (sheet) {
      setCurrentSheet(sheet);
      setSelectedViewId(undefined);
    }
  };

  // Load geometry from file
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

      // Determine file type
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
        // Get first mesh from OBJ
        const mesh = object.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
        if (mesh) geometry = mesh.geometry as THREE.BufferGeometry;
      }

      URL.revokeObjectURL(url);

      if (!geometry) {
        throw new Error('Failed to load geometry');
      }

      // Create mesh
      const material = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
      sourceMeshRef.current = new THREE.Mesh(geometry, material);
      sourceMeshRef.current.updateMatrixWorld();

      // Center geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      setSourceFileId(file.id);
      setSourceFileVersion(file.version || 1);
      setShowFileSelector(false);

      alert(`Loaded ${file.name} successfully!`);
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleAddView = (type: ViewType, name: string, direction?: OrthographicDirection) => {
    if (!drawingSystemRef.current || !currentSheet || !sourceMeshRef.current) return;

    // Calculate position for new view (simple grid layout)
    const viewCount = currentSheet.views.length;
    const cols = 2;
    const row = Math.floor(viewCount / cols);
    const col = viewCount % cols;
    const spacing = 150;
    const offsetX = 50 + col * spacing;
    const offsetY = 50 + row * spacing;

    const view = drawingSystemRef.current.addView(
      currentSheet.id,
      type,
      name,
      { x: offsetX, y: offsetY },
      1
    );

    // Generate geometry for the view
    let edges: any[] = [];

    switch (type) {
      case 'orthographic':
        if (direction) {
          view.orthographicDirection = direction;
      view.edges = drawingSystemRef.current.generateOrthographicView(
            sourceMeshRef.current,
            direction,
            1
          );
        }
        break;
      case 'isometric':
        view.isometricAngle = { x: 35.264, y: 45 };
        view.edges = drawingSystemRef.current.generateIsometricView(
          sourceMeshRef.current,
          35.264,
          45,
          1
        );
        break;
      case 'section':
        view.sectionPlane = {
          point: new THREE.Vector3(0, 0, 0),
          normal: new THREE.Vector3(1, 0, 0),
          cutawayDirection: new THREE.Vector3(1, 0, 0)
        };
        edges = drawingSystemRef.current.generateSectionView(
          sourceMeshRef.current,
          { point: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(1, 0, 0) },
          1
        );
        break;
      case 'auxiliary':
        view.auxiliaryPlane = {
          normal: new THREE.Vector3(1, 1, 0).normalize(),
          up: new THREE.Vector3(0, 1, 0)
        };
        edges = drawingSystemRef.current.generateAuxiliaryView(
          sourceMeshRef.current,
          new THREE.Vector3(1, 1, 0).normalize(),
          new THREE.Vector3(0, 1, 0),
          1
        );
        break;
    }

    view.edges = edges;

    // Update state
    const updatedSheet = drawingSystemRef.current.getSheet(currentSheet.id);
    if (updatedSheet) {
      setCurrentSheet(updatedSheet);
      setSheets(drawingSystemRef.current.getAllSheets());
    }
  };

  const handleDeleteView = (viewId: string) => {
    if (!drawingSystemRef.current || !currentSheet) return;

    const sheet = drawingSystemRef.current.getSheet(currentSheet.id);
    if (!sheet) return;

    sheet.views = sheet.views.filter(v => v.id !== viewId);
    sheet.updatedAt = Date.now();

    setCurrentSheet({ ...sheet });
    setSheets(drawingSystemRef.current.getAllSheets());

    if (selectedViewId === viewId) {
      setSelectedViewId(undefined);
    }
  };

  const handleGenerateViews = () => {
    if (!drawingSystemRef.current || !currentSheet || !sourceMeshRef.current) return;

    // Auto-generate standard orthographic views (front, top, right)
    const views: Array<{ name: string; direction: OrthographicDirection; x: number; y: number }> = [
      { name: 'Front View', direction: 'front', x: 50, y: 50 },
      { name: 'Top View', direction: 'top', x: 50, y: 200 },
      { name: 'Right View', direction: 'right', x: 200, y: 50 },
    ];

    for (const { name, direction, x, y } of views) {
      const view = drawingSystemRef.current.addView(
        currentSheet.id,
        'orthographic',
        name,
        { x, y },
        1
      );

      view.orthographicDirection = direction;
      view.edges = drawingSystemRef.current.generateOrthographicView(
        sourceMeshRef.current,
        direction,
        1
      );
    }

    // Update state
    const updatedSheet = drawingSystemRef.current.getSheet(currentSheet.id);
    if (updatedSheet) {
      setCurrentSheet(updatedSheet);
      setSheets(drawingSystemRef.current.getAllSheets());
    }
  };

  const handleSyncWithFile = async (fileId: number, version: number) => {
    if (!drawingSystemRef.current || !currentSheet) return;

    try {
      await drawingSystemRef.current.syncWithSourceFile(currentSheet.id, fileId, version);

      // Update state
      const updatedSheet = drawingSystemRef.current.getSheet(currentSheet.id);
      if (updatedSheet) {
        setCurrentSheet(updatedSheet);
        setSheets(drawingSystemRef.current.getAllSheets());
      }

      alert('Sheet synced successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync sheet');
    }
  };

  const handleExportDXF = () => {
    if (!currentSheet) return;

    try {
      DXFExporter.exportToDXF(currentSheet);
    } catch (error) {
      console.error('DXF export failed:', error);
      alert('Failed to export DXF');
    }
  };

  const handleExportPDF = () => {
    if (!currentSheet) return;

    try {
      PDFExporter.exportToPDF(currentSheet);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  const handleSave = async () => {
    if (!drawingSystemRef.current) return;

    setSaving(true);
    try {
      // Save to API (would integrate with Blueprint)
      const data = drawingSystemRef.current.toJSON();
      localStorage.setItem('drawings', JSON.stringify(data));

      alert('Drawings saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save drawings');
    } finally {
      setSaving(false);
    }
  };

  // Dimension tool handlers
  const handleAddLinearDimension = () => {
    setActiveTool('linear');
    setDimensionPoints([]);
  };

  const handleAddAngularDimension = () => {
    setActiveTool('angular');
    setDimensionPoints([]);
  };

  const handleAddRadialDimension = () => {
    setActiveTool('radial');
    setDimensionPoints([]);
  };

  const handleAddDiameterDimension = () => {
    setActiveTool('diameter');
    setDimensionPoints([]);
  };

  const handleAddGDTSymbol = (symbol: GDTSymbolType) => {
    setActiveTool('gdt');
    // Would open dialog to configure feature control frame
    console.log('Adding GD&T symbol:', symbol);
  };

  const handleAddDatum = (label: string) => {
    console.log('Adding datum:', label);
  };

  const handleAddSurfaceFinish = (roughness: number) => {
    console.log('Adding surface finish:', roughness);
  };

  const handleAddAnnotation = (type: 'text' | 'leader' | 'note') => {
    setActiveTool('annotation');
    console.log('Adding annotation:', type);
  };

  const handleCanvasClick = (x: number, y: number) => {
    if (activeTool === 'select') return;

    const newPoints = [...dimensionPoints, { x, y }];
    setDimensionPoints(newPoints);

    // Linear dimension: 3 points (start, end, dimension line position)
    if (activeTool === 'linear' && newPoints.length === 3) {
      if (currentSheet && selectedViewId) {
        const view = currentSheet.views.find(v => v.id === selectedViewId);
        if (view) {
          const distance = Math.sqrt(
            Math.pow(newPoints[1].x - newPoints[0].x, 2) +
            Math.pow(newPoints[1].y - newPoints[0].y, 2)
          );

          view.dimensions.push({
            id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            startPoint: newPoints[0],
            endPoint: newPoints[1],
            dimensionPoint: newPoints[2],
            value: distance,
            type: 'linear',
            style: activeAnnotationStyle
          });

          // Update sheet
          setCurrentSheet({ ...currentSheet });
          setSheets(drawingSystemRef.current!.getAllSheets());
        }
      }
      setDimensionPoints([]);
      setActiveTool('select');
    }

    // Angular dimension: 3 points (center, start angle, end angle)
    if (activeTool === 'angular' && newPoints.length === 3) {
      if (currentSheet && selectedViewId) {
        const view = currentSheet.views.find(v => v.id === selectedViewId);
        if (view) {
          const angle1 = Math.atan2(newPoints[1].y - newPoints[0].y, newPoints[1].x - newPoints[0].x);
          const angle2 = Math.atan2(newPoints[2].y - newPoints[0].y, newPoints[2].x - newPoints[0].x);
          let angleDeg = ((angle2 - angle1) * 180 / Math.PI + 360) % 360;

          view.dimensions.push({
            id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            startPoint: newPoints[0],
            endPoint: newPoints[1],
            dimensionPoint: newPoints[2],
            value: angleDeg,
            type: 'angular',
            style: activeAnnotationStyle
          });

          setCurrentSheet({ ...currentSheet });
          setSheets(drawingSystemRef.current!.getAllSheets());
        }
      }
      setDimensionPoints([]);
      setActiveTool('select');
    }

    // Radial dimension: 2 points (center, edge)
    if ((activeTool === 'radial' || activeTool === 'diameter') && newPoints.length === 2) {
      if (currentSheet && selectedViewId) {
        const view = currentSheet.views.find(v => v.id === selectedViewId);
        if (view) {
          const radius = Math.sqrt(
            Math.pow(newPoints[1].x - newPoints[0].x, 2) +
            Math.pow(newPoints[1].y - newPoints[0].y, 2)
          );

          view.dimensions.push({
            id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            startPoint: newPoints[0],
            endPoint: newPoints[1],
            dimensionPoint: newPoints[1],
            value: activeTool === 'diameter' ? radius * 2 : radius,
            type: activeTool,
            style: activeAnnotationStyle
          });

          setCurrentSheet({ ...currentSheet });
          setSheets(drawingSystemRef.current!.getAllSheets());
        }
      }
      setDimensionPoints([]);
      setActiveTool('select');
    }
  };

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">📐 Drawing Editor</h1>
          {currentSheet && (
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentSheet.name}
            </span>
          )}
          {sourceFileId && (
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              File #{sourceFileId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Load File Button */}
          <button
            onClick={() => setShowFileSelector(true)}
            className={`px-3 py-1 rounded text-sm ${
              darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
          >
            📂 Load File
          </button>

          {/* Toggle Dimension Tools */}
          <button
            onClick={() => setShowDimensionTools(!showDimensionTools)}
            className={`px-3 py-1 rounded text-sm ${
              showDimensionTools
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Toggle Dimension Tools Panel"
          >
            📏 Tools
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className={`px-3 py-1 rounded ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              -
            </button>
            <span className="text-sm min-w-[60px] text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.25))}
              className={`px-3 py-1 rounded ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              +
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 rounded ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-1 rounded ${
              saving
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className={`w-80 border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-y-auto`}>
          <DrawingControls
            darkMode={darkMode}
            sheet={currentSheet}
            sheets={sheets}
            selectedViewId={selectedViewId}
            sourceFileId={sourceFileId}
            sourceFileVersion={sourceFileVersion}
            onCreateSheet={handleCreateSheet}
            onDeleteSheet={handleDeleteSheet}
            onSelectSheet={handleSelectSheet}
            onAddView={handleAddView}
            onDeleteView={handleDeleteView}
            onSyncWithFile={handleSyncWithFile}
            onGenerateViews={handleGenerateViews}
            onExportDXF={handleExportDXF}
            onExportPDF={handleExportPDF}
          />
        </div>

        {/* Center - Sheet Viewer */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {currentSheet ? (
            <div 
              className="relative"
              onClick={(e) => {
                if (activeTool !== 'select' && selectedViewId) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / zoom;
                  const y = (e.clientY - rect.top) / zoom;
                  handleCanvasClick(x, y);
                }
              }}
              style={{ cursor: activeTool !== 'select' ? 'crosshair' : 'default' }}
            >
              <DrawingSheetViewer
                darkMode={darkMode}
                sheet={currentSheet}
                scale={zoom}
                selectedViewId={selectedViewId}
                onViewClick={setSelectedViewId}
              />
              {/* Active tool indicator */}
              {activeTool !== 'select' && (
                <div className={`absolute top-4 right-4 px-3 py-2 rounded ${
                  darkMode ? 'bg-blue-900/80 text-blue-200' : 'bg-blue-100 text-blue-800'
                }`}>
                  <div className="text-xs font-semibold">Active Tool:</div>
                  <div className="text-sm capitalize">{activeTool}</div>
                  {dimensionPoints.length > 0 && (
                    <div className="text-xs mt-1">
                      {dimensionPoints.length} point{dimensionPoints.length !== 1 ? 's' : ''} placed
                    </div>
                  )}
                  <div className="text-xs mt-2 opacity-75">ESC to cancel</div>
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-20 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className="text-lg mb-4">No sheet selected</p>
              <p className="text-sm">Create a new sheet to get started</p>
            </div>
          )}
        </div>

        {/* Right Panel - Dimension Tools */}
        {showDimensionTools && (
          <DimensionTools
            darkMode={darkMode}
            activeStyle={activeAnnotationStyle}
            onStyleChange={setActiveAnnotationStyle}
            onAddLinearDimension={handleAddLinearDimension}
            onAddAngularDimension={handleAddAngularDimension}
            onAddRadialDimension={handleAddRadialDimension}
            onAddDiameterDimension={handleAddDiameterDimension}
            onAddGDTSymbol={handleAddGDTSymbol}
            onAddDatum={handleAddDatum}
            onAddSurfaceFinish={handleAddSurfaceFinish}
            onAddAnnotation={handleAddAnnotation}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className={`px-4 py-2 text-sm border-t ${
        darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
      }`}>
        {currentSheet ? (
          <>
            {currentSheet.size} • {currentSheet.orientation} • {currentSheet.views.length} views
            {selectedViewId && ` • Selected: ${currentSheet.views.find(v => v.id === selectedViewId)?.name}`}
          </>
        ) : (
          'No sheet loaded'
        )}
      </div>

      {/* File Selector Dialog */}
      {showFileSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto`}>
            <h3 className="text-lg font-bold mb-4">Load CAD File</h3>

            {loadingFile ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading file...</p>
              </div>
            ) : (
              <>
                {availableFiles.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p>No CAD files available</p>
                    <p className="text-sm mt-2">Upload a CAD file first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleLoadFile(file.id)}
                        className={`w-full text-left p-3 rounded ${
                          darkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-gray-100 hover:bg-gray-200'
                        } ${sourceFileId === file.id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="font-medium">{file.name}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {file.filename} • Version {file.version || 1}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowFileSelector(false)}
                    className={`px-4 py-2 rounded ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

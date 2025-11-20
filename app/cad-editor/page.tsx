'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toolbar from '@/components/cad/Toolbar';
import SidebarLeft from '@/components/cad/SidebarLeft';
import SidebarRight from '@/components/cad/SidebarRight';
import FeatureTreeSidebar from '@/components/cad/FeatureTreeSidebar';
import BottomBar from '@/components/cad/BottomBar';
import LoadingSplash from '@/components/cad/LoadingSplash';
import SketchModal from '@/components/cad/SketchModal';
import AdvancedSketchModal from '@/components/cad/AdvancedSketchModal';
import ExtrudeModal from '@/components/cad/ExtrudeModal';
import ExportModal from '@/components/cad/ExportModal';
import ShellModal from '@/components/cad/ShellModal';
import FilletModal from '@/components/cad/FilletModal';
import ChamferModal from '@/components/cad/ChamferModal';
import DraftAnalysisModal from '@/components/cad/DraftAnalysisModal';
import FaceOperationsModal from '@/components/cad/FaceOperationsModal';
import PatternModal from '@/components/cad/PatternModal';
import { FeatureTree } from '@/lib/cad/feature-tree';
import { DraftAnalyzer, DraftAnalysisResult, DraftAnalysisOptions } from '@/lib/cad/draft-analysis';
import { FaceOperations, OffsetFaceOptions, DeleteFaceOptions, ReplaceFaceOptions, MirrorFaceOptions } from '@/lib/cad/face-operations';
import { PatternFeatures, LinearPatternOptions, CircularPatternOptions, CurvePatternOptions, FillPatternOptions } from '@/lib/cad/pattern-features';
import { GeometryKernel } from '@/lib/cad/geometry-kernel';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

// Dynamically import CADViewport to avoid SSR issues with Three.js
const CADViewport = dynamic(() => import('@/components/cad/CADViewport'), {
  ssr: false,
  loading: () => <LoadingSplash />
});

interface CADFile {
  id: number | null;
  filename: string;
  file_type: string;
  file_path: string | null;
  version: number;
  metadata?: string;
}

interface User {
  id: number;
  username: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
}

function CADEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams?.get('fileId');

  const [user, setUser] = useState<User | null>(null);
  const [currentFile, setCurrentFile] = useState<CADFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [featureTreeOpen, setFeatureTreeOpen] = useState(true);

  // CAD Editor state
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [layers, setLayers] = useState<any[]>([
    { id: 1, name: 'Layer 1', visible: true, locked: false }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [units, setUnits] = useState<'mm' | 'cm' | 'in'>('mm');
  
  // Modal states
  const [showSketchModal, setShowSketchModal] = useState(false);
  const [showExtrudeModal, setShowExtrudeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShellModal, setShowShellModal] = useState(false);
  const [shellSourceGeometry, setShellSourceGeometry] = useState<any>(null);
  const [shellSourceId, setShellSourceId] = useState<string>('');
  const [showFilletModal, setShowFilletModal] = useState(false);
  const [showChamferModal, setShowChamferModal] = useState(false);
  const [availableEdges, setAvailableEdges] = useState(0);
  const [showDraftAnalysisModal, setShowDraftAnalysisModal] = useState(false);
  const [draftAnalysisResult, setDraftAnalysisResult] = useState<DraftAnalysisResult | undefined>(undefined);
  const [draftAnalysisGeometry, setDraftAnalysisGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [showFaceOperationsModal, setShowFaceOperationsModal] = useState(false);
  const [faceOperationType, setFaceOperationType] = useState<'offset' | 'delete' | 'replace' | 'mirror'>('offset');
  const [selectedFaceIndices, setSelectedFaceIndices] = useState<number[]>([]);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternType, setPatternType] = useState<'linear' | 'circular' | 'curve' | 'fill'>('linear');
  const [selectedSketchShape, setSelectedSketchShape] = useState<string | null>(null);
  const [selectedSketchSubtype, setSelectedSketchSubtype] = useState<string | undefined>(undefined);
  const [isSketchMode, setIsSketchMode] = useState(false);
  const [sketchEntities, setSketchEntities] = useState<any[]>([]);

  // Feature tree and geometry kernel
  const featureTreeRef = useRef<FeatureTree>(new FeatureTree());
  const geometryKernelRef = useRef<GeometryKernel>(new GeometryKernel());
  const viewportSceneRef = useRef<THREE.Scene | null>(null);
  
  // Object transformation state
  const [objectPosition, setObjectPosition] = useState({ x: 0, y: 0, z: 0 });
  const [objectRotation, setObjectRotation] = useState({ x: 0, y: 0, z: 0 });
  const [objectScale, setObjectScale] = useState({ x: 1, y: 1, z: 1 });
  const [objectColor, setObjectColor] = useState('#3b82f6');

  useEffect(() => {
    checkAuth();
    if (fileId) {
      loadFile(parseInt(fileId));
      loadFeatureTree(parseInt(fileId));
    }
  }, [fileId]);

  // Load feature tree from version control
  const loadFeatureTree = async (fileId: number) => {
    try {
      const branchId = (currentFile as any)?.branchId || 'main';
      const response = await fetch(`/api/cad/files/feature-tree?fileId=${fileId}&branchId=${branchId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.treeData) {
          featureTreeRef.current.importFromJSON(data.treeData);
        }
      }
    } catch (error) {
      console.log('No existing feature tree found, starting fresh');
    }
  };

  // Regenerate all features
  const handleRegenerate = async () => {
    try {
      const result = await featureTreeRef.current.regenerate(undefined, geometryKernelRef.current);
      
      if (result.success) {
        alert(`Successfully regenerated ${result.featuresRegenerated.length} features in ${result.totalTime.toFixed(0)}ms`);
      } else {
        const errorMsg = Array.from(result.errors.entries())
          .map(([id, msg]) => `${id}: ${msg}`)
          .join('\n');
        alert(`Regeneration failed:\n${errorMsg}`);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('Regeneration failed');
    }
  };

  // Handle feature selection from tree
  const handleFeatureSelect = (featureId: string) => {
    const node = featureTreeRef.current.getState().nodes.get(featureId);
    if (node && node.feature.mesh) {
      setSelectedObjects([node.feature.mesh]);
    }
  };

  // Handle feature edit
  const handleFeatureEdit = (featureId: string) => {
    const node = featureTreeRef.current.getState().nodes.get(featureId);
    if (node) {
      // Open appropriate modal based on feature type
      if (node.feature.type === 'extrude') {
        setShowExtrudeModal(true);
      }
      // Add other feature type modals as needed
    }
  };

  const checkAuth = async () => {
    try {
      // Check NextAuth session first
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData && sessionData.user) {
          setUser({
            id: sessionData.user.id || 0,
            username: sessionData.user.name || sessionData.user.email || 'user',
            tier: sessionData.user.tier || 'free'
          });
          setLoading(false);
          return;
        }
      }

      // Fallback to localStorage
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!userData || !token) {
        router.push('/login?redirect=/cad-editor');
        return;
      }
      
      const user = JSON.parse(userData);
      setUser({
        id: user.id,
        username: user.username,
        tier: user.tier || 'free'
      });
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?redirect=/cad-editor');
    }
  };

  const loadFile = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cad/files/${id}`);
      if (response.ok) {
        const file = await response.json();
        setCurrentFile(file);
      } else {
        console.error('Failed to load file');
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentFile) {
      alert('No file to save. Please create a new file or open an existing one.');
      return;
    }
    
    try {
      // Export feature tree
      const featureTreeData = featureTreeRef.current.exportToJSON();
      
      // Get scene state from viewport
      const sceneData = viewportSceneRef.current ? {
        objects: viewportSceneRef.current.children
          .filter((obj: any) => obj.type === 'Mesh' || obj.type === 'Group')
          .map((obj: any) => ({
            id: obj.userData?.featureId,
            position: obj.position.toArray(),
            rotation: obj.rotation.toArray(),
            scale: obj.scale.toArray(),
            visible: obj.visible
          }))
      } : null;
      
      const response = await fetch(`/api/cad/files/${currentFile.id}/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          metadata: JSON.stringify({
            featureTree: featureTreeData,
            scene: sceneData,
            timestamp: Date.now()
          }),
          changes: 'Manual save'
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setCurrentFile(updated.file);
        alert('File saved successfully!');
      } else {
        alert('Failed to save file');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save file');
    }
  };

  const handleNew = () => {
    // Create a new blank file
    setCurrentFile({
      id: null,
      filename: 'untitled.cad',
      file_type: '.cad',
      file_path: null,
      version: 1,
      metadata: '{}'
    });
    // Dispatch event to add a default cube to viewport
    window.dispatchEvent(new CustomEvent('cad-new-file'));
  };

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stl,.obj,.step,.iges';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      try {
        const response = await fetch('/api/cad/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentFile(data.file);
          alert('File loaded successfully!');
        } else {
          alert('Failed to upload file');
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload file');
      }
    };
    input.click();
  };

  const handleExport = (format: string) => {
    setShowExportModal(true);
  };

  const handleExportConfirm = (format: string, options: any) => {
    if (!viewportSceneRef.current) {
      alert('No scene to export');
      return;
    }
    
    try {
      let output: string | ArrayBuffer;
      let blob: Blob;
      let filename = `model_${Date.now()}.${format}`;
      
      if (format === 'stl') {
        const exporter = new STLExporter();
        const meshes = viewportSceneRef.current.children.filter((obj: any) => obj.type === 'Mesh');
        
        if (meshes.length === 0) {
          alert('No meshes found to export');
          return;
        }
        
        // Export as binary STL
        const result = exporter.parse(viewportSceneRef.current, { binary: options.quality === 'high' });
        if (result instanceof DataView) {
          // @ts-ignore - STLExporter returns DataView for binary
          blob = new Blob([result], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([result], { type: 'text/plain' });
        }
        
      } else if (format === 'obj') {
        const exporter = new OBJExporter();
        output = exporter.parse(viewportSceneRef.current);
        blob = new Blob([output], { type: 'text/plain' });
        
      } else if (format === 'step' || format === 'iges') {
        // For STEP/IGES, we'd need OpenCascade or similar
        alert(`${format.toUpperCase()} export requires advanced CAD kernel. Coming soon!`);
        return;
      } else {
        alert(`Export format ${format} not supported`);
        return;
      }
      
      // Download file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      
      alert(`Export complete! File: ${filename}`);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    }
  };

  const handleShell = () => {
    // Get currently selected geometry
    if (selectedObjects.length === 0) {
      alert('Please select a geometry object to create a shell');
      return;
    }
    
    const selectedObject = selectedObjects[0];
    if (selectedObject?.geometry) {
      setShellSourceGeometry(selectedObject.geometry);
      setShellSourceId(selectedObject.userData?.featureId || 'unknown');
      setShowShellModal(true);
    } else {
      alert('Selected object does not have valid geometry');
    }
  };

  const handleShellConfirm = (config: any) => {
    console.log('Creating shell with config:', config);
    // TODO: Integrate with shell-integration.ts to add to feature tree
    setShowShellModal(false);
  };

  const handleFillet = () => {
    if (selectedObjects.length === 0) {
      alert('Please select a geometry object to apply fillet');
      return;
    }
    
    const selectedObject = selectedObjects[0];
    if (selectedObject?.geometry) {
      // Estimate edge count from geometry
      const geometry = selectedObject.geometry;
      const estimatedEdges = geometry.index ? Math.floor(geometry.index.count / 3) : 12;
      setAvailableEdges(estimatedEdges);
      setShowFilletModal(true);
    } else {
      alert('Selected object does not have valid geometry');
    }
  };

  const handleFilletApply = (edgeIndices: number[], radius: number, variableRadii?: Map<number, number>) => {
    console.log('Applying fillet:', { edgeIndices, radius, variableRadii });
    // TODO: Implement fillet operation using geometry kernel
    alert(`Fillet applied to ${edgeIndices.length} edge(s) with radius ${radius}`);
    setShowFilletModal(false);
  };

  const handleChamfer = () => {
    if (selectedObjects.length === 0) {
      alert('Please select a geometry object to apply chamfer');
      return;
    }
    
    const selectedObject = selectedObjects[0];
    if (selectedObject?.geometry) {
      // Estimate edge count from geometry
      const geometry = selectedObject.geometry;
      const estimatedEdges = geometry.index ? Math.floor(geometry.index.count / 3) : 12;
      setAvailableEdges(estimatedEdges);
      setShowChamferModal(true);
    } else {
      alert('Selected object does not have valid geometry');
    }
  };

  const handleChamferApply = (edgeIndices: number[], distance1: number, distance2?: number, angle?: number) => {
    console.log('Applying chamfer:', { edgeIndices, distance1, distance2, angle });
    // TODO: Implement chamfer operation using geometry kernel
    const chamferType = distance2 !== undefined ? 'distance-distance' : 'distance-angle';
    alert(`Chamfer applied to ${edgeIndices.length} edge(s) (${chamferType})`);
    setShowChamferModal(false);
  };

  // Draft Analysis
  const handleDraftAnalysis = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object to analyze');
      return;
    }

    const obj = selectedObjects[0];
    if (obj.geometry && obj.geometry instanceof THREE.BufferGeometry) {
      setDraftAnalysisGeometry(obj.geometry);
      setShowDraftAnalysisModal(true);
    } else {
      alert('Selected object does not have analyzable geometry');
    }
  };

  const handleDraftAnalysisApply = (options: {
    minDraftAngle: number;
    neutralPlaneHeight: number;
    direction: 'z' | '-z' | 'x' | '-x' | 'y' | '-y';
    colorScheme: 'traffic-light' | 'heat-map' | 'binary';
    tolerance: number;
  }) => {
    if (!draftAnalysisGeometry) return;

    // Convert direction to THREE.Vector3
    const directionMap = {
      'z': new THREE.Vector3(0, 0, 1),
      '-z': new THREE.Vector3(0, 0, -1),
      'x': new THREE.Vector3(1, 0, 0),
      '-x': new THREE.Vector3(-1, 0, 0),
      'y': new THREE.Vector3(0, 1, 0),
      '-y': new THREE.Vector3(0, -1, 0)
    };

    const direction = directionMap[options.direction];
    const neutralPlane = new THREE.Plane(direction.clone().negate(), -options.neutralPlaneHeight);

    const analysisOptions: DraftAnalysisOptions = {
      minDraftAngle: options.minDraftAngle,
      neutralPlane,
      direction,
      tolerance: options.tolerance,
      colorScheme: options.colorScheme
    };

    const result = DraftAnalyzer.analyze(draftAnalysisGeometry, analysisOptions);
    setDraftAnalysisResult(result);

    // Apply colored geometry to the selected object
    if (result.success && result.coloredGeometry && selectedObjects[0]) {
      const obj = selectedObjects[0];
      
      // Create material with vertex colors
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.2,
        roughness: 0.8
      });

      obj.geometry = result.coloredGeometry;
      obj.material = material;

      // Dispatch update event
      window.dispatchEvent(new CustomEvent('cad-object-changed'));

      // Save draft analysis to metadata
      if (currentFile) {
        saveDraftAnalysisMetadata(result);
      }
    }
  };

  const handleDraftAnalysisUpdateMinAngle = (angle: number) => {
    if (!draftAnalysisGeometry || !draftAnalysisResult) return;

    const options: DraftAnalysisOptions = {
      minDraftAngle: angle,
      neutralPlane: draftAnalysisResult.neutralPlane,
      direction: draftAnalysisResult.direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(draftAnalysisGeometry, options);
    setDraftAnalysisResult(result);

    if (result.success && result.coloredGeometry && selectedObjects[0]) {
      const obj = selectedObjects[0];
      obj.geometry = result.coloredGeometry;
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleDraftAnalysisUpdatePlane = (height: number) => {
    if (!draftAnalysisGeometry || !draftAnalysisResult) return;

    const direction = draftAnalysisResult.direction.clone();
    const newPlane = new THREE.Plane(direction.clone().negate(), -height);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane: newPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(draftAnalysisGeometry, options);
    setDraftAnalysisResult(result);

    if (result.success && result.coloredGeometry && selectedObjects[0]) {
      const obj = selectedObjects[0];
      obj.geometry = result.coloredGeometry;
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleDraftAnalysisUpdateColorScheme = (scheme: 'traffic-light' | 'heat-map' | 'binary') => {
    if (!draftAnalysisGeometry || !draftAnalysisResult) return;

    const result = DraftAnalyzer.updateColorScheme(
      draftAnalysisResult,
      draftAnalysisGeometry,
      scheme
    );
    setDraftAnalysisResult(result);

    if (result.success && result.coloredGeometry && selectedObjects[0]) {
      const obj = selectedObjects[0];
      obj.geometry = result.coloredGeometry;
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleDraftAnalysisExportMetadata = () => {
    if (!draftAnalysisResult) return;
    saveDraftAnalysisMetadata(draftAnalysisResult);
  };

  const saveDraftAnalysisMetadata = async (result: DraftAnalysisResult) => {
    if (!currentFile) return;

    try {
      const metadata = DraftAnalyzer.exportAsMetadata(result);
      
      const response = await fetch(`/api/cad/files/${currentFile.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          metadataType: 'draft-analysis',
          metadata,
          displayOnly: true
        })
      });

      if (response.ok) {
        console.log('Draft analysis saved to file metadata');
      }
    } catch (error) {
      console.error('Failed to save draft analysis metadata:', error);
    }
  };

  // Face Operations
  const handleOffsetFace = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object');
      return;
    }
    setFaceOperationType('offset');
    setShowFaceOperationsModal(true);
  };

  const handleDeleteFace = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object');
      return;
    }
    setFaceOperationType('delete');
    setShowFaceOperationsModal(true);
  };

  const handleReplaceFace = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object');
      return;
    }
    setFaceOperationType('replace');
    setShowFaceOperationsModal(true);
  };

  const handleMirrorFace = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object');
      return;
    }
    setFaceOperationType('mirror');
    setShowFaceOperationsModal(true);
  };

  const handleFaceOperationApply = (operation: string, params: any) => {
    if (selectedObjects.length === 0) return;

    const obj = selectedObjects[0];
    if (!obj.geometry || !(obj.geometry instanceof THREE.BufferGeometry)) {
      alert('Selected object does not have valid geometry');
      return;
    }

    let result: any;
    let featureName: string;
    let featureType: string;

    try {
      switch (operation) {
        case 'offset':
          const offsetOptions: OffsetFaceOptions = {
            faceIndices: params.faceIndices,
            offsetDistance: params.offsetDistance,
            extendAdjacent: params.extendAdjacent,
            createShell: params.createShell
          };
          result = FaceOperations.offsetFace(obj.geometry, offsetOptions);
          featureName = `Offset Face (${params.offsetDistance}mm)`;
          featureType = 'offset-face';
          break;

        case 'delete':
          const deleteOptions: DeleteFaceOptions = {
            faceIndices: params.faceIndices,
            healGeometry: params.healGeometry,
            tolerance: params.tolerance
          };
          result = FaceOperations.deleteFace(obj.geometry, deleteOptions);
          featureName = `Delete Face (${params.faceIndices.length} faces)`;
          featureType = 'delete-face';
          break;

        case 'replace':
          // Create replacement geometry based on type
          let replacementGeometry: THREE.BufferGeometry;
          switch (params.replacementType) {
            case 'sphere':
              replacementGeometry = new THREE.SphereGeometry(10, 32, 32);
              break;
            case 'cylinder':
              replacementGeometry = new THREE.CylinderGeometry(5, 5, 20, 32);
              break;
            default:
              replacementGeometry = new THREE.PlaneGeometry(20, 20);
          }

          const replaceOptions: ReplaceFaceOptions = {
            faceIndex: params.faceIndex,
            replacementGeometry,
            blendEdges: params.blendEdges,
            tolerance: params.tolerance
          };
          result = FaceOperations.replaceFace(obj.geometry, replaceOptions);
          featureName = `Replace Face (${params.replacementType})`;
          featureType = 'replace-face';
          break;

        case 'mirror':
          // Convert plane string to THREE.Plane
          let plane: THREE.Plane;
          switch (params.plane) {
            case 'xy':
              plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -params.height);
              break;
            case 'xz':
              plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -params.height);
              break;
            case 'yz':
              plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -params.height);
              break;
            default:
              plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -params.height);
          }

          const mirrorOptions: MirrorFaceOptions = {
            plane,
            mergeMirrored: params.mergeMirrored,
            tolerance: 0.01
          };
          result = FaceOperations.mirrorFace(obj.geometry, mirrorOptions);
          featureName = `Mirror (${params.plane.toUpperCase()} plane)`;
          featureType = 'mirror-face';
          break;

        default:
          return;
      }

      if (result.success && result.geometry) {
        // Update object geometry
        obj.geometry = result.geometry;
        obj.geometry.computeBoundingBox();
        obj.geometry.computeVertexNormals();

        // Add to feature tree
        const feature = {
          id: `${featureType}-${Date.now()}`,
          type: featureType as any, // Face operations are custom feature types
          name: featureName,
          parameters: params,
          mesh: obj,
          suppressed: false
        };

        featureTreeRef.current.addFeature(
          feature as any,
          selectedObjects.map(o => o.userData?.featureId || '').filter(Boolean),
          {
            description: featureName,
            tags: [operation, 'face-operation'],
            branchId: (currentFile as any)?.branchId || 'main'
          }
        );

        // Save metadata
        saveFaceOperationMetadata(result);

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('cad-object-changed'));

        alert(`${featureName} completed successfully`);
      } else {
        alert(`Operation failed: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Face operation error:', error);
      alert(`Operation failed: ${(error as Error).message}`);
    }
  };

  const saveFaceOperationMetadata = async (result: any) => {
    if (!currentFile) return;

    try {
      const metadata = FaceOperations.exportMetadata(result);
      
      const response = await fetch(`/api/cad/files/${currentFile.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          metadataType: result.metadata.operation,
          metadata,
          displayOnly: false // Face operations are editable
        })
      });

      if (response.ok) {
        console.log('Face operation saved to file metadata');
      }
    } catch (error) {
      console.error('Failed to save face operation metadata:', error);
    }
  };

  // Pattern Features
  const handleLinearPattern = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object to pattern');
      return;
    }
    setPatternType('linear');
    setShowPatternModal(true);
  };

  const handleCircularPattern = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object to pattern');
      return;
    }
    setPatternType('circular');
    setShowPatternModal(true);
  };

  const handleCurvePattern = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object to pattern');
      return;
    }
    setPatternType('curve');
    setShowPatternModal(true);
  };

  const handleFillPattern = () => {
    if (selectedObjects.length === 0) {
      alert('Please select an object to pattern');
      return;
    }
    setPatternType('fill');
    setShowPatternModal(true);
  };

  const handlePatternApply = (params: any) => {
    if (selectedObjects.length === 0) return;

    const sourceObj = selectedObjects[0];
    if (!sourceObj.geometry || !(sourceObj.geometry instanceof THREE.BufferGeometry)) {
      alert('Selected object does not have valid geometry');
      return;
    }

    try {
      let result: any;
      let featureName: string;

      if (params.type === 'linear') {
        // Generate non-uniform spacing if requested
        let spacingArray: number[] | undefined;
        if (params.spacing === 'non-uniform' && params.spacingType) {
          spacingArray = PatternFeatures.generateNonUniformSpacing(
            params.count,
            params.spacingType,
            { factor: 2 }
          );
        }

        const options: LinearPatternOptions = {
          direction: params.direction,
          distance: params.distance,
          count: params.count,
          suppressedInstances: params.suppressedInstances,
          patternType: params.patternType,
          spacing: params.spacing,
          spacingArray
        };

        // Validate options
        const validation = PatternFeatures.validatePatternOptions(options);
        if (!validation.valid) {
          alert(`Invalid pattern parameters:\n${validation.errors.join('\n')}`);
          return;
        }

        result = PatternFeatures.createLinearPattern(
          sourceObj.geometry,
          sourceObj.material as THREE.Material,
          options
        );

        featureName = `Linear Pattern (${params.count} instances, ${params.distance}mm)`;

      } else if (params.type === 'circular') {
        const options: CircularPatternOptions = {
          axis: params.axis,
          center: params.center,
          angle: params.angle,
          count: params.count,
          suppressedInstances: params.suppressedInstances,
          equalSpacing: params.equalSpacing,
          patternType: params.patternType
        };

        // Validate options
        const validation = PatternFeatures.validatePatternOptions(options);
        if (!validation.valid) {
          alert(`Invalid pattern parameters:\n${validation.errors.join('\n')}`);
          return;
        }

        result = PatternFeatures.createCircularPattern(
          sourceObj.geometry,
          sourceObj.material as THREE.Material,
          options
        );

        featureName = `Circular Pattern (${params.count} instances, ${params.angle}°)`;

      } else if (params.type === 'curve') {
        // Create curve from points
        const curve = PatternFeatures.createCurveFromPoints(
          params.curvePoints || [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(25, 25, 0),
            new THREE.Vector3(50, 0, 0)
          ],
          'catmull-rom'
        );

        // Generate non-uniform spacing if requested
        let spacingArray: number[] | undefined;
        if (params.spacing === 'non-uniform' && params.spacingType) {
          spacingArray = PatternFeatures.generateNonUniformSpacing(
            params.count,
            params.spacingType,
            { factor: 2 }
          ).map(d => d / (params.count - 1)); // Normalize to [0-1]
        }

        const options = {
          curve,
          count: params.count,
          suppressedInstances: params.suppressedInstances,
          patternType: params.patternType,
          alignToTangent: params.alignToTangent ?? true,
          offset: params.offset ?? 0,
          spacing: params.spacing,
          spacingArray
        };

        // Validate options
        const validation = PatternFeatures.validatePatternOptions(options);
        if (!validation.valid) {
          alert(`Invalid pattern parameters:\n${validation.errors.join('\n')}`);
          return;
        }

        result = PatternFeatures.createCurvePattern(
          sourceObj.geometry,
          sourceObj.material as THREE.Material,
          options
        );

        featureName = `Curve Pattern (${params.count} instances)`;

      } else if (params.type === 'fill') {
        const options = {
          bounds: params.bounds,
          spacing: params.spacing,
          fillType: params.fillType,
          suppressedInstances: params.suppressedInstances,
          patternType: params.patternType,
          rotation: params.rotation
        };

        // Validate options
        const validation = PatternFeatures.validatePatternOptions(options);
        if (!validation.valid) {
          alert(`Invalid pattern parameters:\n${validation.errors.join('\n')}`);
          return;
        }

        result = PatternFeatures.createFillPattern(
          sourceObj.geometry,
          sourceObj.material as THREE.Material,
          options
        );

        featureName = `Fill Pattern (${result.instances.length} instances, ${params.fillType})`;
      }

      if (result.success && result.instances.length > 0) {
        // Add pattern instances to scene
        if (viewportSceneRef.current) {
          for (const instance of result.instances) {
            viewportSceneRef.current.add(instance);
          }
        }

        // Add to feature tree
        const feature = {
          id: `${params.type}-pattern-${Date.now()}`,
          type: `${params.type}-pattern` as any,
          name: featureName,
          parameters: params,
          mesh: result.instances[0], // Store first instance as representative
          suppressed: false,
          patternInstances: result.instances // Store all instances
        };

        featureTreeRef.current.addFeature(
          feature as any,
          [sourceObj.userData?.featureId || ''].filter(Boolean),
          {
            description: featureName,
            tags: [params.type, 'pattern', 'parametric'],
            branchId: (currentFile as any)?.branchId || 'main'
          }
        );

        // Save metadata
        savePatternMetadata(result, params);

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('cad-object-changed'));

        alert(`${featureName} created successfully!\n${result.instances.length} active instances`);
      } else {
        alert(`Pattern failed: ${result.error || 'No instances created'}`);
      }

    } catch (error) {
      console.error('Pattern error:', error);
      alert(`Pattern failed: ${(error as Error).message}`);
    }
  };

  const savePatternMetadata = async (result: any, params: any) => {
    if (!currentFile) return;

    try {
      const metadata = PatternFeatures.exportMetadata(result, {
        sourceFeatureId: selectedObjects[0]?.userData?.featureId,
        patternType: params.patternType
      });
      
      const response = await fetch(`/api/cad/files/${currentFile.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          metadataType: result.metadata.operation,
          metadata,
          displayOnly: false // Patterns are editable (can update suppression)
        })
      });

      if (response.ok) {
        console.log('Pattern saved to file metadata');
      }
    } catch (error) {
      console.error('Failed to save pattern metadata:', error);
    }
  };

  const handleRevolve = () => {
    if (selectedObjects.length === 0) {
      alert('Please select a sketch or profile to revolve');
      return;
    }
    
    const angle = prompt('Enter revolve angle (degrees):', '360');
    const axis = prompt('Enter axis (x, y, or z):', 'y');
    
    if (angle && axis) {
      window.dispatchEvent(new CustomEvent('cad-revolve', {
        detail: { 
          angle: parseFloat(angle),
          axis: axis.toLowerCase(),
          profile: selectedObjects[0]
        }
      }));
      alert(`Revolve operation: ${angle}° around ${axis.toUpperCase()} axis`);
    }
  };

  const handleCut = () => {
    if (selectedObjects.length < 2) {
      alert('Please select two objects: target and cutting tool');
      return;
    }
    
    window.dispatchEvent(new CustomEvent('cad-boolean', {
      detail: {
        operation: 'subtract',
        objectA: selectedObjects[0],
        objectB: selectedObjects[1]
      }
    }));
    alert('Cut operation: Subtracting second object from first');
  };

  const handleMove = () => {
    setSelectedTool('move');
    window.dispatchEvent(new CustomEvent('cad-transform-mode', { detail: { mode: 'translate' } }));
  };

  const handleRotate = () => {
    setSelectedTool('rotate');
    window.dispatchEvent(new CustomEvent('cad-transform-mode', { detail: { mode: 'rotate' } }));
  };

  const handleScale = () => {
    setSelectedTool('scale');
    window.dispatchEvent(new CustomEvent('cad-transform-mode', { detail: { mode: 'scale' } }));
  };

  const handleSketchStart = (shape: string) => {
    setSelectedSketchShape(shape);
    setSelectedTool('sketch');
    // Dispatch event to viewport
    window.dispatchEvent(new CustomEvent('cad-sketch-mode', { 
      detail: { shape } 
    }));
  };

  const handleSketchToolSelect = (tool: string, subtype?: string) => {
    setSelectedSketchShape(tool);
    setSelectedSketchSubtype(subtype);
    setIsSketchMode(true);
    setSelectedTool('sketch');
    // Dispatch event to viewport with tool and subtype
    window.dispatchEvent(new CustomEvent('cad-sketch-mode', { 
      detail: { shape: tool, subtype } 
    }));
  };

  const handleSketchEntityCreated = (entity: any) => {
    setSketchEntities([...sketchEntities, entity]);
    
    if (currentFile) {
      // Add to feature tree
      featureTreeRef.current.addFeature(
        {
          id: entity.id,
          type: 'sketch' as any,
          name: `${entity.type}-${Date.now()}`,
          parameters: entity,
          suppressed: false
        },
        [],
        {
          author: user?.username,
          branchId: (currentFile as any)?.branchId || 'main',
          description: `Created ${entity.type}`
        }
      );
    }
  };

  const handleSketchEntityModified = (entity: any) => {
    setSketchEntities(sketchEntities.map(e => e.id === entity.id ? entity : e));
  };

  const handleSketchEntityDeleted = (entityId: string) => {
    setSketchEntities(sketchEntities.filter(e => e.id !== entityId));
    featureTreeRef.current.removeFeature(entityId);
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...objectPosition, [axis]: value };
    setObjectPosition(newPosition);
    
    if (selectedObjects.length > 0) {
      selectedObjects[0].position.set(newPosition.x, newPosition.y, newPosition.z);
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation = { ...objectRotation, [axis]: value };
    setObjectRotation(newRotation);
    
    if (selectedObjects.length > 0) {
      selectedObjects[0].rotation.set(
        newRotation.x * Math.PI / 180,
        newRotation.y * Math.PI / 180,
        newRotation.z * Math.PI / 180
      );
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newScale = { ...objectScale, [axis]: value };
    setObjectScale(newScale);
    
    if (selectedObjects.length > 0) {
      selectedObjects[0].scale.set(newScale.x, newScale.y, newScale.z);
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  const handleColorChange = (color: string) => {
    setObjectColor(color);
    
    if (selectedObjects.length > 0 && selectedObjects[0].material) {
      const material = selectedObjects[0].material as THREE.MeshStandardMaterial;
      material.color.set(color);
      window.dispatchEvent(new CustomEvent('cad-object-changed'));
    }
  };

  // Update properties when selection changes
  useEffect(() => {
    if (selectedObjects.length > 0) {
      const obj = selectedObjects[0];
      setObjectPosition({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
      setObjectRotation({ 
        x: obj.rotation.x * 180 / Math.PI, 
        y: obj.rotation.y * 180 / Math.PI, 
        z: obj.rotation.z * 180 / Math.PI 
      });
      setObjectScale({ x: obj.scale.x, y: obj.scale.y, z: obj.scale.z });
      
      if (obj.material) {
        const material = obj.material as THREE.MeshStandardMaterial;
        setObjectColor('#' + material.color.getHexString());
      }
    }
  }, [selectedObjects]);

  const handleExtrudeConfirm = (distance: number, direction: string) => {
    // Dispatch event to viewport
    window.dispatchEvent(new CustomEvent('cad-extrude', { 
      detail: { distance, direction } 
    }));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const previousState = history[historyIndex - 1];
      console.log('Undo:', previousState);
      // Dispatch event to CADViewport to restore scene state
      window.dispatchEvent(new CustomEvent('cad-restore-state', { 
        detail: { state: previousState } 
      }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextState = history[historyIndex + 1];
      console.log('Redo:', nextState);
      // Dispatch event to CADViewport to restore scene state
      window.dispatchEvent(new CustomEvent('cad-restore-state', { 
        detail: { state: nextState } 
      }));
    }
  };
  
  // Function to save current state to history
  const saveToHistory = (stateName: string, sceneData: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const newState = {
      name: stateName,
      timestamp: Date.now(),
      sceneData: sceneData
    };
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Expose saveToHistory via window event
  useEffect(() => {
    const handleSaveState = (e: any) => {
      const { name, sceneData } = e.detail;
      saveToHistory(name, sceneData);
    };
    window.addEventListener('cad-save-state', handleSaveState);
    return () => window.removeEventListener('cad-save-state', handleSaveState);
  }, [history, historyIndex]);

  const handleViewChange = (view: string) => {
    // This will be passed to CADViewport via a ref or state
    const event = new CustomEvent('cad-view-change', { detail: { view } });
    window.dispatchEvent(event);
  };

  const getTierLimits = () => {
    const limits = {
      free: { maxFiles: 5, features: ['basic'], storage: 1024 * 1024 * 1024 },
      pro: { maxFiles: 25, features: ['basic', 'parametric'], storage: 10 * 1024 * 1024 * 1024 },
      team: { maxFiles: 50, features: ['basic', 'parametric', 'collaboration'], storage: 50 * 1024 * 1024 * 1024 },
      enterprise: { maxFiles: -1, features: ['basic', 'parametric', 'collaboration', 'advanced'], storage: -1 }
    };
    return user ? limits[user.tier] : limits.free;
  };

  if (loading) {
    return <LoadingSplash />;
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Modals */}
      <AdvancedSketchModal
        isOpen={showSketchModal}
        onClose={() => setShowSketchModal(false)}
        onSelectTool={handleSketchToolSelect}
        darkMode={darkMode}
      />
      <ExtrudeModal
        isOpen={showExtrudeModal}
        onClose={() => setShowExtrudeModal(false)}
        onExtrude={handleExtrudeConfirm}
        darkMode={darkMode}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        darkMode={darkMode}
        userTier={user?.tier || 'free'}
      />
      <ShellModal
        isOpen={showShellModal}
        onClose={() => setShowShellModal(false)}
        darkMode={darkMode}
        sourceGeometry={shellSourceGeometry}
        sourceGeometryId={shellSourceId}
        onConfirm={handleShellConfirm}
      />
      <FilletModal
        isOpen={showFilletModal}
        darkMode={darkMode}
        onClose={() => setShowFilletModal(false)}
        onApply={handleFilletApply}
        availableEdges={availableEdges}
      />
      <ChamferModal
        isOpen={showChamferModal}
        darkMode={darkMode}
        onClose={() => setShowChamferModal(false)}
        onApply={handleChamferApply}
        availableEdges={availableEdges}
      />
      <DraftAnalysisModal
        isOpen={showDraftAnalysisModal}
        darkMode={darkMode}
        onClose={() => setShowDraftAnalysisModal(false)}
        onApply={handleDraftAnalysisApply}
        result={draftAnalysisResult}
        onUpdateMinAngle={handleDraftAnalysisUpdateMinAngle}
        onUpdatePlane={handleDraftAnalysisUpdatePlane}
        onUpdateColorScheme={handleDraftAnalysisUpdateColorScheme}
        onExportMetadata={handleDraftAnalysisExportMetadata}
      />
      <FaceOperationsModal
        isOpen={showFaceOperationsModal}
        darkMode={darkMode}
        onClose={() => setShowFaceOperationsModal(false)}
        selectedFaces={selectedFaceIndices}
        operationType={faceOperationType}
        onApply={handleFaceOperationApply}
      />
      <PatternModal
        isOpen={showPatternModal}
        darkMode={darkMode}
        onClose={() => setShowPatternModal(false)}
        patternType={patternType}
        onApply={handlePatternApply}
      />

      {/* Top Toolbar */}
      <Toolbar
        darkMode={darkMode}
        selectedTool={selectedTool}
        onToolSelect={(tool) => {
          if (tool === 'sketch') {
            setShowSketchModal(true);
          } else if (tool === 'extrude') {
            setShowExtrudeModal(true);
          } else if (tool === 'shell') {
            handleShell();
          } else if (tool === 'fillet') {
            handleFillet();
          } else if (tool === 'chamfer') {
            handleChamfer();
          } else if (tool === 'revolve') {
            handleRevolve();
          } else if (tool === 'cut') {
            handleCut();
          } else if (tool === 'move') {
            handleMove();
          } else if (tool === 'rotate') {
            handleRotate();
          } else if (tool === 'scale') {
            handleScale();
          } else if (tool === 'draft-analysis') {
            handleDraftAnalysis();
          } else if (tool === 'offset-face') {
            handleOffsetFace();
          } else if (tool === 'delete-face') {
            handleDeleteFace();
          } else if (tool === 'replace-face') {
            handleReplaceFace();
          } else if (tool === 'mirror-face') {
            handleMirrorFace();
          } else if (tool === 'linear-pattern') {
            handleLinearPattern();
          } else if (tool === 'circular-pattern') {
            handleCircularPattern();
          } else if (tool === 'curve-pattern') {
            handleCurvePattern();
          } else if (tool === 'fill-pattern') {
            handleFillPattern();
          } else {
            setSelectedTool(tool);
          }
        }}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        currentFile={currentFile}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feature Tree Sidebar (Left) */}
        {featureTreeOpen && (
          <FeatureTreeSidebar
            darkMode={darkMode}
            featureTree={featureTreeRef.current}
            onFeatureSelect={handleFeatureSelect}
            onFeatureEdit={handleFeatureEdit}
            onRegenerate={handleRegenerate}
            currentFile={currentFile}
          />
        )}

        {/* Left Sidebar (Layers) */}
        {leftSidebarOpen && (
          <SidebarLeft
            darkMode={darkMode}
            layers={layers}
            onLayersChange={setLayers}
            selectedObjects={selectedObjects}
            currentFile={currentFile}
            user={user}
          />
        )}

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          {/* Toggle Feature Tree Button */}
          <button
            onClick={() => setFeatureTreeOpen(!featureTreeOpen)}
            className={`absolute top-4 left-4 z-10 px-3 py-2 rounded shadow-lg transition ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
            }`}
            title={featureTreeOpen ? 'Hide Feature Tree' : 'Show Feature Tree'}
          >
            {featureTreeOpen ? '◀ 🌳' : '🌳 ▶'}
          </button>

          <CADViewport
            darkMode={darkMode}
            selectedTool={selectedTool}
            gridEnabled={gridEnabled}
            snapEnabled={snapEnabled}
            units={units}
            layers={layers}
            onSelectionChange={setSelectedObjects}
            currentFile={currentFile}
            onSceneReady={(scene) => { viewportSceneRef.current = scene; }}
          />
        </div>

        {/* Right Sidebar */}
        {rightSidebarOpen && (
          <SidebarRight
            darkMode={darkMode}
            selectedObjects={selectedObjects}
            units={units}
            onUnitsChange={setUnits}
            onExport={handleExport}
            tierLimits={getTierLimits()}
            onPositionChange={handlePositionChange}
            onRotationChange={handleRotationChange}
            onScaleChange={handleScaleChange}
            onColorChange={handleColorChange}
            objectPosition={objectPosition}
            objectRotation={objectRotation}
            objectScale={objectScale}
            objectColor={objectColor}
          />
        )}
      </div>

      {/* Bottom Bar */}
      <BottomBar
        darkMode={darkMode}
        gridEnabled={gridEnabled}
        snapEnabled={snapEnabled}
        onToggleGrid={() => setGridEnabled(!gridEnabled)}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        onViewChange={handleViewChange}
        currentFile={currentFile}
        selectedObjects={selectedObjects}
      />
    </div>
  );
}

export default function CADEditorPage() {
  return (
    <Suspense fallback={<LoadingSplash />}>
      <CADEditorContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getAssemblySystem, AssemblyTreeNode, PartInstance } from '@/backend/lib/cad/assembly-system';
import { MateType, GeometryReference, Mate } from '@/backend/lib/cad/mate-system';
import { MateAdvancedSolver, DOFAnalysis, SolverResult, CollisionInfo } from '@/backend/lib/cad/mate-solver';
import { GeometryPicker, PickResult } from '@/backend/lib/cad/geometry-picker';
import { InteractiveDragHandler } from '@/backend/lib/cad/interactive-drag';
import { ExplodedViewSystem, ExplodeAnimation } from '@/backend/lib/cad/exploded-view';
import { VideoExporter } from '@/backend/lib/cad/video-exporter';
import AssemblyTreePanel from '@/components/cad/AssemblyTreePanel';
import ExplodeControls from '@/components/cad/ExplodeControls';
import PartBrowserPanel from '@/components/cad/PartBrowserPanel';
import MateEditor from '@/components/cad/MateEditor';
import MateList from '@/components/cad/MateList';
import DOFDisplay from '@/components/cad/DOFDisplay';
import CollisionDisplay from '@/components/cad/CollisionDisplay';

export default function AssemblyEditor() {
  const [darkMode, setDarkMode] = useState(true);
  const [assemblyTree, setAssemblyTree] = useState<AssemblyTreeNode | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [assemblyName, setAssemblyName] = useState('Untitled Assembly');
  const [saving, setSaving] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [matesPanelOpen, setMatesPanelOpen] = useState(false);
  const [mates, setMates] = useState<Mate[]>([]);
  const [pickingGeometry, setPickingGeometry] = useState<1 | 2 | null>(null);
  const [selectedGeometry1, setSelectedGeometry1] = useState<GeometryReference | null>(null);
  const [selectedGeometry2, setSelectedGeometry2] = useState<GeometryReference | null>(null);
  const [dofAnalysis, setDOFAnalysis] = useState<DOFAnalysis | null>(null);
  const [collisions, setCollisions] = useState<CollisionInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedCollision, setHighlightedCollision] = useState<CollisionInfo | null>(null);
  const [highlightedInstance, setHighlightedInstance] = useState<string | null>(null);
  const [explodePanelOpen, setExplodePanelOpen] = useState(false);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [isExploded, setIsExploded] = useState(false);
  const [explodeAnimations, setExplodeAnimations] = useState<ExplodeAnimation[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string | undefined>(undefined);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [animationLoop, setAnimationLoop] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoExplodeDirection, setAutoExplodeDirection] = useState<'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical'>('xyz');
  const [autoExplodeDistance, setAutoExplodeDistance] = useState(100);

  const mountRef = useRef<HTMLDivElement>(null);
  const explodedViewRef = useRef<ExplodedViewSystem | null>(null);
  const videoExporterRef = useRef<VideoExporter | null>(null);
  const geometryPickerRef = useRef<GeometryPicker | null>(null);
  const advancedSolverRef = useRef<MateAdvancedSolver | null>(null);
  const dragHandlerRef = useRef<InteractiveDragHandler | null>(null);
  const boundingBoxesRef = useRef<Map<string, THREE.Box3>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const instanceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(500, 500, 500);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup - dynamic import
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(2000, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(200);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [darkMode]);

  // Initialize assembly system
  useEffect(() => {
    const assemblySystem = getAssemblySystem();

    // Try to load assembly from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const assemblyId = urlParams.get('id');

    if (assemblyId) {
      loadAssembly(assemblyId);
    } else {
      // Create new assembly
      createNewAssembly();
    }

    // Subscribe to assembly changes
    const unsubscribe = assemblySystem.onChange((event, data) => {
      if (['instance-added', 'instance-deleted', 'instance-transformed', 'subassembly-created'].includes(event)) {
        updateAssemblyTree();
        if (event === 'instance-added' || event === 'instance-deleted') {
          updateScene();
        }
      }
    });

    return unsubscribe;
  }, []);

  const loadAssembly = async (assemblyId: string) => {
    try {
      const assemblySystem = getAssemblySystem();
      await assemblySystem.loadAssembly(assemblyId);
      const assembly = assemblySystem.getAssembly();
      if (assembly) {
        setAssemblyName(assembly.name);
        setCanEdit(assembly.permissions.canEdit);
        updateAssemblyTree();
        updateScene();
      }
    } catch (error) {
      console.error('Failed to load assembly:', error);
      alert('Failed to load assembly');
    }
  };

  const createNewAssembly = async () => {
    try {
      const assemblySystem = getAssemblySystem();
      // TODO: Get actual user ID from auth
      const userId = 1;
      await assemblySystem.createAssembly('Untitled Assembly', undefined);
      setAssemblyName('Untitled Assembly');
      updateAssemblyTree();
    } catch (error) {
      console.error('Failed to create assembly:', error);
    }
  };

  const updateAssemblyTree = () => {
    const assemblySystem = getAssemblySystem();
    try {
      const tree = assemblySystem.getAssemblyTree();
      setAssemblyTree(tree);
    } catch (error) {
      console.error('Failed to update tree:', error);
    }
  };

  const updateScene = () => {
    const assemblySystem = getAssemblySystem();
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing instance meshes
    instanceMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
    });
    instanceMeshesRef.current.clear();

    // Add new instance meshes
    const instances = assemblySystem.getInstances();
    instances.forEach(instance => {
      if (!instance.visible) return;

      // Create placeholder geometry (TODO: Load actual part geometry)
      const geometry = new THREE.BoxGeometry(50, 50, 50);
      const material = new THREE.MeshPhongMaterial({
        color: instance.color || 0x3b82f6,
        transparent: instance.locked ? true : false,
        opacity: instance.locked ? 0.5 : 1.0
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Apply transform
      mesh.position.copy(instance.position);
      mesh.rotation.copy(instance.rotation);
      mesh.scale.copy(instance.scale);
      mesh.userData.instanceId = instance.id;

      scene.add(mesh);
      instanceMeshesRef.current.set(instance.id, mesh);
    });
  };

  const handleInsertPart = async (fileId: number, filename: string) => {
    if (!canEdit) return;

    try {
      const assemblySystem = getAssemblySystem();
      
      // Create transform at origin
      const transform = new THREE.Matrix4();
      transform.setPosition(0, 0, 0);

      await assemblySystem.insertPart(fileId, transform);
      
      // Tree and scene will update via onChange listener
    } catch (error) {
      console.error('Failed to insert part:', error);
      alert('Failed to insert part');
    }
  };

  const handleSelectInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    
    // Highlight selected mesh
    instanceMeshesRef.current.forEach((mesh, id) => {
      const material = mesh.material as THREE.MeshPhongMaterial;
      if (id === instanceId) {
        material.emissive.setHex(0x444444);
      } else {
        material.emissive.setHex(0x000000);
      }
    });
  };

  const handleToggleVisibility = async (instanceId: string) => {
    const assemblySystem = getAssemblySystem();
    const instance = assemblySystem.getInstance(instanceId);
    if (!instance) return;

    instance.visible = !instance.visible;
    instance.metadata.updatedAt = Date.now();
    
    await assemblySystem.saveAssembly();
    updateScene();
    updateAssemblyTree();
  };

  const handleToggleLock = async (instanceId: string) => {
    if (!canEdit) return;

    const assemblySystem = getAssemblySystem();
    const instance = assemblySystem.getInstance(instanceId);
    if (!instance) return;

    instance.locked = !instance.locked;
    instance.metadata.updatedAt = Date.now();
    
    await assemblySystem.saveAssembly();
    updateScene();
    updateAssemblyTree();
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!canEdit) return;
    if (!confirm('Delete this instance?')) return;

    try {
      const assemblySystem = getAssemblySystem();
      await assemblySystem.deleteInstance(instanceId);
      
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null);
      }
      
      // Tree and scene will update via onChange listener
    } catch (error) {
      console.error('Failed to delete instance:', error);
      alert('Failed to delete instance');
    }
  };

  const handleCloneInstance = async (instanceId: string) => {
    if (!canEdit) return;

    try {
      const assemblySystem = getAssemblySystem();
      const cloned = await assemblySystem.cloneInstance(instanceId);
      
      // Offset the clone slightly
      cloned.position.x += 100;
      await assemblySystem.updateInstanceTransform(cloned.id, cloned.transform);
      
      // Tree and scene will update via onChange listener
    } catch (error) {
      console.error('Failed to clone instance:', error);
      alert('Failed to clone instance');
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      const assemblySystem = getAssemblySystem();
      await assemblySystem.saveAssembly();
      alert('Assembly saved successfully');
    } catch (error) {
      console.error('Failed to save assembly:', error);
      alert('Failed to save assembly');
    } finally {
      setSaving(false);
    }
  };

  // Mate system handlers
  const handleCreateMate = (
    name: string,
    type: MateType,
    geometry1: GeometryReference | null,
    geometry2: GeometryReference | null,
    options?: {
      offset?: number;
      angle?: number;
      limits?: { min?: number; max?: number };
    }
  ) => {
    if (!geometry1 || !geometry2) {
      alert('Please select both geometries');
      return;
    }

    const assemblySystem = getAssemblySystem();
    const mate = assemblySystem.mateSystem.addMate(
      name,
      type,
      geometry1,
      geometry2,
      options
    );

    assemblySystem.addMate(mate);
    setMates(assemblySystem.getMates());
    
    // Clear selections
    setSelectedGeometry1(null);
    setSelectedGeometry2(null);
    setPickingGeometry(null);

    // Use advanced solver
    if (advancedSolverRef.current) {
      const transforms = new Map<string, THREE.Matrix4>();
      for (const instance of assemblySystem.getInstances()) {
        transforms.set(instance.id, instance.transform.clone());
      }
      
      // Update bounding boxes
      updateBoundingBoxes();
      
      const result = advancedSolverRef.current.solve(
        assemblySystem.getMates(),
        transforms,
        boundingBoxesRef.current
      );
      
      setDOFAnalysis(result.dofAnalysis);
      setCollisions(result.collisions);
      
      // Apply solutions
      for (const [instanceId, transform] of result.solutions) {
        assemblySystem.updateInstanceTransform(instanceId, transform);
      }
      
      // Update drag handler mates
      if (dragHandlerRef.current) {
        dragHandlerRef.current.setMates(assemblySystem.getMates());
      }
    }
    
    updateScene();
    
    alert(`Mate "${name}" created successfully`);
  };

  const handlePickGeometry = (slotIndex: 1 | 2) => {
    setPickingGeometry(slotIndex);
  };

  const handleToggleMateSuppressed = (mateId: string) => {
    const assemblySystem = getAssemblySystem();
    const mate = assemblySystem.mateSystem.getMate(mateId);
    if (mate) {
      assemblySystem.setMateSuppressed(mateId, !mate.suppressed);
      setMates(assemblySystem.getMates());
      
      // Use advanced solver
      if (advancedSolverRef.current) {
        const transforms = new Map<string, THREE.Matrix4>();
        for (const instance of assemblySystem.getInstances()) {
          transforms.set(instance.id, instance.transform.clone());
        }
        
        updateBoundingBoxes();
        
        const result = advancedSolverRef.current.solve(
          assemblySystem.getMates(),
          transforms,
          boundingBoxesRef.current
        );
        
        setDOFAnalysis(result.dofAnalysis);
        setCollisions(result.collisions);
        
        for (const [instanceId, transform] of result.solutions) {
          assemblySystem.updateInstanceTransform(instanceId, transform);
        }
        
        if (dragHandlerRef.current) {
          dragHandlerRef.current.setMates(assemblySystem.getMates());
        }
      }
      
      updateScene();
    }
  };

  const handleDeleteMate = (mateId: string) => {
    const assemblySystem = getAssemblySystem();
    assemblySystem.removeMate(mateId);
    setMates(assemblySystem.getMates());
    
    // Use advanced solver after deletion
    if (advancedSolverRef.current) {
      const transforms = new Map<string, THREE.Matrix4>();
      for (const instance of assemblySystem.getInstances()) {
        transforms.set(instance.id, instance.transform.clone());
      }
      
      updateBoundingBoxes();
      
      const result = advancedSolverRef.current.solve(
        assemblySystem.getMates(),
        transforms,
        boundingBoxesRef.current
      );
      
      setDOFAnalysis(result.dofAnalysis);
      setCollisions(result.collisions);
      
      for (const [instanceId, transform] of result.solutions) {
        assemblySystem.updateInstanceTransform(instanceId, transform);
      }
      
      if (dragHandlerRef.current) {
        dragHandlerRef.current.setMates(assemblySystem.getMates());
      }
    }
    
    updateScene();
  };
  
  // Helper to update bounding boxes for collision detection
  const updateBoundingBoxes = () => {
    boundingBoxesRef.current.clear();
    for (const instance of getAssemblySystem().getInstances()) {
      const mesh = instanceMeshesRef.current.get(instance.id);
      if (mesh) {
        const bbox = new THREE.Box3().setFromObject(mesh);
        boundingBoxesRef.current.set(instance.id, bbox);
      }
    }
  };

  // Initialize geometry picker, advanced solver, and drag handler
  useEffect(() => {
    if (sceneRef.current && cameraRef.current) {
      if (!geometryPickerRef.current) {
        geometryPickerRef.current = new GeometryPicker(cameraRef.current, sceneRef.current);
      }
      
      if (!advancedSolverRef.current) {
        advancedSolverRef.current = new MateAdvancedSolver({
          maxIterations: 50,
          convergenceThreshold: 0.001,
          relaxationFactor: 0.7,
          enableCollisionDetection: true,
          collisionMargin: 0.1
        });
      }
      
      if (!dragHandlerRef.current && advancedSolverRef.current) {
        dragHandlerRef.current = new InteractiveDragHandler(advancedSolverRef.current, {
          enableSnapping: true,
          snapDistance: 5,
          enableCollisionFeedback: true,
          collisionHighlightColor: 0xff0000,
          solverIterations: 10
        });
        
        // Set up drag callbacks
        dragHandlerRef.current.setMates(mates);
        dragHandlerRef.current.onDragUpdate((instanceId, transform, solverResult) => {
          // Update transform
          const assemblySystem = getAssemblySystem();
          assemblySystem.updateInstanceTransform(instanceId, transform);
          
          // Update DOF and collisions
          setDOFAnalysis(solverResult.dofAnalysis);
          setCollisions(solverResult.collisions);
          
          // Update scene
          updateScene();
        });
        
        dragHandlerRef.current.onCollision((hasCollision) => {
          // Visual feedback could be added here
        });
      }

      // Initialize exploded view system
      if (!explodedViewRef.current) {
        explodedViewRef.current = new ExplodedViewSystem();
        
        // Set up change listeners
        explodedViewRef.current.addChangeListener((event, data) => {
          if (event === 'explode-factor-changed') {
            setExplodeFactor(data.factor);
            applyExplodedView();
          } else if (event === 'explode-toggled') {
            setIsExploded(data.enabled);
          } else if (event === 'animation-created') {
            setExplodeAnimations(explodedViewRef.current!.getAllAnimations());
          } else if (event === 'animation-deleted') {
            setExplodeAnimations(explodedViewRef.current!.getAllAnimations());
          } else if (event === 'animation-started') {
            setIsPlayingAnimation(true);
            setCurrentAnimation(data.animationId);
          } else if (event === 'animation-paused') {
            setIsPlayingAnimation(false);
          } else if (event === 'animation-stopped') {
            setIsPlayingAnimation(false);
            setAnimationTime(0);
          } else if (event === 'animation-frame') {
            setAnimationTime(data.time);
            applyAnimationFrame(data.transforms);
          }
        });

        // Load exploded view data from assembly
        const assemblySystem = getAssemblySystem();
        const explodeData = assemblySystem.getExplodeViewData();
        if (explodeData) {
          explodedViewRef.current.fromJSON(explodeData);
          setExplodeAnimations(explodedViewRef.current.getAllAnimations());
          const state = explodedViewRef.current.getPlaybackState();
          setExplodeFactor(explodeData.explodeFactor || 0);
          setAutoExplodeDirection(explodeData.autoExplodeDirection || 'xyz');
          setAutoExplodeDistance(explodeData.autoExplodeDistance || 100);
        }
      }

      // Initialize video exporter
      if (!videoExporterRef.current) {
        videoExporterRef.current = new VideoExporter();
      }
    }
  }, [sceneRef.current, cameraRef.current]);

  // Handle geometry picking clicks
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!pickingGeometry || !geometryPickerRef.current || !mountRef.current) return;

      const result = geometryPickerRef.current.pick(
        event,
        mountRef.current,
        instanceMeshesRef.current
      );

      if (result) {
        const geoRef = GeometryPicker.pickResultToGeometryReference(result);
        
        if (pickingGeometry === 1) {
          setSelectedGeometry1(geoRef);
        } else {
          setSelectedGeometry2(geoRef);
        }
        
        setPickingGeometry(null);
      }
    };

    if (mountRef.current && pickingGeometry) {
      mountRef.current.addEventListener('click', handleClick);
      return () => {
        mountRef.current?.removeEventListener('click', handleClick);
      };
    }
  }, [pickingGeometry]);

  // Load mates when assembly loads
  useEffect(() => {
    const assemblySystem = getAssemblySystem();
    setMates(assemblySystem.getMates());
  }, [assemblyTree]);

  // Mouse event handlers for interactive dragging
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!dragHandlerRef.current || !cameraRef.current || !mountRef.current) return;
      if (pickingGeometry) return; // Don't drag while picking geometry
      
      // Cast ray to find clicked instance
      const raycaster = new THREE.Raycaster();
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      
      raycaster.setFromCamera(mouse, cameraRef.current);
      const meshes = Array.from(instanceMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, true);
      
      if (intersects.length > 0) {
        // Find which instance was clicked
        let clickedObject = intersects[0].object;
        let instanceId: string | undefined;
        
        // Search up the hierarchy to find the instance
        for (const [id, mesh] of instanceMeshesRef.current) {
          if (clickedObject === mesh || clickedObject.parent === mesh) {
            instanceId = id;
            break;
          }
        }
        
        if (instanceId) {
          const mesh = instanceMeshesRef.current.get(instanceId);
          if (mesh) {
            dragHandlerRef.current.startDrag(event, instanceId, mesh, cameraRef.current, mountRef.current);
            setIsDragging(true);
          }
        }
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragHandlerRef.current || !dragHandlerRef.current.isDragging() || !mountRef.current) return;
      
      const assemblySystem = getAssemblySystem();
      const transforms = new Map<string, THREE.Matrix4>();
      for (const instance of assemblySystem.getInstances()) {
        transforms.set(instance.id, instance.transform.clone());
      }
      
      const result = dragHandlerRef.current.updateDrag(
        event,
        mountRef.current,
        transforms,
        boundingBoxesRef.current
      );
      
      if (result) {
        setDOFAnalysis(result.dofAnalysis);
        setCollisions(result.collisions);
      }
    };
    
    const handleMouseUp = () => {
      if (dragHandlerRef.current && dragHandlerRef.current.isDragging()) {
        dragHandlerRef.current.endDrag();
        setIsDragging(false);
      }
    };
    
    const canvas = mountRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [pickingGeometry]);

  // Visual highlighting for collisions and selected instances
  useEffect(() => {
    // Store original materials
    const originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
    
    // Reset all materials first
    for (const [id, mesh] of instanceMeshesRef.current) {
      if (!originalMaterials.has(id)) {
        originalMaterials.set(id, mesh.material);
      }
      mesh.material = originalMaterials.get(id)!;
    }
    
    // Highlight colliding instances
    if (highlightedCollision) {
      const mesh1 = instanceMeshesRef.current.get(highlightedCollision.instance1Id);
      const mesh2 = instanceMeshesRef.current.get(highlightedCollision.instance2Id);
      
      const redMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
        emissive: 0xff0000,
        emissiveIntensity: 0.3
      });
      
      if (mesh1) mesh1.material = redMaterial;
      if (mesh2) mesh2.material = redMaterial;
    }
    
    // Highlight hovered instance
    if (highlightedInstance) {
      const mesh = instanceMeshesRef.current.get(highlightedInstance);
      if (mesh && !highlightedCollision?.instance1Id.includes(highlightedInstance) && 
          !highlightedCollision?.instance2Id.includes(highlightedInstance)) {
        const yellowMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00,
          transparent: true,
          opacity: 0.8,
          emissive: 0xffff00,
          emissiveIntensity: 0.2
        });
        mesh.material = yellowMaterial;
      }
    }
    
    return () => {
      // Cleanup: restore original materials
      for (const [id, mesh] of instanceMeshesRef.current) {
        const original = originalMaterials.get(id);
        if (original) {
          mesh.material = original;
        }
      }
    };
  }, [highlightedCollision, highlightedInstance]);

  // Exploded view handlers
  const applyExplodedView = () => {
    if (!explodedViewRef.current) return;
    
    const assemblySystem = getAssemblySystem();
    const instances = new Map();
    for (const instance of assemblySystem.getInstances()) {
      instances.set(instance.id, { transform: instance.transform, parentInstanceId: instance.parentInstanceId });
    }
    
    explodedViewRef.current.storeOriginalTransforms(instances);
    const transforms = explodedViewRef.current.applyExplodeFactor(instances, explodeFactor);
    
    // Apply exploded transforms
    for (const [instanceId, transform] of transforms) {
      assemblySystem.updateInstanceTransform(instanceId, transform);
    }
    
    updateScene();
    
    // Save to assembly document
    assemblySystem.setExplodeViewData(explodedViewRef.current.toJSON());
  };

  const applyAnimationFrame = (transforms: Map<string, THREE.Matrix4>) => {
    const assemblySystem = getAssemblySystem();
    for (const [instanceId, transform] of transforms) {
      assemblySystem.updateInstanceTransform(instanceId, transform);
    }
    updateScene();
  };

  const handleToggleExplode = () => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.toggleExplode();
    applyExplodedView();
  };

  const handleSetExplodeFactor = (factor: number) => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.setExplodeFactor(factor);
  };

  const handleSetAutoDirection = (direction: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical') => {
    if (!explodedViewRef.current) return;
    setAutoExplodeDirection(direction);
    explodedViewRef.current.setAutoExplodeDirection(direction);
    applyExplodedView();
  };

  const handleSetAutoDistance = (distance: number) => {
    if (!explodedViewRef.current) return;
    setAutoExplodeDistance(distance);
    explodedViewRef.current.setAutoExplodeDistance(distance);
    applyExplodedView();
  };

  const handleCreateAnimation = (name: string, duration: number) => {
    if (!explodedViewRef.current) return;
    
    // Make sure we have exploded transforms
    applyExplodedView();
    
    const animation = explodedViewRef.current.createAnimation(name, duration);
    setExplodeAnimations(explodedViewRef.current.getAllAnimations());
    
    // Save to assembly document
    const assemblySystem = getAssemblySystem();
    assemblySystem.setExplodeViewData(explodedViewRef.current.toJSON());
  };

  const handlePlayAnimation = (animationId: string) => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.playAnimation(animationId);
  };

  const handlePauseAnimation = () => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.pauseAnimation();
  };

  const handleStopAnimation = () => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.stopAnimation();
    
    // Reset to assembled state
    const assemblySystem = getAssemblySystem();
    const instances = new Map();
    for (const instance of assemblySystem.getInstances()) {
      instances.set(instance.id, { transform: instance.transform });
    }
    explodedViewRef.current.storeOriginalTransforms(instances);
    explodedViewRef.current.setExplodeFactor(0);
    applyExplodedView();
  };

  const handleSeekAnimation = (time: number) => {
    if (!explodedViewRef.current || !currentAnimation) return;
    explodedViewRef.current.seekAnimation(time);
    
    const transforms = explodedViewRef.current.evaluateAnimation(currentAnimation, time);
    if (transforms) {
      applyAnimationFrame(transforms);
    }
  };

  const handleDeleteAnimation = (animationId: string) => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.deleteAnimation(animationId);
    setExplodeAnimations(explodedViewRef.current.getAllAnimations());
    
    // Save to assembly document
    const assemblySystem = getAssemblySystem();
    assemblySystem.setExplodeViewData(explodedViewRef.current.toJSON());
  };

  const handleToggleLoop = () => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.toggleLoop();
    setAnimationLoop(!animationLoop);
  };

  const handleSetPlaybackSpeed = (speed: number) => {
    if (!explodedViewRef.current) return;
    explodedViewRef.current.setPlaybackSpeed(speed);
    setPlaybackSpeed(speed);
  };

  const handleExportVideo = async () => {
    if (!videoExporterRef.current || !mountRef.current || !currentAnimation || !explodedViewRef.current) {
      alert('No animation selected or canvas not ready');
      return;
    }

    const animation = explodedViewRef.current.getAnimation(currentAnimation);
    if (!animation) return;

    try {
      // Get the canvas element
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;

      // Stop current playback
      if (isPlayingAnimation) {
        handlePauseAnimation();
      }

      // Start recording
      await videoExporterRef.current.startRecording(canvas, {
        width: canvas.width,
        height: canvas.height,
        fps: 30,
        bitrate: 5000000
      });

      // Play animation
      explodedViewRef.current.seekAnimation(0);
      handlePlayAnimation(currentAnimation);

      // Wait for animation to finish
      await new Promise<void>((resolve) => {
        const checkFinished = setInterval(() => {
          const state = explodedViewRef.current?.getPlaybackState();
          if (!state?.isPlaying) {
            clearInterval(checkFinished);
            resolve();
          }
        }, 100);
      });

      // Stop recording and download
      await videoExporterRef.current.stopRecording(`${animation.name}.webm`);
      
      alert('Video exported successfully!');
    } catch (error) {
      console.error('Failed to export video:', error);
      alert('Failed to export video. Check console for details.');
    }
  };

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Assembly Editor</h1>
          <input
            type="text"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            disabled={!canEdit}
            className={`px-3 py-1 rounded border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`px-3 py-1 rounded ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Toggle Assembly Tree"
          >
            {leftPanelOpen ? '◀' : '▶'} Tree
          </button>

          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`px-3 py-1 rounded ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Toggle Part Browser"
          >
            Parts {rightPanelOpen ? '▶' : '◀'}
          </button>

          <button
            onClick={() => setMatesPanelOpen(!matesPanelOpen)}
            className={`px-3 py-1 rounded ${
              matesPanelOpen
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Toggle Mates Panel"
          >
            🔗 Mates ({mates.length})
          </button>

          <button
            onClick={() => setExplodePanelOpen(!explodePanelOpen)}
            className={`px-3 py-1 rounded ${
              explodePanelOpen
                ? 'bg-orange-600 text-white'
                : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Toggle Exploded View"
          >
            💥 Explode
          </button>

          <button
            onClick={handleSave}
            disabled={!canEdit || saving}
            className={`px-4 py-1 rounded ${
              canEdit && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>

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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Assembly Tree */}
        {leftPanelOpen && (
          <div className={`w-80 border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <AssemblyTreePanel
              rootNode={assemblyTree}
              selectedInstanceId={selectedInstanceId}
              onSelectInstance={handleSelectInstance}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDeleteInstance={handleDeleteInstance}
              onCloneInstance={handleCloneInstance}
              darkMode={darkMode}
              canEdit={canEdit}
            />
          </div>
        )}

        {/* Center - 3D Viewport */}
        <div className="flex-1 relative">
          <div ref={mountRef} className="w-full h-full" />
          
          {/* Viewport Info Overlay */}
          <div className={`absolute top-4 left-4 px-3 py-2 rounded shadow ${
            darkMode ? 'bg-gray-800 bg-opacity-90' : 'bg-white bg-opacity-90'
          }`}>
            <div className="text-sm">
              <div>Assembly: {assemblyName}</div>
              <div className="text-xs text-gray-400 mt-1">
                {assemblyTree ? countInstances(assemblyTree) : 0} parts
              </div>
            </div>
          </div>

          {/* Geometry Picking Indicator */}
          {pickingGeometry && (
            <div className={`absolute top-4 right-4 px-4 py-3 rounded shadow border-2 border-green-500 ${
              darkMode ? 'bg-gray-800 bg-opacity-95' : 'bg-white bg-opacity-95'
            }`}>
              <div className="text-sm font-semibold text-green-500">
                🎯 Picking Geometry {pickingGeometry}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Click on a face, edge, or vertex
              </div>
              <button
                onClick={() => setPickingGeometry(null)}
                className="mt-2 w-full px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Part Browser, Mates, or Exploded View */}
        {(rightPanelOpen || matesPanelOpen || explodePanelOpen) && (
          <div className={`w-80 border-l ${darkMode ? 'border-gray-700' : 'border-gray-300'} overflow-y-auto`}>
            {explodePanelOpen ? (
              <ExplodeControls
                darkMode={darkMode}
                explodeFactor={explodeFactor}
                isExploded={isExploded}
                autoDirection={autoExplodeDirection}
                autoDistance={autoExplodeDistance}
                animations={explodeAnimations}
                currentAnimation={currentAnimation}
                isPlaying={isPlayingAnimation}
                currentTime={animationTime}
                loop={animationLoop}
                playbackSpeed={playbackSpeed}
                onToggleExplode={handleToggleExplode}
                onSetExplodeFactor={handleSetExplodeFactor}
                onSetAutoDirection={handleSetAutoDirection}
                onSetAutoDistance={handleSetAutoDistance}
                onCreateAnimation={handleCreateAnimation}
                onPlayAnimation={handlePlayAnimation}
                onPauseAnimation={handlePauseAnimation}
                onStopAnimation={handleStopAnimation}
                onSeekAnimation={handleSeekAnimation}
                onDeleteAnimation={handleDeleteAnimation}
                onToggleLoop={handleToggleLoop}
                onSetPlaybackSpeed={handleSetPlaybackSpeed}
                onExportVideo={handleExportVideo}
              />
            ) : matesPanelOpen ? (
              <div className="p-4 space-y-4">
                <MateEditor
                  darkMode={darkMode}
                  onCreateMate={handleCreateMate}
                  onPickGeometry={handlePickGeometry}
                  geometry1={selectedGeometry1}
                  geometry2={selectedGeometry2}
                  pickingSlot={pickingGeometry}
                />
                <MateList
                  darkMode={darkMode}
                  mates={mates}
                  onToggleSuppressed={handleToggleMateSuppressed}
                  onDeleteMate={handleDeleteMate}
                />
                <DOFDisplay
                  darkMode={darkMode}
                  dofAnalysis={dofAnalysis}
                  onHighlightInstance={setHighlightedInstance}
                />
                <CollisionDisplay
                  darkMode={darkMode}
                  collisions={collisions}
                  onHighlightCollision={setHighlightedCollision}
                />
              </div>
            ) : (
              <PartBrowserPanel
                darkMode={darkMode}
                onInsertPart={handleInsertPart}
                canEdit={canEdit}
              />
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={`px-4 py-2 text-sm border-t ${
        darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
      }`}>
        {selectedInstanceId ? `Selected: ${selectedInstanceId}` : 'No selection'} | {canEdit ? 'Edit mode' : 'View only'}
      </div>
    </div>
  );
}

function countInstances(node: AssemblyTreeNode): number {
  let count = node.type === 'part' ? 1 : 0;
  for (const child of node.children) {
    count += countInstances(child);
  }
  return count;
}

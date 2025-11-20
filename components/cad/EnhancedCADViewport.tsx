// Enhanced CAD Viewport with full sketching and modeling
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GeometryKernel, Feature, Sketch, SketchEntity } from '@/lib/cad/geometry-kernel';
import { SketchSolver } from '@/lib/cad/sketch-solver';

interface EnhancedCADViewportProps {
  darkMode: boolean;
  selected Tool: string;
  gridEnabled: boolean;
  snapEnabled: boolean;
  units: 'mm' | 'cm' | 'in';
  onSelectionChange: (objects: any[]) => void;
  onFeatureCreated: (feature: Feature) => void;
  onSketchCreated: (sketch: Sketch) => void;
}

export default function EnhancedCADViewport({
  darkMode,
  selectedTool,
  gridEnabled,
  snapEnabled,
  units,
  onSelectionChange,
  onFeatureCreated,
  onSketchCreated
}: EnhancedCADViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  
  const [geometryKernel] = useState(() => new GeometryKernel());
  const [sketchSolver] = useState(() => new SketchSolver());
  const [isSketchMode, setIsSketchMode] = useState(false);
  const [currentSketch, setCurrentSketch] = useState<Sketch | null>(null);
  const [sketchPoints, setSketchPoints] = useState<THREE.Vector2[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<SketchEntity[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid
    const grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    grid.visible = gridEnabled;
    scene.add(grid);
    gridRef.current = grid;

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Orbit Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.screenSpacePanning = false;
    orbitControls.maxPolarAngle = Math.PI / 2;
    orbitControlsRef.current = orbitControls;

    // Transform Controls
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    // Raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (isSketchMode && selectedTool === 'line') {
        // Add point to sketch
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        if (intersectPoint) {
          const point2D = new THREE.Vector2(intersectPoint.x, intersectPoint.y);
          setSketchPoints(prev => [...prev, point2D]);

          if (sketchPoints.length > 0) {
            // Create line entity
            const entity = geometryKernel.addSketchEntity(currentSketch!.id, {
              type: 'line',
              points: [sketchPoints[sketchPoints.length - 1], point2D]
            });
            
            // Draw line in scene
            drawSketchEntity(entity);
          }
        }
      } else if (selectedTool === 'select') {
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object instanceof THREE.Mesh) {
            onSelectionChange([object]);
            transformControls.attach(object);
          }
        } else {
          onSelectionChange([]);
          transformControls.detach();
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Draw sketch entity in 3D
  const drawSketchEntity = (entity: SketchEntity) => {
    if (!sceneRef.current) return;

    if (entity.type === 'line' && entity.points.length >= 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(entity.points[0].x, entity.points[0].y, 0),
        new THREE.Vector3(entity.points[1].x, entity.points[1].y, 0)
      ]);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      line.name = `sketch-entity-${entity.id}`;
      sceneRef.current.add(line);
    } else if (entity.type === 'circle' && entity.radius) {
      const geometry = new THREE.CircleGeometry(entity.radius, 32);
      const edges = new THREE.EdgesGeometry(geometry);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const circle = new THREE.LineSegments(edges, material);
      if (entity.points[0]) {
        circle.position.set(entity.points[0].x, entity.points[0].y, 0);
      }
      circle.name = `sketch-entity-${entity.id}`;
      sceneRef.current.add(circle);
    }
  };

  // Handle tool changes
  useEffect(() => {
    if (!transformControlsRef.current) return;

    switch (selectedTool) {
      case 'move':
        transformControlsRef.current.setMode('translate');
        break;
      case 'rotate':
        transformControlsRef.current.setMode('rotate');
        break;
      case 'scale':
        transformControlsRef.current.setMode('scale');
        break;
      case 'sketch':
        enterSketchMode();
        break;
      case 'extrude':
        handleExtrude();
        break;
      case 'revolve':
        handleRevolve();
        break;
      default:
        transformControlsRef.current.detach();
    }
  }, [selectedTool]);

  const enterSketchMode = () => {
    setIsSketchMode(true);
    const sketch = geometryKernel.createSketch('Sketch 1', new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    setCurrentSketch(sketch);
    setSketchPoints([]);
    onSketchCreated(sketch);
    alert('Sketch mode active! Click to add points. Press ESC to exit sketch mode.');
  };

  const exitSketchMode = () => {
    setIsSketchMode(false);
    setCurrentSketch(null);
    setSketchPoints([]);
  };

  const handleExtrude = () => {
    if (!currentSketch) {
      alert('Please create a sketch first!');
      return;
    }

    const distance = prompt('Enter extrude distance:', '20');
    if (!distance) return;

    try {
      const feature = geometryKernel.extrude(currentSketch.id, parseFloat(distance));
      if (feature.mesh && sceneRef.current) {
        sceneRef.current.add(feature.mesh);
        setFeatures(prev => [...prev, feature]);
        onFeatureCreated(feature);
      }
      exitSketchMode();
    } catch (error) {
      console.error('Extrude failed:', error);
      alert('Extrude failed! Make sure your sketch is closed.');
    }
  };

  const handleRevolve = () => {
    if (!currentSketch) {
      alert('Please create a sketch first!');
      return;
    }

    const angle = prompt('Enter revolve angle (degrees):', '360');
    if (!angle) return;

    try {
      const feature = geometryKernel.revolve(currentSketch.id, new THREE.Vector3(0, 1, 0), parseFloat(angle));
      if (feature.mesh && sceneRef.current) {
        sceneRef.current.add(feature.mesh);
        setFeatures(prev => [...prev, feature]);
        onFeatureCreated(feature);
      }
      exitSketchMode();
    } catch (error) {
      console.error('Revolve failed:', error);
      alert('Revolve failed!');
    }
  };

  // ESC to exit sketch mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSketchMode) {
        exitSketchMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSketchMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Sketch mode indicator */}
      {isSketchMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-semibold">Sketch Mode Active</span>
            <span className="text-sm opacity-90">• Click to add points • ESC to exit</span>
          </div>
        </div>
      )}

      {/* Feature count */}
      {features.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm">
          {features.length} feature{features.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

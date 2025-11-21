'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import FilletModal from './FilletModal';
import ChamferModal from './ChamferModal';
import { GeometryKernel } from '@/backend/lib/cad/geometry-kernel';

interface CADViewportProps {
  darkMode: boolean;
  selectedTool: string;
  gridEnabled: boolean;
  snapEnabled: boolean;
  units: 'mm' | 'cm' | 'in';
  layers: any[];
  onSelectionChange: (objects: any[]) => void;
  currentFile: any;
  onSceneReady?: (scene: THREE.Scene) => void;
}

export default function CADViewport({
  darkMode,
  selectedTool,
  gridEnabled,
  snapEnabled,
  units,
  layers,
  onSelectionChange,
  onSceneReady,
  currentFile
}: CADViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
  const [showFilletModal, setShowFilletModal] = useState(false);
  const [showChamferModal, setShowChamferModal] = useState(false);
  const [selectedEdges, setSelectedEdges] = useState<number[]>([]);
  const [highlightedEdges, setHighlightedEdges] = useState<THREE.LineSegments | null>(null);
  const geometryKernelRef = useRef<GeometryKernel>(new GeometryKernel());

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;
    
    // Notify parent that scene is ready
    if (onSceneReady) {
      onSceneReady(scene);
    }

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
      if (!containerRef.current || selectedTool !== 'select') return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Deselect previous objects and restore original colors
      scene.traverse((obj) => {
        if ((obj as any).originalColor) {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.color.setHex((obj as any).originalColor);
            obj.material.emissive.setHex(0x000000);
          } else if (obj instanceof THREE.Line && obj.material instanceof THREE.LineBasicMaterial) {
            obj.material.color.setHex((obj as any).originalColor);
          }
        }
      });

      if (intersects.length > 0) {
        const object = intersects[0].object;
        
        // Apply orange highlight to selected object
        if (object instanceof THREE.Mesh) {
          const material = object.material as THREE.MeshStandardMaterial;
          if (!(object as any).originalColor) {
            (object as any).originalColor = material.color.getHex();
          }
          material.color.setHex(0xffaa00); // Orange highlight
          material.emissive.setHex(0x442200); // Orange glow
          setSelectedObjects([object]);
          onSelectionChange([object]);
          transformControls.attach(object);
        } else if (object instanceof THREE.Line && (object as any).isSketchObject) {
          const material = object.material as THREE.LineBasicMaterial;
          if (!(object as any).originalColor) {
            (object as any).originalColor = material.color.getHex();
          }
          material.color.setHex(0xffaa00); // Orange highlight
          setSelectedObjects([object]);
          onSelectionChange([object]);
        }
      } else {
        setSelectedObjects([]);
        onSelectionChange([]);
        transformControls.detach();
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
    
    // Helper function to capture current scene state
    const captureSceneState = () => {
      const objects = scene.children
        .filter((obj) => (obj as any).isSketchObject || obj instanceof THREE.Mesh)
        .map((obj) => ({
          name: obj.name,
          type: obj.type,
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
          isSketchObject: (obj as any).isSketchObject,
          sketchData: (obj as any).sketchData,
          geometry: obj instanceof THREE.Line ? 
            Array.from((obj.geometry as THREE.BufferGeometry).attributes.position.array) : null,
          meshData: obj instanceof THREE.Mesh ? {
            geometryType: obj.geometry.type,
            color: (obj.material as THREE.MeshStandardMaterial).color.getHex()
          } : null
        }));
      return { objects };
    };
    
    // Helper function to restore scene state
    const restoreSceneState = (state: any) => {
      // Clear current scene objects (keep lights, grid, etc.)
      const objectsToRemove = scene.children.filter((obj) => 
        (obj as any).isSketchObject || (obj instanceof THREE.Mesh && obj.name.startsWith('sketch'))
      );
      objectsToRemove.forEach((obj) => {
        scene.remove(obj);
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      
      // Restore objects from state
      state.objects.forEach((objData: any) => {
        if (objData.isSketchObject && objData.geometry) {
          // Restore sketch line
          const points = [];
          for (let i = 0; i < objData.geometry.length; i += 3) {
            points.push(new THREE.Vector3(
              objData.geometry[i],
              objData.geometry[i + 1],
              objData.geometry[i + 2]
            ));
          }
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          const line = new THREE.Line(geometry, material);
          line.name = objData.name;
          line.position.copy(objData.position);
          line.rotation.copy(objData.rotation);
          line.scale.copy(objData.scale);
          (line as any).isSketchObject = true;
          if (objData.sketchData) {
            (line as any).sketchData = objData.sketchData;
          }
          scene.add(line);
        } else if (objData.meshData) {
          // TODO: Restore mesh - requires serializing geometry
          console.log('Mesh restoration not yet implemented');
        }
      });
    };
    
    // Listen for state restoration (undo/redo)
    const handleRestoreState = (e: any) => {
      const { state } = e.detail;
      if (state && state.sceneData) {
        restoreSceneState(state.sceneData);
      }
    };
    window.addEventListener('cad-restore-state', handleRestoreState);
    
    // Save initial state
    setTimeout(() => {
      const initialState = captureSceneState();
      window.dispatchEvent(new CustomEvent('cad-save-state', {
        detail: { name: 'Initial State', sceneData: initialState }
      }));
    }, 100);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('cad-restore-state', handleRestoreState);
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update scene background when dark mode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    }
  }, [darkMode]);

  // Update grid visibility
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = gridEnabled;
    }
  }, [gridEnabled]);

  // Update transform controls mode based on selected tool
  useEffect(() => {
    if (!transformControlsRef.current) return;

    switch (selectedTool) {
      case 'move':
        transformControlsRef.current.setMode('translate');
        if (selectedObjects.length > 0) {
          transformControlsRef.current.attach(selectedObjects[0]);
        }
        break;
      case 'rotate':
        transformControlsRef.current.setMode('rotate');
        if (selectedObjects.length > 0) {
          transformControlsRef.current.attach(selectedObjects[0]);
        }
        break;
      case 'scale':
        transformControlsRef.current.setMode('scale');
        if (selectedObjects.length > 0) {
          transformControlsRef.current.attach(selectedObjects[0]);
        }
        break;
      case 'select':
        // Keep transform controls attached but don't change mode
        break;
      case 'sketch':
        // Sketch mode handled by modal
        break;
      case 'extrude':
        // Extrude handled by modal
        break;
      case 'revolve':
        // Revolve handled by modal
        break;
      case 'fillet':
        // Open fillet modal when feature selected
        if (selectedObjects.length > 0) {
          setShowFilletModal(true);
        }
        break;
      case 'chamfer':
        // Open chamfer modal when feature selected
        if (selectedObjects.length > 0) {
          setShowChamferModal(true);
        }
        break;
      case 'cut':
        // Cut handled by modal
        break;
      default:
        transformControlsRef.current.detach();
    }
  }, [selectedTool, selectedObjects]);

  // Handle view changes
  useEffect(() => {
    const handleViewChange = (e: any) => {
      if (!cameraRef.current || !orbitControlsRef.current) return;
      
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;
      const distance = 150;

      switch (e.detail.view) {
        case 'top':
          camera.position.set(0, distance, 0);
          camera.lookAt(0, 0, 0);
          break;
        case 'front':
          camera.position.set(0, 0, distance);
          camera.lookAt(0, 0, 0);
          break;
        case 'right':
          camera.position.set(distance, 0, 0);
          camera.lookAt(0, 0, 0);
          break;
        case 'perspective':
          camera.position.set(100, 100, 100);
          camera.lookAt(0, 0, 0);
          break;
      }
      
      controls.update();
    };

    window.addEventListener('cad-view-change', handleViewChange);
    return () => window.removeEventListener('cad-view-change', handleViewChange);
  }, []);

  // Handle new file - add a default cube
  useEffect(() => {
    const handleNewFile = () => {
      if (!sceneRef.current) return;

      // Add a sample cube to work with
      const geometry = new THREE.BoxGeometry(20, 20, 20);
      const material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.5,
        metalness: 0.1
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.position.set(0, 10, 0);
      cube.name = 'Cube';
      sceneRef.current.add(cube);
    };

    window.addEventListener('cad-new-file', handleNewFile);
    return () => window.removeEventListener('cad-new-file', handleNewFile);
  }, []);

  // Handle sketch mode with drag-to-size interaction
  useEffect(() => {
    let isDrawing = false;
    let startPoint: THREE.Vector3 | null = null;
    let previewShape: THREE.Line | THREE.Mesh | null = null;
    let currentShape: string | null = null;
    let sketchObjects: (THREE.Line | THREE.Mesh)[] = [];
    
    const handleSketchMode = (e: any) => {
      currentShape = e.detail.shape;
      console.log('Starting sketch mode with shape:', currentShape);
      
      const getIntersectionPoint = (event: MouseEvent): THREE.Vector3 | null => {
        if (!containerRef.current || !cameraRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);

        // Create plane facing the camera at origin
        const cameraDirection = new THREE.Vector3();
        cameraRef.current.getWorldDirection(cameraDirection);
        const plane = new THREE.Plane(cameraDirection.negate(), 0);
        
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        return intersectPoint;
      };

      const onMouseDown = (event: MouseEvent) => {
        const point = getIntersectionPoint(event);
        if (point) {
          isDrawing = true;
          startPoint = point.clone();
        }
      };

      const onMouseMove = (event: MouseEvent) => {
        if (!isDrawing || !startPoint || !sceneRef.current || !currentShape) return;

        const currentPoint = getIntersectionPoint(event);
        if (!currentPoint) return;

        // Remove previous preview
        if (previewShape) {
          sceneRef.current.remove(previewShape);
          previewShape.geometry.dispose();
          if (previewShape.material instanceof THREE.Material) {
            previewShape.material.dispose();
          }
        }

        // Create preview based on shape type
        if (currentShape === 'rectangle') {
          // Get camera's right and up vectors for proper orientation
          const cameraRight = new THREE.Vector3();
          const cameraUp = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(new THREE.Vector3()); // Force update
          cameraRight.setFromMatrixColumn(cameraRef.current!.matrixWorld, 0);
          cameraUp.setFromMatrixColumn(cameraRef.current!.matrixWorld, 1);
          
          const dx = currentPoint.x - startPoint.x;
          const dy = currentPoint.y - startPoint.y;
          const dz = currentPoint.z - startPoint.z;
          
          const points = [
            startPoint.clone(),
            startPoint.clone().add(cameraRight.clone().multiplyScalar(dx)),
            currentPoint.clone(),
            startPoint.clone().add(cameraUp.clone().multiplyScalar(dy)),
            startPoint.clone()
          ];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          previewShape = new THREE.Line(geometry, material);
          sceneRef.current.add(previewShape);
        } else if (currentShape === 'circle') {
          const radius = startPoint.distanceTo(currentPoint);
          
          // Create circle in camera-facing plane
          const cameraDirection = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(cameraDirection);
          const circleGeometry = new THREE.CircleGeometry(radius, 64);
          
          // Orient circle to face camera
          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cameraDirection.negate());
          circleGeometry.applyQuaternion(quaternion);
          
          // Create line loop from circle edges
          const positions = circleGeometry.attributes.position;
          const points: THREE.Vector3[] = [];
          for (let i = 1; i <= 64; i++) {
            points.push(new THREE.Vector3(
              positions.getX(i) + startPoint.x,
              positions.getY(i) + startPoint.y,
              positions.getZ(i) + startPoint.z
            ));
          }
          points.push(points[0].clone()); // Close the loop
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          previewShape = new THREE.Line(geometry, material);
          circleGeometry.dispose();
          sceneRef.current.add(previewShape);
        } else if (currentShape === 'line') {
          const points = [startPoint, currentPoint];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          previewShape = new THREE.Line(geometry, material);
          sceneRef.current.add(previewShape);
        }
      };

      const onMouseUp = (event: MouseEvent) => {
        if (!isDrawing || !startPoint || !sceneRef.current || !currentShape) return;

        const endPoint = getIntersectionPoint(event);
        if (!endPoint) return;

        // Remove preview
        if (previewShape) {
          sceneRef.current.remove(previewShape);
          previewShape.geometry.dispose();
          if (previewShape.material instanceof THREE.Material) {
            previewShape.material.dispose();
          }
        }

        // Create final shape
        let finalShape: THREE.Line | THREE.Mesh | null = null;

        if (currentShape === 'rectangle') {
          const cameraRight = new THREE.Vector3();
          const cameraUp = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(new THREE.Vector3());
          cameraRight.setFromMatrixColumn(cameraRef.current!.matrixWorld, 0);
          cameraUp.setFromMatrixColumn(cameraRef.current!.matrixWorld, 1);
          
          const dx = endPoint.x - startPoint.x;
          const dy = endPoint.y - startPoint.y;
          
          const points = [
            startPoint.clone(),
            startPoint.clone().add(cameraRight.clone().multiplyScalar(dx)),
            endPoint.clone(),
            startPoint.clone().add(cameraUp.clone().multiplyScalar(dy)),
            startPoint.clone()
          ];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          finalShape = new THREE.Line(geometry, material);
          finalShape.name = 'sketch-rectangle';
        } else if (currentShape === 'circle') {
          const radius = startPoint.distanceTo(endPoint);
          
          // Create circle in camera-facing plane
          const cameraDirection = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(cameraDirection);
          const circleGeometry = new THREE.CircleGeometry(radius, 64);
          
          // Orient circle to face camera
          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cameraDirection.negate());
          circleGeometry.applyQuaternion(quaternion);
          
          // Create line loop from circle edges
          const positions = circleGeometry.attributes.position;
          const points: THREE.Vector3[] = [];
          for (let i = 1; i <= 64; i++) {
            points.push(new THREE.Vector3(
              positions.getX(i) + startPoint.x,
              positions.getY(i) + startPoint.y,
              positions.getZ(i) + startPoint.z
            ));
          }
          points.push(points[0].clone());
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          finalShape = new THREE.Line(geometry, material);
          finalShape.name = 'sketch-circle';
          (finalShape as any).sketchData = { 
            center: startPoint.clone(), 
            radius, 
            normal: cameraDirection.negate().normalize() 
          };
          circleGeometry.dispose();
        } else if (currentShape === 'line') {
          const points = [startPoint, endPoint];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
          finalShape = new THREE.Line(geometry, material);
          finalShape.name = 'sketch-line';
        }

        if (finalShape) {
          (finalShape as any).isSketchObject = true;
          sceneRef.current.add(finalShape);
          sketchObjects.push(finalShape);
          
          // Save state for undo/redo
          setTimeout(() => {
            const sceneState = sceneRef.current?.children
              .filter((obj) => (obj as any).isSketchObject || obj instanceof THREE.Mesh)
              .map((obj) => ({
                name: obj.name,
                type: obj.type,
                position: obj.position.clone(),
                rotation: obj.rotation.clone(),
                scale: obj.scale.clone(),
                isSketchObject: (obj as any).isSketchObject,
                sketchData: (obj as any).sketchData,
                geometry: obj instanceof THREE.Line ? 
                  Array.from((obj.geometry as THREE.BufferGeometry).attributes.position.array) : null
              }));
            window.dispatchEvent(new CustomEvent('cad-save-state', {
              detail: { 
                name: `Created ${currentShape}`,
                sceneData: { objects: sceneState }
              }
            }));
          }, 50);
        }

        isDrawing = false;
        startPoint = null;
        previewShape = null;
        
        // Auto-exit sketch mode after creating shape
        cleanup();
      };

      const onEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };

      const cleanup = () => {
        containerRef.current?.removeEventListener('mousedown', onMouseDown);
        containerRef.current?.removeEventListener('mousemove', onMouseMove);
        containerRef.current?.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onEscapeKey);
        if (previewShape && sceneRef.current) {
          sceneRef.current.remove(previewShape);
        }
        isDrawing = false;
        startPoint = null;
        previewShape = null;
        console.log('Sketch mode ended');
      };

      containerRef.current?.addEventListener('mousedown', onMouseDown);
      containerRef.current?.addEventListener('mousemove', onMouseMove);
      containerRef.current?.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onEscapeKey);
    };

    const handleExtrude = (e: any) => {
      const { distance, direction } = e.detail;
      console.log('Extruding with distance:', distance, 'direction:', direction);
      
      if (!sceneRef.current) return;
      
      // Find all sketch objects (use the most recently created if none selected)
      const allSketches = sceneRef.current.children.filter(
        (obj) => (obj as any).isSketchObject
      );
      
      console.log('All sketches found:', allSketches.length);
      console.log('Selected objects:', selectedObjects.length);
      
      let selectedSketches = allSketches.filter(obj => selectedObjects.includes(obj));
      
      // If no sketch is selected, use the last created sketch
      if (selectedSketches.length === 0 && allSketches.length > 0) {
        selectedSketches = [allSketches[allSketches.length - 1]];
        console.log('Using last created sketch');
      }
      
      if (selectedSketches.length === 0) {
        console.warn('No sketch available for extrusion');
        return;
      }
      
      console.log('Extruding', selectedSketches.length, 'sketch(es)');
      
      selectedSketches.forEach((sketchObj) => {
        const sketchData = (sketchObj as any).sketchData;
        
        if (sketchObj.name === 'sketch-circle' && sketchData) {
          // Extrude circle into cylinder
          const extrudeDistance = direction === 'both' ? distance / 2 : distance;
          const geometry = new THREE.CylinderGeometry(
            sketchData.radius,
            sketchData.radius,
            distance,
            64
          );
          
          const material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            roughness: 0.5,
            metalness: 0.1
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          // Position at sketch center
          mesh.position.copy(sketchData.center);
          
          // Orient based on sketch normal if available
          if (sketchData.normal) {
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              sketchData.normal
            );
            mesh.applyQuaternion(quaternion);
          }
          
          // Adjust position based on direction
          if (direction === 'up') {
            const offset = sketchData.normal ? 
              sketchData.normal.clone().multiplyScalar(extrudeDistance / 2) :
              new THREE.Vector3(0, extrudeDistance / 2, 0);
            mesh.position.add(offset);
          } else if (direction === 'down') {
            const offset = sketchData.normal ? 
              sketchData.normal.clone().multiplyScalar(-extrudeDistance / 2) :
              new THREE.Vector3(0, -extrudeDistance / 2, 0);
            mesh.position.add(offset);
          }
          
          mesh.name = 'Extruded Circle';
          sceneRef.current!.add(mesh);
          
          // Remove sketch after extrusion
          sceneRef.current!.remove(sketchObj);
          if (sketchObj instanceof THREE.Line || sketchObj instanceof THREE.Mesh) {
            sketchObj.geometry.dispose();
            if (sketchObj.material instanceof THREE.Material) {
              sketchObj.material.dispose();
            }
          }
          
          console.log('Circle extruded into cylinder');
        } else {
          console.warn('Extrude not yet implemented for', sketchObj.name);
        }
      });
    };

    window.addEventListener('cad-sketch-mode', handleSketchMode);
    window.addEventListener('cad-extrude', handleExtrude);
    
    return () => {
      window.removeEventListener('cad-sketch-mode', handleSketchMode);
      window.removeEventListener('cad-extrude', handleExtrude);
    };
  }, [selectedObjects]);

  // Load file when currentFile changes
  useEffect(() => {
    if (!currentFile || !sceneRef.current) return;

    const loadFile = async () => {
      try {
        const response = await fetch(`/api/cad/files/${currentFile.id}/content`);
        if (!response.ok) throw new Error('Failed to load file');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (currentFile.file_type === '.stl' || currentFile.file_type === 'stl') {
          const loader = new STLLoader();
          loader.load(url, (geometry) => {
            const material = new THREE.MeshStandardMaterial({
              color: 0x3b82f6,
              roughness: 0.5,
              metalness: 0.1
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Center the geometry
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox?.getCenter(center);
            mesh.position.sub(center);

            sceneRef.current!.add(mesh);
            URL.revokeObjectURL(url);
          });
        } else if (currentFile.file_type === '.obj' || currentFile.file_type === 'obj') {
          const loader = new OBJLoader();
          loader.load(url, (object) => {
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x3b82f6,
                  roughness: 0.5,
                  metalness: 0.1
                });
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            sceneRef.current!.add(object);
            URL.revokeObjectURL(url);
          });
        }
      } catch (error) {
        console.error('Error loading file:', error);
      }
    };

    loadFile();
  }, [currentFile]);

  // Handle fillet application
  const handleApplyFillet = async (edgeIndices: number[], radius: number, variableRadii?: Map<number, number>) => {
    if (selectedObjects.length === 0) return;

    try {
      const selectedMesh = selectedObjects[0] as THREE.Mesh;
      const featureId = (selectedMesh as any).featureId || 'temp-feature';

      // Create temporary feature if needed
      if (!geometryKernelRef.current.getFeature(featureId)) {
        // TODO: Properly create feature from mesh with BREP topology
        console.warn('Selected object does not have BREP topology');
        alert('This feature does not support fillet. Please create features using Sketch + Extrude.');
        return;
      }

      const filletFeature = await geometryKernelRef.current.filletEdges(
        featureId,
        edgeIndices,
        radius,
        variableRadii
      );

      // Replace mesh in scene
      if (filletFeature.mesh && sceneRef.current) {
        sceneRef.current.remove(selectedMesh);
        filletFeature.mesh.position.copy(selectedMesh.position);
        filletFeature.mesh.rotation.copy(selectedMesh.rotation);
        filletFeature.mesh.scale.copy(selectedMesh.scale);
        (filletFeature.mesh as any).featureId = filletFeature.id;
        sceneRef.current.add(filletFeature.mesh);
        
        setSelectedObjects([filletFeature.mesh]);
      }

      // Save state for undo/redo
      window.dispatchEvent(new CustomEvent('cad-save-state', {
        detail: { name: `Fillet applied (${edgeIndices.length} edges)` }
      }));

    } catch (error) {
      console.error('Fillet failed:', error);
      alert(`Fillet failed: ${error}`);
    }
  };

  // Handle chamfer application
  const handleApplyChamfer = async (
    edgeIndices: number[],
    distance1: number,
    distance2?: number,
    angle?: number
  ) => {
    if (selectedObjects.length === 0) return;

    try {
      const selectedMesh = selectedObjects[0] as THREE.Mesh;
      const featureId = (selectedMesh as any).featureId || 'temp-feature';

      // Create temporary feature if needed
      if (!geometryKernelRef.current.getFeature(featureId)) {
        console.warn('Selected object does not have BREP topology');
        alert('This feature does not support chamfer. Please create features using Sketch + Extrude.');
        return;
      }

      const chamferFeature = await geometryKernelRef.current.chamferEdges(
        featureId,
        edgeIndices,
        distance1,
        distance2,
        angle
      );

      // Replace mesh in scene
      if (chamferFeature.mesh && sceneRef.current) {
        sceneRef.current.remove(selectedMesh);
        chamferFeature.mesh.position.copy(selectedMesh.position);
        chamferFeature.mesh.rotation.copy(selectedMesh.rotation);
        chamferFeature.mesh.scale.copy(selectedMesh.scale);
        (chamferFeature.mesh as any).featureId = chamferFeature.id;
        sceneRef.current.add(chamferFeature.mesh);
        
        setSelectedObjects([chamferFeature.mesh]);
      }

      // Save state for undo/redo
      window.dispatchEvent(new CustomEvent('cad-save-state', {
        detail: { name: `Chamfer applied (${edgeIndices.length} edges)` }
      }));

    } catch (error) {
      console.error('Chamfer failed:', error);
      alert(`Chamfer failed: ${error}`);
    }
  };

  // Get available edges count for selected feature
  const getAvailableEdgesCount = (): number => {
    if (selectedObjects.length === 0) return 0;
    
    const selectedMesh = selectedObjects[0] as THREE.Mesh;
    const featureId = (selectedMesh as any).featureId;
    
    if (!featureId) return 0;
    
    const edges = geometryKernelRef.current.getFeatureEdges(featureId);
    return edges.length;
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Viewport Overlay Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <button className="p-2 bg-gray-800 bg-opacity-75 rounded hover:bg-opacity-100 transition">
          🔍 Zoom Fit
        </button>
        <button className="p-2 bg-gray-800 bg-opacity-75 rounded hover:bg-opacity-100 transition">
          📸 Screenshot
        </button>
      </div>

      {/* Viewport Info */}
      <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-75 px-3 py-2 rounded text-xs font-mono">
        <div>Camera: Perspective</div>
        <div>Units: {units}</div>
        {selectedObjects.length > 0 && (
          <div className="text-blue-400 mt-1">{selectedObjects.length} object(s) selected</div>
        )}
        {(selectedTool === 'fillet' || selectedTool === 'chamfer') && selectedObjects.length > 0 && (
          <div className="text-yellow-400 mt-1">
            Click edges to select, then configure in panel
          </div>
        )}
      </div>

      {/* Fillet Modal */}
      <FilletModal
        isOpen={showFilletModal}
        darkMode={darkMode}
        onClose={() => setShowFilletModal(false)}
        onApply={handleApplyFillet}
        availableEdges={getAvailableEdgesCount()}
      />

      {/* Chamfer Modal */}
      <ChamferModal
        isOpen={showChamferModal}
        darkMode={darkMode}
        onClose={() => setShowChamferModal(false)}
        onApply={handleApplyChamfer}
        availableEdges={getAvailableEdgesCount()}
      />
    </div>
  );
}

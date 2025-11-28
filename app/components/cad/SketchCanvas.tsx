'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AdvancedSketchEntity,
  ArcTools,
  PolygonTools,
  BSplineTools,
  EllipseTools,
  SketchOperations,
  SketchTessellation
} from '@/lib/cad/sketch-tools';

interface SketchCanvasProps {
  activeTool: string | null;
  toolSubtype?: string;
  darkMode: boolean;
  gridSize: number;
  snapEnabled: boolean;
  onEntityCreated: (entity: AdvancedSketchEntity) => void;
  onEntityModified: (entity: AdvancedSketchEntity) => void;
  onEntityDeleted: (entityId: string) => void;
  existingEntities: AdvancedSketchEntity[];
}

export default function SketchCanvas({
  activeTool,
  toolSubtype,
  darkMode,
  gridSize,
  snapEnabled,
  onEntityCreated,
  onEntityModified,
  onEntityDeleted,
  existingEntities
}: SketchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  
  const [clickPoints, setClickPoints] = useState<THREE.Vector2[]>([]);
  const [previewEntity, setPreviewEntity] = useState<AdvancedSketchEntity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<THREE.Vector2 | null>(null);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;
    
    // Camera (orthographic for 2D)
    const aspect = width / height;
    const frustumSize = 100;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Grid
    const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);
    
    // Axes
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    // Cleanup
    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [darkMode]);
  
  // Render existing entities
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Clear existing entity meshes
    const entitiesToRemove: THREE.Object3D[] = [];
    sceneRef.current.children.forEach(child => {
      if ((child as any).isEntity) {
        entitiesToRemove.push(child);
      }
    });
    entitiesToRemove.forEach(obj => sceneRef.current!.remove(obj));
    
    // Add entity meshes
    existingEntities.forEach(entity => {
      const geometry = SketchTessellation.toThreeGeometry(entity);
      const material = new THREE.LineBasicMaterial({
        color: entity.construction ? 0x888888 : (darkMode ? 0x00ffff : 0x0066ff),
        linewidth: entity.id === hoveredEntity ? 3 : 1,
        linecap: 'round',
        linejoin: 'round'
      });
      
      const line = new THREE.Line(geometry, material);
      (line as any).isEntity = true;
      (line as any).entityId = entity.id;
      sceneRef.current!.add(line);
    });
  }, [existingEntities, hoveredEntity, darkMode]);
  
  // Render preview entity
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Remove previous preview
    const previewToRemove: THREE.Object3D[] = [];
    sceneRef.current.children.forEach(child => {
      if ((child as any).isPreview) {
        previewToRemove.push(child);
      }
    });
    previewToRemove.forEach(obj => sceneRef.current!.remove(obj));
    
    // Add new preview if exists
    if (previewEntity) {
      try {
        const geometry = SketchTessellation.toThreeGeometry(previewEntity);
        const material = new THREE.LineBasicMaterial({
          color: 0xffaa00, // Orange for preview
          linewidth: 2,
          opacity: 0.6,
          transparent: true,
          linecap: 'round',
          linejoin: 'round'
        });
        
        const line = new THREE.Line(geometry, material);
        (line as any).isPreview = true;
        sceneRef.current!.add(line);
      } catch (error) {
        console.error('Error rendering preview:', error);
      }
    }
  }, [previewEntity]);
  
  // Helper to convert screen to world coords
  const screenToWorld = (event: React.MouseEvent<HTMLDivElement>): THREE.Vector2 => {
    if (!cameraRef.current || !containerRef.current) return new THREE.Vector2(0, 0);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const vector = new THREE.Vector3(x, y, 0);
    vector.unproject(cameraRef.current);
    const worldPoint = new THREE.Vector2(vector.x, vector.y);
    
    // Snap to grid if enabled
    if (snapEnabled) {
      worldPoint.x = Math.round(worldPoint.x / gridSize) * gridSize;
      worldPoint.y = Math.round(worldPoint.y / gridSize) * gridSize;
    }
    
    return worldPoint;
  };
  
  // Check if tool uses drag interaction
  const usesDragInteraction = (tool: string | null, subtype?: string): boolean => {
    if (!tool) return false;
    
    // Tools that use drag-to-create
    if (tool === 'line') return true;
    if (tool === 'circle' && subtype === 'center-radius') return true;
    if (tool === 'rectangle') return true;
    if (tool === 'ellipse' && subtype === 'center-axes') return false; // Uses 3 clicks
    
    // Multi-click tools
    if (tool === 'circle' && subtype === '3-point') return false;
    if (tool === 'arc') return false; // Both subtypes use 3 clicks
    if (tool === 'polygon') return false;
    if (tool === 'spline') return false;
    
    return false;
  };
  
  // Handle mouse down - start drag
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    
    if (usesDragInteraction(activeTool, toolSubtype)) {
      const point = screenToWorld(event);
      setDragStart(point);
      setIsDragging(true);
    }
  };
  
  // Handle mouse up - finish drag
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    
    if (isDragging && dragStart) {
      const endPoint = screenToWorld(event);
      
      // Don't create if drag distance too small (accidental clicks)
      const dragDistance = dragStart.distanceTo(endPoint);
      if (dragDistance > 0.5) {
        const entity = createFinalEntity(activeTool, toolSubtype, dragStart, endPoint);
        if (entity) {
          onEntityCreated(entity);
        }
      }
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setPreviewEntity(null);
    }
  };
  
  // Create preview entity during drag/move
  const createPreviewEntity = (
    tool: string,
    subtype: string | undefined,
    startPoint: THREE.Vector2,
    currentPoint: THREE.Vector2
  ): AdvancedSketchEntity | null => {
    try {
      switch (tool) {
        case 'line':
          return {
            id: 'preview',
            type: 'line',
            points: [startPoint, currentPoint],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
          };
          
        case 'circle':
          if (subtype === 'center-radius') {
            const radius = startPoint.distanceTo(currentPoint);
            return {
              id: 'preview',
              type: 'circle',
              points: [startPoint],
              center: startPoint,
              radius,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          }
          break;
          
        case 'rectangle':
          return {
            id: 'preview',
            type: 'rectangle',
            points: [startPoint, currentPoint],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
          };
      }
    } catch (error) {
      console.error('Error creating preview:', error);
    }
    return null;
  };
  
  // Create final entity from drag
  const createFinalEntity = (
    tool: string,
    subtype: string | undefined,
    startPoint: THREE.Vector2,
    endPoint: THREE.Vector2
  ): AdvancedSketchEntity | null => {
    try {
      switch (tool) {
        case 'line':
          return {
            id: crypto.randomUUID(),
            type: 'line',
            points: [startPoint, endPoint],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
          };
          
        case 'circle':
          if (subtype === 'center-radius') {
            const radius = startPoint.distanceTo(endPoint);
            return {
              id: crypto.randomUUID(),
              type: 'circle',
              points: [startPoint],
              center: startPoint,
              radius,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          }
          break;
          
        case 'rectangle':
          return {
            id: crypto.randomUUID(),
            type: 'rectangle',
            points: [startPoint, endPoint],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
          };
      }
    } catch (error) {
      console.error('Error creating entity:', error);
    }
    return null;
  };
  
  // Handle canvas click (for multi-click tools)
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    
    // Skip if this is a drag tool
    if (usesDragInteraction(activeTool, toolSubtype)) return;
    
    const clickPoint = screenToWorld(event);
    const newPoints = [...clickPoints, clickPoint];
    setClickPoints(newPoints);
    
    // Create entity based on tool
    createEntityFromPoints(activeTool, toolSubtype, newPoints);
  };
  
  // Create entity from click points
  const createEntityFromPoints = (
    tool: string,
    subtype: string | undefined,
    points: THREE.Vector2[]
  ) => {
    let entity: AdvancedSketchEntity | null = null;
    
    try {
      switch (tool) {
        case 'line':
          if (points.length === 2) {
            entity = {
              id: crypto.randomUUID(),
              type: 'line',
              points,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          }
          break;
          
        case 'circle':
          if (subtype === 'center-radius' && points.length === 2) {
            const center = points[0];
            const radius = center.distanceTo(points[1]);
            entity = {
              id: crypto.randomUUID(),
              type: 'circle',
              points: [center],
              center,
              radius,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          } else if (subtype === '3-point' && points.length === 3) {
            // Use 3-point arc algorithm
            const arcEntity = ArcTools.create3Point(points[0], points[1], points[2]);
            entity = {
              ...arcEntity,
              type: 'circle',
              startAngle: 0,
              endAngle: Math.PI * 2
            };
          }
          break;
          
        case 'arc':
          if (subtype === 'center-start-end' && points.length === 3) {
            entity = ArcTools.createCenterStartEnd(points[0], points[1], points[2]);
          } else if (subtype === '3-point' && points.length === 3) {
            entity = ArcTools.create3Point(points[0], points[1], points[2]);
          }
          break;
          
        case 'ellipse':
          if (subtype === 'center-axes' && points.length === 3) {
            const center = points[0];
            const majorRadius = center.distanceTo(points[1]);
            const minorRadius = center.distanceTo(points[2]);
            const rotation = Math.atan2(points[1].y - center.y, points[1].x - center.x);
            entity = EllipseTools.createCenterAxes(center, majorRadius, minorRadius, rotation);
          } else if (subtype === '3-point' && points.length === 3) {
            entity = EllipseTools.create3Point(points[0], points[1], points[2]);
          }
          break;
          
        case 'rectangle':
          if (points.length === 2) {
            const p1 = points[0];
            const p2 = points[1];
            entity = {
              id: crypto.randomUUID(),
              type: 'rectangle',
              points: [
                p1,
                new THREE.Vector2(p2.x, p1.y),
                p2,
                new THREE.Vector2(p1.x, p2.y)
              ],
              closed: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          }
          break;
          
        case 'polygon':
          if (points.length === 2) {
            const center = points[0];
            const radius = center.distanceTo(points[1]);
            const sides = 6; // Default hexagon, make configurable
            entity = subtype === 'inscribed'
              ? PolygonTools.createInscribed(center, radius, sides)
              : PolygonTools.createCircumscribed(center, radius, sides);
          }
          break;
          
        case 'bspline':
          if (points.length >= 4) {
            const degree = subtype === 'degree-2' ? 2 : subtype === 'degree-4' ? 4 : 3;
            entity = BSplineTools.createInterpolated(points, degree);
          }
          break;
          
        case 'polyline':
          if (points.length >= 2) {
            entity = {
              id: crypto.randomUUID(),
              type: 'polyline',
              points,
              closed: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
          }
          break;
      }
      
      if (entity) {
        onEntityCreated(entity);
        setClickPoints([]);
        setPreviewEntity(null);
      }
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  };
  
  // Handle mouse move for preview
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    
    if (isDragging && dragStart) {
      // Update preview for drag tools
      const currentPoint = screenToWorld(event);
      const preview = createPreviewEntity(activeTool, toolSubtype, dragStart, currentPoint);
      setPreviewEntity(preview);
    } else if (clickPoints.length > 0 && !usesDragInteraction(activeTool, toolSubtype)) {
      // Update preview for multi-click tools
      const mousePoint = screenToWorld(event);
      const previewPoints = [...clickPoints, mousePoint];
      createEntityFromPoints(activeTool, toolSubtype, previewPoints);
    }
  };
  
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClickPoints([]);
        setPreviewEntity(null);
        setIsDragging(false);
        setDragStart(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      
      {/* Status bar */}
      <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg shadow-lg ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="text-sm">
          <div className="font-semibold">
            {activeTool ? `Tool: ${activeTool}` : 'No tool selected'}
            {toolSubtype && ` (${toolSubtype})`}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {isDragging ? '🖱️ Dragging' : `Points: ${clickPoints.length}`} | 
            Entities: {existingEntities.length} |
            Snap: {snapEnabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      {activeTool && (
        <div className={`absolute top-4 left-4 px-4 py-2 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="text-xs">
            {getToolInstructions(activeTool, toolSubtype, clickPoints.length, isDragging)}
          </div>
        </div>
      )}
    </div>
  );
}

function getToolInstructions(tool: string, subtype: string | undefined, pointCount: number, isDragging: boolean): string {
  // Show release message while dragging
  if (isDragging) {
    return 'Release to complete';
  }
  
  switch (tool) {
    case 'line':
      return 'Click and drag to draw line';
    case 'circle':
      if (subtype === '3-point') {
        return pointCount === 0 ? 'Click first point' :
               pointCount === 1 ? 'Click second point' : 'Click third point';
      }
      return 'Click and drag from center to edge';
    case 'rectangle':
      return 'Click and drag from corner to corner';
    case 'arc':
      if (subtype === '3-point') {
        return pointCount === 0 ? 'Click start point' :
               pointCount === 1 ? 'Click middle point' : 'Click end point';
      }
      return pointCount === 0 ? 'Click center' :
             pointCount === 1 ? 'Click start point' : 'Click end point';
    case 'ellipse':
      return pointCount === 0 ? 'Click center' :
             pointCount === 1 ? 'Click major axis' : 'Click minor axis';
    case 'rectangle':
      return pointCount === 0 ? 'Click first corner' : 'Click opposite corner';
    case 'polygon':
      return pointCount === 0 ? 'Click center' : 'Click edge point';
    case 'bspline':
    case 'polyline':
      return `Click points (${pointCount} so far), press ESC to finish`;
    default:
      return 'Click to place points';
  }
}

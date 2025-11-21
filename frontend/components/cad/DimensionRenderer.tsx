'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Dimension,
  DimensionGeometry,
  calculateDimensionGeometry,
  formatDimensionValue
} from '@/backend/lib/cad/dimension-annotations';

interface DimensionRendererProps {
  dimensions: Dimension[];
  camera: THREE.OrthographicCamera | null;
  darkMode: boolean;
  visible: boolean;
  selectedDimensionId?: string;
  onDimensionClick?: (dimensionId: string) => void;
  onDimensionDoubleClick?: (dimensionId: string) => void;
  gridSize?: number;
}

export default function DimensionRenderer({
  dimensions,
  camera,
  darkMode,
  visible,
  selectedDimensionId,
  onDimensionClick,
  onDimensionDoubleClick,
  gridSize = 1
}: DimensionRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastClickTime = useRef<number>(0);
  const lastClickId = useRef<string | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !camera || !visible) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Draw each dimension
    dimensions.forEach(dimension => {
      const isSelected = dimension.id === selectedDimensionId;
      const isHovered = dimension.id === hoveredId;
      
      drawDimension(ctx, dimension, camera, {
        darkMode,
        isSelected,
        isHovered,
        canvasWidth: rect.width,
        canvasHeight: rect.height
      });
    });
  }, [dimensions, camera, darkMode, visible, selectedDimensionId, hoveredId]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let foundHover = false;
    for (const dimension of dimensions) {
      if (isPointNearDimension(dimension, camera, x, y, rect.width, rect.height)) {
        setHoveredId(dimension.id);
        canvas.style.cursor = 'pointer';
        foundHover = true;
        break;
      }
    }
    
    if (!foundHover) {
      setHoveredId(null);
      canvas.style.cursor = 'default';
    }
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera || !canvasRef.current || !onDimensionClick) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const now = Date.now();
    const isDoubleClick = now - lastClickTime.current < 300 && lastClickId.current === hoveredId;
    
    for (const dimension of dimensions) {
      if (isPointNearDimension(dimension, camera, x, y, rect.width, rect.height)) {
        if (isDoubleClick && onDimensionDoubleClick) {
          onDimensionDoubleClick(dimension.id);
          lastClickTime.current = 0;
          lastClickId.current = null;
        } else {
          onDimensionClick(dimension.id);
          lastClickTime.current = now;
          lastClickId.current = dimension.id;
        }
        break;
      }
    }
  };
  
  if (!visible) return null;
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto z-15"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function drawDimension(
  ctx: CanvasRenderingContext2D,
  dimension: Dimension,
  camera: THREE.OrthographicCamera,
  options: {
    darkMode: boolean;
    isSelected: boolean;
    isHovered: boolean;
    canvasWidth: number;
    canvasHeight: number;
  }
) {
  const geometry = calculateDimensionGeometry(dimension);
  const arrowSize = dimension.arrowSize ?? 8;
  const textSize = dimension.textSize ?? 14;
  
  // Determine colors
  let lineColor: string;
  let textColor: string;
  let fillColor: string;
  
  if (options.isSelected) {
    lineColor = '#3b82f6'; // Blue
    textColor = '#3b82f6';
    fillColor = '#3b82f6';
  } else if (options.isHovered) {
    lineColor = options.darkMode ? '#60a5fa' : '#2563eb';
    textColor = options.darkMode ? '#60a5fa' : '#2563eb';
    fillColor = options.darkMode ? '#60a5fa' : '#2563eb';
  } else if (!dimension.isDriving) {
    // Reference dimension (driven by geometry)
    lineColor = options.darkMode ? '#9ca3af' : '#6b7280';
    textColor = options.darkMode ? '#9ca3af' : '#6b7280';
    fillColor = options.darkMode ? '#9ca3af' : '#6b7280';
  } else {
    lineColor = dimension.color ?? (options.darkMode ? '#e5e7eb' : '#374151');
    textColor = dimension.color ?? (options.darkMode ? '#ffffff' : '#000000');
    fillColor = dimension.color ?? (options.darkMode ? '#e5e7eb' : '#374151');
  }
  
  const lineWidth = options.isSelected ? 2.5 : options.isHovered ? 2 : 1.5;
  
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw extension lines
  if (geometry.extensionLines) {
    ctx.setLineDash([2, 2]);
    geometry.extensionLines.forEach(line => {
      const start = worldToScreen(line.start, camera, options.canvasWidth, options.canvasHeight);
      const end = worldToScreen(line.end, camera, options.canvasWidth, options.canvasHeight);
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);
  }
  
  // Draw dimension line or arc
  if (geometry.arcPath) {
    // Angular dimension - draw arc
    ctx.beginPath();
    const firstPoint = worldToScreen(geometry.arcPath[0], camera, options.canvasWidth, options.canvasHeight);
    if (firstPoint) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      geometry.arcPath.slice(1).forEach(point => {
        const screenPoint = worldToScreen(point, camera, options.canvasWidth, options.canvasHeight);
        if (screenPoint) {
          ctx.lineTo(screenPoint.x, screenPoint.y);
        }
      });
      ctx.stroke();
    }
  } else {
    // Linear or radial dimension
    const start = worldToScreen(geometry.dimensionLine.start, camera, options.canvasWidth, options.canvasHeight);
    const end = worldToScreen(geometry.dimensionLine.end, camera, options.canvasWidth, options.canvasHeight);
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }
  
  // Draw arrows
  if (geometry.arrowStart) {
    drawArrow(ctx, geometry.arrowStart.position, geometry.arrowStart.direction, arrowSize, camera, options.canvasWidth, options.canvasHeight);
  }
  if (geometry.arrowEnd) {
    drawArrow(ctx, geometry.arrowEnd.position, geometry.arrowEnd.direction, arrowSize, camera, options.canvasWidth, options.canvasHeight);
  }
  
  // Draw text
  const textPos = worldToScreen(geometry.textPosition, camera, options.canvasWidth, options.canvasHeight);
  if (textPos) {
    ctx.save();
    ctx.translate(textPos.x, textPos.y);
    
    // Rotate text if needed (keep upright for readability)
    let rotation = geometry.textRotation;
    if (rotation > Math.PI / 2) rotation -= Math.PI;
    if (rotation < -Math.PI / 2) rotation += Math.PI;
    ctx.rotate(rotation);
    
    // Draw text background
    const text = formatDimensionValue(dimension);
    ctx.font = `${textSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(text);
    const padding = 4;
    
    ctx.fillStyle = options.darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
      -metrics.width / 2 - padding,
      -textSize / 2 - padding,
      metrics.width + padding * 2,
      textSize + padding * 2
    );
    
    // Draw text
    ctx.fillStyle = textColor;
    ctx.fillText(text, 0, 0);
    
    // Draw driving dimension indicator
    if (!dimension.isDriving) {
      ctx.fillStyle = options.darkMode ? '#9ca3af' : '#6b7280';
      ctx.font = `${textSize * 0.7}px Arial`;
      ctx.fillText('REF', 0, textSize / 2 + 8);
    }
    
    // Draw locked indicator
    if (dimension.locked) {
      ctx.fillStyle = options.darkMode ? '#fbbf24' : '#f59e0b';
      ctx.font = `${textSize * 0.8}px Arial`;
      ctx.fillText('🔒', metrics.width / 2 + padding + 8, 0);
    }
    
    ctx.restore();
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  position: THREE.Vector2,
  direction: THREE.Vector2,
  size: number,
  camera: THREE.OrthographicCamera,
  canvasWidth: number,
  canvasHeight: number
) {
  const pos = worldToScreen(position, camera, canvasWidth, canvasHeight);
  if (!pos) return;
  
  const angle = Math.atan2(direction.y, direction.x);
  const arrowAngle = Math.PI / 6; // 30 degrees
  
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(
    pos.x - size * Math.cos(angle - arrowAngle),
    pos.y - size * Math.sin(angle - arrowAngle)
  );
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(
    pos.x - size * Math.cos(angle + arrowAngle),
    pos.y - size * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();
}

function worldToScreen(
  worldPos: THREE.Vector2,
  camera: THREE.OrthographicCamera,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } | null {
  const vector = new THREE.Vector3(worldPos.x, worldPos.y, 0);
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * canvasWidth;
  const y = (-(vector.y * 0.5) + 0.5) * canvasHeight;
  
  return { x, y };
}

function screenToWorld(
  screenX: number,
  screenY: number,
  camera: THREE.OrthographicCamera,
  canvasWidth: number,
  canvasHeight: number
): THREE.Vector2 {
  const x = (screenX / canvasWidth) * 2 - 1;
  const y = -(screenY / canvasHeight) * 2 + 1;
  
  const vector = new THREE.Vector3(x, y, 0);
  vector.unproject(camera);
  
  return new THREE.Vector2(vector.x, vector.y);
}

function isPointNearDimension(
  dimension: Dimension,
  camera: THREE.OrthographicCamera,
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const geometry = calculateDimensionGeometry(dimension);
  const threshold = 10; // pixels
  
  // Check text position
  const textPos = worldToScreen(geometry.textPosition, camera, canvasWidth, canvasHeight);
  if (textPos) {
    const dx = screenX - textPos.x;
    const dy = screenY - textPos.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) return true;
  }
  
  // Check dimension line
  if (geometry.arcPath) {
    // Check arc path
    for (let i = 0; i < geometry.arcPath.length - 1; i++) {
      const p1 = worldToScreen(geometry.arcPath[i], camera, canvasWidth, canvasHeight);
      const p2 = worldToScreen(geometry.arcPath[i + 1], camera, canvasWidth, canvasHeight);
      if (p1 && p2 && isPointNearLine(screenX, screenY, p1.x, p1.y, p2.x, p2.y, threshold)) {
        return true;
      }
    }
  } else {
    // Check straight line
    const start = worldToScreen(geometry.dimensionLine.start, camera, canvasWidth, canvasHeight);
    const end = worldToScreen(geometry.dimensionLine.end, camera, canvasWidth, canvasHeight);
    if (start && end && isPointNearLine(screenX, screenY, start.x, start.y, end.x, end.y, threshold)) {
      return true;
    }
  }
  
  return false;
}

function isPointNearLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    return dist < threshold;
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  
  return dist < threshold;
}

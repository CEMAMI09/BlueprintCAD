'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ConstraintSolver, Constraint } from '@/lib/cad/constraint-solver';

interface ConstraintIconOverlayProps {
  solver: ConstraintSolver;
  camera: THREE.OrthographicCamera | null;
  darkMode: boolean;
  visible: boolean;
  onIconClick?: (constraintId: string) => void;
  selectedConstraintId?: string;
}

interface ConstraintIcon {
  id: string;
  position: THREE.Vector2;
  icon: string;
  satisfied: boolean;
  autoInferred: boolean;
  type: string;
  value?: number;
}

export default function ConstraintIconOverlay({
  solver,
  camera,
  darkMode,
  visible,
  onIconClick,
  selectedConstraintId
}: ConstraintIconOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [icons, setIcons] = useState<ConstraintIcon[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Update icons when solver state changes
  useEffect(() => {
    if (!visible || !camera) return;
    
    const state = solver.exportState();
    const newIcons: ConstraintIcon[] = [];
    
    state.constraints.forEach(constraint => {
      const icon = getConstraintIcon(constraint.type);
      const position = calculateIconPosition(constraint, solver);
      
      if (position) {
        newIcons.push({
          id: constraint.id,
          position,
          icon,
          satisfied: constraint.satisfied ?? false,
          autoInferred: constraint.autoInferred ?? false,
          type: constraint.type,
          value: constraint.value
        });
      }
    });
    
    setIcons(newIcons);
  }, [solver, camera, visible]);
  
  // Draw icons on canvas
  useEffect(() => {
    if (!canvasRef.current || !camera || !visible) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each icon
    icons.forEach(iconData => {
      const screenPos = worldToScreen(iconData.position, camera, canvas);
      if (!screenPos) return;
      
      const isSelected = iconData.id === selectedConstraintId;
      const isHovered = iconData.id === hoveredId;
      const size = isSelected ? 32 : isHovered ? 28 : 24;
      
      // Background circle
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size / 2, 0, Math.PI * 2);
      
      if (isSelected) {
        ctx.fillStyle = darkMode ? 'rgba(59, 130, 246, 0.8)' : 'rgba(96, 165, 250, 0.8)';
      } else if (isHovered) {
        ctx.fillStyle = darkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(229, 231, 235, 0.9)';
      } else if (iconData.autoInferred) {
        ctx.fillStyle = darkMode ? 'rgba(147, 51, 234, 0.7)' : 'rgba(196, 181, 253, 0.7)';
      } else {
        ctx.fillStyle = darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)';
      }
      ctx.fill();
      
      // Border
      ctx.strokeStyle = iconData.satisfied 
        ? 'rgba(34, 197, 94, 0.8)' 
        : 'rgba(251, 146, 60, 0.8)';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Icon text
      ctx.font = `${size * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = darkMode ? 'white' : 'black';
      ctx.fillText(iconData.icon, screenPos.x, screenPos.y);
      
      // Value text for dimensional constraints
      if (iconData.value !== undefined && (isHovered || isSelected)) {
        const valueText = formatValue(iconData.type, iconData.value);
        ctx.font = '12px monospace';
        ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
        ctx.strokeStyle = darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(valueText, screenPos.x, screenPos.y + size / 2 + 12);
        ctx.fillText(valueText, screenPos.x, screenPos.y + size / 2 + 12);
      }
      
      // Auto-inferred badge
      if (iconData.autoInferred && !isSelected) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = darkMode ? 'rgba(147, 51, 234, 0.9)' : 'rgba(126, 34, 206, 0.9)';
        ctx.fillText('A', screenPos.x + size / 2 - 4, screenPos.y - size / 2 + 4);
      }
    });
  }, [icons, camera, darkMode, visible, hoveredId, selectedConstraintId]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let foundHover = false;
    for (const icon of icons) {
      const screenPos = worldToScreen(icon.position, camera, canvas);
      if (!screenPos) continue;
      
      const dx = x - screenPos.x;
      const dy = y - screenPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 16) {
        setHoveredId(icon.id);
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
    if (!camera || !canvasRef.current || !onIconClick) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (const icon of icons) {
      const screenPos = worldToScreen(icon.position, camera, canvas);
      if (!screenPos) continue;
      
      const dx = x - screenPos.x;
      const dy = y - screenPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 16) {
        onIconClick(icon.id);
        break;
      }
    }
  };
  
  if (!visible) return null;
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="absolute inset-0 pointer-events-auto z-20"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function calculateIconPosition(constraint: Constraint, solver: ConstraintSolver): THREE.Vector2 | null {
  const state = solver.exportState();
  const entities = Array.from(state.entities.values());
  
  if (constraint.entityIds.length === 0) return null;
  
  // Get first entity
  const entity1 = entities.find(e => e.id === constraint.entityIds[0]);
  if (!entity1) return null;
  
  // For single-entity constraints, place icon at midpoint
  if (constraint.entityIds.length === 1) {
    if (entity1.type === 'line' && entity1.points.length >= 2) {
      const p1 = entity1.points[0];
      const p2 = entity1.points[1];
      return new THREE.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    } else if (entity1.type === 'circle' && entity1.center) {
      return new THREE.Vector2(entity1.center.x, entity1.center.y);
    }
  }
  
  // For two-entity constraints, place icon between them
  if (constraint.entityIds.length === 2) {
    const entity2 = entities.find(e => e.id === constraint.entityIds[1]);
    if (!entity2) return null;
    
    const pos1 = getEntityCenter(entity1);
    const pos2 = getEntityCenter(entity2);
    
    if (pos1 && pos2) {
      return new THREE.Vector2((pos1.x + pos2.x) / 2, (pos1.y + pos2.y) / 2);
    }
  }
  
  return null;
}

function getEntityCenter(entity: any): THREE.Vector2 | null {
  if (entity.type === 'line' && entity.points.length >= 2) {
    const p1 = entity.points[0];
    const p2 = entity.points[1];
    return new THREE.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  } else if (entity.type === 'circle' && entity.center) {
    return new THREE.Vector2(entity.center.x, entity.center.y);
  } else if (entity.type === 'arc' && entity.center) {
    return new THREE.Vector2(entity.center.x, entity.center.y);
  }
  return null;
}

function worldToScreen(
  worldPos: THREE.Vector2,
  camera: THREE.OrthographicCamera,
  canvas: HTMLCanvasElement
): { x: number; y: number } | null {
  const vector = new THREE.Vector3(worldPos.x, worldPos.y, 0);
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * canvas.width;
  const y = (-(vector.y * 0.5) + 0.5) * canvas.height;
  
  return { x, y };
}

function getConstraintIcon(type: string): string {
  const icons: Record<string, string> = {
    horizontal: '⬌',
    vertical: '⬍',
    parallel: '∥',
    perpendicular: '⊥',
    tangent: '⌒',
    coincident: '●',
    concentric: '⊚',
    midpoint: '◐',
    equal: '≈',
    symmetric: '⇋',
    collinear: '⋯',
    distance: '↔',
    angle: '∠',
    radius: '◯',
    length: '📏',
    diameter: '⌀'
  };
  return icons[type] || '?';
}

function formatValue(type: string, value: number): string {
  if (type === 'angle') {
    return `${value.toFixed(1)}°`;
  }
  return value.toFixed(2);
}

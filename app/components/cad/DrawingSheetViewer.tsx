'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DrawingSheet, DrawingView, ViewType, OrthographicDirection } from '@/lib/cad/drawing-system';

interface DrawingSheetViewerProps {
  darkMode: boolean;
  sheet: DrawingSheet;
  scale: number; // Zoom scale for viewport
  onViewClick?: (viewId: string) => void;
  selectedViewId?: string;
}

export default function DrawingSheetViewer({
  darkMode,
  sheet,
  scale,
  onViewClick,
  selectedViewId
}: DrawingSheetViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredView, setHoveredView] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = sheet.width * scale;
    canvas.height = sheet.height * scale;

    // Clear canvas
    ctx.fillStyle = darkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sheet border
    ctx.strokeStyle = darkMode ? '#666' : '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(10 * scale, 10 * scale, (sheet.width - 20) * scale, (sheet.height - 20) * scale);

    // Draw title block
    drawTitleBlock(ctx, sheet, scale, darkMode);

    // Draw all views
    for (const view of sheet.views) {
      drawView(ctx, view, scale, darkMode, view.id === selectedViewId, view.id === hoveredView);
    }
  }, [sheet, scale, darkMode, selectedViewId, hoveredView]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onViewClick) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Find clicked view
    for (const view of sheet.views) {
      // Simple bounding box check (can be improved)
      const bounds = getViewBounds(view);
      if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
        onViewClick(view.id);
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    let foundView: string | null = null;

    for (const view of sheet.views) {
      const bounds = getViewBounds(view);
      if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
        foundView = view.id;
        break;
      }
    }

    setHoveredView(foundView);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border rounded shadow-lg cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredView(null)}
      />
    </div>
  );
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  sheet: DrawingSheet,
  scale: number,
  darkMode: boolean
) {
  const margin = 10 * scale;
  const blockHeight = 50 * scale;
  const blockWidth = 200 * scale;
  const x = sheet.width * scale - blockWidth - margin;
  const y = sheet.height * scale - blockHeight - margin;

  // Draw title block border
  ctx.strokeStyle = darkMode ? '#888' : '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, blockWidth, blockHeight);

  // Draw dividers
  ctx.beginPath();
  ctx.moveTo(x, y + blockHeight / 2);
  ctx.lineTo(x + blockWidth, y + blockHeight / 2);
  ctx.stroke();

  // Draw text
  ctx.fillStyle = darkMode ? '#fff' : '#000';
  ctx.font = `${12 * scale}px Arial`;
  ctx.textBaseline = 'top';

  // Title
  ctx.font = `bold ${14 * scale}px Arial`;
  ctx.fillText(sheet.titleBlock.title || 'Untitled', x + 5 * scale, y + 5 * scale);

  // Details
  ctx.font = `${10 * scale}px Arial`;
  const detailY = y + blockHeight / 2 + 5 * scale;
  ctx.fillText(`Scale: ${sheet.titleBlock.scale || '1:1'}`, x + 5 * scale, detailY);
  ctx.fillText(`Sheet: ${sheet.name}`, x + 5 * scale, detailY + 12 * scale);

  if (sheet.titleBlock.partNumber) {
    ctx.fillText(`Part No: ${sheet.titleBlock.partNumber}`, x + blockWidth / 2 + 5 * scale, detailY);
  }
  if (sheet.titleBlock.revision) {
    ctx.fillText(`Rev: ${sheet.titleBlock.revision}`, x + blockWidth / 2 + 5 * scale, detailY + 12 * scale);
  }
}

function drawView(
  ctx: CanvasRenderingContext2D,
  view: DrawingView,
  scale: number,
  darkMode: boolean,
  isSelected: boolean,
  isHovered: boolean
) {
  const viewX = view.position.x * scale;
  const viewY = view.position.y * scale;

  ctx.save();
  ctx.translate(viewX, viewY);
  ctx.scale(view.scale, view.scale);
  ctx.rotate((view.rotation * Math.PI) / 180);

  // Draw view border if selected or hovered
  if (isSelected || isHovered) {
    const bounds = getViewBoundsLocal(view);
    ctx.strokeStyle = isSelected ? '#4a90e2' : '#888';
    ctx.lineWidth = 2 / view.scale;
    ctx.setLineDash([5 / view.scale, 5 / view.scale]);
    ctx.strokeRect(
      bounds.minX - 10,
      bounds.minY - 10,
      bounds.maxX - bounds.minX + 20,
      bounds.maxY - bounds.minY + 20
    );
    ctx.setLineDash([]);
  }

  // Draw edges
  for (const edge of view.edges) {
    drawEdge(ctx, edge, darkMode, view);
  }

  // Draw dimensions
  if (view.showDimensions) {
    for (const dim of view.dimensions) {
      drawDimension(ctx, dim, darkMode);
    }
  }

  // Draw annotations
  if (view.showAnnotations) {
    for (const annotation of view.annotations) {
      drawAnnotation(ctx, annotation, darkMode);
    }
  }

  // Draw view label
  ctx.fillStyle = darkMode ? '#fff' : '#000';
  ctx.font = `${10 / view.scale}px Arial`;
  ctx.fillText(view.name, 0, -15 / view.scale);

  ctx.restore();
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: any,
  darkMode: boolean,
  view: DrawingView
) {
  if (edge.points.length < 2) return;

  ctx.beginPath();

  // Set line style based on type
  switch (edge.type) {
    case 'visible':
      ctx.strokeStyle = darkMode ? '#fff' : '#000';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      break;
    case 'hidden':
      if (!view.showHiddenLines) return;
      ctx.strokeStyle = darkMode ? '#888' : '#666';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([3, 2]);
      break;
    case 'centerline':
      if (!view.showCenterlines) return;
      ctx.strokeStyle = darkMode ? '#4a90e2' : '#0066cc';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([10, 3, 2, 3]);
      break;
    case 'section':
      ctx.strokeStyle = darkMode ? '#ff6b6b' : '#e03131';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([]);
      break;
    default:
      ctx.strokeStyle = darkMode ? '#fff' : '#000';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
  }

  // Draw the line
  ctx.moveTo(edge.points[0].x, edge.points[0].y);
  for (let i = 1; i < edge.points.length; i++) {
    ctx.lineTo(edge.points[i].x, edge.points[i].y);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDimension(
  ctx: CanvasRenderingContext2D,
  dim: any,
  darkMode: boolean
) {
  ctx.strokeStyle = darkMode ? '#4a90e2' : '#0066cc';
  ctx.fillStyle = darkMode ? '#4a90e2' : '#0066cc';
  ctx.lineWidth = 0.3;

  // Draw dimension line
  ctx.beginPath();
  ctx.moveTo(dim.startPoint.x, dim.startPoint.y);
  ctx.lineTo(dim.dimensionPoint.x, dim.dimensionPoint.y);
  ctx.lineTo(dim.endPoint.x, dim.endPoint.y);
  ctx.stroke();

  // Draw arrows
  const arrowSize = 2;
  drawArrow(ctx, dim.startPoint, dim.dimensionPoint, arrowSize);
  drawArrow(ctx, dim.endPoint, dim.dimensionPoint, arrowSize);

  // Draw dimension text
  const text = dim.text || dim.value.toFixed(2);
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, dim.dimensionPoint.x, dim.dimensionPoint.y - 2);
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: any,
  darkMode: boolean
) {
  ctx.fillStyle = darkMode ? '#fff' : '#000';
  ctx.strokeStyle = darkMode ? '#fff' : '#000';

  if (annotation.type === 'text' || annotation.type === 'note') {
    ctx.font = `${annotation.fontSize || 10}px Arial`;
    ctx.fillText(annotation.text || '', annotation.position.x, annotation.position.y);
  } else if (annotation.type === 'leader' && annotation.leaderPoints) {
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(annotation.leaderPoints[0].x, annotation.leaderPoints[0].y);
    for (let i = 1; i < annotation.leaderPoints.length; i++) {
      ctx.lineTo(annotation.leaderPoints[i].x, annotation.leaderPoints[i].y);
    }
    ctx.stroke();

    // Draw text at end
    const lastPoint = annotation.leaderPoints[annotation.leaderPoints.length - 1];
    ctx.font = `${annotation.fontSize || 10}px Arial`;
    ctx.fillText(annotation.text || '', lastPoint.x + 5, lastPoint.y);
  } else if (annotation.type === 'balloon') {
    // Draw circle with text
    ctx.beginPath();
    ctx.arc(annotation.position.x, annotation.position.y, 8, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(annotation.text || '', annotation.position.x, annotation.position.y);
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(
    from.x - size * Math.cos(angle - Math.PI / 6),
    from.y - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(
    from.x - size * Math.cos(angle + Math.PI / 6),
    from.y - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function getViewBounds(view: DrawingView): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (view.edges.length === 0) {
    return {
      minX: view.position.x - 50,
      minY: view.position.y - 50,
      maxX: view.position.x + 50,
      maxY: view.position.y + 50,
    };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const edge of view.edges) {
    for (const point of edge.points) {
      const x = view.position.x + point.x * view.scale;
      const y = view.position.y + point.y * view.scale;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
}

function getViewBoundsLocal(view: DrawingView): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (view.edges.length === 0) {
    return { minX: -50, minY: -50, maxX: 50, maxY: 50 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const edge of view.edges) {
    for (const point of edge.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return { minX, minY, maxX, maxY };
}

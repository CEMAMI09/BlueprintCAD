/**
 * Dimension System Integration Guide for Blueprint CAD
 * 
 * This file demonstrates how to integrate the dimension annotation system
 * with the constraint solver and feature tree.
 */

import { useRef, useState, useEffect } from 'react';
import { ConstraintSolver } from '@/backend/lib/cad/constraint-solver';
import { DimensionManager } from '@/backend/lib/cad/dimension-manager';
import {
  Dimension,
  LinearDimension,
  RadialDimension,
  AngularDimension
} from '@/backend/lib/cad/dimension-annotations';
import { SketchEntity } from '@/backend/lib/cad/geometry-kernel';
import DimensionRenderer from '@/components/cad/DimensionRenderer';
import DimensionEditor, { DimensionEditOptions } from '@/components/cad/DimensionEditor';
import DimensionToolbar, { DimensionToolType } from '@/components/cad/DimensionToolbar';
import * as THREE from 'three';

/**
 * Example integration in CAD Editor component
 */
export function useDimensionSystem(
  solver: ConstraintSolver,
  camera: THREE.OrthographicCamera | null,
  entities: SketchEntity[]
) {
  const dimensionManagerRef = useRef<DimensionManager>(new DimensionManager(solver));
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null);
  const [editingDimensionId, setEditingDimensionId] = useState<string | null>(null);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);
  const [activeDimensionTool, setActiveDimensionTool] = useState<DimensionToolType>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  
  // Sync dimensions with manager
  useEffect(() => {
    const dims = dimensionManagerRef.current.getDimensions();
    setDimensions(dims);
  }, [entities]); // Update when entities change
  
  // Create dimension from tool
  const handleCreateDimension = (entityIds: string[], clickPosition?: THREE.Vector2) => {
    if (!activeDimensionTool || entityIds.length === 0) return;
    
    const manager = dimensionManagerRef.current;
    const selectedEntities = entities.filter(e => entityIds.includes(e.id));
    
    let dimension: Dimension | null = null;
    
    if (activeDimensionTool.startsWith('linear-')) {
      const subtype = activeDimensionTool.split('-')[1] as 'horizontal' | 'vertical' | 'aligned';
      dimension = manager.createLinearDimensionFromEntities(selectedEntities, subtype, true);
    } else if (activeDimensionTool.startsWith('radial-')) {
      const subtype = activeDimensionTool.split('-')[1] as 'radius' | 'diameter';
      if (selectedEntities.length === 1) {
        dimension = manager.createRadialDimensionFromEntity(selectedEntities[0], subtype, true);
      }
    } else if (activeDimensionTool === 'angular') {
      if (selectedEntities.length === 2) {
        dimension = manager.createAngularDimensionFromEntities(selectedEntities, true);
      }
    }
    
    if (dimension) {
      manager.addDimension(dimension);
      setDimensions(manager.getDimensions());
      setActiveDimensionTool(null); // Reset tool after creation
      setSelectedEntityIds([]);
    }
  };
  
  // Edit dimension value
  const handleEditDimension = (dimensionId: string, newValue: number, options?: DimensionEditOptions) => {
    dimensionManagerRef.current.updateDimensionValue(dimensionId, newValue, options);
    
    // Solve constraints after dimension update
    if (dimensionManagerRef.current.getDimension(dimensionId)?.isDriving) {
      solver.solve().then(result => {
        if (result.success) {
          // Update dimension displays from solved geometry
          dimensionManagerRef.current.updateDimensionsFromGeometry();
          setDimensions(dimensionManagerRef.current.getDimensions());
          
          // Notify that entities were modified by solver
          // (parent component should update geometry display)
        }
      });
    } else {
      setDimensions(dimensionManagerRef.current.getDimensions());
    }
    
    setEditingDimensionId(null);
  };
  
  // Delete dimension
  const handleDeleteDimension = (dimensionId: string) => {
    dimensionManagerRef.current.removeDimension(dimensionId);
    setDimensions(dimensionManagerRef.current.getDimensions());
    if (selectedDimensionId === dimensionId) {
      setSelectedDimensionId(null);
    }
  };
  
  // Update dimensions after solver runs
  const updateDimensionsAfterSolve = () => {
    dimensionManagerRef.current.updateDimensionsFromGeometry();
    setDimensions(dimensionManagerRef.current.getDimensions());
  };
  
  // Handle entity selection for dimension creation
  const handleEntityClick = (entityId: string) => {
    if (!activeDimensionTool) return;
    
    const newSelection = [...selectedEntityIds, entityId];
    setSelectedEntityIds(newSelection);
    
    // Check if we have enough entities for the active tool
    const requiredEntities = getRequiredEntityCount(activeDimensionTool);
    if (newSelection.length >= requiredEntities) {
      handleCreateDimension(newSelection);
    }
  };
  
  return {
    dimensions,
    selectedDimensionId,
    setSelectedDimensionId,
    editingDimensionId,
    setEditingDimensionId,
    dimensionsVisible,
    setDimensionsVisible,
    activeDimensionTool,
    setActiveDimensionTool,
    handleEditDimension,
    handleDeleteDimension,
    handleEntityClick,
    updateDimensionsAfterSolve,
    dimensionManager: dimensionManagerRef.current
  };
}

function getRequiredEntityCount(tool: DimensionToolType): number {
  if (!tool) return 0;
  if (tool.startsWith('linear-')) return 2;
  if (tool.startsWith('radial-')) return 1;
  if (tool === 'angular') return 2;
  return 0;
}

/**
 * Example JSX integration in CAD Editor component
 */
export const DimensionSystemExample = `
// In your CAD Editor component:

const solverRef = useRef(new ConstraintSolver());
const cameraRef = useRef<THREE.OrthographicCamera>(null);
const [entities, setEntities] = useState<SketchEntity[]>([]);

const dimensionSystem = useDimensionSystem(
  solverRef.current,
  cameraRef.current,
  entities
);

// After constraint solving
const handleSolve = async () => {
  const result = await solverRef.current.solve();
  if (result.success) {
    // Update entities from solver
    updateEntitiesFromSolver(result.modifiedEntities);
    
    // Update dimensions to reflect new geometry
    dimensionSystem.updateDimensionsAfterSolve();
    
    // Propagate to feature tree
    propagateToFeatureTree(result);
  }
};

// In JSX:
return (
  <>
    {/* Dimension Toolbar */}
    <DimensionToolbar
      darkMode={darkMode}
      activeTool={dimensionSystem.activeDimensionTool}
      onToolSelect={dimensionSystem.setActiveDimensionTool}
      onToggleDimensionDisplay={() => 
        dimensionSystem.setDimensionsVisible(!dimensionSystem.dimensionsVisible)
      }
      dimensionsVisible={dimensionSystem.dimensionsVisible}
      dimensionCount={dimensionSystem.dimensions.length}
    />
    
    {/* Dimension Renderer (overlaid on canvas) */}
    <DimensionRenderer
      dimensions={dimensionSystem.dimensions}
      camera={cameraRef.current}
      darkMode={darkMode}
      visible={dimensionSystem.dimensionsVisible}
      selectedDimensionId={dimensionSystem.selectedDimensionId}
      onDimensionClick={dimensionSystem.setSelectedDimensionId}
      onDimensionDoubleClick={dimensionSystem.setEditingDimensionId}
    />
    
    {/* Dimension Editor Modal */}
    <DimensionEditor
      isOpen={dimensionSystem.editingDimensionId !== null}
      dimension={
        dimensionSystem.editingDimensionId
          ? dimensionSystem.dimensions.find(d => d.id === dimensionSystem.editingDimensionId) ?? null
          : null
      }
      darkMode={darkMode}
      onClose={() => dimensionSystem.setEditingDimensionId(null)}
      onSave={dimensionSystem.handleEditDimension}
    />
  </>
);
`;

/**
 * Feature Tree Integration
 * 
 * Dimensions should propagate through the feature tree:
 */
export function propagateDimensionToFeatureTree(
  dimension: Dimension,
  featureTree: any, // Your FeatureTree instance
  user: any,
  currentFile: any
) {
  // Create feature tree entry for dimension
  featureTree.addFeature(
    {
      id: dimension.id,
      type: 'dimension' as any,
      name: `${dimension.type}-${dimension.isDriving ? 'driving' : 'reference'}-${Date.now()}`,
      parameters: {
        dimensionType: dimension.type,
        value: dimension.value,
        nominalValue: dimension.nominalValue,
        isDriving: dimension.isDriving,
        entityIds: dimension.entityIds,
        constraintId: dimension.constraintId,
        precision: dimension.precision,
        units: dimension.units,
        label: dimension.label
      },
      suppressed: false
    },
    dimension.entityIds, // Parent dependencies
    {
      author: user?.username || 'system',
      branchId: currentFile?.branchId || 'main',
      description: `${dimension.isDriving ? 'Driving' : 'Reference'} ${dimension.type} dimension`
    }
  );
}

/**
 * Version Control Integration
 * 
 * Export/import dimension state for persistence:
 */
export function exportDimensionStateForVersionControl(dimensionManager: DimensionManager) {
  return {
    dimensions: dimensionManager.exportState(),
    timestamp: Date.now(),
    version: 1
  };
}

export function importDimensionStateFromVersionControl(
  dimensionManager: DimensionManager,
  state: any
) {
  if (state.dimensions) {
    dimensionManager.importState(state.dimensions);
  }
}

/**
 * Keyboard Shortcuts for Dimension Tools
 */
export function useDimensionKeyboardShortcuts(
  activeTool: DimensionToolType,
  setActiveTool: (tool: DimensionToolType) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toUpperCase()) {
        case 'H':
          setActiveTool(activeTool === 'linear-horizontal' ? null : 'linear-horizontal');
          break;
        case 'V':
          setActiveTool(activeTool === 'linear-vertical' ? null : 'linear-vertical');
          break;
        case 'A':
          setActiveTool(activeTool === 'linear-aligned' ? null : 'linear-aligned');
          break;
        case 'R':
          setActiveTool(activeTool === 'radial-radius' ? null : 'radial-radius');
          break;
        case 'D':
          setActiveTool(activeTool === 'radial-diameter' ? null : 'radial-diameter');
          break;
        case 'G':
          setActiveTool(activeTool === 'angular' ? null : 'angular');
          break;
        case 'ESCAPE':
          setActiveTool(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, setActiveTool]);
}

/**
 * Example: Complete CAD Editor with Dimensions
 */
export const CompleteIntegrationExample = `
'use client';

import { useRef, useState } from 'react';
import { ConstraintSolver } from '@/backend/lib/cad/constraint-solver';
import { DimensionManager } from '@/backend/lib/cad/dimension-manager';
import { useDimensionSystem, useDimensionKeyboardShortcuts } from '@/backend/lib/cad/dimension-integration';
import DimensionRenderer from '@/components/cad/DimensionRenderer';
import DimensionEditor from '@/components/cad/DimensionEditor';
import DimensionToolbar from '@/components/cad/DimensionToolbar';
import ConstraintToolbar from '@/components/cad/ConstraintToolbar';
import SketchCanvas from '@/components/cad/SketchCanvas';

export default function CADEditor() {
  const solverRef = useRef(new ConstraintSolver());
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const [entities, setEntities] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  
  // Initialize dimension system
  const dimensionSystem = useDimensionSystem(
    solverRef.current,
    cameraRef.current,
    entities
  );
  
  // Keyboard shortcuts
  useDimensionKeyboardShortcuts(
    dimensionSystem.activeDimensionTool,
    dimensionSystem.setActiveDimensionTool
  );
  
  // Solve constraints and update dimensions
  const handleSolve = async () => {
    const result = await solverRef.current.solve();
    if (result.success) {
      // Update entities from solver
      setEntities(getUpdatedEntities(result.modifiedEntities));
      
      // Update dimensions
      dimensionSystem.updateDimensionsAfterSolve();
    }
  };
  
  return (
    <div className="relative w-full h-screen">
      {/* Sketch Canvas */}
      <SketchCanvas
        camera={cameraRef}
        entities={entities}
        onEntityClick={dimensionSystem.handleEntityClick}
        activeTool={dimensionSystem.activeDimensionTool}
      />
      
      {/* Dimension Renderer */}
      <DimensionRenderer
        dimensions={dimensionSystem.dimensions}
        camera={cameraRef.current}
        darkMode={darkMode}
        visible={dimensionSystem.dimensionsVisible}
        selectedDimensionId={dimensionSystem.selectedDimensionId}
        onDimensionClick={dimensionSystem.setSelectedDimensionId}
        onDimensionDoubleClick={dimensionSystem.setEditingDimensionId}
      />
      
      {/* Dimension Toolbar */}
      <DimensionToolbar
        darkMode={darkMode}
        activeTool={dimensionSystem.activeDimensionTool}
        onToolSelect={dimensionSystem.setActiveDimensionTool}
        onToggleDimensionDisplay={() => 
          dimensionSystem.setDimensionsVisible(!dimensionSystem.dimensionsVisible)
        }
        dimensionsVisible={dimensionSystem.dimensionsVisible}
        dimensionCount={dimensionSystem.dimensions.length}
      />
      
      {/* Constraint Toolbar */}
      <ConstraintToolbar
        darkMode={darkMode}
        onSolve={handleSolve}
        // ... other constraint props
      />
      
      {/* Dimension Editor Modal */}
      <DimensionEditor
        isOpen={dimensionSystem.editingDimensionId !== null}
        dimension={
          dimensionSystem.editingDimensionId
            ? dimensionSystem.dimensions.find(d => d.id === dimensionSystem.editingDimensionId) ?? null
            : null
        }
        darkMode={darkMode}
        onClose={() => dimensionSystem.setEditingDimensionId(null)}
        onSave={dimensionSystem.handleEditDimension}
      />
    </div>
  );
}
`;

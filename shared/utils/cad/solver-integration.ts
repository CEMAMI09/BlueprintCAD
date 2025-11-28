import { OptimizedNewtonRaphsonSolver, OptimizedSolverResult } from './optimized-solver';
import { Constraint } from './constraint-solver';
import { SketchEntity } from './geometry-kernel';
import { DimensionManager } from './dimension-manager';
import { Dimension } from './dimension-annotations';

/**
 * Solver Integration with Feature Tree and Version Control
 * 
 * Manages the connection between:
 * - Optimized Newton-Raphson solver
 * - Dimension annotations
 * - Feature tree DAG
 * - Version control system
 * 
 * Automatically propagates changes through the feature tree and
 * maintains version history for parametric updates.
 */

export interface FeatureUpdateEvent {
  featureId: string;
  type: 'geometry' | 'constraint' | 'dimension';
  timestamp: number;
  modifiedEntities: string[];
  version: number;
}

export interface SolverIntegrationOptions {
  enableFeatureUpdates?: boolean;
  enableVersionControl?: boolean;
  enableAutomaticSolve?: boolean;
  solveDelay?: number; // Debounce delay in ms
  maxSolveTime?: number; // Max time budget per solve
}

export class SolverIntegration {
  private solver: OptimizedNewtonRaphsonSolver;
  private dimensionManager: DimensionManager | null = null;
  private featureTree: any | null = null; // FeatureTree instance
  private updateQueue: Set<string> = new Set();
  private solveTimeout: NodeJS.Timeout | null = null;
  private versionHistory: FeatureUpdateEvent[] = [];
  private currentVersion: number = 1;
  
  private options: Required<SolverIntegrationOptions>;
  
  // Performance tracking
  private solveCount: number = 0;
  private totalSolveTime: number = 0;
  private lastSolveTime: number = 0;
  
  // Callbacks
  private onSolveComplete?: (result: OptimizedSolverResult) => void;
  private onFeatureUpdate?: (event: FeatureUpdateEvent) => void;
  private onVersionCreate?: (version: number) => void;
  
  constructor(options: SolverIntegrationOptions = {}) {
    this.solver = new OptimizedNewtonRaphsonSolver({
      maxIterations: 50,
      tolerance: 1e-6,
      adaptiveDamping: true,
      useParallel: false,
      cacheJacobian: true,
      incrementalUpdate: true
    });
    
    this.options = {
      enableFeatureUpdates: options.enableFeatureUpdates ?? true,
      enableVersionControl: options.enableVersionControl ?? true,
      enableAutomaticSolve: options.enableAutomaticSolve ?? true,
      solveDelay: options.solveDelay ?? 100,
      maxSolveTime: options.maxSolveTime ?? 100
    };
  }
  
  /**
   * Set feature tree reference
   */
  setFeatureTree(featureTree: any): void {
    this.featureTree = featureTree;
  }
  
  /**
   * Set dimension manager reference
   */
  setDimensionManager(dimensionManager: DimensionManager): void {
    this.dimensionManager = dimensionManager;
  }
  
  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onSolveComplete?: (result: OptimizedSolverResult) => void;
    onFeatureUpdate?: (event: FeatureUpdateEvent) => void;
    onVersionCreate?: (version: number) => void;
  }): void {
    this.onSolveComplete = callbacks.onSolveComplete;
    this.onFeatureUpdate = callbacks.onFeatureUpdate;
    this.onVersionCreate = callbacks.onVersionCreate;
  }
  
  /**
   * Add entity to solver
   */
  addEntity(entity: SketchEntity): void {
    this.solver.addEntity(entity);
    this.queueUpdate(entity.id);
  }
  
  /**
   * Remove entity from solver
   */
  removeEntity(entityId: string): void {
    this.solver.removeEntity(entityId);
    this.queueUpdate(entityId);
  }
  
  /**
   * Add constraint to solver
   */
  addConstraint(constraint: Constraint): void {
    this.solver.addConstraint(constraint);
    this.queueUpdate(`constraint-${constraint.id}`);
  }
  
  /**
   * Remove constraint from solver
   */
  removeConstraint(constraintId: string): void {
    this.solver.removeConstraint(constraintId);
    this.queueUpdate(`constraint-${constraintId}`);
  }
  
  /**
   * Update constraint value and trigger solve
   */
  async updateConstraint(constraintId: string, value: number): Promise<void> {
    this.solver.updateConstraint(constraintId, value);
    this.queueUpdate(`constraint-${constraintId}`);
    
    if (this.options.enableAutomaticSolve) {
      await this.scheduleSolve();
    }
  }
  
  /**
   * Update dimension value (creates/updates constraint)
   */
  async updateDimension(
    dimensionId: string,
    value: number,
    options?: any
  ): Promise<void> {
    if (!this.dimensionManager) return;
    
    this.dimensionManager.updateDimensionValue(dimensionId, value, options);
    this.queueUpdate(`dimension-${dimensionId}`);
    
    if (this.options.enableAutomaticSolve) {
      await this.scheduleSolve();
    }
  }
  
  /**
   * Queue an update (debounced solving)
   */
  private queueUpdate(id: string): void {
    this.updateQueue.add(id);
    
    if (this.options.enableAutomaticSolve) {
      this.scheduleSolve();
    }
  }
  
  /**
   * Schedule a solve operation (debounced)
   */
  private async scheduleSolve(): Promise<void> {
    if (this.solveTimeout) {
      clearTimeout(this.solveTimeout);
    }
    
    this.solveTimeout = setTimeout(async () => {
      await this.solve();
    }, this.options.solveDelay);
  }
  
  /**
   * Main solve method with feature tree integration
   */
  async solve(): Promise<OptimizedSolverResult> {
    const startTime = performance.now();
    
    // Clear update queue
    const updatedIds = Array.from(this.updateQueue);
    this.updateQueue.clear();
    
    // Run optimized solver
    const result = await this.solver.solve();
    
    this.solveCount++;
    this.totalSolveTime += result.solveTime;
    this.lastSolveTime = result.solveTime;
    
    // Get modified entities
    const modifiedEntities = this.solver.getModifiedEntities();
    const modifiedEntityIds = modifiedEntities.map(e => e.id);
    
    // Update dimensions from geometry
    if (this.dimensionManager) {
      this.dimensionManager.updateDimensionsFromGeometry();
    }
    
    // Propagate to feature tree
    if (this.options.enableFeatureUpdates && this.featureTree && result.success) {
      await this.propagateToFeatureTree(modifiedEntities);
    }
    
    // Create version snapshot
    if (this.options.enableVersionControl && result.success) {
      await this.createVersionSnapshot(modifiedEntityIds);
    }
    
    // Fire callbacks
    if (this.onSolveComplete) {
      this.onSolveComplete(result);
    }
    
    // Check performance
    if (result.solveTime > this.options.maxSolveTime) {
      console.warn(
        `Solve time ${result.solveTime.toFixed(1)}ms exceeded budget ${this.options.maxSolveTime}ms`
      );
    }
    
    return result;
  }
  
  /**
   * Propagate geometry changes through feature tree
   */
  private async propagateToFeatureTree(modifiedEntities: SketchEntity[]): Promise<void> {
    if (!this.featureTree) return;
    
    const timestamp = Date.now();
    
    for (const entity of modifiedEntities) {
      // Find downstream features that depend on this entity
      const downstreamFeatures = this.featureTree.getDownstreamFeatures(entity.id);
      
      if (downstreamFeatures && downstreamFeatures.length > 0) {
        // Update each downstream feature
        for (const featureId of downstreamFeatures) {
          const feature = this.featureTree.getFeature(featureId);
          if (!feature) continue;
          
          // Mark feature as needing update
          await this.updateFeature(featureId, entity);
          
          // Fire update event
          const event: FeatureUpdateEvent = {
            featureId,
            type: 'geometry',
            timestamp,
            modifiedEntities: [entity.id],
            version: this.currentVersion
          };
          
          this.versionHistory.push(event);
          
          if (this.onFeatureUpdate) {
            this.onFeatureUpdate(event);
          }
        }
      }
    }
  }
  
  /**
   * Update a feature in the feature tree
   */
  private async updateFeature(featureId: string, sourceEntity: SketchEntity): Promise<void> {
    if (!this.featureTree) return;
    
    const feature = this.featureTree.getFeature(featureId);
    if (!feature) return;
    
    // Update feature parameters based on source entity
    switch (feature.type) {
      case 'extrude':
        // Extrude feature depends on sketch profile
        // Update extrusion if sketch changed
        if (feature.parameters.profileId === sourceEntity.id) {
          feature.parameters.updatedAt = Date.now();
          feature.parameters.version++;
        }
        break;
        
      case 'revolve':
        // Revolve feature depends on sketch profile and axis
        if (feature.parameters.profileId === sourceEntity.id ||
            feature.parameters.axisId === sourceEntity.id) {
          feature.parameters.updatedAt = Date.now();
          feature.parameters.version++;
        }
        break;
        
      case 'fillet':
      case 'chamfer':
        // Fillet/chamfer depends on edges
        if (feature.parameters.edgeIds?.includes(sourceEntity.id)) {
          feature.parameters.updatedAt = Date.now();
          feature.parameters.version++;
        }
        break;
        
      case 'pattern':
        // Pattern depends on seed feature
        if (feature.parameters.seedFeatureId === sourceEntity.id) {
          feature.parameters.updatedAt = Date.now();
          feature.parameters.version++;
          // Regenerate pattern instances
        }
        break;
        
      default:
        // Generic update
        feature.parameters.updatedAt = Date.now();
        feature.parameters.version++;
    }
    
    // Mark feature tree as modified
    this.featureTree.markModified(featureId);
  }
  
  /**
   * Create version snapshot for version control
   */
  private async createVersionSnapshot(modifiedEntityIds: string[]): Promise<void> {
    this.currentVersion++;
    
    const snapshot = {
      version: this.currentVersion,
      timestamp: Date.now(),
      modifiedEntities: modifiedEntityIds,
      solverStats: this.solver.getStatistics(),
      dimensions: this.dimensionManager?.exportState() ?? null
    };
    
    // Store snapshot (would be saved to database in production)
    if (this.onVersionCreate) {
      this.onVersionCreate(this.currentVersion);
    }
    
    // Trim history if too large (keep last 100 events)
    if (this.versionHistory.length > 100) {
      this.versionHistory = this.versionHistory.slice(-100);
    }
  }
  
  /**
   * Get solver statistics
   */
  getStatistics(): {
    solverStats: ReturnType<OptimizedNewtonRaphsonSolver['getStatistics']>;
    solveCount: number;
    averageSolveTime: number;
    lastSolveTime: number;
    currentVersion: number;
    pendingUpdates: number;
  } {
    return {
      solverStats: this.solver.getStatistics(),
      solveCount: this.solveCount,
      averageSolveTime: this.solveCount > 0 ? this.totalSolveTime / this.solveCount : 0,
      lastSolveTime: this.lastSolveTime,
      currentVersion: this.currentVersion,
      pendingUpdates: this.updateQueue.size
    };
  }
  
  /**
   * Get version history
   */
  getVersionHistory(): FeatureUpdateEvent[] {
    return [...this.versionHistory];
  }
  
  /**
   * Export state for persistence
   */
  exportState(): {
    currentVersion: number;
    solverStats: any;
    versionHistory: FeatureUpdateEvent[];
  } {
    return {
      currentVersion: this.currentVersion,
      solverStats: this.solver.getStatistics(),
      versionHistory: this.versionHistory
    };
  }
  
  /**
   * Import state from persistence
   */
  importState(state: any): void {
    if (state.currentVersion) {
      this.currentVersion = state.currentVersion;
    }
    if (state.versionHistory) {
      this.versionHistory = state.versionHistory;
    }
  }
  
  /**
   * Force immediate solve (bypass debouncing)
   */
  async forcesolve(): Promise<OptimizedSolverResult> {
    if (this.solveTimeout) {
      clearTimeout(this.solveTimeout);
      this.solveTimeout = null;
    }
    return await this.solve();
  }
  
  /**
   * Clear all pending updates
   */
  clearPendingUpdates(): void {
    this.updateQueue.clear();
    if (this.solveTimeout) {
      clearTimeout(this.solveTimeout);
      this.solveTimeout = null;
    }
  }
  
  /**
   * Get modified entities since last solve
   */
  getModifiedEntities(): SketchEntity[] {
    return this.solver.getModifiedEntities();
  }
  
  /**
   * Benchmark solver performance
   */
  async benchmark(entityCount: number): Promise<{
    entityCount: number;
    constraintCount: number;
    solveTime: number;
    success: boolean;
    iterations: number;
  }> {
    // Create test entities (lines in a grid pattern)
    const gridSize = Math.ceil(Math.sqrt(entityCount));
    const spacing = 10;
    
    const testEntities: SketchEntity[] = [];
    const testConstraints: Constraint[] = [];
    
    // Create grid of lines
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (testEntities.length >= entityCount) break;
        
        const x = i * spacing;
        const y = j * spacing;
        
        const entity: SketchEntity = {
          id: `test-line-${i}-${j}`,
          type: 'line',
          points: [
            { x, y, z: 0 },
            { x: x + spacing * 0.8, y, z: 0 }
          ]
        };
        
        testEntities.push(entity);
        this.solver.addEntity(entity);
        
        // Add constraints to connect grid
        if (i > 0) {
          // Connect to left line (coincident)
          const leftEntity = testEntities[testEntities.length - gridSize - 1];
          if (leftEntity) {
            const constraint: Constraint = {
              id: `test-coincident-h-${i}-${j}`,
              type: 'coincident',
              entityIds: [entity.id, leftEntity.id],
              pointIndices: [0, 1],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
            testConstraints.push(constraint);
            this.solver.addConstraint(constraint);
          }
        }
        
        if (j > 0) {
          // Connect to top line (coincident)
          const topEntity = testEntities[testEntities.length - 2];
          if (topEntity) {
            const constraint: Constraint = {
              id: `test-coincident-v-${i}-${j}`,
              type: 'coincident',
              entityIds: [entity.id, topEntity.id],
              pointIndices: [0, 1],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: 1
            };
            testConstraints.push(constraint);
            this.solver.addConstraint(constraint);
          }
        }
      }
    }
    
    // Run solve
    const result = await this.solver.solve();
    
    // Cleanup
    for (const entity of testEntities) {
      this.solver.removeEntity(entity.id);
    }
    for (const constraint of testConstraints) {
      this.solver.removeConstraint(constraint.id);
    }
    
    return {
      entityCount: testEntities.length,
      constraintCount: testConstraints.length,
      solveTime: result.solveTime,
      success: result.success,
      iterations: result.iterations
    };
  }
}

/**
 * React Hook for Solver Integration
 */
export function useSolverIntegration(
  featureTree: any,
  options?: SolverIntegrationOptions
) {
  const integrationRef = React.useRef<SolverIntegration>(
    new SolverIntegration(options)
  );
  const [statistics, setStatistics] = React.useState<any>(null);
  const [solving, setSolving] = React.useState(false);
  
  React.useEffect(() => {
    const integration = integrationRef.current;
    integration.setFeatureTree(featureTree);
    
    integration.setCallbacks({
      onSolveComplete: (result) => {
        setSolving(false);
        setStatistics(integration.getStatistics());
      },
      onFeatureUpdate: (event) => {
        // Feature updated
      },
      onVersionCreate: (version) => {
        // Version created
      }
    });
  }, [featureTree]);
  
  const solve = React.useCallback(async () => {
    setSolving(true);
    return await integrationRef.current.forcesolve();
  }, []);
  
  const addEntity = React.useCallback((entity: SketchEntity) => {
    integrationRef.current.addEntity(entity);
  }, []);
  
  const addConstraint = React.useCallback((constraint: Constraint) => {
    integrationRef.current.addConstraint(constraint);
  }, []);
  
  const updateConstraint = React.useCallback(async (id: string, value: number) => {
    await integrationRef.current.updateConstraint(id, value);
  }, []);
  
  return {
    integration: integrationRef.current,
    solve,
    addEntity,
    addConstraint,
    updateConstraint,
    statistics,
    solving
  };
}

// Import React if needed
import React from 'react';

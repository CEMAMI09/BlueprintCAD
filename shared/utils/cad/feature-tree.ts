/**
 * Parametric Feature Tree - Directed Acyclic Graph (DAG)
 * Manages feature dependencies, regeneration, and history
 */

import { Feature } from './geometry-kernel';
import * as THREE from 'three';

export interface FeatureNode {
  id: string;
  feature: Feature;
  parents: string[]; // Feature IDs this depends on
  children: string[]; // Features that depend on this
  timestamp: number;
  order: number; // Execution order
  suppressed: boolean;
  error: string | null;
  regenerationTime: number;
  metadata: {
    author?: string;
    description?: string;
    tags?: string[];
    version?: string;
    branchId?: string;
  };
}

export interface FeatureTreeState {
  nodes: Map<string, FeatureNode>;
  roots: string[]; // Features with no parents (sketches, primitives)
  executionOrder: string[]; // Topologically sorted feature IDs
  version: number;
  dirty: Set<string>; // Features needing regeneration
}

export interface RegenerationResult {
  success: boolean;
  featuresRegenerated: string[];
  errors: Map<string, string>;
  totalTime: number;
}

export interface DependencyValidation {
  valid: boolean;
  cycles: string[][]; // Detected circular dependencies
  missing: string[]; // Referenced features that don't exist
  warnings: string[];
}

/**
 * Feature Tree Manager - Handles DAG operations
 */
export class FeatureTree {
  private state: FeatureTreeState;
  private onChangeCallbacks: ((state: FeatureTreeState) => void)[] = [];
  private undoStack: FeatureTreeState[] = [];
  private redoStack: FeatureTreeState[] = [];
  private maxUndoSteps = 50;

  constructor() {
    this.state = {
      nodes: new Map(),
      roots: [],
      executionOrder: [],
      version: 0,
      dirty: new Set()
    };
  }

  /**
   * Add a new feature to the tree
   */
  addFeature(
    feature: Feature,
    parentIds: string[] = [],
    metadata: Partial<FeatureNode['metadata']> = {}
  ): FeatureNode {
    this.saveState();

    const node: FeatureNode = {
      id: feature.id,
      feature,
      parents: parentIds,
      children: [],
      timestamp: Date.now(),
      order: this.state.nodes.size,
      suppressed: false,
      error: null,
      regenerationTime: 0,
      metadata: {
        author: metadata.author,
        description: metadata.description || feature.name,
        tags: metadata.tags || [],
        version: metadata.version || '1.0',
        branchId: metadata.branchId
      }
    };

    // Validate dependencies
    const validation = this.validateDependencies(feature.id, parentIds);
    if (!validation.valid) {
      throw new Error(`Invalid dependencies: ${validation.cycles.join(', ')}`);
    }

    // Add node
    this.state.nodes.set(feature.id, node);

    // Update parent-child relationships
    for (const parentId of parentIds) {
      const parent = this.state.nodes.get(parentId);
      if (parent) {
        parent.children.push(feature.id);
      }
    }

    // Update roots
    if (parentIds.length === 0) {
      this.state.roots.push(feature.id);
    }

    // Mark as dirty
    this.state.dirty.add(feature.id);

    // Recompute execution order
    this.computeExecutionOrder();

    this.state.version++;
    this.notifyChange();

    return node;
  }

  /**
   * Remove a feature from the tree
   */
  removeFeature(featureId: string): boolean {
    this.saveState();

    const node = this.state.nodes.get(featureId);
    if (!node) return false;

    // Check if any children depend on this
    if (node.children.length > 0) {
      throw new Error(
        `Cannot delete feature ${featureId}: ${node.children.length} features depend on it`
      );
    }

    // Remove from parents' children lists
    for (const parentId of node.parents) {
      const parent = this.state.nodes.get(parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== featureId);
      }
    }

    // Remove from roots if applicable
    this.state.roots = this.state.roots.filter(id => id !== featureId);

    // Remove node
    this.state.nodes.delete(featureId);
    this.state.dirty.delete(featureId);

    // Recompute execution order
    this.computeExecutionOrder();

    this.state.version++;
    this.notifyChange();

    return true;
  }

  /**
   * Update feature dependencies
   */
  updateDependencies(featureId: string, newParentIds: string[]): void {
    this.saveState();

    const node = this.state.nodes.get(featureId);
    if (!node) throw new Error(`Feature ${featureId} not found`);

    // Validate new dependencies
    const validation = this.validateDependencies(featureId, newParentIds);
    if (!validation.valid) {
      throw new Error(`Invalid dependencies: ${validation.cycles.join(', ')}`);
    }

    // Remove from old parents
    for (const oldParentId of node.parents) {
      const parent = this.state.nodes.get(oldParentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== featureId);
      }
    }

    // Add to new parents
    for (const newParentId of newParentIds) {
      const parent = this.state.nodes.get(newParentId);
      if (parent) {
        if (!parent.children.includes(featureId)) {
          parent.children.push(featureId);
        }
      }
    }

    // Update node
    node.parents = newParentIds;

    // Update roots
    if (newParentIds.length === 0 && !this.state.roots.includes(featureId)) {
      this.state.roots.push(featureId);
    } else if (newParentIds.length > 0) {
      this.state.roots = this.state.roots.filter(id => id !== featureId);
    }

    // Mark feature and descendants as dirty
    this.markDirty(featureId);

    // Recompute execution order
    this.computeExecutionOrder();

    this.state.version++;
    this.notifyChange();
  }

  /**
   * Suppress/unsuppress a feature
   */
  toggleSuppress(featureId: string): void {
    this.saveState();

    const node = this.state.nodes.get(featureId);
    if (!node) return;

    node.suppressed = !node.suppressed;
    node.feature.suppressed = node.suppressed;

    // Mark descendants as dirty
    this.markDescendantsDirty(featureId);

    this.state.version++;
    this.notifyChange();
  }

  /**
   * Reorder features (manual ordering)
   */
  reorderFeature(featureId: string, newOrder: number): void {
    this.saveState();

    const node = this.state.nodes.get(featureId);
    if (!node) return;

    // Validate that new order respects dependencies
    const ancestors = this.getAncestors(featureId);
    const descendants = this.getDescendants(featureId);

    for (const [id, otherNode] of this.state.nodes) {
      if (id === featureId) continue;

      // Ancestors must come before
      if (ancestors.includes(id) && otherNode.order >= newOrder) {
        throw new Error(`Cannot reorder: parent feature ${id} must come before`);
      }

      // Descendants must come after
      if (descendants.includes(id) && otherNode.order <= newOrder) {
        throw new Error(`Cannot reorder: child feature ${id} must come after`);
      }
    }

    const oldOrder = node.order;

    // Shift other features
    for (const [id, otherNode] of this.state.nodes) {
      if (id === featureId) continue;

      if (newOrder < oldOrder) {
        // Moving up
        if (otherNode.order >= newOrder && otherNode.order < oldOrder) {
          otherNode.order++;
        }
      } else {
        // Moving down
        if (otherNode.order > oldOrder && otherNode.order <= newOrder) {
          otherNode.order--;
        }
      }
    }

    node.order = newOrder;

    // Recompute execution order
    this.computeExecutionOrder();

    this.state.version++;
    this.notifyChange();
  }

  /**
   * Regenerate features (rebuild geometry)
   */
  async regenerate(
    featureIds?: string[],
    geometryKernel?: any
  ): Promise<RegenerationResult> {
    const startTime = performance.now();
    const result: RegenerationResult = {
      success: true,
      featuresRegenerated: [],
      errors: new Map(),
      totalTime: 0
    };

    // If no specific features, regenerate all dirty features
    const toRegenerate = featureIds || Array.from(this.state.dirty);

    // Sort by execution order
    const sortedIds = toRegenerate.sort((a, b) => {
      const nodeA = this.state.nodes.get(a);
      const nodeB = this.state.nodes.get(b);
      return (nodeA?.order || 0) - (nodeB?.order || 0);
    });

    for (const featureId of sortedIds) {
      const node = this.state.nodes.get(featureId);
      if (!node || node.suppressed) continue;

      try {
        const featureStart = performance.now();

        // Check if parents are up to date
        const parentsValid = node.parents.every(parentId => {
          const parent = this.state.nodes.get(parentId);
          return parent && !parent.error && !this.state.dirty.has(parentId);
        });

        if (!parentsValid) {
          throw new Error('Parent features not up to date');
        }

        // Regenerate feature using geometry kernel
        if (geometryKernel) {
          await this.regenerateFeature(node, geometryKernel);
        }

        const featureTime = performance.now() - featureStart;
        node.regenerationTime = featureTime;
        node.error = null;

        this.state.dirty.delete(featureId);
        result.featuresRegenerated.push(featureId);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        node.error = errorMsg;
        result.errors.set(featureId, errorMsg);
        result.success = false;
      }
    }

    result.totalTime = performance.now() - startTime;
    this.state.version++;
    this.notifyChange();

    return result;
  }

  /**
   * Regenerate a single feature
   */
  private async regenerateFeature(node: FeatureNode, geometryKernel: any): Promise<void> {
    const feature = node.feature;

    // Depending on feature type, call appropriate kernel method
    switch (feature.type) {
      case 'extrude':
        if (feature.sketch && feature.parameters) {
          const sketch = geometryKernel.sketches.get(feature.sketch);
          if (sketch) {
            const newFeature = await geometryKernel.extrude(sketch, feature.parameters);
            feature.mesh = newFeature.mesh;
            feature.brepSolid = newFeature.brepSolid;
          }
        }
        break;

      case 'revolve':
        if (feature.sketch && feature.parameters) {
          const sketch = geometryKernel.sketches.get(feature.sketch);
          if (sketch) {
            const newFeature = await geometryKernel.revolve(sketch, feature.parameters);
            feature.mesh = newFeature.mesh;
            feature.brepSolid = newFeature.brepSolid;
          }
        }
        break;

      case 'boolean':
        if (feature.parameters) {
          const { operation, feature1, feature2 } = feature.parameters;
          const newFeature = await geometryKernel.booleanOperation(
            operation,
            feature1,
            feature2
          );
          feature.mesh = newFeature.mesh;
          feature.brepSolid = newFeature.brepSolid;
        }
        break;

      case 'fillet':
        if (feature.parameters) {
          const { baseFeature, edgeIndices, radius, variableRadii } = feature.parameters;
          const radiiMap = variableRadii ? new Map(variableRadii) : undefined;
          const newFeature = await geometryKernel.filletEdges(
            baseFeature,
            edgeIndices,
            radius,
            radiiMap
          );
          feature.mesh = newFeature.mesh;
          feature.brepSolid = newFeature.brepSolid;
        }
        break;

      case 'chamfer':
        if (feature.parameters) {
          const { baseFeature, edgeIndices, distance1, distance2, angle } = feature.parameters;
          const newFeature = await geometryKernel.chamferEdges(
            baseFeature,
            edgeIndices,
            distance1,
            distance2,
            angle
          );
          feature.mesh = newFeature.mesh;
          feature.brepSolid = newFeature.brepSolid;
        }
        break;

      default:
        console.warn(`Unknown feature type: ${feature.type}`);
    }
  }

  /**
   * Validate dependencies (detect cycles)
   */
  validateDependencies(
    featureId: string,
    parentIds: string[]
  ): DependencyValidation {
    const result: DependencyValidation = {
      valid: true,
      cycles: [],
      missing: [],
      warnings: []
    };

    // Check for missing parents
    for (const parentId of parentIds) {
      if (!this.state.nodes.has(parentId)) {
        result.missing.push(parentId);
        result.valid = false;
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.state.nodes.get(nodeId);
      if (node) {
        for (const parentId of node.parents) {
          if (!visited.has(parentId)) {
            if (hasCycle(parentId)) {
              return true;
            }
          } else if (recursionStack.has(parentId)) {
            result.cycles.push([nodeId, parentId]);
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Temporarily add new dependencies for cycle detection
    const tempNode: Partial<FeatureNode> = {
      id: featureId,
      parents: parentIds
    };

    const savedNode = this.state.nodes.get(featureId);
    this.state.nodes.set(featureId, tempNode as FeatureNode);

    if (hasCycle(featureId)) {
      result.valid = false;
    }

    // Restore original node
    if (savedNode) {
      this.state.nodes.set(featureId, savedNode);
    } else {
      this.state.nodes.delete(featureId);
    }

    return result;
  }

  /**
   * Compute topological execution order
   */
  private computeExecutionOrder(): void {
    const order: string[] = [];
    const visited = new Set<string>();
    const tempMark = new Set<string>();

    const visit = (nodeId: string): void => {
      if (tempMark.has(nodeId)) {
        throw new Error(`Circular dependency detected at ${nodeId}`);
      }
      if (visited.has(nodeId)) return;

      tempMark.add(nodeId);

      const node = this.state.nodes.get(nodeId);
      if (node) {
        // Visit parents first
        for (const parentId of node.parents) {
          visit(parentId);
        }
      }

      tempMark.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    // Start with roots
    for (const rootId of this.state.roots) {
      visit(rootId);
    }

    // Visit any remaining nodes
    for (const [nodeId] of this.state.nodes) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    this.state.executionOrder = order;

    // Update order property
    order.forEach((id, index) => {
      const node = this.state.nodes.get(id);
      if (node) node.order = index;
    });
  }

  /**
   * Mark feature and descendants as dirty
   */
  private markDirty(featureId: string): void {
    this.state.dirty.add(featureId);
    this.markDescendantsDirty(featureId);
  }

  /**
   * Mark all descendants as dirty
   */
  private markDescendantsDirty(featureId: string): void {
    const descendants = this.getDescendants(featureId);
    descendants.forEach(id => this.state.dirty.add(id));
  }

  /**
   * Get all ancestors of a feature
   */
  getAncestors(featureId: string): string[] {
    const ancestors = new Set<string>();
    const visited = new Set<string>();

    const traverse = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.state.nodes.get(id);
      if (node) {
        for (const parentId of node.parents) {
          ancestors.add(parentId);
          traverse(parentId);
        }
      }
    };

    traverse(featureId);
    return Array.from(ancestors);
  }

  /**
   * Get all descendants of a feature
   */
  getDescendants(featureId: string): string[] {
    const descendants = new Set<string>();
    const visited = new Set<string>();

    const traverse = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.state.nodes.get(id);
      if (node) {
        for (const childId of node.children) {
          descendants.add(childId);
          traverse(childId);
        }
      }
    };

    traverse(featureId);
    return Array.from(descendants);
  }

  /**
   * Get feature tree as hierarchical structure
   */
  getTreeHierarchy(): FeatureNode[] {
    return this.state.executionOrder
      .map(id => this.state.nodes.get(id))
      .filter((node): node is FeatureNode => node !== undefined);
  }

  /**
   * Export tree to JSON for version control
   */
  exportToJSON(): string {
    const exportData = {
      version: this.state.version,
      timestamp: Date.now(),
      nodes: Array.from(this.state.nodes.values()).map(node => ({
        id: node.id,
        featureType: node.feature.type,
        featureName: node.feature.name,
        parents: node.parents,
        children: node.children,
        suppressed: node.suppressed,
        order: node.order,
        parameters: node.feature.parameters,
        metadata: node.metadata
      })),
      executionOrder: this.state.executionOrder
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import tree from JSON
   */
  importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      
      this.state.nodes.clear();
      this.state.roots = [];
      this.state.dirty.clear();
      this.state.version = data.version || 0;

      // Note: This is a simplified import. In production, you'd need to
      // recreate Feature objects with actual geometry
      
      this.state.executionOrder = data.executionOrder || [];
      this.notifyChange();
    } catch (error) {
      console.error('Failed to import feature tree:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): FeatureTreeState {
    return this.state;
  }

  /**
   * Subscribe to changes
   */
  onChange(callback: (state: FeatureTreeState) => void): () => void {
    this.onChangeCallbacks.push(callback);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of state change
   */
  private notifyChange(): void {
    this.onChangeCallbacks.forEach(callback => callback(this.state));
  }

  /**
   * Undo/Redo support
   */
  private saveState(): void {
    // Deep clone state
    const stateCopy: FeatureTreeState = {
      nodes: new Map(this.state.nodes),
      roots: [...this.state.roots],
      executionOrder: [...this.state.executionOrder],
      version: this.state.version,
      dirty: new Set(this.state.dirty)
    };

    this.undoStack.push(stateCopy);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const currentState = this.state;
    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop()!;
    this.state = previousState;
    this.notifyChange();

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const currentState = this.state;
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop()!;
    this.state = nextState;
    this.notifyChange();

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

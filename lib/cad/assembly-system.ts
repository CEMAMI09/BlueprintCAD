import * as THREE from 'three';
import { MateSystem, Mate } from './mate-system';

/**
 * Assembly System - Manage part instances, hierarchies, and transforms
 * Integrates with Blueprint folders and file permissions
 */

export interface PartInstance {
  id: string;
  partFileId: number;
  partName: string;
  transform: THREE.Matrix4;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
  locked: boolean;
  color?: number;
  material?: string;
  parentInstanceId?: string; // For sub-assemblies
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    version?: number;
  };
}

export interface AssemblyConstraint {
  id: string;
  type: 'mate' | 'align' | 'insert' | 'tangent' | 'parallel' | 'perpendicular' | 'concentric' | 'distance' | 'angle';
  instance1Id: string;
  instance2Id: string;
  entity1?: { type: 'face' | 'edge' | 'vertex'; index: number };
  entity2?: { type: 'face' | 'edge' | 'vertex'; index: number };
  offset?: number;
  angle?: number;
  locked: boolean;
  solved: boolean;
  error?: string;
}

export interface AssemblyDocument {
  id: string;
  name: string;
  folderId?: number;
  instances: PartInstance[];
  constraints: AssemblyConstraint[];
  mates?: any[]; // Mate definitions (stored as JSON)
  explodeView?: any; // Exploded view animations and settings (stored as JSON)
  subAssemblies: string[]; // IDs of child assembly documents
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    version: number;
    description?: string;
    tags?: string[];
  };
  permissions: {
    canEdit: boolean;
    canView: boolean;
    canDelete: boolean;
    isOwner: boolean;
  };
}

export interface PartReference {
  fileId: number;
  filename: string;
  filepath: string;
  version: number;
  thumbnail?: string;
  boundingBox?: THREE.Box3;
  mass?: number;
  material?: string;
}

export class AssemblySystem {
  private instances: Map<string, PartInstance> = new Map();
  private constraints: Map<string, AssemblyConstraint> = new Map();
  private partReferences: Map<number, PartReference> = new Map();
  private assemblyDocument: AssemblyDocument | null = null;
  private changeListeners: Set<(event: string, data: any) => void> = new Set();
  public mateSystem: MateSystem = new MateSystem();
  public explodeViewData: any = null; // Exploded view data (will be loaded/saved)

  /**
   * Initialize or load an assembly document
   */
  async loadAssembly(assemblyId: string): Promise<AssemblyDocument> {
    const response = await fetch(`/api/cad/assemblies/${assemblyId}`);
    if (!response.ok) {
      throw new Error('Failed to load assembly');
    }

    const assembly: AssemblyDocument = await response.json();
    this.assemblyDocument = assembly;

    // Load all instances
    this.instances.clear();
    for (const instance of assembly.instances) {
      this.instances.set(instance.id, instance);
    }

    // Load all constraints
    this.constraints.clear();
    for (const constraint of assembly.constraints) {
      this.constraints.set(constraint.id, constraint);
    }

    // Load mates
    this.loadMatesFromDocument();

    // Load exploded view data
    this.loadExplodeViewFromDocument();

    this.notifyChange('assembly-loaded', assembly);
    return assembly;
  }

  /**
   * Create a new assembly document
   */
  async createAssembly(name: string, folderId?: number): Promise<AssemblyDocument> {
    const response = await fetch('/api/cad/assemblies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, folderId })
    });

    if (!response.ok) {
      throw new Error('Failed to create assembly');
    }

    const assembly: AssemblyDocument = await response.json();
    this.assemblyDocument = assembly;
    this.instances.clear();
    this.constraints.clear();

    this.notifyChange('assembly-created', assembly);
    return assembly;
  }

  /**
   * Insert a part instance into the assembly
   */
  async insertPart(
    partFileId: number,
    transform?: THREE.Matrix4,
    parentInstanceId?: string
  ): Promise<PartInstance> {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    // Load part reference if not cached
    if (!this.partReferences.has(partFileId)) {
      await this.loadPartReference(partFileId);
    }

    const partRef = this.partReferences.get(partFileId);
    if (!partRef) {
      throw new Error('Part reference not found');
    }

    // Create instance
    const instanceTransform = transform || new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    instanceTransform.decompose(position, rotation, scale);

    const instance: PartInstance = {
      id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      partFileId,
      partName: partRef.filename,
      transform: instanceTransform,
      position,
      rotation: new THREE.Euler().setFromQuaternion(rotation),
      scale,
      visible: true,
      locked: false,
      parentInstanceId,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };

    this.instances.set(instance.id, instance);
    this.assemblyDocument.instances.push(instance);

    // Save to server
    await this.saveAssembly();

    this.notifyChange('instance-added', instance);
    return instance;
  }

  /**
   * Update part instance transform
   */
  updateInstanceTransform(
    instanceId: string,
    transform: THREE.Matrix4
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    instance.transform = transform;
    
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    transform.decompose(position, rotation, scale);

    instance.position = position;
    instance.rotation = new THREE.Euler().setFromQuaternion(rotation);
    instance.scale = scale;
    instance.metadata.updatedAt = Date.now();

    this.notifyChange('instance-transformed', instance);
  }

  /**
   * Delete a part instance
   */
  async deleteInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    // Remove from instances map
    this.instances.delete(instanceId);

    // Remove from assembly document
    if (this.assemblyDocument) {
      this.assemblyDocument.instances = this.assemblyDocument.instances.filter(
        i => i.id !== instanceId
      );
    }

    // Remove any constraints referencing this instance
    const constraintsToRemove: string[] = [];
    for (const [id, constraint] of this.constraints) {
      if (constraint.instance1Id === instanceId || constraint.instance2Id === instanceId) {
        constraintsToRemove.push(id);
      }
    }

    for (const id of constraintsToRemove) {
      this.constraints.delete(id);
      if (this.assemblyDocument) {
        this.assemblyDocument.constraints = this.assemblyDocument.constraints.filter(
          c => c.id !== id
        );
      }
    }

    await this.saveAssembly();
    this.notifyChange('instance-deleted', { instanceId, constraintsRemoved: constraintsToRemove });
  }

  /**
   * Create a constraint between two instances
   */
  async addConstraint(
    type: AssemblyConstraint['type'],
    instance1Id: string,
    instance2Id: string,
    options?: {
      entity1?: { type: 'face' | 'edge' | 'vertex'; index: number };
      entity2?: { type: 'face' | 'edge' | 'vertex'; index: number };
      offset?: number;
      angle?: number;
    }
  ): Promise<AssemblyConstraint> {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    const instance1 = this.instances.get(instance1Id);
    const instance2 = this.instances.get(instance2Id);

    if (!instance1 || !instance2) {
      throw new Error('Instance(s) not found');
    }

    const constraint: AssemblyConstraint = {
      id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      instance1Id,
      instance2Id,
      entity1: options?.entity1,
      entity2: options?.entity2,
      offset: options?.offset,
      angle: options?.angle,
      locked: false,
      solved: false
    };

    this.constraints.set(constraint.id, constraint);
    this.assemblyDocument.constraints.push(constraint);

    // Attempt to solve constraint
    this.solveConstraint(constraint.id);

    await this.saveAssembly();
    this.notifyChange('constraint-added', constraint);

    return constraint;
  }

  /**
   * Solve a constraint (basic implementation)
   */
  private solveConstraint(constraintId: string): void {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) return;

    const instance1 = this.instances.get(constraint.instance1Id);
    const instance2 = this.instances.get(constraint.instance2Id);

    if (!instance1 || !instance2) {
      constraint.solved = false;
      constraint.error = 'Instance not found';
      return;
    }

    try {
      switch (constraint.type) {
        case 'mate':
          this.solveMateConstraint(constraint, instance1, instance2);
          break;
        case 'align':
          this.solveAlignConstraint(constraint, instance1, instance2);
          break;
        case 'distance':
          this.solveDistanceConstraint(constraint, instance1, instance2);
          break;
        case 'angle':
          this.solveAngleConstraint(constraint, instance1, instance2);
          break;
        default:
          constraint.solved = false;
          constraint.error = 'Constraint type not implemented';
      }
    } catch (error) {
      constraint.solved = false;
      constraint.error = (error as Error).message;
    }
  }

  private solveMateConstraint(
    constraint: AssemblyConstraint,
    instance1: PartInstance,
    instance2: PartInstance
  ): void {
    // Mate: Align faces and make them coincident
    if (!constraint.entity1 || !constraint.entity2) {
      constraint.solved = false;
      constraint.error = 'Mate constraint requires two faces';
      return;
    }

    // Simple mate: move instance2 to align with instance1
    // In a real implementation, this would calculate face normals and positions
    const offset = constraint.offset || 0;
    
    // For now, just apply a simple offset
    instance2.position.copy(instance1.position);
    instance2.position.y += offset;
    
    instance2.transform.setPosition(instance2.position);
    instance2.metadata.updatedAt = Date.now();

    constraint.solved = true;
    this.notifyChange('instance-transformed', instance2);
  }

  private solveAlignConstraint(
    constraint: AssemblyConstraint,
    instance1: PartInstance,
    instance2: PartInstance
  ): void {
    // Align: Make entities parallel but not necessarily coincident
    // Simple implementation: match rotations
    instance2.rotation.copy(instance1.rotation);
    instance2.transform.makeRotationFromEuler(instance2.rotation);
    instance2.transform.setPosition(instance2.position);
    instance2.metadata.updatedAt = Date.now();

    constraint.solved = true;
    this.notifyChange('instance-transformed', instance2);
  }

  private solveDistanceConstraint(
    constraint: AssemblyConstraint,
    instance1: PartInstance,
    instance2: PartInstance
  ): void {
    // Distance: Maintain specific distance between entities
    const distance = constraint.offset || 10;
    const direction = new THREE.Vector3(1, 0, 0); // Default direction

    instance2.position.copy(instance1.position);
    instance2.position.add(direction.multiplyScalar(distance));
    instance2.transform.setPosition(instance2.position);
    instance2.metadata.updatedAt = Date.now();

    constraint.solved = true;
    this.notifyChange('instance-transformed', instance2);
  }

  private solveAngleConstraint(
    constraint: AssemblyConstraint,
    instance1: PartInstance,
    instance2: PartInstance
  ): void {
    // Angle: Maintain specific angle between entities
    const angle = constraint.angle || 0;
    
    instance2.rotation.copy(instance1.rotation);
    instance2.rotation.z += angle * Math.PI / 180;
    instance2.transform.makeRotationFromEuler(instance2.rotation);
    instance2.transform.setPosition(instance2.position);
    instance2.metadata.updatedAt = Date.now();

    constraint.solved = true;
    this.notifyChange('instance-transformed', instance2);
  }

  /**
   * Delete a constraint
   */
  async deleteConstraint(constraintId: string): Promise<void> {
    if (!this.constraints.has(constraintId)) {
      throw new Error('Constraint not found');
    }

    this.constraints.delete(constraintId);

    if (this.assemblyDocument) {
      this.assemblyDocument.constraints = this.assemblyDocument.constraints.filter(
        c => c.id !== constraintId
      );
    }

    await this.saveAssembly();
    this.notifyChange('constraint-deleted', { constraintId });
  }

  /**
   * Create a sub-assembly from selected instances
   */
  async createSubAssembly(
    name: string,
    instanceIds: string[]
  ): Promise<AssemblyDocument> {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    // Create new assembly document
    const subAssembly = await this.createAssembly(
      name,
      this.assemblyDocument.folderId
    );

    // Move instances to sub-assembly
    const instancesToMove = instanceIds.map(id => this.instances.get(id)).filter(Boolean) as PartInstance[];

    for (const instance of instancesToMove) {
      // Add to sub-assembly
      subAssembly.instances.push({ ...instance });
      
      // Remove from current assembly
      this.instances.delete(instance.id);
      if (this.assemblyDocument) {
        this.assemblyDocument.instances = this.assemblyDocument.instances.filter(
          i => i.id !== instance.id
        );
      }
    }

    // Add sub-assembly reference
    this.assemblyDocument.subAssemblies.push(subAssembly.id);

    await this.saveAssembly();
    this.notifyChange('subassembly-created', { subAssembly, instanceIds });

    return subAssembly;
  }

  /**
   * Get assembly tree structure
   */
  getAssemblyTree(): AssemblyTreeNode {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    return this.buildAssemblyTree(this.assemblyDocument);
  }

  private buildAssemblyTree(assembly: AssemblyDocument): AssemblyTreeNode {
    const rootInstances = assembly.instances.filter(i => !i.parentInstanceId);
    
    const children: AssemblyTreeNode[] = rootInstances.map(instance => ({
      id: instance.id,
      name: instance.partName,
      type: 'part',
      instance,
      children: this.getChildInstances(instance.id).map(child => 
        this.buildInstanceNode(child)
      ),
      visible: instance.visible,
      locked: instance.locked
    }));

    return {
      id: assembly.id,
      name: assembly.name,
      type: 'assembly',
      children,
      visible: true,
      locked: false
    };
  }

  private buildInstanceNode(instance: PartInstance): AssemblyTreeNode {
    return {
      id: instance.id,
      name: instance.partName,
      type: 'part',
      instance,
      children: this.getChildInstances(instance.id).map(child => 
        this.buildInstanceNode(child)
      ),
      visible: instance.visible,
      locked: instance.locked
    };
  }

  private getChildInstances(parentId: string): PartInstance[] {
    return Array.from(this.instances.values()).filter(
      i => i.parentInstanceId === parentId
    );
  }

  /**
   * Load part reference from server
   */
  private async loadPartReference(fileId: number): Promise<void> {
    const response = await fetch(`/api/cad/files/${fileId}/reference`);
    if (!response.ok) {
      throw new Error('Failed to load part reference');
    }

    const reference: PartReference = await response.json();
    this.partReferences.set(fileId, reference);
  }

  /**
   * Save assembly to server
   */
  async saveAssembly(): Promise<void> {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    this.assemblyDocument.metadata.updatedAt = Date.now();
    
    // Export mates to document
    this.assemblyDocument.mates = this.exportMatesToDocument();

    // Export exploded view to document
    this.assemblyDocument.explodeView = this.exportExplodeViewToDocument();

    const response = await fetch(`/api/cad/assemblies/${this.assemblyDocument.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.assemblyDocument)
    });

    if (!response.ok) {
      throw new Error('Failed to save assembly');
    }

    this.notifyChange('assembly-saved', this.assemblyDocument);
  }

  /**
   * Check permissions for assembly operations
   */
  canEdit(): boolean {
    return this.assemblyDocument?.permissions.canEdit || false;
  }

  canDelete(): boolean {
    return this.assemblyDocument?.permissions.canDelete || false;
  }

  isOwner(): boolean {
    return this.assemblyDocument?.permissions.isOwner || false;
  }

  /**
   * Get all instances
   */
  getInstances(): PartInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get instance by ID
   */
  getInstance(id: string): PartInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Get all constraints
   */
  getConstraints(): AssemblyConstraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Get constraints for an instance
   */
  getInstanceConstraints(instanceId: string): AssemblyConstraint[] {
    return Array.from(this.constraints.values()).filter(
      c => c.instance1Id === instanceId || c.instance2Id === instanceId
    );
  }

  /**
   * Calculate assembly mass properties
   */
  calculateMassProperties(): {
    totalMass: number;
    centerOfMass: THREE.Vector3;
    boundingBox: THREE.Box3;
  } {
    let totalMass = 0;
    const centerOfMass = new THREE.Vector3();
    const boundingBox = new THREE.Box3();

    for (const instance of this.instances.values()) {
      const partRef = this.partReferences.get(instance.partFileId);
      if (partRef?.mass) {
        totalMass += partRef.mass;
        
        // Weight center of mass by part mass
        const weightedPos = instance.position.clone().multiplyScalar(partRef.mass);
        centerOfMass.add(weightedPos);
      }

      if (partRef?.boundingBox) {
        const transformedBox = partRef.boundingBox.clone();
        transformedBox.applyMatrix4(instance.transform);
        boundingBox.union(transformedBox);
      }
    }

    if (totalMass > 0) {
      centerOfMass.divideScalar(totalMass);
    }

    return { totalMass, centerOfMass, boundingBox };
  }

  /**
   * Register change listener
   */
  onChange(listener: (event: string, data: any) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(event: string, data: any): void {
    for (const listener of this.changeListeners) {
      listener(event, data);
    }
  }

  /**
   * Export assembly to format
   */
  exportAssembly(format: 'step' | 'iges' | 'json'): string {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    if (format === 'json') {
      return JSON.stringify(this.assemblyDocument, null, 2);
    }

    // STEP/IGES export would require additional libraries
    throw new Error(`Export format ${format} not yet implemented`);
  }

  /**
   * Clone an instance
   */
  async cloneInstance(instanceId: string): Promise<PartInstance> {
    const original = this.instances.get(instanceId);
    if (!original) {
      throw new Error('Instance not found');
    }

    const clone = await this.insertPart(
      original.partFileId,
      original.transform.clone(),
      original.parentInstanceId
    );

    clone.color = original.color;
    clone.material = original.material;

    return clone;
  }

  /**
   * Get current assembly document
   */
  getAssembly(): AssemblyDocument | null {
    return this.assemblyDocument;
  }

  /**
   * Get all mates
   */
  getMates(): Mate[] {
    return this.mateSystem.getAllMates();
  }

  /**
   * Add a mate to the assembly
   */
  addMate(mate: Mate): void {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }
    
    this.notifyChange('mate-added', mate);
  }

  /**
   * Remove a mate from the assembly
   */
  removeMate(mateId: string): void {
    if (!this.assemblyDocument) {
      throw new Error('No assembly document loaded');
    }

    this.mateSystem.removeMate(mateId);
    this.notifyChange('mate-removed', { mateId });
  }

  /**
   * Toggle mate suppressed state
   */
  setMateSuppressed(mateId: string, suppressed: boolean): void {
    this.mateSystem.setMateSuppressed(mateId, suppressed);
    this.notifyChange('mate-suppressed', { mateId, suppressed });
  }

  /**
   * Solve all mates and update instance transforms
   */
  solveMates(): void {
    if (!this.assemblyDocument) return;

    // Build instance transform map
    const transforms = new Map<string, THREE.Matrix4>();
    for (const [id, instance] of this.instances) {
      transforms.set(id, instance.transform);
    }

    // Solve mates
    const solutions = this.mateSystem.solveMates(transforms);

    // Apply solutions to instances
    for (const solution of solutions) {
      const instance = this.instances.get(solution.instanceId);
      if (instance && solution.satisfied) {
        this.updateInstanceTransform(solution.instanceId, solution.transform);
      }
    }

    this.notifyChange('mates-solved', solutions);
  }

  /**
   * Load mates from assembly document
   */
  private loadMatesFromDocument(): void {
    if (this.assemblyDocument?.mates) {
      this.mateSystem.fromJSON(this.assemblyDocument.mates);
    }
  }

  /**
   * Export mates to assembly document format
   */
  private exportMatesToDocument(): any[] {
    return this.mateSystem.toJSON();
  }

  /**
   * Load exploded view data from assembly document
   */
  private loadExplodeViewFromDocument(): void {
    if (this.assemblyDocument?.explodeView) {
      this.explodeViewData = this.assemblyDocument.explodeView;
    }
  }

  /**
   * Export exploded view to assembly document format
   */
  private exportExplodeViewToDocument(): any {
    return this.explodeViewData;
  }

  /**
   * Get exploded view data
   */
  getExplodeViewData(): any {
    return this.explodeViewData;
  }

  /**
   * Set exploded view data
   */
  setExplodeViewData(data: any): void {
    this.explodeViewData = data;
    this.notifyChange('explode-view-updated', data);
  }
}

export interface AssemblyTreeNode {
  id: string;
  name: string;
  type: 'assembly' | 'part';
  instance?: PartInstance;
  children: AssemblyTreeNode[];
  visible: boolean;
  locked: boolean;
}

// Singleton instance
let assemblySystemInstance: AssemblySystem | null = null;

export function getAssemblySystem(): AssemblySystem {
  if (!assemblySystemInstance) {
    assemblySystemInstance = new AssemblySystem();
  }
  return assemblySystemInstance;
}

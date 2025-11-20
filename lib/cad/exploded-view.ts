import * as THREE from 'three';

/**
 * Exploded View System
 * Handles automatic and manual part explosion with animation timeline
 */

export interface ExplodeKeyframe {
  time: number; // 0-1 normalized time
  instanceId: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface ExplodeStep {
  id: string;
  name: string;
  duration: number; // seconds
  instanceIds: string[];
  direction?: THREE.Vector3;
  distance?: number;
  keyframes: ExplodeKeyframe[];
  easingFunction: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

export interface ExplodeAnimation {
  id: string;
  name: string;
  totalDuration: number; // seconds
  steps: ExplodeStep[];
  createdAt: number;
  updatedAt: number;
}

export interface ExplodeViewData {
  enabled: boolean;
  explodeFactor: number; // 0-1, 0 = assembled, 1 = fully exploded
  autoExplodeDirection: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical';
  autoExplodeDistance: number; // mm
  manualOffsets: Map<string, THREE.Vector3>; // Instance-specific offsets
  animations: ExplodeAnimation[];
  currentAnimation?: string;
  currentTime: number; // Current playback time in seconds
  isPlaying: boolean;
  loop: boolean;
  playbackSpeed: number; // 1.0 = normal speed
}

export class ExplodedViewSystem {
  private explodeData: ExplodeViewData;
  private originalTransforms: Map<string, THREE.Matrix4> = new Map();
  private explodedTransforms: Map<string, THREE.Matrix4> = new Map();
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private changeListeners: Set<(event: string, data: any) => void> = new Set();

  constructor() {
    this.explodeData = {
      enabled: false,
      explodeFactor: 0,
      autoExplodeDirection: 'xyz',
      autoExplodeDistance: 100,
      manualOffsets: new Map(),
      animations: [],
      currentTime: 0,
      isPlaying: false,
      loop: false,
      playbackSpeed: 1.0
    };
  }

  /**
   * Add a change listener
   */
  addChangeListener(listener: (event: string, data: any) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove a change listener
   */
  removeChangeListener(listener: (event: string, data: any) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(event: string, data: any): void {
    for (const listener of this.changeListeners) {
      listener(event, data);
    }
  }

  /**
   * Store original transforms before exploding
   */
  storeOriginalTransforms(instances: Map<string, { transform: THREE.Matrix4 }>): void {
    this.originalTransforms.clear();
    for (const [id, instance] of instances) {
      this.originalTransforms.set(id, instance.transform.clone());
    }
  }

  /**
   * Calculate automatic exploded positions
   */
  calculateAutoExplode(
    instances: Map<string, { transform: THREE.Matrix4; parentInstanceId?: string }>,
    direction: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical' = 'xyz'
  ): Map<string, THREE.Vector3> {
    const offsets = new Map<string, THREE.Vector3>();
    
    // Calculate assembly center
    const center = new THREE.Vector3();
    let count = 0;
    for (const instance of instances.values()) {
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(instance.transform);
      center.add(pos);
      count++;
    }
    if (count > 0) center.divideScalar(count);

    for (const [id, instance] of instances) {
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(instance.transform);

      let offset = new THREE.Vector3();

      switch (direction) {
        case 'xyz':
          // Explode in all directions from center
          offset = pos.clone().sub(center).normalize().multiplyScalar(this.explodeData.autoExplodeDistance);
          break;

        case 'x':
          offset.x = (pos.x - center.x) > 0 ? this.explodeData.autoExplodeDistance : -this.explodeData.autoExplodeDistance;
          break;

        case 'y':
          offset.y = (pos.y - center.y) > 0 ? this.explodeData.autoExplodeDistance : -this.explodeData.autoExplodeDistance;
          break;

        case 'z':
          offset.z = (pos.z - center.z) > 0 ? this.explodeData.autoExplodeDistance : -this.explodeData.autoExplodeDistance;
          break;

        case 'radial':
          // Explode radially in XZ plane (common for rotational assemblies)
          const radialDir = new THREE.Vector3(pos.x - center.x, 0, pos.z - center.z);
          if (radialDir.length() > 0.001) {
            radialDir.normalize();
            offset = radialDir.multiplyScalar(this.explodeData.autoExplodeDistance);
          }
          break;

        case 'hierarchical':
          // Explode based on hierarchy depth
          const depth = this.getHierarchyDepth(id, instances);
          const hierarchyOffset = depth * this.explodeData.autoExplodeDistance * 0.5;
          offset = pos.clone().sub(center).normalize().multiplyScalar(hierarchyOffset);
          break;
      }

      offsets.set(id, offset);
    }

    return offsets;
  }

  /**
   * Get hierarchy depth of an instance
   */
  private getHierarchyDepth(
    instanceId: string,
    instances: Map<string, { parentInstanceId?: string }>
  ): number {
    let depth = 0;
    let currentId: string | undefined = instanceId;

    while (currentId) {
      const instance = instances.get(currentId);
      if (!instance || !instance.parentInstanceId) break;
      currentId = instance.parentInstanceId;
      depth++;
    }

    return depth;
  }

  /**
   * Apply explode factor to calculate current transforms
   */
  applyExplodeFactor(
    instances: Map<string, { transform: THREE.Matrix4 }>,
    factor: number
  ): Map<string, THREE.Matrix4> {
    const transforms = new Map<string, THREE.Matrix4>();

    // Clamp factor to 0-1
    factor = Math.max(0, Math.min(1, factor));

    for (const [id, instance] of instances) {
      const original = this.originalTransforms.get(id);
      if (!original) {
        transforms.set(id, instance.transform.clone());
        continue;
      }

      // Get offset (manual or auto)
      let offset = this.explodeData.manualOffsets.get(id);
      if (!offset) {
        // Use auto-calculated offset
        const autoOffsets = this.calculateAutoExplode(instances, this.explodeData.autoExplodeDirection);
        offset = autoOffsets.get(id) || new THREE.Vector3();
      }

      // Interpolate between original and exploded position
      const explodedPos = new THREE.Vector3();
      explodedPos.setFromMatrixPosition(original);
      explodedPos.add(offset.clone().multiplyScalar(factor));

      // Create new transform with exploded position
      const newTransform = original.clone();
      newTransform.setPosition(explodedPos);

      transforms.set(id, newTransform);
      this.explodedTransforms.set(id, newTransform);
    }

    return transforms;
  }

  /**
   * Set explode factor (0 = assembled, 1 = fully exploded)
   */
  setExplodeFactor(factor: number): void {
    this.explodeData.explodeFactor = Math.max(0, Math.min(1, factor));
    this.notifyListeners('explode-factor-changed', { factor: this.explodeData.explodeFactor });
  }

  /**
   * Get current explode factor
   */
  getExplodeFactor(): number {
    return this.explodeData.explodeFactor;
  }

  /**
   * Toggle exploded view
   */
  toggleExplode(): void {
    this.explodeData.enabled = !this.explodeData.enabled;
    if (this.explodeData.enabled) {
      this.setExplodeFactor(1.0);
    } else {
      this.setExplodeFactor(0.0);
    }
    this.notifyListeners('explode-toggled', { enabled: this.explodeData.enabled });
  }

  /**
   * Set auto explode direction
   */
  setAutoExplodeDirection(direction: 'xyz' | 'x' | 'y' | 'z' | 'radial' | 'hierarchical'): void {
    this.explodeData.autoExplodeDirection = direction;
    this.notifyListeners('explode-direction-changed', { direction });
  }

  /**
   * Set auto explode distance
   */
  setAutoExplodeDistance(distance: number): void {
    this.explodeData.autoExplodeDistance = distance;
    this.notifyListeners('explode-distance-changed', { distance });
  }

  /**
   * Set manual offset for specific instance
   */
  setManualOffset(instanceId: string, offset: THREE.Vector3): void {
    this.explodeData.manualOffsets.set(instanceId, offset.clone());
    this.notifyListeners('manual-offset-changed', { instanceId, offset });
  }

  /**
   * Clear manual offset for instance
   */
  clearManualOffset(instanceId: string): void {
    this.explodeData.manualOffsets.delete(instanceId);
    this.notifyListeners('manual-offset-cleared', { instanceId });
  }

  /**
   * Clear all manual offsets
   */
  clearAllManualOffsets(): void {
    this.explodeData.manualOffsets.clear();
    this.notifyListeners('all-manual-offsets-cleared', {});
  }

  /**
   * Create animation from current explode state
   */
  createAnimation(name: string, duration: number = 5): ExplodeAnimation {
    const animation: ExplodeAnimation = {
      id: `anim_${Date.now()}`,
      name,
      totalDuration: duration,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Create single step with all instances
    const keyframes: ExplodeKeyframe[] = [];
    
    // Start keyframe (assembled)
    for (const [id, transform] of this.originalTransforms) {
      const pos = new THREE.Vector3();
      const rot = new THREE.Euler();
      const scale = new THREE.Vector3();
      
      transform.decompose(pos, new THREE.Quaternion(), scale);
      const quat = new THREE.Quaternion();
      quat.setFromRotationMatrix(transform);
      rot.setFromQuaternion(quat);

      keyframes.push({
        time: 0,
        instanceId: id,
        position: pos.clone(),
        rotation: rot.clone(),
        scale: scale.clone()
      });
    }

    // End keyframe (exploded)
    for (const [id, transform] of this.explodedTransforms) {
      const pos = new THREE.Vector3();
      const rot = new THREE.Euler();
      const scale = new THREE.Vector3();
      
      transform.decompose(pos, new THREE.Quaternion(), scale);
      const quat = new THREE.Quaternion();
      quat.setFromRotationMatrix(transform);
      rot.setFromQuaternion(quat);

      keyframes.push({
        time: 1,
        instanceId: id,
        position: pos.clone(),
        rotation: rot.clone(),
        scale: scale.clone()
      });
    }

    animation.steps.push({
      id: `step_${Date.now()}`,
      name: 'Explode',
      duration,
      instanceIds: Array.from(this.originalTransforms.keys()),
      keyframes,
      easingFunction: 'easeInOut'
    });

    this.explodeData.animations.push(animation);
    this.notifyListeners('animation-created', { animation });

    return animation;
  }

  /**
   * Add animation step
   */
  addAnimationStep(
    animationId: string,
    name: string,
    duration: number,
    instanceIds: string[],
    direction?: THREE.Vector3,
    distance?: number
  ): ExplodeStep | null {
    const animation = this.explodeData.animations.find(a => a.id === animationId);
    if (!animation) return null;

    const step: ExplodeStep = {
      id: `step_${Date.now()}`,
      name,
      duration,
      instanceIds,
      direction,
      distance,
      keyframes: [],
      easingFunction: 'easeInOut'
    };

    animation.steps.push(step);
    animation.totalDuration = animation.steps.reduce((sum, s) => sum + s.duration, 0);
    animation.updatedAt = Date.now();

    this.notifyListeners('animation-step-added', { animationId, step });

    return step;
  }

  /**
   * Remove animation step
   */
  removeAnimationStep(animationId: string, stepId: string): void {
    const animation = this.explodeData.animations.find(a => a.id === animationId);
    if (!animation) return;

    animation.steps = animation.steps.filter(s => s.id !== stepId);
    animation.totalDuration = animation.steps.reduce((sum, s) => sum + s.duration, 0);
    animation.updatedAt = Date.now();

    this.notifyListeners('animation-step-removed', { animationId, stepId });
  }

  /**
   * Get animation by ID
   */
  getAnimation(animationId: string): ExplodeAnimation | undefined {
    return this.explodeData.animations.find(a => a.id === animationId);
  }

  /**
   * Get all animations
   */
  getAllAnimations(): ExplodeAnimation[] {
    return this.explodeData.animations;
  }

  /**
   * Delete animation
   */
  deleteAnimation(animationId: string): void {
    this.explodeData.animations = this.explodeData.animations.filter(a => a.id !== animationId);
    if (this.explodeData.currentAnimation === animationId) {
      this.stopAnimation();
    }
    this.notifyListeners('animation-deleted', { animationId });
  }

  /**
   * Evaluate animation at specific time
   */
  evaluateAnimation(animationId: string, time: number): Map<string, THREE.Matrix4> | null {
    const animation = this.getAnimation(animationId);
    if (!animation) return null;

    const transforms = new Map<string, THREE.Matrix4>();
    
    // Clamp time to animation duration
    time = Math.max(0, Math.min(animation.totalDuration, time));

    // Find which step we're in
    let accumulatedTime = 0;
    let currentStep: ExplodeStep | null = null;
    let stepTime = 0;

    for (const step of animation.steps) {
      if (time <= accumulatedTime + step.duration) {
        currentStep = step;
        stepTime = time - accumulatedTime;
        break;
      }
      accumulatedTime += step.duration;
    }

    if (!currentStep) {
      // Use last frame
      currentStep = animation.steps[animation.steps.length - 1];
      stepTime = currentStep.duration;
    }

    // Interpolate keyframes
    const t = currentStep.duration > 0 ? stepTime / currentStep.duration : 1;
    const easedT = this.applyEasing(t, currentStep.easingFunction);

    // Group keyframes by instance
    const keyframesByInstance = new Map<string, ExplodeKeyframe[]>();
    for (const keyframe of currentStep.keyframes) {
      if (!keyframesByInstance.has(keyframe.instanceId)) {
        keyframesByInstance.set(keyframe.instanceId, []);
      }
      keyframesByInstance.get(keyframe.instanceId)!.push(keyframe);
    }

    // Interpolate each instance
    for (const [instanceId, keyframes] of keyframesByInstance) {
      // Sort keyframes by time
      keyframes.sort((a, b) => a.time - b.time);

      // Find surrounding keyframes
      let startKeyframe = keyframes[0];
      let endKeyframe = keyframes[keyframes.length - 1];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (easedT >= keyframes[i].time && easedT <= keyframes[i + 1].time) {
          startKeyframe = keyframes[i];
          endKeyframe = keyframes[i + 1];
          break;
        }
      }

      // Calculate local interpolation factor
      const localT = startKeyframe.time === endKeyframe.time 
        ? 1 
        : (easedT - startKeyframe.time) / (endKeyframe.time - startKeyframe.time);

      // Interpolate position
      const position = new THREE.Vector3().lerpVectors(
        startKeyframe.position,
        endKeyframe.position,
        localT
      );

      // Interpolate rotation
      const startQuat = new THREE.Quaternion().setFromEuler(startKeyframe.rotation);
      const endQuat = new THREE.Quaternion().setFromEuler(endKeyframe.rotation);
      const rotation = new THREE.Quaternion().slerpQuaternions(startQuat, endQuat, localT);

      // Interpolate scale
      const scale = new THREE.Vector3().lerpVectors(
        startKeyframe.scale,
        endKeyframe.scale,
        localT
      );

      // Compose transform
      const transform = new THREE.Matrix4();
      transform.compose(position, rotation, scale);
      transforms.set(instanceId, transform);
    }

    return transforms;
  }

  /**
   * Apply easing function
   */
  private applyEasing(t: number, easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut'): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return t * (2 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  /**
   * Play animation
   */
  playAnimation(animationId: string): void {
    const animation = this.getAnimation(animationId);
    if (!animation) return;

    this.explodeData.currentAnimation = animationId;
    this.explodeData.isPlaying = true;
    this.lastFrameTime = performance.now();

    this.animationLoop();
    this.notifyListeners('animation-started', { animationId });
  }

  /**
   * Pause animation
   */
  pauseAnimation(): void {
    this.explodeData.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyListeners('animation-paused', { time: this.explodeData.currentTime });
  }

  /**
   * Stop animation
   */
  stopAnimation(): void {
    this.explodeData.isPlaying = false;
    this.explodeData.currentTime = 0;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyListeners('animation-stopped', {});
  }

  /**
   * Seek to specific time in animation
   */
  seekAnimation(time: number): void {
    if (!this.explodeData.currentAnimation) return;
    
    const animation = this.getAnimation(this.explodeData.currentAnimation);
    if (!animation) return;

    this.explodeData.currentTime = Math.max(0, Math.min(animation.totalDuration, time));
    this.notifyListeners('animation-seeked', { time: this.explodeData.currentTime });
  }

  /**
   * Animation loop
   */
  private animationLoop(): void {
    if (!this.explodeData.isPlaying || !this.explodeData.currentAnimation) return;

    const animation = this.getAnimation(this.explodeData.currentAnimation);
    if (!animation) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = now;

    // Update current time
    this.explodeData.currentTime += deltaTime * this.explodeData.playbackSpeed;

    // Check if animation finished
    if (this.explodeData.currentTime >= animation.totalDuration) {
      if (this.explodeData.loop) {
        this.explodeData.currentTime = 0;
      } else {
        this.stopAnimation();
        return;
      }
    }

    // Evaluate and notify
    const transforms = this.evaluateAnimation(this.explodeData.currentAnimation, this.explodeData.currentTime);
    if (transforms) {
      this.notifyListeners('animation-frame', { time: this.explodeData.currentTime, transforms });
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: number): void {
    this.explodeData.playbackSpeed = Math.max(0.1, Math.min(5, speed));
    this.notifyListeners('playback-speed-changed', { speed: this.explodeData.playbackSpeed });
  }

  /**
   * Toggle loop
   */
  toggleLoop(): void {
    this.explodeData.loop = !this.explodeData.loop;
    this.notifyListeners('loop-toggled', { loop: this.explodeData.loop });
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): {
    isPlaying: boolean;
    currentTime: number;
    loop: boolean;
    speed: number;
    animationId?: string;
  } {
    return {
      isPlaying: this.explodeData.isPlaying,
      currentTime: this.explodeData.currentTime,
      loop: this.explodeData.loop,
      speed: this.explodeData.playbackSpeed,
      animationId: this.explodeData.currentAnimation
    };
  }

  /**
   * Export to JSON for storage in assembly document
   */
  toJSON(): any {
    return {
      enabled: this.explodeData.enabled,
      explodeFactor: this.explodeData.explodeFactor,
      autoExplodeDirection: this.explodeData.autoExplodeDirection,
      autoExplodeDistance: this.explodeData.autoExplodeDistance,
      manualOffsets: Array.from(this.explodeData.manualOffsets.entries()).map(([id, offset]) => ({
        instanceId: id,
        offset: { x: offset.x, y: offset.y, z: offset.z }
      })),
      animations: this.explodeData.animations.map(anim => ({
        ...anim,
        steps: anim.steps.map(step => ({
          ...step,
          direction: step.direction ? { x: step.direction.x, y: step.direction.y, z: step.direction.z } : undefined,
          keyframes: step.keyframes.map(kf => ({
            ...kf,
            position: { x: kf.position.x, y: kf.position.y, z: kf.position.z },
            rotation: { x: kf.rotation.x, y: kf.rotation.y, z: kf.rotation.z },
            scale: { x: kf.scale.x, y: kf.scale.y, z: kf.scale.z }
          }))
        }))
      }))
    };
  }

  /**
   * Load from JSON
   */
  fromJSON(data: any): void {
    if (!data) return;

    this.explodeData.enabled = data.enabled || false;
    this.explodeData.explodeFactor = data.explodeFactor || 0;
    this.explodeData.autoExplodeDirection = data.autoExplodeDirection || 'xyz';
    this.explodeData.autoExplodeDistance = data.autoExplodeDistance || 100;

    // Load manual offsets
    this.explodeData.manualOffsets.clear();
    if (data.manualOffsets && Array.isArray(data.manualOffsets)) {
      for (const item of data.manualOffsets) {
        this.explodeData.manualOffsets.set(
          item.instanceId,
          new THREE.Vector3(item.offset.x, item.offset.y, item.offset.z)
        );
      }
    }

    // Load animations
    this.explodeData.animations = [];
    if (data.animations && Array.isArray(data.animations)) {
      for (const animData of data.animations) {
        const animation: ExplodeAnimation = {
          id: animData.id,
          name: animData.name,
          totalDuration: animData.totalDuration,
          steps: animData.steps.map((stepData: any) => ({
            id: stepData.id,
            name: stepData.name,
            duration: stepData.duration,
            instanceIds: stepData.instanceIds,
            direction: stepData.direction ? new THREE.Vector3(stepData.direction.x, stepData.direction.y, stepData.direction.z) : undefined,
            distance: stepData.distance,
            easingFunction: stepData.easingFunction,
            keyframes: stepData.keyframes.map((kfData: any) => ({
              time: kfData.time,
              instanceId: kfData.instanceId,
              position: new THREE.Vector3(kfData.position.x, kfData.position.y, kfData.position.z),
              rotation: new THREE.Euler(kfData.rotation.x, kfData.rotation.y, kfData.rotation.z),
              scale: new THREE.Vector3(kfData.scale.x, kfData.scale.y, kfData.scale.z)
            }))
          })),
          createdAt: animData.createdAt,
          updatedAt: animData.updatedAt
        };
        this.explodeData.animations.push(animation);
      }
    }
  }

  /**
   * Get explode data for persistence
   */
  getExplodeData(): ExplodeViewData {
    return { ...this.explodeData };
  }
}

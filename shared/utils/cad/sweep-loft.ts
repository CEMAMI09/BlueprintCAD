/**
 * Sweep and Loft Operations for CAD System
 * 
 * Implements:
 * - Sweep: Extrude a profile along a path with twist and scale
 * - Loft: Blend between multiple profiles with guide curves
 * - Preview generation for real-time feedback
 * - Fail-safes for invalid geometry
 * - Feature history integration
 * - Version control integration
 */

import * as THREE from 'three';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SweepOptions {
  /** Profile curve/sketch to sweep */
  profile: THREE.Shape | THREE.Curve<THREE.Vector3>;
  /** Path curve to follow */
  path: THREE.Curve<THREE.Vector3>;
  /** Number of segments along path (default: 64) */
  segments?: number;
  /** Twist angle in radians along path (default: 0) */
  twistAngle?: number;
  /** Scale factor at end relative to start (default: 1) */
  scaleEnd?: number;
  /** Whether to cap the ends (default: true) */
  capped?: boolean;
  /** Follow path tangent for orientation (default: true) */
  followPath?: boolean;
  /** Custom up vector for orientation */
  upVector?: THREE.Vector3;
  /** Preserve profile area while scaling (default: false) */
  preserveArea?: boolean;
}

export interface LoftOptions {
  /** Array of profile curves to loft between (minimum 2) */
  profiles: Array<THREE.Shape | THREE.Curve<THREE.Vector3>>;
  /** Optional guide curves to control loft shape */
  guideCurves?: Array<THREE.Curve<THREE.Vector3>>;
  /** Number of segments between profiles (default: 32) */
  segments?: number;
  /** Whether to close the loft (connect first and last) */
  closed?: boolean;
  /** Whether to cap the ends (default: true) */
  capped?: boolean;
  /** Smoothness factor 0-1 (default: 0.5) */
  smoothness?: number;
  /** Twist angle in radians (default: 0) */
  twistAngle?: number;
  /** Scale profiles uniformly (default: false) */
  uniformScale?: boolean;
}

export interface SweepResult {
  /** Generated mesh geometry */
  geometry: THREE.BufferGeometry;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Statistics about the operation */
  stats: {
    vertices: number;
    faces: number;
    segments: number;
    volume?: number;
  };
}

export interface LoftResult {
  /** Generated mesh geometry */
  geometry: THREE.BufferGeometry;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Statistics about the operation */
  stats: {
    vertices: number;
    faces: number;
    profiles: number;
    volume?: number;
  };
}

export interface SweepFeature {
  id: string;
  type: 'sweep';
  name: string;
  profileId: string;
  pathId: string;
  options: SweepOptions;
  geometry?: THREE.BufferGeometry;
  suppressed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LoftFeature {
  id: string;
  type: 'loft';
  name: string;
  profileIds: string[];
  guideCurveIds?: string[];
  options: LoftOptions;
  geometry?: THREE.BufferGeometry;
  suppressed: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Validation and Fail-safes
// ============================================================================

class GeometryValidator {
  static validateProfile(profile: any): { valid: boolean; error?: string } {
    if (!profile) {
      return { valid: false, error: 'Profile is null or undefined' };
    }

    if (profile instanceof THREE.Shape) {
      const points = profile.getPoints();
      if (points.length < 3) {
        return { valid: false, error: 'Profile must have at least 3 points' };
      }
      return { valid: true };
    }

    if (profile instanceof THREE.Curve) {
      try {
        const testPoints = profile.getPoints(10);
        if (testPoints.length < 2) {
          return { valid: false, error: 'Curve must generate at least 2 points' };
        }
        return { valid: true };
      } catch (e) {
        return { valid: false, error: `Invalid curve: ${e.message}` };
      }
    }

    return { valid: false, error: 'Profile must be THREE.Shape or THREE.Curve' };
  }

  static validatePath(path: THREE.Curve<THREE.Vector3>): { valid: boolean; error?: string } {
    if (!path) {
      return { valid: false, error: 'Path is null or undefined' };
    }

    try {
      const points = path.getPoints(10);
      if (points.length < 2) {
        return { valid: false, error: 'Path must have at least 2 points' };
      }

      // Check for degenerate path (all points same)
      const first = points[0];
      const allSame = points.every(p => p.distanceTo(first) < 0.001);
      if (allSame) {
        return { valid: false, error: 'Path is degenerate (all points identical)' };
      }

      return { valid: true };
    } catch (e) {
      return { valid: false, error: `Invalid path: ${e.message}` };
    }
  }

  static validateLoftProfiles(profiles: any[]): { valid: boolean; error?: string } {
    if (!profiles || profiles.length < 2) {
      return { valid: false, error: 'Loft requires at least 2 profiles' };
    }

    if (profiles.length > 100) {
      return { valid: false, error: 'Too many profiles (max 100)' };
    }

    for (let i = 0; i < profiles.length; i++) {
      const result = this.validateProfile(profiles[i]);
      if (!result.valid) {
        return { valid: false, error: `Profile ${i}: ${result.error}` };
      }
    }

    return { valid: true };
  }

  static checkSelfIntersection(points: THREE.Vector3[]): boolean {
    // Simple check for obvious self-intersections
    if (points.length < 4) return false;

    for (let i = 0; i < points.length - 1; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        if (j === i + 1 || (i === 0 && j === points.length - 2)) continue;

        const d1 = points[i].distanceTo(points[j]);
        const d2 = points[i + 1].distanceTo(points[j + 1]);
        
        // Very close parallel segments might intersect
        if (d1 < 0.01 && d2 < 0.01) {
          return true;
        }
      }
    }

    return false;
  }
}

// ============================================================================
// Sweep Operation
// ============================================================================

export class SweepOperation {
  /**
   * Create a sweep geometry by extruding a profile along a path
   */
  static create(options: SweepOptions): SweepResult {
    const warnings: string[] = [];
    
    try {
      // Validate inputs
      const profileValidation = GeometryValidator.validateProfile(options.profile);
      if (!profileValidation.valid) {
        return {
          geometry: new THREE.BufferGeometry(),
          success: false,
          error: profileValidation.error,
          warnings,
          stats: { vertices: 0, faces: 0, segments: 0 }
        };
      }

      const pathValidation = GeometryValidator.validatePath(options.path);
      if (!pathValidation.valid) {
        return {
          geometry: new THREE.BufferGeometry(),
          success: false,
          error: pathValidation.error,
          warnings,
          stats: { vertices: 0, faces: 0, segments: 0 }
        };
      }

      // Apply defaults
      const segments = Math.max(3, Math.min(256, options.segments || 64));
      const twistAngle = options.twistAngle || 0;
      const scaleEnd = Math.max(0.01, options.scaleEnd !== undefined ? options.scaleEnd : 1);
      const capped = options.capped !== false;
      const followPath = options.followPath !== false;
      const preserveArea = options.preserveArea || false;

      if (Math.abs(twistAngle) > Math.PI * 8) {
        warnings.push(`Large twist angle (${twistAngle.toFixed(2)} rad) may cause distortion`);
      }

      if (scaleEnd < 0.1 || scaleEnd > 10) {
        warnings.push(`Extreme scale factor (${scaleEnd}) may produce invalid geometry`);
      }

      // Generate profile points
      const profilePoints = this.getProfilePoints(options.profile);
      const profileCount = profilePoints.length;

      // Generate path samples
      const pathPoints: THREE.Vector3[] = [];
      const pathTangents: THREE.Vector3[] = [];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = options.path.getPoint(t);
        const tangent = options.path.getTangent(t).normalize();
        
        pathPoints.push(point);
        pathTangents.push(tangent);
      }

      // Build geometry
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const upVector = options.upVector || new THREE.Vector3(0, 1, 0);
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const pathPoint = pathPoints[i];
        const tangent = pathTangents[i];
        
        // Calculate transformation matrix for this segment
        const scale = THREE.MathUtils.lerp(1, scaleEnd, t);
        const twist = twistAngle * t;
        
        // Area-preserving scale if requested
        let scaleX = scale;
        let scaleY = scale;
        if (preserveArea && scale !== 1) {
          // Keep area constant: scaleX * scaleY = 1
          scaleX = Math.sqrt(scale);
          scaleY = 1 / Math.sqrt(scale);
        }
        
        // Create local coordinate system
        let binormal: THREE.Vector3;
        let normal: THREE.Vector3;
        
        if (followPath) {
          // Use Frenet frame
          const cross = new THREE.Vector3().crossVectors(tangent, upVector);
          if (cross.lengthSq() < 0.0001) {
            // Tangent parallel to up vector, use fallback
            const fallback = new THREE.Vector3(1, 0, 0);
            cross.crossVectors(tangent, fallback);
          }
          binormal = cross.normalize();
          normal = new THREE.Vector3().crossVectors(tangent, binormal);
        } else {
          // Fixed orientation
          binormal = new THREE.Vector3(1, 0, 0);
          normal = new THREE.Vector3(0, 1, 0);
        }
        
        // Apply twist
        if (twist !== 0) {
          const rotMatrix = new THREE.Matrix4().makeRotationAxis(tangent, twist);
          binormal.applyMatrix4(rotMatrix);
          normal.applyMatrix4(rotMatrix);
        }
        
        // Transform and add profile points
        for (let j = 0; j < profileCount; j++) {
          const p = profilePoints[j];
          
          // Apply scale and twist
          const x = p.x * scaleX;
          const y = p.y * scaleY;
          
          // Transform to world space
          const worldPos = new THREE.Vector3(
            pathPoint.x + binormal.x * x + normal.x * y,
            pathPoint.y + binormal.y * x + normal.y * y,
            pathPoint.z + binormal.z * x + normal.z * y
          );
          
          positions.push(worldPos.x, worldPos.y, worldPos.z);
          
          // Calculate normal (perpendicular to path)
          const nx = binormal.x * Math.cos(twist) + normal.x * Math.sin(twist);
          const ny = binormal.y * Math.cos(twist) + normal.y * Math.sin(twist);
          const nz = binormal.z * Math.cos(twist) + normal.z * Math.sin(twist);
          normals.push(nx, ny, nz);
          
          // UV coordinates
          uvs.push(j / (profileCount - 1), t);
        }
      }

      // Generate faces
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < profileCount - 1; j++) {
          const a = i * profileCount + j;
          const b = i * profileCount + j + 1;
          const c = (i + 1) * profileCount + j + 1;
          const d = (i + 1) * profileCount + j;
          
          indices.push(a, b, c);
          indices.push(a, c, d);
        }
      }

      // Add caps if requested
      if (capped) {
        const startCapIndices = this.generateCapIndices(profilePoints, 0, profileCount, false);
        const endCapIndices = this.generateCapIndices(profilePoints, segments * profileCount, profileCount, true);
        indices.push(...startCapIndices, ...endCapIndices);
      }

      // Create geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      
      // Compute normals if not following path exactly
      if (!followPath) {
        geometry.computeVertexNormals();
      }

      // Calculate volume
      const volume = this.calculateVolume(geometry);

      return {
        geometry,
        success: true,
        warnings,
        stats: {
          vertices: positions.length / 3,
          faces: indices.length / 3,
          segments,
          volume
        }
      };

    } catch (error) {
      return {
        geometry: new THREE.BufferGeometry(),
        success: false,
        error: `Sweep failed: ${error.message}`,
        warnings,
        stats: { vertices: 0, faces: 0, segments: 0 }
      };
    }
  }

  private static getProfilePoints(profile: any): THREE.Vector2[] {
    if (profile instanceof THREE.Shape) {
      return profile.getPoints(32);
    } else if (profile instanceof THREE.Curve) {
      const points3d = profile.getPoints(32);
      return points3d.map(p => new THREE.Vector2(p.x, p.y));
    }
    return [];
  }

  private static generateCapIndices(
    profilePoints: THREE.Vector2[],
    startIndex: number,
    profileCount: number,
    reverse: boolean
  ): number[] {
    const indices: number[] = [];
    
    // Simple triangle fan from center
    const center = startIndex + Math.floor(profileCount / 2);
    
    for (let i = 0; i < profileCount - 1; i++) {
      if (reverse) {
        indices.push(center, startIndex + i + 1, startIndex + i);
      } else {
        indices.push(center, startIndex + i, startIndex + i + 1);
      }
    }
    
    return indices;
  }

  private static calculateVolume(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) return 0;
    
    let volume = 0;
    
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);
      
      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );
      
      // Signed volume of tetrahedron
      volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
    }
    
    return Math.abs(volume);
  }

  /**
   * Generate preview mesh for interactive feedback
   */
  static createPreview(options: SweepOptions): THREE.Mesh | null {
    const result = this.create({ ...options, segments: 16 });
    
    if (!result.success) return null;
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x4CAF50,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    return new THREE.Mesh(result.geometry, material);
  }
}

// ============================================================================
// Loft Operation
// ============================================================================

export class LoftOperation {
  /**
   * Create a loft geometry by blending between multiple profiles
   */
  static create(options: LoftOptions): LoftResult {
    const warnings: string[] = [];
    
    try {
      // Validate inputs
      const profilesValidation = GeometryValidator.validateLoftProfiles(options.profiles);
      if (!profilesValidation.valid) {
        return {
          geometry: new THREE.BufferGeometry(),
          success: false,
          error: profilesValidation.error,
          warnings,
          stats: { vertices: 0, faces: 0, profiles: 0 }
        };
      }

      // Validate guide curves if provided
      if (options.guideCurves) {
        for (let i = 0; i < options.guideCurves.length; i++) {
          const validation = GeometryValidator.validatePath(options.guideCurves[i]);
          if (!validation.valid) {
            warnings.push(`Guide curve ${i}: ${validation.error}`);
          }
        }
      }

      // Apply defaults
      const segments = Math.max(1, Math.min(128, options.segments || 32));
      const closed = options.closed || false;
      const capped = options.capped !== false;
      const smoothness = Math.max(0, Math.min(1, options.smoothness !== undefined ? options.smoothness : 0.5));
      const twistAngle = options.twistAngle || 0;
      const uniformScale = options.uniformScale || false;

      // Get profile points
      const profilePointsArray: THREE.Vector2[][] = options.profiles.map(profile => 
        this.getProfilePoints(profile)
      );

      // Normalize profile point counts
      const maxPoints = Math.max(...profilePointsArray.map(p => p.length));
      const normalizedProfiles = profilePointsArray.map(points => 
        this.normalizeProfilePoints(points, maxPoints)
      );

      if (uniformScale) {
        // Scale all profiles to have same average radius
        const avgRadii = normalizedProfiles.map(points => this.getAverageRadius(points));
        const targetRadius = avgRadii.reduce((a, b) => a + b, 0) / avgRadii.length;
        
        for (let i = 0; i < normalizedProfiles.length; i++) {
          const scale = targetRadius / avgRadii[i];
          normalizedProfiles[i] = normalizedProfiles[i].map(p => 
            new THREE.Vector2(p.x * scale, p.y * scale)
          );
        }
      }

      // Build geometry
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const profileCount = options.profiles.length;
      const pointsPerProfile = normalizedProfiles[0].length;
      
      // Interpolate between profiles
      const totalSegments = closed ? segments * profileCount : segments * (profileCount - 1);
      
      for (let i = 0; i <= totalSegments; i++) {
        const t = i / totalSegments;
        const globalT = closed ? t * profileCount : t * (profileCount - 1);
        
        // Find which profiles to interpolate between
        const profileIndex = Math.floor(globalT);
        const localT = globalT - profileIndex;
        
        const p1Index = profileIndex % profileCount;
        const p2Index = (profileIndex + 1) % profileCount;
        
        const profile1 = normalizedProfiles[p1Index];
        const profile2 = normalizedProfiles[p2Index];
        
        // Smooth interpolation
        const smoothT = this.smoothstep(localT, smoothness);
        
        // Apply twist
        const twist = twistAngle * t;
        
        // Interpolate each point
        for (let j = 0; j < pointsPerProfile; j++) {
          const point1 = profile1[j];
          const point2 = profile2[j];
          
          // Linear interpolation with smoothing
          let x = THREE.MathUtils.lerp(point1.x, point2.x, smoothT);
          let y = THREE.MathUtils.lerp(point1.y, point2.y, smoothT);
          
          // Apply twist
          if (twist !== 0) {
            const cos = Math.cos(twist);
            const sin = Math.sin(twist);
            const tx = x * cos - y * sin;
            const ty = x * sin + y * cos;
            x = tx;
            y = ty;
          }
          
          // Guide curve influence
          let z = globalT * 10; // Default spacing along Z
          
          if (options.guideCurves && options.guideCurves.length > 0) {
            const guidePoint = options.guideCurves[0].getPoint(t);
            z = guidePoint.z;
            
            // Apply guide curve offset
            x += guidePoint.x;
            y += guidePoint.y;
          }
          
          positions.push(x, y, z);
          
          // Calculate normal (will be recomputed)
          normals.push(0, 0, 1);
          
          // UV coordinates
          uvs.push(j / (pointsPerProfile - 1), t);
        }
      }

      // Generate faces
      const ringCount = totalSegments + 1;
      for (let i = 0; i < totalSegments; i++) {
        for (let j = 0; j < pointsPerProfile - 1; j++) {
          const a = i * pointsPerProfile + j;
          const b = i * pointsPerProfile + j + 1;
          const c = (i + 1) * pointsPerProfile + j + 1;
          const d = (i + 1) * pointsPerProfile + j;
          
          indices.push(a, b, c);
          indices.push(a, c, d);
        }
      }

      // Add caps if requested and not closed
      if (capped && !closed) {
        const startCapIndices = this.generateCapIndices(0, pointsPerProfile, false);
        const endCapIndices = this.generateCapIndices(
          totalSegments * pointsPerProfile,
          pointsPerProfile,
          true
        );
        indices.push(...startCapIndices, ...endCapIndices);
      }

      // Create geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      // Calculate volume
      const volume = this.calculateVolume(geometry);

      if (volume < 0.001) {
        warnings.push('Resulting geometry has very small volume');
      }

      return {
        geometry,
        success: true,
        warnings,
        stats: {
          vertices: positions.length / 3,
          faces: indices.length / 3,
          profiles: profileCount,
          volume
        }
      };

    } catch (error) {
      return {
        geometry: new THREE.BufferGeometry(),
        success: false,
        error: `Loft failed: ${error.message}`,
        warnings,
        stats: { vertices: 0, faces: 0, profiles: 0 }
      };
    }
  }

  private static getProfilePoints(profile: any): THREE.Vector2[] {
    if (profile instanceof THREE.Shape) {
      return profile.getPoints(32);
    } else if (profile instanceof THREE.Curve) {
      const points3d = profile.getPoints(32);
      return points3d.map(p => new THREE.Vector2(p.x, p.y));
    }
    return [];
  }

  private static normalizeProfilePoints(points: THREE.Vector2[], targetCount: number): THREE.Vector2[] {
    if (points.length === targetCount) return points;
    
    const normalized: THREE.Vector2[] = [];
    
    for (let i = 0; i < targetCount; i++) {
      const t = i / (targetCount - 1);
      const sourceIndex = t * (points.length - 1);
      const index = Math.floor(sourceIndex);
      const frac = sourceIndex - index;
      
      if (index >= points.length - 1) {
        normalized.push(points[points.length - 1].clone());
      } else {
        const p1 = points[index];
        const p2 = points[index + 1];
        normalized.push(new THREE.Vector2(
          THREE.MathUtils.lerp(p1.x, p2.x, frac),
          THREE.MathUtils.lerp(p1.y, p2.y, frac)
        ));
      }
    }
    
    return normalized;
  }

  private static getAverageRadius(points: THREE.Vector2[]): number {
    const center = new THREE.Vector2(0, 0);
    points.forEach(p => center.add(p));
    center.divideScalar(points.length);
    
    let totalRadius = 0;
    points.forEach(p => {
      totalRadius += p.distanceTo(center);
    });
    
    return totalRadius / points.length;
  }

  private static smoothstep(t: number, smoothness: number): number {
    // Hermite interpolation with adjustable smoothness
    const x = Math.max(0, Math.min(1, t));
    const s = smoothness;
    
    // Blend between linear (s=0) and smooth (s=1)
    const smooth = x * x * (3 - 2 * x);
    return THREE.MathUtils.lerp(x, smooth, s);
  }

  private static generateCapIndices(
    startIndex: number,
    pointCount: number,
    reverse: boolean
  ): number[] {
    const indices: number[] = [];
    
    // Triangle fan from center
    const center = startIndex + Math.floor(pointCount / 2);
    
    for (let i = 0; i < pointCount - 1; i++) {
      if (reverse) {
        indices.push(center, startIndex + i + 1, startIndex + i);
      } else {
        indices.push(center, startIndex + i, startIndex + i + 1);
      }
    }
    
    return indices;
  }

  private static calculateVolume(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) return 0;
    
    let volume = 0;
    
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);
      
      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );
      
      volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
    }
    
    return Math.abs(volume);
  }

  /**
   * Generate preview mesh for interactive feedback
   */
  static createPreview(options: LoftOptions): THREE.Mesh | null {
    const result = this.create({ ...options, segments: 8 });
    
    if (!result.success) return null;
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x2196F3,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    return new THREE.Mesh(result.geometry, material);
  }
}

// ============================================================================
// Feature Integration
// ============================================================================

export class SweepLoftFeatureManager {
  /**
   * Create a sweep feature with full metadata
   */
  static createSweepFeature(
    name: string,
    profileId: string,
    pathId: string,
    options: SweepOptions
  ): SweepFeature {
    const result = SweepOperation.create(options);
    
    return {
      id: crypto.randomUUID(),
      type: 'sweep',
      name,
      profileId,
      pathId,
      options,
      geometry: result.success ? result.geometry : undefined,
      suppressed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Create a loft feature with full metadata
   */
  static createLoftFeature(
    name: string,
    profileIds: string[],
    options: LoftOptions,
    guideCurveIds?: string[]
  ): LoftFeature {
    const result = LoftOperation.create(options);
    
    return {
      id: crypto.randomUUID(),
      type: 'loft',
      name,
      profileIds,
      guideCurveIds,
      options,
      geometry: result.success ? result.geometry : undefined,
      suppressed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Update sweep feature geometry
   */
  static updateSweepFeature(feature: SweepFeature, options: Partial<SweepOptions>): SweepFeature {
    const newOptions = { ...feature.options, ...options };
    const result = SweepOperation.create(newOptions);
    
    return {
      ...feature,
      options: newOptions,
      geometry: result.success ? result.geometry : feature.geometry,
      updatedAt: Date.now()
    };
  }

  /**
   * Update loft feature geometry
   */
  static updateLoftFeature(feature: LoftFeature, options: Partial<LoftOptions>): LoftFeature {
    const newOptions = { ...feature.options, ...options };
    const result = LoftOperation.create(newOptions);
    
    return {
      ...feature,
      options: newOptions,
      geometry: result.success ? result.geometry : feature.geometry,
      updatedAt: Date.now()
    };
  }
}

export default {
  SweepOperation,
  LoftOperation,
  SweepLoftFeatureManager,
  GeometryValidator
};

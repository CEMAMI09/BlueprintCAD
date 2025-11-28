import * as THREE from 'three';

/**
 * Draft Analysis - Analyzes and visualizes draft angles for manufacturing
 * Used for injection molding, casting, and other processes requiring draft
 */

export interface DraftAnalysisOptions {
  minDraftAngle: number; // Minimum acceptable draft angle in degrees (typically 1-3°)
  neutralPlane: THREE.Plane; // Reference plane for draft measurement
  direction: THREE.Vector3; // Pull direction (typically perpendicular to neutral plane)
  tolerance: number; // Angle tolerance for classification
  colorScheme: 'traffic-light' | 'heat-map' | 'binary';
}

export interface DraftAnalysisResult {
  success: boolean;
  faceAnalysis: FaceDraftInfo[];
  statistics: DraftStatistics;
  coloredGeometry?: THREE.BufferGeometry;
  warnings: string[];
  neutralPlane: THREE.Plane;
  direction: THREE.Vector3;
}

export interface FaceDraftInfo {
  faceIndex: number;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  draftAngle: number; // In degrees, positive = adequate draft, negative = undercut
  area: number;
  classification: 'adequate' | 'marginal' | 'insufficient' | 'undercut';
  color: THREE.Color;
}

export interface DraftStatistics {
  totalFaces: number;
  totalArea: number;
  adequateFaces: number;
  adequateArea: number;
  marginalFaces: number;
  marginalArea: number;
  insufficientFaces: number;
  insufficientArea: number;
  undercutFaces: number;
  undercutArea: number;
  averageDraftAngle: number;
  minDraftAngle: number;
  maxDraftAngle: number;
}

/**
 * Draft Analysis Engine
 */
export class DraftAnalyzer {
  /**
   * Analyze draft angles on a geometry
   */
  static analyze(
    geometry: THREE.BufferGeometry,
    options: DraftAnalysisOptions
  ): DraftAnalysisResult {
    const result: DraftAnalysisResult = {
      success: false,
      faceAnalysis: [],
      statistics: {
        totalFaces: 0,
        totalArea: 0,
        adequateFaces: 0,
        adequateArea: 0,
        marginalFaces: 0,
        marginalArea: 0,
        insufficientFaces: 0,
        insufficientArea: 0,
        undercutFaces: 0,
        undercutArea: 0,
        averageDraftAngle: 0,
        minDraftAngle: Infinity,
        maxDraftAngle: -Infinity
      },
      warnings: [],
      neutralPlane: options.neutralPlane.clone(),
      direction: options.direction.clone().normalize()
    };

    try {
      // Validate geometry
      if (!geometry.attributes.position) {
        result.warnings.push('Geometry missing position attribute');
        return result;
      }

      const position = geometry.attributes.position;
      const index = geometry.index;

      if (!index) {
        result.warnings.push('Geometry must be indexed');
        return result;
      }

      // Compute face normals if not present
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }

      // Analyze each face
      const faceCount = index.count / 3;
      let totalDraftAngle = 0;

      for (let i = 0; i < faceCount; i++) {
        const i0 = index.getX(i * 3);
        const i1 = index.getX(i * 3 + 1);
        const i2 = index.getX(i * 3 + 2);

        // Get vertices
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

        // Calculate face center
        const center = new THREE.Vector3()
          .add(v0)
          .add(v1)
          .add(v2)
          .divideScalar(3);

        // Calculate face normal
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        // Calculate face area
        const area = edge1.cross(edge2).length() / 2;

        // Calculate draft angle
        // Draft angle = angle between face normal and pull direction
        // 90° = perpendicular to pull (neutral), >90° = adequate draft, <90° = undercut
        const dotProduct = normal.dot(options.direction);
        const angleFromPerpendicular = Math.acos(Math.abs(dotProduct)) * (180 / Math.PI);
        
        // Convert to draft angle (0° = parallel to pull, 90° = perpendicular)
        let draftAngle = 90 - angleFromPerpendicular;
        
        // Determine if it's facing the right direction (positive draft) or undercut (negative)
        if (dotProduct < 0) {
          draftAngle = -Math.abs(draftAngle); // Undercut
        }

        // Classify face
        let classification: FaceDraftInfo['classification'];
        let color: THREE.Color;

        if (draftAngle < 0) {
          // Undercut - requires side actions or will prevent ejection
          classification = 'undercut';
          color = this.getColor(options.colorScheme, 'undercut');
          result.statistics.undercutFaces++;
          result.statistics.undercutArea += area;
        } else if (draftAngle < options.minDraftAngle - options.tolerance) {
          // Insufficient draft - likely to cause ejection problems
          classification = 'insufficient';
          color = this.getColor(options.colorScheme, 'insufficient');
          result.statistics.insufficientFaces++;
          result.statistics.insufficientArea += area;
        } else if (draftAngle < options.minDraftAngle + options.tolerance) {
          // Marginal draft - meets minimum but could be better
          classification = 'marginal';
          color = this.getColor(options.colorScheme, 'marginal');
          result.statistics.marginalFaces++;
          result.statistics.marginalArea += area;
        } else {
          // Adequate draft
          classification = 'adequate';
          color = this.getColor(options.colorScheme, 'adequate');
          result.statistics.adequateFaces++;
          result.statistics.adequateArea += area;
        }

        // Store face info
        result.faceAnalysis.push({
          faceIndex: i,
          center,
          normal,
          draftAngle,
          area,
          classification,
          color
        });

        totalDraftAngle += draftAngle;
        result.statistics.minDraftAngle = Math.min(result.statistics.minDraftAngle, draftAngle);
        result.statistics.maxDraftAngle = Math.max(result.statistics.maxDraftAngle, draftAngle);
      }

      result.statistics.totalFaces = faceCount;
      result.statistics.totalArea = 
        result.statistics.adequateArea +
        result.statistics.marginalArea +
        result.statistics.insufficientArea +
        result.statistics.undercutArea;
      result.statistics.averageDraftAngle = totalDraftAngle / faceCount;

      // Create colored geometry
      result.coloredGeometry = this.createColoredGeometry(geometry, result.faceAnalysis);

      // Generate warnings
      if (result.statistics.undercutFaces > 0) {
        result.warnings.push(
          `${result.statistics.undercutFaces} faces have undercuts requiring side actions`
        );
      }
      if (result.statistics.insufficientFaces > 0) {
        result.warnings.push(
          `${result.statistics.insufficientFaces} faces have insufficient draft (< ${options.minDraftAngle}°)`
        );
      }
      if (result.statistics.marginalFaces > 0) {
        result.warnings.push(
          `${result.statistics.marginalFaces} faces have marginal draft (~${options.minDraftAngle}°)`
        );
      }

      result.success = true;
      return result;

    } catch (error) {
      result.warnings.push(`Analysis failed: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Get color for classification based on color scheme
   */
  private static getColor(
    scheme: DraftAnalysisOptions['colorScheme'],
    classification: FaceDraftInfo['classification']
  ): THREE.Color {
    if (scheme === 'traffic-light') {
      switch (classification) {
        case 'adequate': return new THREE.Color(0x00ff00); // Green
        case 'marginal': return new THREE.Color(0xffff00); // Yellow
        case 'insufficient': return new THREE.Color(0xff8800); // Orange
        case 'undercut': return new THREE.Color(0xff0000); // Red
      }
    } else if (scheme === 'heat-map') {
      switch (classification) {
        case 'adequate': return new THREE.Color(0x0000ff); // Blue (cool)
        case 'marginal': return new THREE.Color(0x00ffff); // Cyan
        case 'insufficient': return new THREE.Color(0xffff00); // Yellow
        case 'undercut': return new THREE.Color(0xff0000); // Red (hot)
      }
    } else { // binary
      switch (classification) {
        case 'adequate':
        case 'marginal':
          return new THREE.Color(0x00ff00); // Green (pass)
        case 'insufficient':
        case 'undercut':
          return new THREE.Color(0xff0000); // Red (fail)
      }
    }
  }

  /**
   * Create geometry with vertex colors based on draft analysis
   */
  private static createColoredGeometry(
    originalGeometry: THREE.BufferGeometry,
    faceAnalysis: FaceDraftInfo[]
  ): THREE.BufferGeometry {
    const geometry = originalGeometry.clone();
    const position = geometry.attributes.position;
    const index = geometry.index!;
    
    // Create color attribute
    const colors = new Float32Array(position.count * 3);
    
    // Apply colors per face
    for (const face of faceAnalysis) {
      const i0 = index.getX(face.faceIndex * 3);
      const i1 = index.getX(face.faceIndex * 3 + 1);
      const i2 = index.getX(face.faceIndex * 3 + 2);
      
      // Set color for all three vertices
      for (const vertexIndex of [i0, i1, i2]) {
        colors[vertexIndex * 3] = face.color.r;
        colors[vertexIndex * 3 + 1] = face.color.g;
        colors[vertexIndex * 3 + 2] = face.color.b;
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }

  /**
   * Update neutral plane and reanalyze
   */
  static updateNeutralPlane(
    geometry: THREE.BufferGeometry,
    currentOptions: DraftAnalysisOptions,
    newPlane: THREE.Plane
  ): DraftAnalysisResult {
    const updatedOptions = {
      ...currentOptions,
      neutralPlane: newPlane,
      direction: newPlane.normal.clone().negate() // Pull direction opposite to plane normal
    };
    
    return this.analyze(geometry, updatedOptions);
  }

  /**
   * Update minimum draft angle and reanalyze
   */
  static updateMinDraftAngle(
    geometry: THREE.BufferGeometry,
    currentOptions: DraftAnalysisOptions,
    newMinAngle: number
  ): DraftAnalysisResult {
    const updatedOptions = {
      ...currentOptions,
      minDraftAngle: newMinAngle
    };
    
    return this.analyze(geometry, updatedOptions);
  }

  /**
   * Update color scheme and regenerate visualization
   */
  static updateColorScheme(
    result: DraftAnalysisResult,
    geometry: THREE.BufferGeometry,
    newScheme: DraftAnalysisOptions['colorScheme']
  ): DraftAnalysisResult {
    // Update colors in face analysis
    for (const face of result.faceAnalysis) {
      face.color = this.getColor(newScheme, face.classification);
    }
    
    // Regenerate colored geometry
    result.coloredGeometry = this.createColoredGeometry(geometry, result.faceAnalysis);
    
    return result;
  }

  /**
   * Export draft analysis results as metadata for Blueprint
   */
  static exportAsMetadata(result: DraftAnalysisResult): string {
    const metadata = {
      type: 'draft-analysis',
      timestamp: Date.now(),
      neutralPlane: {
        normal: result.neutralPlane.normal.toArray(),
        constant: result.neutralPlane.constant
      },
      direction: result.direction.toArray(),
      statistics: result.statistics,
      warnings: result.warnings,
      faceData: result.faceAnalysis.map(face => ({
        index: face.faceIndex,
        draftAngle: face.draftAngle,
        classification: face.classification,
        area: face.area
      }))
    };
    
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Import draft analysis metadata from Blueprint
   */
  static importFromMetadata(
    metadataJson: string,
    geometry: THREE.BufferGeometry
  ): DraftAnalysisResult | null {
    try {
      const metadata = JSON.parse(metadataJson);
      
      if (metadata.type !== 'draft-analysis') {
        return null;
      }
      
      const neutralPlane = new THREE.Plane(
        new THREE.Vector3().fromArray(metadata.neutralPlane.normal),
        metadata.neutralPlane.constant
      );
      
      const direction = new THREE.Vector3().fromArray(metadata.direction);
      
      // Reconstruct face analysis (without full geometry data)
      const faceAnalysis: FaceDraftInfo[] = metadata.faceData.map((data: any) => ({
        faceIndex: data.index,
        center: new THREE.Vector3(), // Would need to recalculate
        normal: new THREE.Vector3(), // Would need to recalculate
        draftAngle: data.draftAngle,
        area: data.area,
        classification: data.classification,
        color: new THREE.Color(0xcccccc) // Default, would need to recalculate
      }));
      
      return {
        success: true,
        faceAnalysis,
        statistics: metadata.statistics,
        warnings: metadata.warnings,
        neutralPlane,
        direction
      };
      
    } catch (error) {
      console.error('Failed to import draft analysis metadata:', error);
      return null;
    }
  }

  /**
   * Create default options for standard manufacturing processes
   */
  static getDefaultOptions(
    process: 'injection-molding' | 'die-casting' | 'sand-casting' = 'injection-molding'
  ): Partial<DraftAnalysisOptions> {
    switch (process) {
      case 'injection-molding':
        return {
          minDraftAngle: 2, // 2° typical for injection molding
          tolerance: 0.5,
          colorScheme: 'traffic-light'
        };
      case 'die-casting':
        return {
          minDraftAngle: 3, // 3° typical for die casting
          tolerance: 1,
          colorScheme: 'traffic-light'
        };
      case 'sand-casting':
        return {
          minDraftAngle: 5, // 5° typical for sand casting
          tolerance: 2,
          colorScheme: 'traffic-light'
        };
    }
  }
}

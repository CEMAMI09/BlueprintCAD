/**
 * Sweep and Loft Feature Tree Integration
 * 
 * Integrates sweep and loft operations with:
 * - Feature tree (DAG-based parametric history)
 * - Version control system (Blueprint versioning)
 * - Automatic geometry regeneration
 * - Dependency tracking
 */

import { FeatureTree, Feature, FeatureUpdateEvent } from './feature-tree';
import { 
  SweepOperation, 
  LoftOperation,
  SweepOptions,
  LoftOptions,
  SweepFeature,
  LoftFeature
} from './sweep-loft';
import * as THREE from 'three';

// ============================================================================
// Integration Types
// ============================================================================

export interface SweepLoftVersion {
  id: string;
  timestamp: number;
  featureId: string;
  type: 'sweep' | 'loft';
  parameters: SweepOptions | LoftOptions;
  geometry?: THREE.BufferGeometry;
  stats: {
    vertices: number;
    faces: number;
    volume?: number;
  };
  author?: string;
  description?: string;
}

export interface SweepLoftHistory {
  featureId: string;
  versions: SweepLoftVersion[];
  currentVersion: number;
}

// ============================================================================
// Feature Tree Integration
// ============================================================================

export class SweepLoftIntegration {
  private featureTree: FeatureTree;
  private history: Map<string, SweepLoftHistory> = new Map();
  private versionCallbacks: Array<(version: SweepLoftVersion) => void> = [];

  constructor(featureTree: FeatureTree) {
    this.featureTree = featureTree;
  }

  /**
   * Add a sweep feature to the feature tree
   */
  addSweepFeature(
    name: string,
    profileId: string,
    pathId: string,
    options: SweepOptions,
    metadata?: {
      author?: string;
      branchId?: string;
      description?: string;
    }
  ): { success: boolean; featureId?: string; error?: string } {
    try {
      // Generate geometry
      const result = SweepOperation.create(options);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Create feature
      const feature: Feature = {
        id: crypto.randomUUID(),
        type: 'sweep' as any,
        name,
        parameters: {
          profileId,
          pathId,
          ...options
        },
        geometry: result.geometry,
        suppressed: false
      };

      // Add to feature tree with dependencies
      const dependencies = [profileId, pathId];
      this.featureTree.addFeature(feature, dependencies, metadata);

      // Create initial version
      const version: SweepLoftVersion = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        featureId: feature.id,
        type: 'sweep',
        parameters: options,
        geometry: result.geometry,
        stats: result.stats,
        author: metadata?.author,
        description: metadata?.description || 'Initial sweep creation'
      };

      // Store in history
      this.history.set(feature.id, {
        featureId: feature.id,
        versions: [version],
        currentVersion: 0
      });

      // Notify callbacks
      this.versionCallbacks.forEach(cb => cb(version));

      return { success: true, featureId: feature.id };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a loft feature to the feature tree
   */
  addLoftFeature(
    name: string,
    profileIds: string[],
    options: LoftOptions,
    guideCurveIds?: string[],
    metadata?: {
      author?: string;
      branchId?: string;
      description?: string;
    }
  ): { success: boolean; featureId?: string; error?: string } {
    try {
      // Validate minimum profiles
      if (profileIds.length < 2) {
        return { success: false, error: 'Loft requires at least 2 profiles' };
      }

      // Generate geometry
      const result = LoftOperation.create(options);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Create feature
      const feature: Feature = {
        id: crypto.randomUUID(),
        type: 'loft' as any,
        name,
        parameters: {
          profileIds,
          guideCurveIds,
          ...options
        },
        geometry: result.geometry,
        suppressed: false
      };

      // Add to feature tree with dependencies
      const dependencies = [...profileIds, ...(guideCurveIds || [])];
      this.featureTree.addFeature(feature, dependencies, metadata);

      // Create initial version
      const version: SweepLoftVersion = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        featureId: feature.id,
        type: 'loft',
        parameters: options,
        geometry: result.geometry,
        stats: result.stats,
        author: metadata?.author,
        description: metadata?.description || 'Initial loft creation'
      };

      // Store in history
      this.history.set(feature.id, {
        featureId: feature.id,
        versions: [version],
        currentVersion: 0
      });

      // Notify callbacks
      this.versionCallbacks.forEach(cb => cb(version));

      return { success: true, featureId: feature.id };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update sweep feature parameters
   */
  updateSweepFeature(
    featureId: string,
    options: Partial<SweepOptions>,
    metadata?: {
      author?: string;
      description?: string;
    }
  ): { success: boolean; error?: string } {
    try {
      const feature = this.featureTree.getFeature(featureId);
      
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      if (feature.type !== 'sweep' as any) {
        return { success: false, error: 'Feature is not a sweep' };
      }

      // Merge options
      const newOptions = { ...feature.parameters, ...options };

      // Regenerate geometry
      const result = SweepOperation.create(newOptions as SweepOptions);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Update feature
      feature.parameters = newOptions;
      feature.geometry = result.geometry;

      // Create new version
      const history = this.history.get(featureId);
      if (history) {
        const version: SweepLoftVersion = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          featureId,
          type: 'sweep',
          parameters: newOptions as SweepOptions,
          geometry: result.geometry,
          stats: result.stats,
          author: metadata?.author,
          description: metadata?.description || 'Sweep parameter update'
        };

        history.versions.push(version);
        history.currentVersion = history.versions.length - 1;

        // Notify callbacks
        this.versionCallbacks.forEach(cb => cb(version));
      }

      // Trigger feature tree update to propagate changes
      this.featureTree.updateFeature(featureId, feature);

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update loft feature parameters
   */
  updateLoftFeature(
    featureId: string,
    options: Partial<LoftOptions>,
    metadata?: {
      author?: string;
      description?: string;
    }
  ): { success: boolean; error?: string } {
    try {
      const feature = this.featureTree.getFeature(featureId);
      
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      if (feature.type !== 'loft' as any) {
        return { success: false, error: 'Feature is not a loft' };
      }

      // Merge options
      const newOptions = { ...feature.parameters, ...options };

      // Regenerate geometry
      const result = LoftOperation.create(newOptions as LoftOptions);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Update feature
      feature.parameters = newOptions;
      feature.geometry = result.geometry;

      // Create new version
      const history = this.history.get(featureId);
      if (history) {
        const version: SweepLoftVersion = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          featureId,
          type: 'loft',
          parameters: newOptions as LoftOptions,
          geometry: result.geometry,
          stats: result.stats,
          author: metadata?.author,
          description: metadata?.description || 'Loft parameter update'
        };

        history.versions.push(version);
        history.currentVersion = history.versions.length - 1;

        // Notify callbacks
        this.versionCallbacks.forEach(cb => cb(version));
      }

      // Trigger feature tree update to propagate changes
      this.featureTree.updateFeature(featureId, feature);

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Regenerate feature when dependencies change
   */
  regenerateFeature(featureId: string): { success: boolean; error?: string } {
    try {
      const feature = this.featureTree.getFeature(featureId);
      
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      const featureType = feature.type as any;
      
      if (featureType === 'sweep') {
        const result = SweepOperation.create(feature.parameters as SweepOptions);
        
        if (!result.success) {
          return { success: false, error: result.error };
        }

        feature.geometry = result.geometry;
        this.featureTree.updateFeature(featureId, feature);

      } else if (featureType === 'loft') {
        const result = LoftOperation.create(feature.parameters as LoftOptions);
        
        if (!result.success) {
          return { success: false, error: result.error };
        }

        feature.geometry = result.geometry;
        this.featureTree.updateFeature(featureId, feature);

      } else {
        return { success: false, error: 'Unknown feature type' };
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get version history for a feature
   */
  getHistory(featureId: string): SweepLoftHistory | null {
    return this.history.get(featureId) || null;
  }

  /**
   * Revert to a previous version
   */
  revertToVersion(
    featureId: string,
    versionIndex: number
  ): { success: boolean; error?: string } {
    try {
      const history = this.history.get(featureId);
      
      if (!history) {
        return { success: false, error: 'No history found for feature' };
      }

      if (versionIndex < 0 || versionIndex >= history.versions.length) {
        return { success: false, error: 'Invalid version index' };
      }

      const version = history.versions[versionIndex];
      const feature = this.featureTree.getFeature(featureId);
      
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      // Restore parameters and geometry
      feature.parameters = version.parameters;
      feature.geometry = version.geometry;

      // Update current version
      history.currentVersion = versionIndex;

      // Update feature tree
      this.featureTree.updateFeature(featureId, feature);

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export feature history for version control system
   */
  exportHistory(featureId: string): string {
    const history = this.history.get(featureId);
    
    if (!history) return '{}';

    // Exclude geometry from export (too large)
    const exportData = {
      featureId: history.featureId,
      currentVersion: history.currentVersion,
      versions: history.versions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        type: v.type,
        parameters: v.parameters,
        stats: v.stats,
        author: v.author,
        description: v.description
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import feature history from version control system
   */
  importHistory(data: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(data);
      
      // Validate structure
      if (!imported.featureId || !imported.versions) {
        return { success: false, error: 'Invalid history data' };
      }

      // Recreate geometry for each version
      const versions: SweepLoftVersion[] = [];
      
      for (const v of imported.versions) {
        let geometry: THREE.BufferGeometry | undefined;
        
        if (v.type === 'sweep') {
          const result = SweepOperation.create(v.parameters);
          geometry = result.success ? result.geometry : undefined;
        } else if (v.type === 'loft') {
          const result = LoftOperation.create(v.parameters);
          geometry = result.success ? result.geometry : undefined;
        }

        versions.push({
          ...v,
          geometry
        });
      }

      // Store in history
      this.history.set(imported.featureId, {
        featureId: imported.featureId,
        versions,
        currentVersion: imported.currentVersion
      });

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Register callback for version changes
   */
  onVersionCreated(callback: (version: SweepLoftVersion) => void): void {
    this.versionCallbacks.push(callback);
  }

  /**
   * Get all sweep/loft features from feature tree
   */
  getAllFeatures(): Array<{ id: string; type: 'sweep' | 'loft'; name: string }> {
    const features: Array<{ id: string; type: 'sweep' | 'loft'; name: string }> = [];
    
    // Traverse feature tree
    const allFeatures = this.featureTree.getTopologicalOrder();
    
    for (const feature of allFeatures) {
      const featureType = feature.type as any;
      if (featureType === 'sweep' || featureType === 'loft') {
        features.push({
          id: feature.id,
          type: featureType,
          name: feature.name
        });
      }
    }

    return features;
  }

  /**
   * Delete feature and its history
   */
  deleteFeature(featureId: string): { success: boolean; error?: string } {
    try {
      // Remove from feature tree
      const result = this.featureTree.deleteFeature(featureId);
      
      if (!result.success) {
        return result;
      }

      // Remove from history
      this.history.delete(featureId);

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics for all sweep/loft features
   */
  getStatistics(): {
    totalFeatures: number;
    sweeps: number;
    lofts: number;
    totalVersions: number;
    totalVolume: number;
  } {
    let sweeps = 0;
    let lofts = 0;
    let totalVersions = 0;
    let totalVolume = 0;

    this.history.forEach(history => {
      totalVersions += history.versions.length;
      
      const currentVersion = history.versions[history.currentVersion];
      if (currentVersion.type === 'sweep') {
        sweeps++;
      } else {
        lofts++;
      }

      totalVolume += currentVersion.stats.volume || 0;
    });

    return {
      totalFeatures: this.history.size,
      sweeps,
      lofts,
      totalVersions,
      totalVolume
    };
  }
}

// ============================================================================
// React Hook for Easy Integration
// ============================================================================

export function useSweepLoftIntegration(featureTree: FeatureTree) {
  const integration = new SweepLoftIntegration(featureTree);

  return {
    integration,
    addSweep: integration.addSweepFeature.bind(integration),
    addLoft: integration.addLoftFeature.bind(integration),
    updateSweep: integration.updateSweepFeature.bind(integration),
    updateLoft: integration.updateLoftFeature.bind(integration),
    regenerate: integration.regenerateFeature.bind(integration),
    getHistory: integration.getHistory.bind(integration),
    revertToVersion: integration.revertToVersion.bind(integration),
    exportHistory: integration.exportHistory.bind(integration),
    importHistory: integration.importHistory.bind(integration),
    getAllFeatures: integration.getAllFeatures.bind(integration),
    deleteFeature: integration.deleteFeature.bind(integration),
    getStatistics: integration.getStatistics.bind(integration)
  };
}

export default SweepLoftIntegration;

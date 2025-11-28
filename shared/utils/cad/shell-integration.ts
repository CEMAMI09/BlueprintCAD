import * as THREE from 'three';
import { FeatureTree, FeatureNode } from './feature-tree';
import { Feature } from './geometry-kernel';
import { 
  ShellOptions, 
  ShellOperation, 
  ShellFeatureManager,
  ShellFeature 
} from './shell-operation';
import { useState, useEffect } from 'react';

/**
 * Version history for shell features
 */
export interface ShellVersion {
  id: string;
  timestamp: number;
  featureId: string;
  type: 'shell';
  parameters: ShellOptions;
  geometry?: THREE.BufferGeometry;
  stats: {
    originalVertices: number;
    originalFaces: number;
    shellVertices: number;
    shellFaces: number;
    removedFaces: number;
    wallThickness: number;
    volume: number;
    surfaceArea: number;
  };
  author?: string;
  description?: string;
}

/**
 * History record for a shell feature
 */
export interface ShellHistory {
  featureId: string;
  versions: ShellVersion[];
  currentVersion: number;
}

/**
 * Configuration for creating a shell feature
 */
export interface ShellFeatureConfig {
  name: string;
  sourceGeometryId: string;
  sourceGeometry: THREE.BufferGeometry;
  options: ShellOptions;
  metadata?: {
    author?: string;
    description?: string;
  };
}

/**
 * Result of adding a shell feature
 */
export interface AddShellResult {
  success: boolean;
  featureId?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Statistics for all shell features
 */
export interface ShellStatistics {
  totalFeatures: number;
  totalVersions: number;
  totalVolume: number;
  averageWallThickness: number;
  totalSurfaceArea: number;
}

/**
 * Integration layer for shell operations with feature tree and version control
 */
export class ShellIntegration {
  private featureTree: FeatureTree;
  private history: Map<string, ShellHistory>;
  private versionCallbacks: ((version: ShellVersion) => void)[];
  private maxVersionsPerFeature: number;

  constructor(featureTree: FeatureTree, maxVersionsPerFeature = 100) {
    this.featureTree = featureTree;
    this.history = new Map();
    this.versionCallbacks = [];
    this.maxVersionsPerFeature = maxVersionsPerFeature;
  }

  /**
   * Add a callback to be notified when a new version is created
   */
  onVersionCreated(callback: (version: ShellVersion) => void): void {
    this.versionCallbacks.push(callback);
  }

  /**
   * Add a new shell feature to the feature tree
   */
  addShellFeature(config: ShellFeatureConfig): AddShellResult {
    try {
      // Create the shell
      const result = ShellOperation.create(config.sourceGeometry, config.options);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          warnings: result.warnings
        };
      }

      // Create feature structure
      const shellFeature = ShellFeatureManager.createShellFeature(
        config.name,
        config.sourceGeometryId,
        result.geometry!,
        config.options
      );

      // Convert to Feature for tree
      const feature: Feature = {
        id: shellFeature.id,
        type: 'shell',
        name: shellFeature.name,
        parameters: {
          sourceGeometryId: config.sourceGeometryId,
          options: config.options
        },
        mesh: new THREE.Mesh(result.geometry!),
        suppressed: false
      };

      // Add to feature tree with dependency on source geometry
      this.featureTree.addFeature(feature, [config.sourceGeometryId]);

      // Create initial version
      const version: ShellVersion = {
        id: `${shellFeature.id}-v1`,
        timestamp: Date.now(),
        featureId: shellFeature.id,
        type: 'shell',
        parameters: config.options,
        geometry: result.geometry!.clone(),
        stats: result.stats!,
        author: config.metadata?.author,
        description: config.metadata?.description
      };

      // Store in history
      this.history.set(shellFeature.id, {
        featureId: shellFeature.id,
        versions: [version],
        currentVersion: 0
      });

      // Notify callbacks
      this.versionCallbacks.forEach(cb => cb(version));

      return {
        success: true,
        featureId: shellFeature.id,
        warnings: result.warnings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an existing shell feature with new options
   */
  updateShellFeature(
    featureId: string,
    options: Partial<ShellOptions>,
    metadata?: { author?: string; description?: string }
  ): AddShellResult {
    try {
      // Get existing feature node
      const state = this.featureTree.getState();
      const node = state.nodes.get(featureId);
      if (!node) {
        return { success: false, error: 'Feature not found' };
      }

      if (node.feature.type !== 'shell') {
        return { success: false, error: 'Feature is not a shell' };
      }

      // Get source geometry
      const sourceGeometryId = node.feature.parameters.sourceGeometryId;
      const sourceNode = state.nodes.get(sourceGeometryId);
      if (!sourceNode?.feature?.mesh?.geometry) {
        return { success: false, error: 'Source geometry not found' };
      }

      // Merge options
      const currentOptions = node.feature.parameters.options as ShellOptions;
      const newOptions: ShellOptions = {
        ...currentOptions,
        ...options
      };

      // Regenerate shell
      const result = ShellOperation.create(sourceNode.feature.mesh.geometry, newOptions);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          warnings: result.warnings
        };
      }

      // Update feature
      node.feature.parameters.options = newOptions;
      node.feature.mesh = new THREE.Mesh(result.geometry!);

      // Create new version
      const history = this.history.get(featureId);
      if (history) {
        const versionNumber = history.versions.length + 1;
        const version: ShellVersion = {
          id: `${featureId}-v${versionNumber}`,
          timestamp: Date.now(),
          featureId,
          type: 'shell',
          parameters: newOptions,
          geometry: result.geometry!.clone(),
          stats: result.stats!,
          author: metadata?.author,
          description: metadata?.description
        };

        history.versions.push(version);
        history.currentVersion = history.versions.length - 1;

        // Limit version history
        if (history.versions.length > this.maxVersionsPerFeature) {
          const excess = history.versions.length - this.maxVersionsPerFeature;
          history.versions.splice(0, excess);
          history.currentVersion -= excess;
        }

        // Notify callbacks
        this.versionCallbacks.forEach(cb => cb(version));
      }

      return {
        success: true,
        featureId,
        warnings: result.warnings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Regenerate a shell feature when its dependencies change
   */
  regenerateFeature(featureId: string): AddShellResult {
    try {
      const state = this.featureTree.getState();
      const node = state.nodes.get(featureId);
      if (!node) {
        return { success: false, error: 'Feature not found' };
      }

      if (node.feature.type !== 'shell') {
        return { success: false, error: 'Feature is not a shell' };
      }

      // Get source geometry
      const sourceGeometryId = node.feature.parameters.sourceGeometryId;
      const sourceNode = state.nodes.get(sourceGeometryId);
      if (!sourceNode?.feature?.mesh?.geometry) {
        return { success: false, error: 'Source geometry not found' };
      }

      // Regenerate with existing options
      const options = node.feature.parameters.options as ShellOptions;
      const result = ShellOperation.create(sourceNode.feature.mesh.geometry, options);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          warnings: result.warnings
        };
      }

      // Update feature
      node.feature.mesh = new THREE.Mesh(result.geometry!);

      return {
        success: true,
        featureId,
        warnings: result.warnings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get version history for a feature
   */
  getHistory(featureId: string): ShellHistory | null {
    return this.history.get(featureId) || null;
  }

  /**
   * Revert a feature to a previous version
   */
  revertToVersion(featureId: string, versionIndex: number): AddShellResult {
    try {
      const history = this.history.get(featureId);
      if (!history) {
        return { success: false, error: 'No history found for feature' };
      }

      if (versionIndex < 0 || versionIndex >= history.versions.length) {
        return { success: false, error: 'Invalid version index' };
      }

      const version = history.versions[versionIndex];
      const state = this.featureTree.getState();
      const node = state.nodes.get(featureId);
      if (!node) {
        return { success: false, error: 'Feature not found' };
      }

      // Restore parameters and geometry
      node.feature.parameters.options = version.parameters;
      node.feature.mesh = new THREE.Mesh(version.geometry!.clone());
      history.currentVersion = versionIndex;

      return { success: true, featureId };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export version history to JSON (for Blueprint version control)
   */
  exportHistory(featureId: string): string | null {
    const history = this.history.get(featureId);
    if (!history) return null;

    // Export without geometry to reduce size
    const exportData = {
      featureId: history.featureId,
      currentVersion: history.currentVersion,
      versions: history.versions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        featureId: v.featureId,
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
   * Import version history from JSON
   */
  importHistory(json: string, sourceGeometry: THREE.BufferGeometry): boolean {
    try {
      const data = JSON.parse(json);
      
      // Regenerate geometry for each version
      const versions: ShellVersion[] = data.versions.map((v: any) => {
        const result = ShellOperation.create(sourceGeometry, v.parameters);
        return {
          id: v.id,
          timestamp: v.timestamp,
          featureId: v.featureId,
          type: v.type,
          parameters: v.parameters,
          geometry: result.geometry!,
          stats: v.stats,
          author: v.author,
          description: v.description
        };
      });

      this.history.set(data.featureId, {
        featureId: data.featureId,
        versions,
        currentVersion: data.currentVersion
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all shell features from the tree
   */
  getAllFeatures(): Feature[] {
    const state = this.featureTree.getState();
    return Array.from(state.nodes.values())
      .filter((node: FeatureNode) => node.feature.type === 'shell')
      .map((node: FeatureNode) => node.feature);
  }

  /**
   * Delete a shell feature and its history
   */
  deleteFeature(featureId: string): boolean {
    this.history.delete(featureId);
    return this.featureTree.removeFeature(featureId);
  }

  /**
   * Get statistics about all shell features
   */
  getStatistics(): ShellStatistics {
    const features = this.getAllFeatures();
    let totalVersions = 0;
    let totalVolume = 0;
    let totalSurfaceArea = 0;
    let totalWallThickness = 0;

    features.forEach(feature => {
      const history = this.history.get(feature.id);
      if (history) {
        totalVersions += history.versions.length;
        const currentVersion = history.versions[history.currentVersion];
        if (currentVersion) {
          totalVolume += currentVersion.stats.volume;
          totalSurfaceArea += currentVersion.stats.surfaceArea;
          totalWallThickness += currentVersion.stats.wallThickness;
        }
      }
    });

    return {
      totalFeatures: features.length,
      totalVersions,
      totalVolume,
      averageWallThickness: features.length > 0 ? totalWallThickness / features.length : 0,
      totalSurfaceArea
    };
  }

  /**
   * Export all shell features and their history
   */
  exportAllHistory(): string {
    const allHistory: any[] = [];
    const state = this.featureTree.getState();
    
    this.history.forEach((history, featureId) => {
      const node = state.nodes.get(featureId);
      if (node) {
        allHistory.push({
          feature: {
            id: node.feature.id,
            name: node.feature.name,
            type: node.feature.type,
            parameters: node.feature.parameters,
            suppressed: node.feature.suppressed
          },
          history: {
            featureId: history.featureId,
            currentVersion: history.currentVersion,
            versions: history.versions.map(v => ({
              id: v.id,
              timestamp: v.timestamp,
              featureId: v.featureId,
              type: v.type,
              parameters: v.parameters,
              stats: v.stats,
              author: v.author,
              description: v.description
            }))
          }
        });
      }
    });

    return JSON.stringify(allHistory, null, 2);
  }

  /**
   * Import all shell features and their history
   */
  importAllHistory(json: string): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    try {
      const allHistory = JSON.parse(json);
      const state = this.featureTree.getState();

      for (const item of allHistory) {
        try {
          // Add feature to tree
          const feature: Feature = {
            ...item.feature,
            mesh: new THREE.Mesh(new THREE.BufferGeometry()) // Temporary empty geometry
          };

          // Will be regenerated from history
          const sourceGeometryId = feature.parameters.sourceGeometryId;
          const sourceNode = state.nodes.get(sourceGeometryId);
          
          if (!sourceNode?.feature?.mesh?.geometry) {
            failed++;
            continue;
          }

          // Regenerate geometry from current version
          const currentVersionData = item.history.versions[item.history.currentVersion];
          const result = ShellOperation.create(sourceNode.feature.mesh.geometry, currentVersionData.parameters);
          
          if (result.success) {
            feature.mesh = new THREE.Mesh(result.geometry!);
            this.featureTree.addFeature(feature, [sourceGeometryId]);

            // Regenerate all versions
            const versions: ShellVersion[] = item.history.versions.map((v: any) => {
              const versionResult = ShellOperation.create(sourceNode.feature.mesh!.geometry, v.parameters);
              return {
                id: v.id,
                timestamp: v.timestamp,
                featureId: v.featureId,
                type: v.type,
                parameters: v.parameters,
                geometry: versionResult.geometry!,
                stats: v.stats,
                author: v.author,
                description: v.description
              };
            });

            this.history.set(feature.id, {
              featureId: item.history.featureId,
              versions,
              currentVersion: item.history.currentVersion
            });

            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    } catch {
      return { success: 0, failed: 0 };
    }

    return { success, failed };
  }
}

/**
 * React hook for using shell integration in components
 */
export function useShellIntegration(featureTree: FeatureTree | null) {
  const [integration, setIntegration] = useState<ShellIntegration | null>(null);

  useEffect(() => {
    if (featureTree) {
      setIntegration(new ShellIntegration(featureTree));
    }
  }, [featureTree]);

  return {
    integration,
    
    addShellFeature: (config: ShellFeatureConfig) => 
      integration?.addShellFeature(config) || { success: false, error: 'Integration not ready' },
    
    updateShellFeature: (featureId: string, options: Partial<ShellOptions>, metadata?: any) =>
      integration?.updateShellFeature(featureId, options, metadata) || { success: false, error: 'Integration not ready' },
    
    regenerateFeature: (featureId: string) =>
      integration?.regenerateFeature(featureId) || { success: false, error: 'Integration not ready' },
    
    getHistory: (featureId: string) =>
      integration?.getHistory(featureId) || null,
    
    revertToVersion: (featureId: string, versionIndex: number) =>
      integration?.revertToVersion(featureId, versionIndex) || { success: false, error: 'Integration not ready' },
    
    exportHistory: (featureId: string) =>
      integration?.exportHistory(featureId) || null,
    
    importHistory: (json: string, sourceGeometry: THREE.BufferGeometry) =>
      integration?.importHistory(json, sourceGeometry) || false,
    
    getAllFeatures: () =>
      integration?.getAllFeatures() || [],
    
    deleteFeature: (featureId: string) =>
      integration?.deleteFeature(featureId) || false,
    
    getStatistics: () =>
      integration?.getStatistics() || {
        totalFeatures: 0,
        totalVersions: 0,
        totalVolume: 0,
        averageWallThickness: 0,
        totalSurfaceArea: 0
      },
    
    exportAllHistory: () =>
      integration?.exportAllHistory() || '[]',
    
    importAllHistory: (json: string) =>
      integration?.importAllHistory(json) || { success: 0, failed: 0 }
  };
}

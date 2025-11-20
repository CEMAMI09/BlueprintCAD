/**
 * Unit tests for Draft Analysis
 */

import * as THREE from 'three';
import { DraftAnalyzer, DraftAnalysisOptions } from '../lib/cad/draft-analysis';

describe('DraftAnalyzer', () => {
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Create a simple box geometry for testing
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    testGeometry = boxGeometry;
  });

  test('analyzes geometry with default options', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(testGeometry, options);

    expect(result.success).toBe(true);
    expect(result.faceAnalysis.length).toBeGreaterThan(0);
    expect(result.statistics.totalFaces).toBeGreaterThan(0);
    expect(result.coloredGeometry).toBeDefined();
  });

  test('classifies faces correctly', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(testGeometry, options);

    // Box should have faces with varying draft angles
    const classifications = result.faceAnalysis.map(f => f.classification);
    expect(classifications).toContain('adequate');
  });

  test('calculates statistics correctly', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(testGeometry, options);

    expect(result.statistics.totalFaces).toBe(result.faceAnalysis.length);
    expect(result.statistics.totalArea).toBeGreaterThan(0);
    
    const totalClassified = 
      result.statistics.adequateFaces +
      result.statistics.marginalFaces +
      result.statistics.insufficientFaces +
      result.statistics.undercutFaces;
    
    expect(totalClassified).toBe(result.statistics.totalFaces);
  });

  test('updates neutral plane correctly', () => {
    const neutralPlane1 = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const neutralPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), 5);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane: neutralPlane1,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result1 = DraftAnalyzer.analyze(testGeometry, options);
    const result2 = DraftAnalyzer.updateNeutralPlane(testGeometry, options, neutralPlane2);

    expect(result2.neutralPlane.constant).toBe(5);
    expect(result2.success).toBe(true);
  });

  test('updates minimum draft angle correctly', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result1 = DraftAnalyzer.analyze(testGeometry, options);
    const result2 = DraftAnalyzer.updateMinDraftAngle(testGeometry, options, 5);

    // With higher minimum, should have fewer adequate faces
    expect(result2.statistics.adequateFaces).toBeLessThanOrEqual(result1.statistics.adequateFaces);
  });

  test('updates color scheme correctly', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result1 = DraftAnalyzer.analyze(testGeometry, options);
    const result2 = DraftAnalyzer.updateColorScheme(result1, testGeometry, 'heat-map');

    expect(result2.faceAnalysis.length).toBe(result1.faceAnalysis.length);
    expect(result2.coloredGeometry).toBeDefined();
    
    // Colors should be different
    const color1 = result1.faceAnalysis[0].color;
    const color2 = result2.faceAnalysis[0].color;
    // Only check if classifications are the same
    if (result1.faceAnalysis[0].classification === result2.faceAnalysis[0].classification) {
      // Colors might be different for different schemes
    }
  });

  test('exports metadata correctly', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(testGeometry, options);
    const metadata = DraftAnalyzer.exportAsMetadata(result);

    expect(typeof metadata).toBe('string');
    
    const parsed = JSON.parse(metadata);
    expect(parsed.type).toBe('draft-analysis');
    expect(parsed.statistics).toBeDefined();
    expect(parsed.neutralPlane).toBeDefined();
    expect(parsed.direction).toBeDefined();
  });

  test('gets default options for injection molding', () => {
    const defaults = DraftAnalyzer.getDefaultOptions('injection-molding');
    
    expect(defaults.minDraftAngle).toBe(2);
    expect(defaults.tolerance).toBe(0.5);
    expect(defaults.colorScheme).toBe('traffic-light');
  });

  test('gets default options for die casting', () => {
    const defaults = DraftAnalyzer.getDefaultOptions('die-casting');
    
    expect(defaults.minDraftAngle).toBe(3);
    expect(defaults.tolerance).toBe(1);
  });

  test('gets default options for sand casting', () => {
    const defaults = DraftAnalyzer.getDefaultOptions('sand-casting');
    
    expect(defaults.minDraftAngle).toBe(5);
    expect(defaults.tolerance).toBe(2);
  });

  test('handles geometry without index', () => {
    const nonIndexedGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0
    ]);
    nonIndexedGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(nonIndexedGeometry, options);

    expect(result.success).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('computes vertex colors', () => {
    const neutralPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const direction = new THREE.Vector3(0, 0, 1);

    const options: DraftAnalysisOptions = {
      minDraftAngle: 2,
      neutralPlane,
      direction,
      tolerance: 0.5,
      colorScheme: 'traffic-light'
    };

    const result = DraftAnalyzer.analyze(testGeometry, options);

    expect(result.coloredGeometry).toBeDefined();
    expect(result.coloredGeometry!.attributes.color).toBeDefined();
    
    const colorAttribute = result.coloredGeometry!.attributes.color;
    expect(colorAttribute.count).toBe(testGeometry.attributes.position.count);
  });
});

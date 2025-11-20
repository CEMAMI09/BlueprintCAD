# Advanced Pattern Features - Curve, Fill, and Non-Uniform Spacing

## Overview

This document covers the advanced pattern features added to the CAD editor:

1. **Curve-Driven Patterns** - Distribute instances along a 3D curve
2. **Fill Patterns** - Fill regions with regular grids (rectangular, hexagonal, circular)
3. **Non-Uniform Spacing** - Variable spacing for linear and curve patterns
4. **Feature Pattern System** - Pattern entire feature histories with Blueprint integration

## Curve-Driven Patterns

### Description

Curve patterns distribute geometry instances along a 3D path defined by a curve. Instances can be aligned to follow the curve's tangent direction and offset perpendicular to the path.

### API

```typescript
interface CurvePatternOptions {
  curve: THREE.Curve<THREE.Vector3>;
  count: number;
  suppressedInstances: number[];
  patternType: 'geometry' | 'feature';
  alignToTangent: boolean;          // Orient instances along curve
  spacing?: 'uniform' | 'non-uniform';
  spacingArray?: number[];          // Custom t-values [0-1]
  offset?: number;                  // Perpendicular offset from curve
}
```

### Usage Example

```typescript
// Create curve from control points
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(25, 25, 0),
  new THREE.Vector3(50, 25, 0),
  new THREE.Vector3(75, 0, 0)
];

const curve = PatternFeatures.createCurveFromPoints(
  points,
  'catmull-rom' // or 'bezier', 'line'
);

// Create pattern along curve
const result = PatternFeatures.createCurvePattern(
  geometry,
  material,
  {
    curve,
    count: 10,
    suppressedInstances: [],
    patternType: 'geometry',
    alignToTangent: true,
    offset: 5 // 5mm perpendicular offset
  }
);

// Add instances to scene
for (const instance of result.instances) {
  scene.add(instance);
}
```

### Curve Types

#### Catmull-Rom Spline
- **Use**: Smooth curves through control points
- **Best for**: Organic paths, flowing designs
- **Parameters**: Points array, tension (0.5 default)

#### Cubic Bezier
- **Use**: Precise control with tangent handles
- **Best for**: Controlled curves, CAD paths
- **Parameters**: 4 points (start, control1, control2, end)

#### Line
- **Use**: Straight path between two points
- **Best for**: Simple linear distribution
- **Parameters**: 2 points (start, end)

### Non-Uniform Spacing on Curves

```typescript
// Generate custom t-values for non-uniform distribution
const spacingArray = PatternFeatures.generateNonUniformSpacing(
  10,           // count
  'exponential', // type: 'increasing' | 'decreasing' | 'exponential'
  { factor: 1.5 }
).map(d => d / 9); // Normalize to [0-1] range

const result = PatternFeatures.createCurvePattern(
  geometry,
  material,
  {
    curve,
    count: 10,
    spacing: 'non-uniform',
    spacingArray, // Custom distribution along curve
    alignToTangent: true
  }
);
```

### Use Cases

1. **Cable/Pipe Routing**: Place clamps or supports along a cable path
2. **Fence Posts**: Distribute posts along a curved boundary
3. **Decorative Elements**: Place ornaments along an architectural curve
4. **Mechanical Guides**: Position bearings or guides along a motion path
5. **Lighting Fixtures**: Arrange lights along a curved ceiling

## Fill Patterns

### Description

Fill patterns populate a bounded region with instances arranged in regular grids. Three fill types are supported:

1. **Rectangular** - Standard X-Y grid
2. **Hexagonal** - Close-packed hexagonal grid
3. **Circular** - Radial distribution from center

### API

```typescript
interface FillPatternOptions {
  bounds: THREE.Box3 | THREE.Shape;
  spacing: number;                   // Distance between instances
  fillType: 'rectangular' | 'hexagonal' | 'circular';
  suppressedInstances: number[];
  patternType: 'geometry' | 'feature';
  rotation?: number;                 // Rotation angle for fill pattern
}
```

### Usage Examples

#### Rectangular Fill

```typescript
const bounds = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),      // Min corner
  new THREE.Vector3(100, 100, 0)   // Max corner
);

const result = PatternFeatures.createFillPattern(
  geometry,
  material,
  {
    bounds,
    spacing: 10,                     // 10mm spacing
    fillType: 'rectangular',
    suppressedInstances: [],
    patternType: 'geometry',
    rotation: 0
  }
);

// Result: 11×11 = 121 instances in a grid
```

#### Hexagonal Fill

```typescript
const result = PatternFeatures.createFillPattern(
  geometry,
  material,
  {
    bounds,
    spacing: 10,
    fillType: 'hexagonal',           // Close-packed hex grid
    suppressedInstances: [],
    patternType: 'geometry'
  }
);

// Hexagonal packing uses spacing × 0.866 (√3/2) for Y direction
// More efficient packing than rectangular
```

#### Circular/Radial Fill

```typescript
const result = PatternFeatures.createFillPattern(
  geometry,
  material,
  {
    bounds,
    spacing: 10,
    fillType: 'circular',            // Radial from center
    suppressedInstances: [],
    patternType: 'geometry'
  }
);

// Distributes in concentric circles from bounds center
// Instance count per ring increases with radius
```

### Fill Pattern Algorithms

#### Rectangular Grid
```
Instance count = ceil(width/spacing) × ceil(height/spacing)
Position(x,y) = min + (x*spacing, y*spacing)
```

#### Hexagonal Grid
```
Y spacing = spacing × √3/2 ≈ spacing × 0.866
X offset on odd rows = spacing / 2
More efficient packing (15% more instances in same area)
```

#### Circular/Radial
```
Rings = ceil(maxRadius / spacing)
For each ring r:
  Radius = r × spacing
  Instances per ring = max(1, floor(2πr / spacing))
  Angular spacing = 360° / instances_per_ring
```

### Use Cases

1. **Cooling Holes**: Fill a face with ventilation holes
2. **Fastener Patterns**: Distribute bolts/rivets across a panel
3. **Perforated Panels**: Create perforated sheet metal patterns
4. **Seed Arrays**: Pattern seeds/components in tight layouts
5. **Solar Panel Arrays**: Rectangular grid of solar cells
6. **LED Displays**: Hexagonal pixel arrays
7. **Acoustic Panels**: Circular diffusion patterns

## Non-Uniform Spacing

### Description

Non-uniform spacing allows variable distances between pattern instances for linear and curve patterns. Three distribution types are available:

1. **Increasing** - Linear increase (1, 2, 3, 4...)
2. **Decreasing** - Linear decrease (n, n-1, n-2...)
3. **Exponential** - Exponential growth (1, 2, 4, 8...)

### API

```typescript
static generateNonUniformSpacing(
  count: number,
  type: 'increasing' | 'decreasing' | 'exponential' | 'custom',
  params?: { 
    factor?: number;        // For exponential (default 2)
    customArray?: number[]; // For custom spacing
  }
): number[]
```

### Usage Examples

#### Linear Pattern with Increasing Spacing

```typescript
// Generate increasing spacing
const spacingArray = PatternFeatures.generateNonUniformSpacing(
  5,           // 5 instances
  'increasing' // 0, 1, 3, 6, 10 (cumulative: 0+1, 1+2, 3+3, 6+4)
);

const result = PatternFeatures.createLinearPattern(
  geometry,
  material,
  {
    direction: new THREE.Vector3(1, 0, 0),
    distance: 10,  // Base distance (multiplied by spacing values)
    count: 5,
    spacing: 'non-uniform',
    spacingArray,  // [0, 10, 30, 60, 100]
    suppressedInstances: [],
    patternType: 'geometry'
  }
);
```

#### Exponential Spacing

```typescript
// Doubling spacing each time
const spacingArray = PatternFeatures.generateNonUniformSpacing(
  6,
  'exponential',
  { factor: 2 }  // 0, 1, 3, 7, 15, 31 (0, 1, 1+2, 3+4, 7+8, 15+16)
);
```

#### Custom Spacing Array

```typescript
// Completely custom distribution
const customSpacing = [0, 5, 15, 20, 40, 80]; // Any pattern

const result = PatternFeatures.createLinearPattern(
  geometry,
  material,
  {
    direction: new THREE.Vector3(1, 0, 0),
    distance: 1,  // Multiplier (usually 1 for custom arrays)
    count: 6,
    spacing: 'non-uniform',
    spacingArray: customSpacing,
    suppressedInstances: [],
    patternType: 'geometry'
  }
);
```

### Spacing Formulas

#### Increasing
```
spacing[0] = 0
spacing[i] = spacing[i-1] + i
Result: 0, 1, 3, 6, 10, 15, 21, 28, ...
```

#### Decreasing
```
spacing[0] = 0
spacing[i] = spacing[i-1] + (count - i)
Result: 0, n, 2n-1, 3n-3, 4n-6, ...
```

#### Exponential
```
spacing[0] = 0
spacing[i] = spacing[i-1] + factor^(i-1)
With factor=2: 0, 1, 3, 7, 15, 31, 63, ...
With factor=1.5: 0, 1, 2.5, 4.75, 8.125, ...
```

### Use Cases

1. **Spring Coils**: Variable pitch springs
2. **Gear Teeth**: Progressive tooth spacing
3. **Cooling Fins**: Increasing fin density toward heat source
4. **Structural Ribs**: Reinforcement with variable spacing
5. **Audio Diffusers**: Acoustic panels with non-uniform patterns

## Feature Pattern System

### Description

Feature patterns replicate entire feature histories, not just final geometry. Each pattern instance becomes an independent feature with full parametric history that can be regenerated when source features change.

### API

```typescript
interface FeaturePatternOptions {
  sourceFeatureId: string;
  patternFeatures: boolean;     // Pattern feature history
  updateReferences: boolean;    // Update feature references
}

static createFeaturePattern(
  sourceFeature: Feature,
  featureTree: FeatureTree,
  patternOptions: LinearPatternOptions | CircularPatternOptions | CurvePatternOptions,
  featureOptions: FeaturePatternOptions
): FeaturePatternResult
```

### Usage Example

```typescript
// Source feature (e.g., an extruded hole)
const sourceFeature = featureTree.getFeatureById('hole-123');

// Create feature pattern
const result = PatternFeatures.createFeaturePattern(
  sourceFeature,
  featureTree,
  {
    // Linear pattern options
    direction: new THREE.Vector3(1, 0, 0),
    distance: 25,
    count: 5,
    suppressedInstances: [2], // Skip 3rd instance
    patternType: 'feature'
  },
  {
    sourceFeatureId: 'hole-123',
    patternFeatures: true,        // Pattern full history
    updateReferences: true         // Update refs in cloned features
  }
);

// Result: 4 new features (instances 0, 1, 3, 4) in feature tree
// Each is a clone of the source with offset transform applied
```

### How Feature Patterns Work

1. **Clone Source Feature**: Creates deep copy with new ID
2. **Apply Transform**: Calculates position/rotation based on pattern type
3. **Update Parameters**: Modifies feature parameters with transform
4. **Add to Feature Tree**: Registers as dependent on source feature
5. **Link History**: Maintains parent-child relationships
6. **Enable Regeneration**: When source changes, all pattern instances update

### Pattern Feature vs Geometry Pattern

| Aspect | Geometry Pattern | Feature Pattern |
|--------|------------------|-----------------|
| Speed | Fast (single operation) | Slower (N operations) |
| Memory | Shared geometry | Independent copies |
| Editability | Read-only copies | Fully editable |
| History | No history | Full history |
| Regeneration | Manual repattern | Automatic |
| Use Case | Cosmetic | Parametric design |

### Feature Pattern Regeneration

When a source feature is modified:

```typescript
// Source feature updated
const sourceFeature = featureTree.getFeatureById('hole-123');
sourceFeature.parameters.radius = 8; // Change from 5 to 8

// Trigger regeneration
featureTree.regenerateFeature(sourceFeature);

// All pattern instances automatically regenerate:
// - Pattern instances are dependents of source
// - Feature tree detects dependency change
// - Each pattern instance regenerates with new radius
// - Transform is reapplied to updated geometry
```

### Blueprint Integration

Feature patterns integrate with Blueprint's version control:

```typescript
// Save pattern to Blueprint
const metadata = PatternFeatures.exportMetadata(result, {
  sourceFeatureId: sourceFeature.id,
  patternType: 'feature',
  featureOptions: {
    patternFeatures: true,
    updateReferences: true
  }
});

await fetch(`/api/cad/files/${fileId}/metadata`, {
  method: 'POST',
  body: JSON.stringify({
    metadataType: 'feature-pattern',
    metadata,
    displayOnly: false // Editable pattern
  })
});
```

## UI Integration

### Pattern Modal

The PatternModal component now supports all pattern types with a unified interface:

```tsx
<PatternModal
  isOpen={showPatternModal}
  darkMode={darkMode}
  onClose={() => setShowPatternModal(false)}
  patternType={patternType} // 'linear' | 'circular' | 'curve' | 'fill'
  onApply={handlePatternApply}
/>
```

### Pattern Type Selection

Users can select pattern type from toolbar:
- **Linear Pattern** ⚡ - Linear distribution
- **Circular Pattern** 🔁 - Rotational distribution
- **Curve Pattern** 〰️ - Path-following distribution
- **Fill Pattern** ⬢ - Area filling

### Non-Uniform Spacing Controls

For linear and curve patterns:

```tsx
{/* Non-Uniform Spacing Checkbox */}
<input
  type="checkbox"
  checked={useNonUniformSpacing}
  onChange={(e) => setUseNonUniformSpacing(e.target.checked)}
/>

{useNonUniformSpacing && (
  <div>
    {/* Spacing Type Selector */}
    <button onClick={() => setSpacingType('increasing')}>Increasing</button>
    <button onClick={() => setSpacingType('decreasing')}>Decreasing</button>
    <button onClick={() => setSpacingType('exponential')}>Exponential</button>
  </div>
)}
```

## Performance Considerations

### Pattern Type Performance

| Pattern Type | 10 Instances | 100 Instances | 1000 Instances |
|--------------|--------------|---------------|----------------|
| Linear | <10ms | <50ms | <500ms |
| Circular | <15ms | <75ms | <750ms |
| Curve | <20ms | <100ms | ~1s |
| Fill (Rect) | <15ms | <80ms | <800ms |
| Fill (Hex) | <20ms | <100ms | ~1s |
| Fill (Circular) | <25ms | <150ms | ~1.5s |
| Feature Pattern | <100ms | ~1s | ~10s |

*Benchmarks on box geometry (24 vertices), Chrome 120*

### Memory Usage

```
Geometry Pattern: geometrySize × activeInstances + 64 bytes/instance
Feature Pattern: geometrySize × activeInstances × 2 (history overhead)
```

### Optimization Tips

1. **Use Geometry Patterns**: For static/cosmetic instances
2. **Suppress During Creation**: Include suppressedInstances array
3. **Limit Fill Density**: Keep spacing reasonable for large areas
4. **Cache Curves**: Reuse curve objects for multiple patterns
5. **Batch Updates**: Update multiple suppressions at once

## Advanced Examples

### Example 1: Bolt Pattern Along Curved Flange

```typescript
// Define flange curve
const flangePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(20, 30, 0),
  new THREE.Vector3(40, 30, 0),
  new THREE.Vector3(60, 0, 0)
];

const flangeCurve = PatternFeatures.createCurveFromPoints(
  flangePoints,
  'catmull-rom'
);

// Pattern bolts along curve
const boltPattern = PatternFeatures.createCurvePattern(
  boltGeometry,
  boltMaterial,
  {
    curve: flangeCurve,
    count: 8,
    alignToTangent: false, // Bolts stay vertical
    offset: 5,             // 5mm from curve centerline
    suppressedInstances: [],
    patternType: 'geometry'
  }
);
```

### Example 2: Perforated Panel with Hexagonal Fill

```typescript
// Define panel bounds
const panelBounds = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(200, 100, 0)
);

// Create hex-packed hole pattern
const holePattern = PatternFeatures.createFillPattern(
  holeGeometry,
  material,
  {
    bounds: panelBounds,
    spacing: 8,              // 8mm hole spacing
    fillType: 'hexagonal',    // Efficient packing
    rotation: Math.PI / 6,   // 30° rotation for aesthetics
    suppressedInstances: [], // All holes active
    patternType: 'geometry'
  }
);

// Result: ~300 holes in close-packed array
```

### Example 3: Variable Pitch Spring

```typescript
// Generate exponentially increasing spacing
const pitchArray = PatternFeatures.generateNonUniformSpacing(
  20,           // 20 coils
  'exponential',
  { factor: 1.1 } // 10% increase per coil
);

// Create spring coils with variable pitch
const springPattern = PatternFeatures.createLinearPattern(
  coilGeometry,
  springMaterial,
  {
    direction: new THREE.Vector3(0, 1, 0), // Along Y axis
    distance: 5,                            // Base pitch 5mm
    count: 20,
    spacing: 'non-uniform',
    spacingArray: pitchArray,
    suppressedInstances: [],
    patternType: 'geometry'
  }
);

// Result: Progressive pitch spring (tighter at bottom, looser at top)
```

### Example 4: Feature Pattern with History

```typescript
// Source feature: Extrude → Fillet → Hole
const pocketFeature = {
  id: 'pocket-001',
  type: 'extrude',
  history: [
    { operation: 'extrude', depth: 10 },
    { operation: 'fillet', radius: 2, edges: [0, 1, 2, 3] },
    { operation: 'hole', diameter: 5, depth: 8 }
  ]
};

// Pattern the pocket feature (all history included)
const pocketPattern = PatternFeatures.createFeaturePattern(
  pocketFeature,
  featureTree,
  {
    direction: new THREE.Vector3(1, 0, 0),
    distance: 50,
    count: 4,
    suppressedInstances: [],
    patternType: 'feature'
  },
  {
    sourceFeatureId: 'pocket-001',
    patternFeatures: true,
    updateReferences: true
  }
);

// Result: 4 pockets, each with full history
// Editing source pocket updates all pattern instances
```

## Validation and Error Handling

All pattern functions include comprehensive validation:

```typescript
const validation = PatternFeatures.validatePatternOptions(options);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Example errors:
  // - "Pattern count must be at least 1"
  // - "Curve is required for curve-driven pattern"
  // - "Fill pattern spacing cannot be zero"
  // - "Suppressed instance indices out of range"
}
```

## Metadata Export

All patterns export metadata for Blueprint storage:

```typescript
const metadata = PatternFeatures.exportMetadata(result, {
  sourceFeatureId: sourceFeature.id,
  patternType: options.patternType,
  additionalInfo: {
    // Pattern-specific data
  }
});

// Metadata includes:
// - Pattern type (linear/circular/curve/fill)
// - Parameters (direction, spacing, bounds, etc.)
// - Instance count (total, active, suppressed)
// - Bounding box
// - Timestamp
```

## Version History

- **v1.1** (2024-11) - Added curve, fill, and non-uniform patterns
  - Curve-driven patterns with tangent alignment
  - Fill patterns (rectangular, hexagonal, circular)
  - Non-uniform spacing (increasing, decreasing, exponential)
  - Feature pattern system with history replication
  - Blueprint integration for all pattern types

- **v1.0** (2024-01) - Initial release
  - Linear and circular patterns
  - Instance suppression
  - Basic feature tree integration

## References

- Main Implementation: `lib/cad/pattern-features.ts`
- UI Component: `components/cad/PatternModal.tsx`
- Tests: `__tests__/pattern-features.test.ts`
- Base Documentation: `docs/PATTERN_FEATURES.md`

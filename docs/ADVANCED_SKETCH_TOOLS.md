# Advanced Sketch Tools

## Overview

Blueprint's advanced sketch tools provide comprehensive 2D parametric geometry creation with full version control integration. All geometry is drawn in a 2D sketch plane in Three.js and stored as parametric objects that sync with file versions.

## Supported Entity Types

### Basic Tools

#### Line
- **Tool**: `line`
- **Subtypes**: None
- **Usage**: Click start point, click end point
- **Parameters**: `points: [start, end]`

#### Point
- **Tool**: `point`
- **Subtypes**: None
- **Usage**: Click to place construction points
- **Parameters**: `points: [position]`

#### Polyline
- **Tool**: `polyline`
- **Subtypes**: None
- **Usage**: Click multiple points, press ESC to finish
- **Parameters**: `points: [p1, p2, ...], closed: boolean`

### Arc Variants

#### Center-Start-End Arc
- **Tool**: `arc`
- **Subtype**: `center-start-end`
- **Usage**: Click center → start point → end point
- **Parameters**: `center, radius, startAngle, endAngle, clockwise`
- **Algorithm**: Calculates angles using `Math.atan2()`

#### 3-Point Arc
- **Tool**: `arc`
- **Subtype**: `3-point`
- **Usage**: Click start → middle → end points
- **Parameters**: Computed center via circumcircle
- **Algorithm**: 
  - Finds perpendicular bisectors of two chords
  - Intersection = center
  - Distance to any point = radius

#### Tangent Arc
- **Tool**: `arc`
- **Subtype**: `tangent`
- **Usage**: Select two lines, specify radius
- **Parameters**: `center, radius, startAngle, endAngle`
- **Algorithm**: Creates arc tangent to both line directions

### Circles

#### Center-Radius Circle
- **Tool**: `circle`
- **Subtype**: `center-radius`
- **Usage**: Click center → edge point
- **Parameters**: `center, radius`

#### 3-Point Circle
- **Tool**: `circle`
- **Subtype**: `3-point`
- **Usage**: Click 3 points on circumference
- **Parameters**: Computed using 3-point arc algorithm
- **Algorithm**: Same as 3-point arc but with full 360° sweep

### B-Splines

#### Interpolated B-Spline
- **Tool**: `bspline`
- **Subtype**: `interpolated`
- **Usage**: Click points, curve passes through all points
- **Parameters**: `controlPoints, degree, knots`
- **Algorithm**: 
  - Chord-length parameterization
  - Clamped uniform knot vector
  - Control points = data points

#### Degree 2 (Quadratic)
- **Tool**: `bspline`
- **Subtype**: `degree-2`
- **Parameters**: `degree: 2`
- **Min Points**: 3

#### Degree 3 (Cubic)
- **Tool**: `bspline`
- **Subtype**: `degree-3`
- **Parameters**: `degree: 3` (default)
- **Min Points**: 4
- **Best For**: Smooth curves

#### Degree 4 (Quartic)
- **Tool**: `bspline`
- **Subtype**: `degree-4`
- **Parameters**: `degree: 4`
- **Min Points**: 5

### NURBS (Non-Uniform Rational B-Splines)
- **Tool**: `nurbs`
- **Usage**: Define control points with weights
- **Parameters**: `controlPoints, weights, degree, knots`
- **Features**: Supports exact conic sections (circles, ellipses)

### Ellipses

#### Center-Axes Ellipse
- **Tool**: `ellipse`
- **Subtype**: `center-axes`
- **Usage**: Click center → major axis → minor axis
- **Parameters**: `center, radiusX, radiusY, rotation`

#### 3-Point Ellipse
- **Tool**: `ellipse`
- **Subtype**: `3-point`
- **Usage**: Click 3 points defining the ellipse
- **Parameters**: Computed center and axes
- **Algorithm**:
  - Center = midpoint of p1-p3
  - Major axis = p1-p3 distance / 2
  - Minor axis calculated from p2 position

#### Elliptical Arc
- **Tool**: `ellipse`
- **Subtype**: `arc`
- **Usage**: Like ellipse but with start/end angles
- **Parameters**: `center, radiusX, radiusY, startAngle, endAngle, rotation`

### Shapes

#### Rectangle
- **Tool**: `rectangle`
- **Subtype**: `2-point`
- **Usage**: Click opposite corners
- **Parameters**: `points: [p1, p2, p3, p4], closed: true`

#### Regular Polygon
- **Tool**: `polygon`
- **Subtype**: `inscribed` or `circumscribed`
- **Usage**: Click center → edge point
- **Parameters**: `center, radius, sides, inscribed, rotation`
- **Inscribed**: Vertices on circle
- **Circumscribed**: Edges tangent to circle

## Operations

### Offset
- **Tool**: `offset`
- **Usage**: Select entity → specify distance
- **Behavior**:
  - **Lines**: Perpendicular offset
  - **Circles**: Radius adjustment
  - **Ellipses**: Proportional scaling
  - **Polygons**: Vertex displacement

### Trim
- **Tool**: `trim`
- **Usage**: Select entity → select trim boundaries
- **Algorithm**:
  - Finds intersection points
  - Splits entity into segments
  - Returns array of trimmed pieces

### Extend
- **Tool**: `extend`
- **Usage**: Select entity → select boundary to extend to
- **Algorithm**:
  - Projects entity direction
  - Finds intersection with boundary
  - Extends to intersection point

### Mirror
- **Tool**: `mirror`
- **Usage**: Select entities → select mirror axis
- **Behavior**: Creates mirrored copies across axis

## Parametric Storage

All sketch entities are stored with full parametric data:

```typescript
interface AdvancedSketchEntity {
  id: string;
  type: SketchEntityType;
  points: THREE.Vector2[];
  
  // Type-specific parameters
  radius?: number;
  center?: THREE.Vector2;
  controlPoints?: THREE.Vector2[];
  knots?: number[];
  degree?: number;
  weights?: number[]; // NURBS
  
  // Version control
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

## Version Control Integration

### Automatic Tracking
- Every entity creation increments version
- Modifications update `updatedAt` timestamp
- Changes sync to `cad_feature_trees` table

### File Structure
```json
{
  "sketch": {
    "id": "sketch-123",
    "entities": [
      {
        "id": "line-456",
        "type": "line",
        "points": [[0, 0], [10, 10]],
        "createdAt": 1700000000000,
        "updatedAt": 1700000000000,
        "version": 1
      },
      {
        "id": "arc-789",
        "type": "arc-3point",
        "points": [[0, 0], [5, 5], [10, 0]],
        "center": [5, 2.5],
        "radius": 3.54,
        "startAngle": 3.14,
        "endAngle": 0,
        "version": 1
      }
    ]
  }
}
```

### Sync Workflow
1. User creates/modifies entity
2. `handleSketchEntityCreated()` adds to feature tree
3. Feature tree marked dirty
4. Click 🔗 Sync button
5. POST to `/api/cad/files/feature-tree`
6. Stored in database with version + branch

## Algorithms

### B-Spline Evaluation (de Boor's Algorithm)

```typescript
function deBoor(
  controlPoints: Vector2[],
  knots: number[],
  degree: number,
  span: number,
  t: number
): Vector2 {
  const d: Vector2[] = [];
  
  // Initialize with control points in span range
  for (let i = 0; i <= degree; i++) {
    d[i] = controlPoints[span - degree + i].clone();
  }
  
  // De Boor recursion
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const alpha = (t - knots[span - degree + j]) / 
                   (knots[span + j - r + 1] - knots[span - degree + j]);
      d[j] = d[j] * alpha + d[j - 1] * (1 - alpha);
    }
  }
  
  return d[degree];
}
```

### Knot Vector Generation (Clamped Uniform)

```typescript
function generateKnotVector(numPoints: number, degree: number): number[] {
  const knots: number[] = [];
  
  // First (degree+1) knots are 0
  for (let i = 0; i <= degree; i++) {
    knots.push(0);
  }
  
  // Internal knots uniformly spaced
  for (let i = 1; i < numPoints - degree; i++) {
    knots.push(i / (numPoints - degree));
  }
  
  // Last (degree+1) knots are 1
  for (let i = 0; i <= degree; i++) {
    knots.push(1);
  }
  
  return knots;
}
```

### Ellipse Parametric Evaluation

```typescript
function evaluateEllipse(
  center: Vector2,
  radiusX: number,
  radiusY: number,
  rotation: number,
  t: number // 0 to 2π
): Vector2 {
  // Parametric ellipse
  const x = radiusX * Math.cos(t);
  const y = radiusY * Math.sin(t);
  
  // Rotate
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  return new Vector2(
    center.x + x * cos - y * sin,
    center.y + x * sin + y * cos
  );
}
```

## UI Components

### AdvancedSketchModal
- Category sidebar (Basic, Arcs, Curves, Shapes, Operations)
- Tool grid with icons and descriptions
- Subtype selection for tools with variants
- Keyboard shortcuts display
- Version control tips

### SketchCanvas
- Three.js 2D orthographic viewport
- Real-time preview while drawing
- Grid with snap-to-grid
- Status bar (tool, points, entities, snap state)
- Instructions overlay
- ESC to cancel current operation

## Usage Example

```typescript
import {
  ArcTools,
  BSplineTools,
  EllipseTools,
  PolygonTools,
  SketchOperations,
  SketchTessellation
} from '@/lib/cad/sketch-tools';

// Create 3-point arc
const arc = ArcTools.create3Point(
  new THREE.Vector2(0, 0),
  new THREE.Vector2(5, 5),
  new THREE.Vector2(10, 0)
);

// Create B-spline
const dataPoints = [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(2, 3),
  new THREE.Vector2(5, 2),
  new THREE.Vector2(8, 4)
];
const bspline = BSplineTools.createInterpolated(dataPoints, 3);

// Create ellipse
const ellipse = EllipseTools.createCenterAxes(
  new THREE.Vector2(0, 0),
  10, // major radius
  5,  // minor radius
  Math.PI / 4 // rotation
);

// Create polygon
const hexagon = PolygonTools.createInscribed(
  new THREE.Vector2(0, 0),
  5, // radius
  6  // sides
);

// Offset line
const offsetLine = SketchOperations.offset(lineEntity, 2.5);

// Convert to Three.js for rendering
const geometry = SketchTessellation.toThreeGeometry(arc);
const line = new THREE.Line(geometry, material);
```

## Keyboard Shortcuts

- **L**: Line tool
- **C**: Circle tool
- **A**: Arc tool
- **S**: Spline tool
- **R**: Rectangle tool
- **P**: Polygon tool
- **O**: Offset tool
- **T**: Trim tool
- **E**: Extend tool
- **ESC**: Cancel/finish current operation
- **G**: Toggle grid
- **Shift+S**: Toggle snap

## Best Practices

1. **Use Construction Geometry**: Mark guide lines as `construction: true`
2. **Snap to Grid**: Enable for precise alignment
3. **Version Frequently**: Sync to save parametric state
4. **Use Constraints**: Add dimensional/geometric constraints after sketching
5. **Branch for Experiments**: Use branches for alternative designs

## Performance

- **B-Spline Evaluation**: O(degree²) per point using de Boor
- **Tessellation**: 64 segments for circles/ellipses, 32 for arcs
- **Rendering**: Three.js BufferGeometry with line strips
- **Storage**: JSON serialization, ~100-500 bytes per entity

## Future Enhancements

- [ ] Spline editing with control point drag
- [ ] Arc fillet between lines
- [ ] Sketch constraints solver (parametric)
- [ ] Pattern along path
- [ ] Import DXF sketch entities
- [ ] Export to SVG
- [ ] Dimension annotations
- [ ] Construction plane rotation
- [ ] 3D sketch mode

## References

- **de Boor's Algorithm**: [Wikipedia](https://en.wikipedia.org/wiki/De_Boor%27s_algorithm)
- **B-Splines**: Piegl & Tiller, "The NURBS Book"
- **Three.js**: [Three.js Documentation](https://threejs.org/docs/)
- **Parametric Curves**: [Wolfram MathWorld](https://mathworld.wolfram.com/ParametricCurve.html)

---

**Version**: 1.0.0  
**Last Updated**: November 18, 2025  
**Status**: ✅ Production Ready

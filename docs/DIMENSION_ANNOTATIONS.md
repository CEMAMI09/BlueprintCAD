# Dimension Annotation System

Complete parametric dimension annotation system for Blueprint CAD with bidirectional geometry driving.

## Overview

The dimension annotation system provides:

- **Linear Dimensions**: Horizontal, vertical, and aligned measurements
- **Radial Dimensions**: Radius and diameter for circles/arcs
- **Angular Dimensions**: Angle measurements between lines
- **Driving Dimensions**: Constraints that control geometry
- **Reference Dimensions**: Display-only measurements
- **Edit-on-Double-Click**: Interactive value editing
- **Constraint Integration**: Automatic constraint solver sync
- **Feature Tree Propagation**: Version control integration

## Architecture

### Core Components

```
lib/cad/
├── dimension-annotations.ts    # Dimension types and geometry calculations
├── dimension-manager.ts        # Integration with constraint solver
└── dimension-integration.tsx   # React hooks and utilities

components/cad/
├── DimensionRenderer.tsx       # Canvas-based dimension rendering
├── DimensionEditor.tsx         # Modal for editing dimension values
└── DimensionToolbar.tsx        # Dimension creation tools
```

### Data Flow

```
User Edit → DimensionManager → ConstraintSolver → Solve → Update Geometry → Update Dimensions → Re-render
```

## Dimension Types

### Linear Dimension

Measures distance between two points.

```typescript
interface LinearDimension {
  type: 'linear';
  subtype: 'horizontal' | 'vertical' | 'aligned' | 'parallel';
  startPoint: THREE.Vector2;
  endPoint: THREE.Vector2;
  extensionLineOffset?: number;
  dimensionLinePosition?: number;
}
```

**Subtypes**:
- **Horizontal**: Measures horizontal distance (X-axis projection)
- **Vertical**: Measures vertical distance (Y-axis projection)
- **Aligned**: Measures direct distance between points
- **Parallel**: Similar to aligned, for parallel lines

**Keyboard Shortcut**: H (horizontal), V (vertical), A (aligned)

### Radial Dimension

Measures radius or diameter of circles and arcs.

```typescript
interface RadialDimension {
  type: 'radial';
  subtype: 'radius' | 'diameter';
  center: THREE.Vector2;
  radiusPoint?: THREE.Vector2;
  angle?: number; // Placement angle
}
```

**Subtypes**:
- **Radius**: Measures from center to circumference
- **Diameter**: Measures across full circle through center

**Keyboard Shortcut**: R (radius), D (diameter)

### Angular Dimension

Measures angle between two lines.

```typescript
interface AngularDimension {
  type: 'angular';
  vertex: THREE.Vector2;
  startRay: THREE.Vector2;
  endRay: THREE.Vector2;
  arcRadius?: number;
  isReflex?: boolean; // Measure reflex angle (>180°)
}
```

**Keyboard Shortcut**: G (angular)

## Driving vs Reference Dimensions

### Driving Dimension (Parametric)

- **Controls geometry** through constraint solver
- Creates a constraint (distance, angle, radius, etc.)
- Editing the value updates the geometry
- Shown with **solid color** text
- Icon: 📐

```typescript
const dimension = createLinearDimension(
  [entity1.id, entity2.id],
  startPoint,
  endPoint,
  'horizontal',
  true // isDriving = true
);
```

### Reference Dimension (Driven)

- **Displays measurement** without constraining
- No constraint created
- Updates automatically when geometry changes
- Shown with **gray** text and "REF" label
- Icon: 📏

```typescript
const dimension = createLinearDimension(
  [entity1.id, entity2.id],
  startPoint,
  endPoint,
  'horizontal',
  false // isDriving = false
);
```

## Usage

### Creating Dimensions

#### Method 1: Using Toolbar

1. Click dimension tool (H, V, A, R, D, or G)
2. Select required entities (1 or 2 depending on tool)
3. Dimension automatically created
4. Tool resets after creation

#### Method 2: Programmatically

```typescript
import { DimensionManager } from '@/lib/cad/dimension-manager';
import { createLinearDimension } from '@/lib/cad/dimension-annotations';

const manager = new DimensionManager(constraintSolver);

// Create linear dimension
const dimension = createLinearDimension(
  [line1.id, line2.id],
  new THREE.Vector2(0, 0),
  new THREE.Vector2(10, 0),
  'horizontal',
  true // driving
);

manager.addDimension(dimension);
```

### Editing Dimensions

#### Double-Click to Edit

1. Double-click any dimension
2. Modal opens with current value
3. Edit value, precision, units, etc.
4. Click "Apply Changes"
5. Constraint solver updates geometry

#### Programmatic Edit

```typescript
manager.updateDimensionValue(
  dimensionId,
  50.0, // new value
  {
    precision: 2,
    units: 'mm',
    isDriving: true,
    locked: false,
    label: 'Width',
    tolerance: { upper: 0.1, lower: 0.1 }
  }
);
```

### Dimension Properties

All dimensions support:

- **Value**: Current measurement (number)
- **Nominal Value**: Target value for driving dimensions
- **Precision**: Decimal places (0-4)
- **Units**: mm, cm, m, in, ft (or degrees for angular)
- **Tolerance**: Upper/lower tolerance values
- **Label**: Optional text label (e.g., "Width")
- **Locked**: Prevent automatic updates
- **Style**: standard, minimal, detailed
- **Color**: Custom color override

### Constraint Integration

Driving dimensions automatically create constraints:

| Dimension Type | Constraint Type | Parameters |
|---------------|----------------|------------|
| Linear (horizontal) | distance | Between two entities |
| Linear (vertical) | distance | Between two entities |
| Linear (aligned) | distance | Between two points |
| Radial (radius) | radius | Circle/arc radius |
| Radial (diameter) | diameter | Circle/arc diameter |
| Angular | angle | Between two lines |

When you edit a driving dimension:
1. Dimension value updates
2. Associated constraint value updates
3. Constraint solver runs
4. Geometry updates to satisfy constraint
5. All dimensions update from new geometry

## Integration with CAD Editor

### Step 1: Initialize System

```typescript
import { useRef, useState } from 'react';
import { ConstraintSolver } from '@/lib/cad/constraint-solver';
import { DimensionManager } from '@/lib/cad/dimension-manager';
import { useDimensionSystem } from '@/lib/cad/dimension-integration';

const solverRef = useRef(new ConstraintSolver());
const cameraRef = useRef<THREE.OrthographicCamera>(null);
const [entities, setEntities] = useState<SketchEntity[]>([]);

const dimensionSystem = useDimensionSystem(
  solverRef.current,
  cameraRef.current,
  entities
);
```

### Step 2: Add UI Components

```tsx
<>
  {/* Dimension Toolbar */}
  <DimensionToolbar
    darkMode={darkMode}
    activeTool={dimensionSystem.activeDimensionTool}
    onToolSelect={dimensionSystem.setActiveDimensionTool}
    onToggleDimensionDisplay={() => 
      dimensionSystem.setDimensionsVisible(!dimensionSystem.dimensionsVisible)
    }
    dimensionsVisible={dimensionSystem.dimensionsVisible}
    dimensionCount={dimensionSystem.dimensions.length}
  />
  
  {/* Dimension Renderer */}
  <DimensionRenderer
    dimensions={dimensionSystem.dimensions}
    camera={cameraRef.current}
    darkMode={darkMode}
    visible={dimensionSystem.dimensionsVisible}
    selectedDimensionId={dimensionSystem.selectedDimensionId}
    onDimensionClick={dimensionSystem.setSelectedDimensionId}
    onDimensionDoubleClick={dimensionSystem.setEditingDimensionId}
  />
  
  {/* Dimension Editor */}
  <DimensionEditor
    isOpen={dimensionSystem.editingDimensionId !== null}
    dimension={dimensionSystem.dimensions.find(
      d => d.id === dimensionSystem.editingDimensionId
    )}
    darkMode={darkMode}
    onClose={() => dimensionSystem.setEditingDimensionId(null)}
    onSave={dimensionSystem.handleEditDimension}
  />
</>
```

### Step 3: Handle Solver Updates

```typescript
const handleSolve = async () => {
  const result = await solverRef.current.solve();
  
  if (result.success) {
    // Update entities from solver
    updateEntitiesFromSolver(result.modifiedEntities);
    
    // Update dimension displays
    dimensionSystem.updateDimensionsAfterSolve();
    
    // Propagate to feature tree
    propagateToFeatureTree(result);
  }
};
```

## Feature Tree Integration

Dimensions propagate through the parametric feature tree:

```typescript
import { propagateDimensionToFeatureTree } from '@/lib/cad/dimension-integration';

// When dimension is created/modified
propagateDimensionToFeatureTree(
  dimension,
  featureTreeRef.current,
  user,
  currentFile
);
```

This creates a feature tree node with:
- **Type**: `dimension`
- **Dependencies**: Parent entities
- **Parameters**: Dimension properties
- **Version**: Timestamp and version number

When upstream features change, downstream dimensions automatically update.

## Version Control

Export/import dimension state for persistence:

```typescript
import {
  exportDimensionStateForVersionControl,
  importDimensionStateFromVersionControl
} from '@/lib/cad/dimension-integration';

// Export
const state = exportDimensionStateForVersionControl(dimensionManager);
await saveToDatabase(state);

// Import
const loadedState = await loadFromDatabase();
importDimensionStateFromVersionControl(dimensionManager, loadedState);
```

## Rendering

### Canvas Overlay

Dimensions render on a 2D canvas overlay above the Three.js viewport:

- **Extension Lines**: Dashed lines from entities to dimension line
- **Dimension Line**: Solid line with arrows
- **Arrows**: Directional indicators at endpoints
- **Text**: Value display with background box
- **Hover Effect**: Highlight on mouse hover
- **Selection**: Blue outline when selected

### Visual Indicators

- **Green Border**: Constraint satisfied
- **Orange Border**: Constraint unsatisfied
- **Gray Text**: Reference dimension (REF label)
- **Blue Highlight**: Selected dimension
- **🔒 Icon**: Locked dimension
- **Tolerance Text**: +/- values below main text

### Performance

- Canvas rendering (not WebGL)
- Only redraws on dimension changes
- High DPI support
- Efficient hit testing for clicks

## API Reference

### DimensionManager

```typescript
class DimensionManager {
  constructor(solver: ConstraintSolver);
  
  // Add/remove dimensions
  addDimension(dimension: Dimension): void;
  removeDimension(dimensionId: string): void;
  
  // Update dimension
  updateDimensionValue(
    dimensionId: string,
    newValue: number,
    options?: DimensionEditOptions
  ): void;
  
  // Sync with geometry
  updateDimensionsFromGeometry(): void;
  
  // Query dimensions
  getDimensions(): Dimension[];
  getDimension(id: string): Dimension | undefined;
  getDimensionsForEntities(entityIds: string[]): Dimension[];
  
  // Helpers
  createLinearDimensionFromEntities(...): LinearDimension | null;
  createRadialDimensionFromEntity(...): RadialDimension | null;
  createAngularDimensionFromEntities(...): AngularDimension | null;
  
  // Persistence
  exportState(): DimensionState;
  importState(state: DimensionState): void;
}
```

### Dimension Creation Functions

```typescript
createLinearDimension(
  entityIds: string[],
  startPoint: THREE.Vector2,
  endPoint: THREE.Vector2,
  subtype: 'horizontal' | 'vertical' | 'aligned',
  isDriving: boolean
): LinearDimension;

createRadialDimension(
  entityIds: string[],
  center: THREE.Vector2,
  radiusPoint: THREE.Vector2,
  subtype: 'radius' | 'diameter',
  isDriving: boolean
): RadialDimension;

createAngularDimension(
  entityIds: string[],
  vertex: THREE.Vector2,
  startRay: THREE.Vector2,
  endRay: THREE.Vector2,
  isDriving: boolean
): AngularDimension;
```

### Calculation Functions

```typescript
calculateDimensionValue(dimension: Dimension): number;
calculateDimensionGeometry(dimension: Dimension): DimensionGeometry;
formatDimensionValue(dimension: Dimension): string;
```

## Best Practices

### 1. Use Driving Dimensions for Design Intent

```typescript
// ✅ Good: Driving dimension controls width
const widthDim = createLinearDimension(
  [leftLine.id, rightLine.id],
  leftPoint,
  rightPoint,
  'horizontal',
  true // driving
);
widthDim.label = 'Width';
```

### 2. Use Reference Dimensions for Verification

```typescript
// ✅ Good: Reference dimension shows diagonal
const diagonalDim = createLinearDimension(
  [corner1.id, corner2.id],
  point1,
  point2,
  'aligned',
  false // reference
);
diagonalDim.label = 'Diagonal';
```

### 3. Set Appropriate Precision

```typescript
// Manufacturing: 2-3 decimals
dimension.precision = 2; // 10.00 mm

// High precision: 3-4 decimals
dimension.precision = 3; // 10.005 mm
```

### 4. Use Tolerances for Manufacturing

```typescript
dimension.tolerance = {
  upper: 0.1,  // +0.1
  lower: 0.05  // -0.05
};
// Displays as: 10.00 +0.1/-0.05
```

### 5. Lock Critical Dimensions

```typescript
// Prevent critical dimensions from being auto-adjusted
dimension.locked = true;
```

### 6. Update After Solving

```typescript
// Always update dimensions after constraint solving
const result = await solver.solve();
if (result.success) {
  dimensionManager.updateDimensionsFromGeometry();
}
```

## Troubleshooting

### Dimension Not Updating Geometry

**Problem**: Editing dimension value doesn't change geometry.

**Solution**: Ensure dimension is driving:
```typescript
dimension.isDriving = true;
dimension.nominalValue = newValue;
```

### Solver Fails After Dimension Edit

**Problem**: Constraint solver reports conflicts.

**Solution**: Check for over-constrained system:
```typescript
const stats = solver.getStatistics();
if (stats.degreesOfFreedom < 0) {
  // System is over-constrained
  // Remove conflicting constraints
}
```

### Dimension Text Overlapping

**Problem**: Multiple dimensions overlap.

**Solution**: Manually position text:
```typescript
dimension.textPosition = new THREE.Vector2(x, y);
dimension.textOffset = 10; // Increase offset
```

### Dimension Not Visible

**Problem**: Dimension exists but not rendering.

**Solution**: Check camera and visibility:
```typescript
// Ensure camera is set
<DimensionRenderer camera={cameraRef.current} />

// Ensure visibility is true
<DimensionRenderer visible={true} />
```

## Examples

### Example 1: Rectangle with Driving Dimensions

```typescript
// Create rectangle
const rect = createRectangle(0, 0, 100, 50);

// Add width dimension (driving)
const widthDim = manager.createLinearDimensionFromEntities(
  [rect.leftLine, rect.rightLine],
  'horizontal',
  true
);
widthDim.label = 'Width';
widthDim.nominalValue = 100;
manager.addDimension(widthDim);

// Add height dimension (driving)
const heightDim = manager.createLinearDimensionFromEntities(
  [rect.topLine, rect.bottomLine],
  'vertical',
  true
);
heightDim.label = 'Height';
heightDim.nominalValue = 50;
manager.addDimension(heightDim);

// Edit width to 120
manager.updateDimensionValue(widthDim.id, 120);
await solver.solve(); // Rectangle width becomes 120
```

### Example 2: Circle with Radius Dimension

```typescript
// Create circle
const circle = createCircle(0, 0, 25);

// Add radius dimension (driving)
const radiusDim = manager.createRadialDimensionFromEntity(
  circle,
  'radius',
  true
);
radiusDim.label = 'Radius';
manager.addDimension(radiusDim);

// Edit radius to 30
manager.updateDimensionValue(radiusDim.id, 30);
await solver.solve(); // Circle radius becomes 30
```

### Example 3: Angular Dimension with Tolerance

```typescript
// Create two lines at angle
const line1 = createLine(0, 0, 10, 0);
const line2 = createLine(0, 0, 7.07, 7.07);

// Add angular dimension (driving)
const angleDim = manager.createAngularDimensionFromEntities(
  [line1, line2],
  true
);
angleDim.label = 'Angle';
angleDim.nominalValue = 45; // degrees
angleDim.tolerance = { upper: 1, lower: 1 }; // ±1°
manager.addDimension(angleDim);

// Edit angle to 60°
manager.updateDimensionValue(angleDim.id, 60);
await solver.solve(); // Line2 rotates to 60°
```

## Performance Considerations

- Dimensions use canvas rendering (lightweight)
- Constraint solving is iterative (Newton-Raphson)
- Limit dimensions to ~100 per sketch for optimal performance
- Use reference dimensions when possible (no constraint overhead)
- Lock dimensions that shouldn't change to reduce solver load

## Future Enhancements

- [ ] Dimension arrays (pattern dimensions)
- [ ] Driven dimensions (auto-calculate from expressions)
- [ ] Dimension styles library
- [ ] Smart dimension placement algorithms
- [ ] Dimension import/export (DXF, DWG)
- [ ] Dimension animation during solving
- [ ] Dimension preview before placement
- [ ] Multi-select dimension editing

## Support

For issues or questions, see:
- [Constraint Solver Documentation](./CONSTRAINT_SOLVER.md)
- [Advanced Sketch Tools](./ADVANCED_SKETCH_TOOLS.md)
- [Feature Tree System](./FEATURE_TREE.md)

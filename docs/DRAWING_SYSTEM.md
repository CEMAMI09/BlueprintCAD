# 2D Drawing System Documentation

## Overview

The 2D Drawing System provides comprehensive engineering drawing generation from 3D BREP geometry. It supports multiple view types (orthographic, isometric, section, detail, auxiliary), automatic visible/hidden line classification, dimensions, annotations, and export to standard formats (PDF, DXF).

## Architecture

### Core Components

1. **DrawingSystem** (`lib/cad/drawing-system.ts`) - Core logic for drawing generation and management
2. **DrawingSheetViewer** (`components/cad/DrawingSheetViewer.tsx`) - Canvas-based 2D rendering component
3. **DrawingControls** (`components/cad/DrawingControls.tsx`) - UI controls for sheet/view management
4. **Drawing Editor** (`app/drawing-editor/page.tsx`) - Main editor page integrating all components

### Data Structures

```typescript
// View Types
type ViewType = 'orthographic' | 'isometric' | 'section' | 'detail' | 'auxiliary';
type OrthographicDirection = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type LineType = 'visible' | 'hidden' | 'centerline' | 'section' | 'phantom';

// Drawing View
interface DrawingView {
  id: string;
  type: ViewType;
  name: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  edges: DrawingEdge[];
  dimensions: Dimension[];
  annotations: DrawingAnnotation[];
  
  // View-specific parameters
  orthographicDirection?: OrthographicDirection;
  isometricAngle?: { x: number; y: number };
  sectionPlane?: { point: THREE.Vector3; normal: THREE.Vector3; cutawayDirection: THREE.Vector3 };
  detailSource?: { viewId: string; centerPoint: { x: number; y: number }; radius: number };
  auxiliaryPlane?: { normal: THREE.Vector3; up: THREE.Vector3 };
  
  // Display flags
  showHiddenLines: boolean;
  showCenterlines: boolean;
  showDimensions: boolean;
  showAnnotations: boolean;
}

// Drawing Edge
interface DrawingEdge {
  id: string;
  type: LineType;
  points: Array<{ x: number; y: number }>;
  sourceGeometry?: {
    vertexIndices: number[];
    faceIndex?: number;
  };
}

// Drawing Sheet
interface DrawingSheet {
  id: string;
  name: string;
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D' | 'E' | 'custom';
  width: number;  // mm
  height: number; // mm
  orientation: 'portrait' | 'landscape';
  projectionType: 'first-angle' | 'third-angle';
  views: DrawingView[];
  titleBlock: TitleBlock;
  sourceFileId?: number;
  sourceFileVersion?: number;
  createdAt: number;
  updatedAt: number;
}
```

## Standard Sheet Sizes

### ISO (Metric)
- **A0**: 841 × 1189 mm (33.1 × 46.8 inches)
- **A1**: 594 × 841 mm (23.4 × 33.1 inches)
- **A2**: 420 × 594 mm (16.5 × 23.4 inches)
- **A3**: 297 × 420 mm (11.7 × 16.5 inches)
- **A4**: 210 × 297 mm (8.3 × 11.7 inches)

### ANSI (Imperial)
- **B**: 11 × 17 inches (279 × 432 mm)
- **C**: 17 × 22 inches (432 × 559 mm)
- **D**: 22 × 34 inches (559 × 864 mm)
- **E**: 34 × 44 inches (864 × 1118 mm)

## View Types

### 1. Orthographic Views

Orthographic views show geometry projected onto 6 standard planes (front, back, left, right, top, bottom) using parallel projection. This is the most common type of engineering drawing view.

**Generation Process:**
1. Get orthographic camera for specified direction
2. Create projection matrix (camera projection × camera inverse)
3. Extract triangles from BufferGeometry
4. Project each vertex to 2D using projection matrix
5. Calculate face normals to determine visibility
6. Classify edges as visible (facing camera) or hidden (facing away)
7. Remove duplicate edges using edge set

**Usage:**
```typescript
const edges = drawingSystem.generateOrthographicView(mesh, 'front', 1.0);
```

**Visible/Hidden Line Classification:**
- Calculate triangle normal using cross product of edge vectors
- Compute dot product of normal with view direction
- If dot product < 0, face is visible; otherwise hidden
- Edges between two visible faces are visible lines
- Edges between visible and hidden faces are outline (visible)
- Edges between two hidden faces are hidden lines

### 2. Isometric Views

Isometric views show geometry rotated to display three faces simultaneously, using standard angles (35.264° around X-axis, 45° around Y-axis). All edges remain parallel and at true scale.

**Generation Process:**
1. Create rotation matrices for X and Y angles
2. Apply rotations to world matrix
3. Use orthographic projection for parallel lines
4. All edges shown as visible (isometric convention)

**Usage:**
```typescript
const edges = drawingSystem.generateIsometricView(mesh, 35.264, 45, 1.0);
```

**Standard Isometric Angles:**
- X-axis rotation: 35.264° (arctan(1/√2))
- Y-axis rotation: 45°
- Results in all three axes at 120° apart in 2D view

### 3. Section Views

Section views cut through geometry with a plane to reveal internal features. The cutting plane is defined by a point and normal vector.

**Generation Process:**
1. Create THREE.Plane from point and normal
2. For each triangle:
   - Calculate distance from vertices to plane
   - Find triangles that intersect plane (vertices on both sides)
   - Calculate line segment where triangle crosses plane
   - Add as section line (thick red)
3. Project remaining geometry behind cutting plane
4. Create view matrix perpendicular to section plane

**Usage:**
```typescript
const sectionPlane = {
  point: new THREE.Vector3(0, 0, 0),
  normal: new THREE.Vector3(1, 0, 0) // YZ plane
};
const edges = drawingSystem.generateSectionView(mesh, sectionPlane, 1.0);
```

**Section Line Calculation:**
```
For triangle with vertices V1, V2, V3:
- Calculate distances: d1 = (V1 - P) · N, d2 = (V2 - P) · N, d3 = (V3 - P) · N
- If sign(d1) ≠ sign(d2), edge V1-V2 crosses plane
- Intersection point: I = V1 + (V2 - V1) × (d1 / (d1 - d2))
```

### 4. Detail Views

Detail views show a zoomed portion of another view, typically used to clarify small features. A circular boundary defines the detail region.

**Generation Process:**
1. Get edges from source view
2. Filter edges within circular boundary (center point, radius)
3. Scale edges by detailScale / sourceScale ratio
4. Translate center point to origin
5. Copy edge styling from source view

**Usage:**
```typescript
const detailEdges = drawingSystem.generateDetailView(
  sourceView,
  { x: 100, y: 100 }, // center point in source view
  25, // radius in mm
  2.0 // 2x zoom
);
```

### 5. Auxiliary Views

Auxiliary views project geometry onto an arbitrary plane, useful for viewing features at odd angles that don't align with standard orthographic directions.

**Generation Process:**
1. Create view matrix from plane normal and up vector
2. Calculate right vector via cross product: right = up × normal
3. Build transformation matrix [right, up, normal]
4. Project all edges onto auxiliary plane
5. Classify visible/hidden lines using plane normal

**Usage:**
```typescript
const auxiliaryNormal = new THREE.Vector3(1, 1, 0).normalize();
const auxiliaryUp = new THREE.Vector3(0, 1, 0);
const edges = drawingSystem.generateAuxiliaryView(mesh, auxiliaryNormal, auxiliaryUp, 1.0);
```

## Line Types

### Visual Styling

| Type | Appearance | Color | Width | Pattern |
|------|-----------|-------|-------|---------|
| **visible** | Solid | Black/White | 0.5px | Solid |
| **hidden** | Dashed | Gray | 0.3px | [3, 2] |
| **centerline** | Dash-dot | Blue | 0.3px | [10, 3, 2, 3] |
| **section** | Thick solid | Red | 0.8px | Solid |
| **phantom** | Long-dash-dot | Purple | 0.3px | [15, 5, 2, 5] |

### Usage Conventions

- **Visible**: Object outlines, edges facing viewer
- **Hidden**: Edges behind other geometry, internal features
- **Centerline**: Axes of symmetry, circles, holes
- **Section**: Cutting plane lines, section hatch
- **Phantom**: Alternate positions, adjacent parts

## Canvas Rendering

The DrawingSheetViewer component renders sheets using HTML5 Canvas 2D context.

### Rendering Pipeline

```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // 1. Set canvas size
  canvas.width = sheet.width * scale;
  canvas.height = sheet.height * scale;
  
  // 2. Fill background
  ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 3. Draw sheet border
  ctx.strokeStyle = darkMode ? '#4b5563' : '#d1d5db';
  ctx.lineWidth = 2;
  ctx.strokeRect(10 * scale, 10 * scale, ...);
  
  // 4. Draw title block
  drawTitleBlock(ctx, sheet, scale, darkMode);
  
  // 5. Draw all views
  for (const view of sheet.views) {
    drawView(ctx, view, scale, darkMode, isSelected, isHovered);
  }
}, [sheet, scale, darkMode, selectedViewId, hoveredView]);
```

### Drawing Functions

**drawView():**
```typescript
// Apply view transform
ctx.save();
ctx.translate(view.position.x * scale, view.position.y * scale);
ctx.scale(view.scale, view.scale);
ctx.rotate(view.rotation);

// Draw selection border
if (isSelected) {
  ctx.strokeStyle = '#3b82f6'; // blue
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

// Draw edges
for (const edge of view.edges) {
  drawEdge(ctx, edge, darkMode, view);
}

// Draw dimensions
if (view.showDimensions) {
  for (const dim of view.dimensions) {
    drawDimension(ctx, dim, darkMode);
  }
}

ctx.restore();
```

**drawEdge():**
```typescript
ctx.beginPath();
ctx.moveTo(edge.points[0].x, edge.points[0].y);
for (let i = 1; i < edge.points.length; i++) {
  ctx.lineTo(edge.points[i].x, edge.points[i].y);
}

// Set style based on edge type
switch (edge.type) {
  case 'visible':
    ctx.strokeStyle = darkMode ? '#ffffff' : '#000000';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    break;
  case 'hidden':
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([3, 2]);
    break;
  case 'centerline':
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([10, 3, 2, 3]);
    break;
  case 'section':
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([]);
    break;
}

ctx.stroke();
```

## File Version Sync

The drawing system tracks the source file ID and version to detect when drawings are out of sync with the 3D model.

### Sync Workflow

1. **Create Drawing from Part:**
   ```typescript
   const sheet = drawingSystem.createSheet('Drawing 1', 'A3', 'landscape');
   const view = drawingSystem.addView(sheet.id, 'orthographic', 'Front View', {x: 50, y: 50}, 1);
   
   // Generate from part geometry
   view.edges = drawingSystem.generateOrthographicView(partMesh, 'front', 1);
   
   // Link to source file
   await drawingSystem.syncWithSourceFile(sheet.id, partFileId, partFileVersion);
   ```

2. **Check Sync Status:**
   ```typescript
   const sheet = drawingSystem.getSheet(sheetId);
   const isInSync = sheet.sourceFileVersion === currentPartVersion;
   ```

3. **Update to Latest Version:**
   ```typescript
   // Load latest part geometry
   const latestPartMesh = await loadPart(sheet.sourceFileId);
   
   // Regenerate all views
   for (const view of sheet.views) {
     view.edges = regenerateView(view, latestPartMesh);
   }
   
   // Update version
   await drawingSystem.syncWithSourceFile(sheet.id, sheet.sourceFileId, latestPartVersion);
   ```

### Sync Status Indicator

```typescript
{sheet.sourceFileId && sheet.sourceFileVersion && (
  <div className="flex items-center gap-2">
    {isInSync ? (
      <span className="text-green-500">✓ In Sync</span>
    ) : (
      <span className="text-orange-500">⚠ Out of Sync</span>
    )}
    <button 
      disabled={isInSync}
      onClick={() => handleSyncWithFile(sheet.sourceFileId!, latestVersion)}
    >
      🔄 Sync to Latest
    </button>
  </div>
)}
```

## Export Formats

### PDF Export

Export drawings to PDF for printing, sharing, and archival.

**Implementation (using jsPDF):**
```typescript
import { jsPDF } from 'jspdf';

const handleExportPDF = () => {
  const pdf = new jsPDF({
    orientation: sheet.orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: [sheet.width, sheet.height]
  });
  
  // Render title block
  pdf.setFontSize(16);
  pdf.text(sheet.titleBlock.title, 20, 20);
  
  // Render each view
  for (const view of sheet.views) {
    pdf.setLineWidth(0.1);
    
    for (const edge of view.edges) {
      const [p1, p2] = edge.points;
      
      // Set line style
      if (edge.type === 'hidden') {
        pdf.setLineDash([3, 2]);
      } else if (edge.type === 'centerline') {
        pdf.setLineDash([10, 3, 2, 3]);
      } else {
        pdf.setLineDash([]);
      }
      
      pdf.line(
        view.position.x + p1.x * view.scale,
        view.position.y + p1.y * view.scale,
        view.position.x + p2.x * view.scale,
        view.position.y + p2.y * view.scale
      );
    }
  }
  
  pdf.save(`${sheet.name}.pdf`);
};
```

### DXF Export

Export drawings to DXF (Drawing Exchange Format) for CAD interoperability.

**DXF Structure:**
```
SECTION
HEADER
  $ACADVER
  AC1015
ENDSEC

SECTION
TABLES
  TABLE
  LAYER
    LAYER
    0
    2
    VISIBLE
    ...
  ENDTAB
ENDSEC

SECTION
ENTITIES
  LINE
  8
  VISIBLE
  10
  50.0
  20
  100.0
  11
  150.0
  21
  100.0
  ...
ENDSEC

EOF
```

**Implementation:**
```typescript
const handleExportDXF = () => {
  let dxf = '';
  
  // Header
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000 format
  dxf += '0\nENDSEC\n';
  
  // Tables (layers)
  dxf += '0\nSECTION\n2\nTABLES\n';
  dxf += '0\nTABLE\n2\nLAYER\n';
  
  const layers = ['VISIBLE', 'HIDDEN', 'CENTERLINE', 'SECTION'];
  for (const layer of layers) {
    dxf += `0\nLAYER\n2\n${layer}\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  }
  
  dxf += '0\nENDTAB\n0\nENDSEC\n';
  
  // Entities
  dxf += '0\nSECTION\n2\nENTITIES\n';
  
  for (const view of sheet.views) {
    for (const edge of view.edges) {
      const layer = edge.type.toUpperCase();
      const [p1, p2] = edge.points;
      
      dxf += '0\nLINE\n';
      dxf += `8\n${layer}\n`; // Layer
      dxf += `10\n${view.position.x + p1.x * view.scale}\n`; // Start X
      dxf += `20\n${view.position.y + p1.y * view.scale}\n`; // Start Y
      dxf += `11\n${view.position.x + p2.x * view.scale}\n`; // End X
      dxf += `21\n${view.position.y + p2.y * view.scale}\n`; // End Y
    }
  }
  
  dxf += '0\nENDSEC\n0\nEOF\n';
  
  // Download
  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sheet.name}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

## API Reference

### DrawingSystem Class

#### Constructor
```typescript
const drawingSystem = new DrawingSystem();
```

#### Sheet Management

**createSheet(name, size, orientation)**
- Creates a new drawing sheet
- Returns: `DrawingSheet`
- Parameters:
  - `name: string` - Sheet name
  - `size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D' | 'E' | 'custom'`
  - `orientation: 'portrait' | 'landscape'`

**getSheet(id)**
- Gets a sheet by ID
- Returns: `DrawingSheet | undefined`

**getAllSheets()**
- Gets all sheets
- Returns: `DrawingSheet[]`

**deleteSheet(id)**
- Deletes a sheet
- Returns: `void`

#### View Management

**addView(sheetId, type, name, position, scale)**
- Adds a view to a sheet
- Returns: `DrawingView`
- Parameters:
  - `sheetId: string`
  - `type: ViewType`
  - `name: string`
  - `position: { x: number; y: number }`
  - `scale: number`

**generateOrthographicView(mesh, direction, scale)**
- Generates orthographic view from mesh
- Returns: `DrawingEdge[]`
- Parameters:
  - `mesh: THREE.Mesh`
  - `direction: OrthographicDirection`
  - `scale: number`

**generateIsometricView(mesh, angleX, angleY, scale)**
- Generates isometric view
- Returns: `DrawingEdge[]`
- Parameters:
  - `mesh: THREE.Mesh`
  - `angleX: number` (default 35.264)
  - `angleY: number` (default 45)
  - `scale: number`

**generateSectionView(mesh, sectionPlane, scale)**
- Generates section view
- Returns: `DrawingEdge[]`
- Parameters:
  - `mesh: THREE.Mesh`
  - `sectionPlane: { point: THREE.Vector3; normal: THREE.Vector3 }`
  - `scale: number`

**generateDetailView(sourceView, centerPoint, radius, detailScale)**
- Generates detail view from another view
- Returns: `DrawingEdge[]`
- Parameters:
  - `sourceView: DrawingView`
  - `centerPoint: { x: number; y: number }`
  - `radius: number`
  - `detailScale: number`

**generateAuxiliaryView(mesh, planeNormal, planeUp, scale)**
- Generates auxiliary view
- Returns: `DrawingEdge[]`
- Parameters:
  - `mesh: THREE.Mesh`
  - `planeNormal: THREE.Vector3`
  - `planeUp: THREE.Vector3`
  - `scale: number`

#### Annotations

**addDimension(viewId, sheetId, dimension)**
- Adds a dimension to a view
- Returns: `void`

**addAnnotation(viewId, sheetId, annotation)**
- Adds an annotation to a view
- Returns: `void`

#### File Sync

**syncWithSourceFile(sheetId, fileId, version)**
- Updates source file reference
- Returns: `Promise<void>`

#### Serialization

**toJSON()**
- Serializes drawing document to JSON
- Returns: `DrawingDocument`

**fromJSON(data)**
- Loads drawing document from JSON
- Returns: `void`

## Usage Examples

### Basic Workflow

```typescript
// 1. Create drawing system
const drawingSystem = new DrawingSystem();

// 2. Create a sheet
const sheet = drawingSystem.createSheet('Part Drawing', 'A3', 'landscape');

// 3. Load 3D geometry
const geometry = new THREE.BoxGeometry(50, 30, 20);
const mesh = new THREE.Mesh(geometry);
mesh.updateMatrixWorld();

// 4. Add orthographic views
const frontView = drawingSystem.addView(sheet.id, 'orthographic', 'Front View', {x: 50, y: 50}, 1);
frontView.orthographicDirection = 'front';
frontView.edges = drawingSystem.generateOrthographicView(mesh, 'front', 1);

const topView = drawingSystem.addView(sheet.id, 'orthographic', 'Top View', {x: 50, y: 200}, 1);
topView.orthographicDirection = 'top';
topView.edges = drawingSystem.generateOrthographicView(mesh, 'top', 1);

// 5. Add isometric view
const isoView = drawingSystem.addView(sheet.id, 'isometric', 'Isometric', {x: 250, y: 50}, 1);
isoView.edges = drawingSystem.generateIsometricView(mesh, 35.264, 45, 1);

// 6. Save
const data = drawingSystem.toJSON();
localStorage.setItem('drawings', JSON.stringify(data));
```

### Auto-Generate Standard Views

```typescript
const handleGenerateViews = () => {
  const views: Array<{ name: string; direction: OrthographicDirection; x: number; y: number }> = [
    { name: 'Front View', direction: 'front', x: 50, y: 150 },
    { name: 'Top View', direction: 'top', x: 50, y: 50 },
    { name: 'Right View', direction: 'right', x: 200, y: 150 },
  ];
  
  for (const { name, direction, x, y } of views) {
    const view = drawingSystem.addView(sheetId, 'orthographic', name, {x, y}, 1);
    view.orthographicDirection = direction;
    view.edges = drawingSystem.generateOrthographicView(mesh, direction, 1);
  }
};
```

### Section View with Cutting Plane

```typescript
// Create section view cutting through YZ plane at X=0
const sectionView = drawingSystem.addView(
  sheet.id,
  'section',
  'Section A-A',
  { x: 300, y: 50 },
  1
);

sectionView.sectionPlane = {
  point: new THREE.Vector3(0, 0, 0),
  normal: new THREE.Vector3(1, 0, 0), // YZ plane
  cutawayDirection: new THREE.Vector3(1, 0, 0) // Show right side
};

sectionView.edges = drawingSystem.generateSectionView(
  mesh,
  { point: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(1, 0, 0) },
  1
);
```

### Detail View (Zoomed Region)

```typescript
// Create detail view of top-left corner of front view
const detailView = drawingSystem.addView(
  sheet.id,
  'detail',
  'Detail B (Scale 2:1)',
  { x: 400, y: 200 },
  2
);

detailView.detailSource = {
  viewId: frontView.id,
  centerPoint: { x: 20, y: 20 }, // In front view coordinates
  radius: 15 // 15mm radius circle
};

detailView.edges = drawingSystem.generateDetailView(
  frontView,
  { x: 20, y: 20 },
  15,
  2 // 2x zoom
);
```

## Troubleshooting

### Problem: No edges generated

**Cause:** Mesh geometry may not have proper position attribute or may be empty.

**Solution:**
```typescript
// Check geometry
console.log('Position attribute:', mesh.geometry.attributes.position);
console.log('Vertex count:', mesh.geometry.attributes.position.count);

// Ensure mesh matrix is updated
mesh.updateMatrixWorld(true);
```

### Problem: All edges shown as hidden

**Cause:** Face normals may be inverted or camera direction incorrect.

**Solution:**
```typescript
// Check face normals
geometry.computeVertexNormals();

// Or reverse winding order
const index = geometry.index;
if (index) {
  for (let i = 0; i < index.count; i += 3) {
    const tmp = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, tmp);
  }
}
```

### Problem: Section view not cutting properly

**Cause:** Section plane may not intersect geometry.

**Solution:**
```typescript
// Verify plane intersects mesh bounding box
mesh.geometry.computeBoundingBox();
const bbox = mesh.geometry.boundingBox;

console.log('BBox:', bbox);
console.log('Plane point:', sectionPlane.point);
console.log('Plane normal:', sectionPlane.normal);

// Adjust plane point to center of bounding box
const center = new THREE.Vector3();
bbox.getCenter(center);
sectionPlane.point.copy(center);
```

### Problem: Canvas not rendering

**Cause:** Canvas size may be zero or scale incorrect.

**Solution:**
```typescript
// Check canvas size
console.log('Canvas size:', canvas.width, canvas.height);
console.log('Sheet size:', sheet.width, sheet.height);
console.log('Scale:', scale);

// Ensure minimum canvas size
const minWidth = 100;
const minHeight = 100;
canvas.width = Math.max(minWidth, sheet.width * scale);
canvas.height = Math.max(minHeight, sheet.height * scale);
```

## Best Practices

1. **Update Matrix World:** Always call `mesh.updateMatrixWorld()` before generating views
2. **Compute Normals:** Ensure geometry has computed normals for proper visibility detection
3. **Use Appropriate Scale:** Start with scale=1, adjust based on sheet size and detail level
4. **Organize Layers:** Group similar line types for better management
5. **Save Frequently:** Use auto-save or save after each significant change
6. **Version Control:** Track source file versions to detect when drawings are out of sync
7. **Minimize Detail Views:** Only create detail views when necessary to reduce complexity
8. **Standard Naming:** Use consistent naming conventions (Front View, Top View, Section A-A, etc.)
9. **Title Block Info:** Always fill in title block with complete drawing information
10. **Export Early:** Test PDF/DXF export early to catch formatting issues

## Future Enhancements

- [ ] Automatic dimension generation from geometry
- [ ] Smart annotation placement to avoid overlaps
- [ ] Hatch patterns for section views
- [ ] Multiple sheets per document
- [ ] Drawing templates (title blocks, border styles)
- [ ] Layer management (show/hide/lock)
- [ ] Undo/redo support
- [ ] Real-time collaboration
- [ ] GD&T (Geometric Dimensioning and Tolerancing) symbols
- [ ] Bill of Materials (BOM) generation
- [ ] Print preview with scaling options
- [ ] Custom line weights and styles
- [ ] Automatic view alignment and spacing

## License

This drawing system is part of the Forge CAD platform.

# Enhanced Dimensioning & GD&T System

## Overview

The enhanced dimensioning system adds professional engineering annotation capabilities to the 2D Drawing Editor. It includes full dimensioning tools, GD&T (Geometric Dimensioning and Tolerancing) symbols, editable annotation styles, and support for industry standards (ISO, ASME Y14.5, Architectural, Mechanical).

## Features

### 1. Dimension Types

- **Linear Dimensions**: Horizontal, vertical, or aligned measurements between two points
- **Angular Dimensions**: Angle measurements between two lines from a center point
- **Radial Dimensions**: Radius measurements from center to edge (prefix: R)
- **Diameter Dimensions**: Diameter measurements across circles (prefix: Ø)
- **Ordinate Dimensions**: Coordinate dimensions from a datum (coming soon)

### 2. GD&T Symbols

#### Form Controls
- **Straightness** (⏤): Controls the straightness of a line element
- **Flatness** (⏥): Controls the flatness of a surface
- **Circularity** (○): Controls the roundness of a circle
- **Cylindricity** (⌭): Controls the form of a cylinder

#### Orientation Controls
- **Angularity** (∠): Controls the angle of a feature relative to a datum
- **Perpendicularity** (⊥): Controls the perpendicularity to a datum plane
- **Parallelism** (∥): Controls parallelism to a datum

#### Location Controls
- **Position** (⊕): True position of a feature
- **Concentricity** (◎): Coaxial relationship of features
- **Symmetry** (⌯): Symmetrical relationship to a datum plane

#### Runout Controls
- **Circular Runout** (↗): Runout of a circular feature
- **Total Runout** (⤢): Total runout of a feature

#### Profile Controls
- **Profile of a Surface** (⌓): Profile tolerance of a surface
- **Profile of a Line** (⌒): Profile tolerance of a line element

#### Material Condition Modifiers
- **MMC** (Ⓜ): Maximum Material Condition
- **LMC** (Ⓛ): Least Material Condition
- **RFS** (Ⓢ): Regardless of Feature Size

### 3. Annotation Styles

Four professional presets are available:

#### ISO Standard
- Font: 3.5pt Arial
- Line width: 0.35mm
- Arrow: Filled (2.5mm)
- Units: mm
- Decimals: 2
- Tolerance: Symmetric (±)

#### ASME Y14.5
- Font: 3mm Arial
- Line width: 0.3mm
- Arrow: Filled (3mm)
- Units: inches
- Decimals: 3
- Tolerance: Deviation (+/-)

#### Architectural
- Font: 4pt Arial
- Line width: 0.5mm
- Arrow: Slash (4mm)
- Units: inches
- Decimals: 1
- Tolerance: Symmetric (±)

#### Mechanical Engineering
- Font: 3.5pt Arial Bold
- Line width: 0.35mm
- Arrow: Filled (2.5mm)
- Units: mm
- Decimals: 3
- Tolerance: Deviation (+/-)

### 4. Custom Style Editor

All style parameters are editable:

**Text Settings:**
- Font size (1-20pt)
- Font family (Arial, Times, Courier, etc.)
- Font weight (Normal/Bold)
- Text color

**Line Settings:**
- Line width (0.1-5mm)
- Line color
- Arrow size (1-10mm)
- Arrow style (Filled/Open/Dot/Slash/None)

**Dimension Settings:**
- Decimal places (0-6)
- Units (mm/in/cm/m)
- Show/hide units
- Extension line offset
- Extension line overhang
- Dimension line gap

**Tolerance Settings:**
- Format (Symmetric/Deviation/Limits/Basic)
- Upper tolerance value
- Lower tolerance value

## Usage

### Placing Linear Dimensions

1. Click the **Linear** button (or press **L**)
2. Click the **start point** on the drawing
3. Click the **end point**
4. Click where you want the **dimension line** to appear
5. The dimension is automatically calculated and placed

### Placing Angular Dimensions

1. Click the **Angular** button (or press **A**)
2. Click the **center point** (vertex)
3. Click the **start point** of the first line
4. Click the **end point** of the second line
5. The angle is calculated and displayed

### Placing Radial/Diameter Dimensions

1. Click the **Radius** (R) or **Diameter** (Ø) button
2. Click the **center point** of the circle
3. Click a point on the **edge** of the circle
4. The radius/diameter is calculated with appropriate symbol

### Adding GD&T Symbols

1. Navigate to the **GD&T** tab in the Dimension Tools panel
2. Select a symbol from the categories:
   - Form Controls (straightness, flatness, etc.)
   - Orientation Controls (perpendicularity, parallelism, etc.)
   - Location Controls (position, concentricity, etc.)
3. Click on the drawing to place the **feature control frame**
4. Configure tolerance value and datums in the dialog
5. Optionally add a leader line to the feature

### Adding Datum Features

1. In the **GD&T** tab, scroll to Datum Features
2. Click a datum label (**A** through **Z**)
3. Click on the drawing to place the datum triangle
4. The datum label is automatically added

### Adding Surface Finish Symbols

1. In the **GD&T** tab, scroll to Surface Finish
2. Enter the **Ra value** (surface roughness in μm)
3. Click **Add Surface Finish**
4. Click on the drawing to place the symbol
5. Optionally configure lay direction

### Changing Annotation Style

1. Navigate to the **Styles** tab
2. Click a preset (ISO/ASME/Architectural/Mechanical)
3. All new dimensions will use this style

### Editing Custom Styles

1. Click **Edit Current Style** button
2. Modify parameters in the style editor dialog:
   - Text: font size, family, weight, color
   - Lines: width, color, arrow style
   - Dimensions: decimals, units, offsets
   - Tolerance: format, values
3. Click **Save Style**
4. The style is applied to new dimensions

## Keyboard Shortcuts

- **L**: Activate Linear dimension tool
- **A**: Activate Angular dimension tool
- **R**: Activate Radial dimension tool
- **D**: Activate Diameter dimension tool
- **ESC**: Cancel active tool and clear points

## Technical Details

### Data Structures

#### Dimension Object
```typescript
interface Dimension {
  id: string;
  type: 'linear' | 'angular' | 'radial' | 'diameter' | 'ordinate';
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  dimensionPoint: { x: number; y: number };
  value: number;
  text?: string; // Override text
  tolerance?: {
    upper: number;
    lower: number;
  };
  style?: AnnotationStyle;
}
```

#### GDT Feature Control Frame
```typescript
interface GDTFeatureControlFrame {
  symbol: GDTSymbolType;
  tolerance: number;
  modifiers?: GDTSymbolType[];
  primaryDatum?: string;
  secondaryDatum?: string;
  tertiaryDatum?: string;
  position: { x: number; y: number };
  leaderPoint?: { x: number; y: number };
}
```

#### Annotation Style
```typescript
interface AnnotationStyle {
  id: string;
  name: string;
  
  // Text
  fontSize: number; // 1-20pt
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textColor: string;
  
  // Lines
  lineWidth: number; // 0.1-5mm
  lineColor: string;
  arrowSize: number; // 1-10mm
  arrowStyle: 'filled' | 'open' | 'dot' | 'slash' | 'none';
  
  // Dimensions
  dimensionLineGap: number;
  extensionLineOverhang: number;
  extensionLineOffset: number;
  decimalPlaces: number; // 0-6
  showUnits: boolean;
  units: 'mm' | 'in' | 'cm' | 'm';
  
  // Tolerance
  toleranceFormat: 'symmetric' | 'deviation' | 'limits' | 'basic';
  upperTolerance: number;
  lowerTolerance: number;
  
  // Leaders
  leaderStyle: 'straight' | 'spline' | 'stepped';
  leaderArrow: boolean;
}
```

### Rendering

Dimensions are rendered in `DrawingSheetViewer.tsx` using:

```typescript
// Linear dimension with style
drawStyledDimension(
  ctx,
  startPoint,
  endPoint,
  dimensionPoint,
  value,
  style,
  scale,
  darkMode
);

// Angular dimension
drawAngularDimension(
  ctx,
  centerPoint,
  startAngle,
  endAngle,
  radius,
  value,
  style,
  scale,
  darkMode
);

// Radial/diameter dimension
drawRadialDimension(
  ctx,
  centerPoint,
  edgePoint,
  radius,
  isDiameter,
  style,
  scale,
  darkMode
);
```

GD&T symbols are rendered using:

```typescript
// Feature control frame
drawFeatureControlFrame(
  ctx,
  frame,
  scale,
  darkMode
);

// Datum feature
drawDatumFeature(
  ctx,
  datum,
  scale,
  darkMode
);

// Surface finish
drawSurfaceFinish(
  ctx,
  finish,
  scale,
  darkMode
);
```

### Export

Dimensions are exported in both PDF and DXF formats:

**PDF Export:**
- Dimensions rendered as vector graphics
- Text properly positioned
- Arrow styles preserved
- Colors match dark/light mode

**DXF Export:**
- Dimensions converted to DXF DIMENSION entities
- GD&T symbols exported as TEXT entities
- Datums exported as POINT + TEXT
- Proper layer assignment

## Standards Compliance

The system follows these industry standards:

- **ASME Y14.5-2018**: American dimensioning and GD&T standard
- **ISO 1101**: International geometric tolerancing standard
- **ISO 128**: Technical drawings general principles
- **ISO 129**: Dimensioning principles

## Future Enhancements

- [ ] Ordinate dimension system with datum baseline
- [ ] Chain dimensioning with automatic spacing
- [ ] Baseline dimensioning from reference edge
- [ ] Dimension editing (move, delete, modify value)
- [ ] Dimension grouping and alignment tools
- [ ] Auto-dimensioning based on geometry
- [ ] Dimension styles library import/export
- [ ] Reference dimensions (parentheses)
- [ ] Inspection dimensions (square brackets)
- [ ] Dimension layers for organization
- [ ] Undo/redo for dimension operations
- [ ] Blueprint PDF pipeline integration
- [ ] Dimension validation and conflict detection
- [ ] Custom GD&T tolerance zone visualization
- [ ] Datum reference frame visualization

## Troubleshooting

### Dimensions not appearing
- Ensure a view is selected (highlighted border)
- Check that dimension points are within view bounds
- Verify zoom level allows visibility

### GD&T symbols display incorrectly
- Update browser to latest version for Unicode support
- Check font rendering settings
- Verify system fonts include symbol support

### Style changes not applying
- New styles only apply to dimensions created after change
- Existing dimensions retain their original style
- Re-create dimension to apply new style

### Export issues
- PDF: Check jsPDF library is loaded
- DXF: Verify file downloads successfully
- Test with simple drawings first

## Related Documentation

- [Drawing System Documentation](./DRAWING_SYSTEM.md)
- [GD&T Symbols Reference](../lib/cad/gdt-symbols.ts)
- [Annotation Styles API](../lib/cad/annotation-styles.ts)
- [Drawing Editor Usage](../app/drawing-editor/page.tsx)

## License

Part of the Blueprint CAD system. See main LICENSE file for details.

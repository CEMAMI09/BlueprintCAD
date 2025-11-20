# Draft Analysis Feature

## Overview

Draft analysis is a manufacturing analysis tool that evaluates whether a CAD model has adequate draft angles for processes like injection molding, die casting, and sand casting. The analysis color-codes the model's surfaces based on their draft angles relative to a neutral plane (parting line) and pull direction (mold ejection direction).

## Features

### 1. **Color-Coded Visualization**
- **Traffic Light Scheme**: Green (adequate) → Yellow (marginal) → Orange (insufficient) → Red (undercut)
- **Heat Map Scheme**: Blue (cool/adequate) → Cyan → Yellow → Red (hot/undercut)
- **Binary Scheme**: Green (pass) vs Red (fail)

### 2. **Adjustable Neutral Plane**
- Interactive slider to adjust parting line height
- Real-time visual feedback with plane helper
- Support for any orientation (XY, YZ, XZ planes)

### 3. **Dynamic Updates**
- Live recalculation as parameters change
- Instant visual feedback on geometry
- Performance optimized for large meshes

### 4. **Manufacturing Presets**
- **Injection Molding**: 2° minimum draft, ±0.5° tolerance
- **Die Casting**: 3° minimum draft, ±1° tolerance
- **Sand Casting**: 5° minimum draft, ±2° tolerance

### 5. **Comprehensive Statistics**
- Total face count and surface area
- Breakdown by classification (adequate/marginal/insufficient/undercut)
- Average, minimum, and maximum draft angles
- Area percentages for each category

### 6. **Display-Only Metadata**
- Results saved to Blueprint CAD documents
- Non-editable analysis records
- Version tracking and timestamps
- API support for retrieval

## Usage

### Basic Workflow

1. **Select Object**: Click on the geometry you want to analyze
2. **Open Draft Analysis**: Click the 📐 Draft button in the toolbar
3. **Configure Settings**:
   - Choose manufacturing process (preset)
   - Adjust minimum draft angle
   - Set neutral plane height
   - Select pull direction
   - Choose color scheme
4. **Run Analysis**: Click "Run Analysis" button
5. **Review Results**: View color-coded model and statistics
6. **Adjust Parameters**: Use sliders to fine-tune in real-time
7. **Export Results**: Save analysis as metadata in CAD file

### Parameters

#### Minimum Draft Angle
- Range: 0° to 10°
- Purpose: Defines the threshold for acceptable draft
- Default varies by process (2° for injection molding)

#### Neutral Plane Height
- Range: -100mm to +100mm (adjustable)
- Purpose: Defines the parting line position
- Visual helper shows plane in viewport

#### Pull Direction
- Options: +Z, -Z, +X, -X, +Y, -Y
- Purpose: Defines mold ejection direction
- Typically perpendicular to neutral plane

#### Tolerance
- Range: 0° to 2°
- Purpose: Defines marginal draft zone
- Surfaces within ±tolerance of minimum are "marginal"

#### Color Scheme
- **Traffic Light**: Industry standard, easy to interpret
- **Heat Map**: Gradient visualization, better for presentations
- **Binary**: Simple pass/fail, good for quality control

## Technical Details

### Draft Angle Calculation

For each face in the geometry:

1. **Face Normal**: Calculate normal vector from cross product of edges
2. **Dot Product**: Compute `dot(normal, pullDirection)`
3. **Angle Calculation**: `draftAngle = 90° - arccos(|dot|)`
4. **Sign**: Positive if facing pull direction, negative if undercut

### Classification Rules

```
if draftAngle < 0:
    classification = "undercut"  // Requires side actions
elif draftAngle < minDraft - tolerance:
    classification = "insufficient"  // Will cause problems
elif draftAngle < minDraft + tolerance:
    classification = "marginal"  // Barely acceptable
else:
    classification = "adequate"  // Good
```

### Performance

- **Face Analysis**: O(n) where n = face count
- **Vertex Coloring**: O(3n) for indexed geometry
- **Memory**: ~48 bytes per face (analysis data)
- **Typical Speed**: 10,000 faces in ~50ms

### Metadata Format

```json
{
  "type": "draft-analysis",
  "timestamp": 1700000000000,
  "neutralPlane": {
    "normal": [0, 0, 1],
    "constant": 0
  },
  "direction": [0, 0, 1],
  "statistics": {
    "totalFaces": 2456,
    "totalArea": 15432.5,
    "adequateFaces": 2100,
    "adequateArea": 13500,
    "marginalFaces": 200,
    "marginalArea": 1200,
    "insufficientFaces": 100,
    "insufficientArea": 600,
    "undercutFaces": 56,
    "undercutArea": 132.5,
    "averageDraftAngle": 4.2,
    "minDraftAngle": -2.5,
    "maxDraftAngle": 15.3
  },
  "warnings": [
    "56 faces have undercuts requiring side actions",
    "100 faces have insufficient draft (< 2°)"
  ],
  "faceData": [
    {
      "index": 0,
      "draftAngle": 3.5,
      "classification": "adequate",
      "area": 12.4
    }
    // ... more faces
  ]
}
```

## API Reference

### DraftAnalyzer.analyze()

```typescript
DraftAnalyzer.analyze(
  geometry: THREE.BufferGeometry,
  options: DraftAnalysisOptions
): DraftAnalysisResult
```

Analyzes geometry and returns color-coded results.

### DraftAnalyzer.updateNeutralPlane()

```typescript
DraftAnalyzer.updateNeutralPlane(
  geometry: THREE.BufferGeometry,
  currentOptions: DraftAnalysisOptions,
  newPlane: THREE.Plane
): DraftAnalysisResult
```

Re-analyzes with new neutral plane position.

### DraftAnalyzer.updateMinDraftAngle()

```typescript
DraftAnalyzer.updateMinDraftAngle(
  geometry: THREE.BufferGeometry,
  currentOptions: DraftAnalysisOptions,
  newMinAngle: number
): DraftAnalysisResult
```

Re-analyzes with new minimum draft angle threshold.

### DraftAnalyzer.updateColorScheme()

```typescript
DraftAnalyzer.updateColorScheme(
  result: DraftAnalysisResult,
  geometry: THREE.BufferGeometry,
  newScheme: 'traffic-light' | 'heat-map' | 'binary'
): DraftAnalysisResult
```

Updates visualization colors without re-analyzing.

### DraftAnalyzer.exportAsMetadata()

```typescript
DraftAnalyzer.exportAsMetadata(
  result: DraftAnalysisResult
): string
```

Exports analysis results as JSON metadata string.

### DraftAnalyzer.getDefaultOptions()

```typescript
DraftAnalyzer.getDefaultOptions(
  process: 'injection-molding' | 'die-casting' | 'sand-casting'
): Partial<DraftAnalysisOptions>
```

Returns default settings for common manufacturing processes.

## Best Practices

### For Designers

1. **Run Early**: Check draft angles during design, not after completion
2. **Use Traffic Light**: Easiest to interpret for most users
3. **Check All Orientations**: Analyze from multiple pull directions
4. **Document Results**: Export metadata for manufacturing review
5. **Iterate**: Use real-time updates to optimize design

### For Manufacturing Engineers

1. **Verify Presets**: Adjust minimum draft for specific materials/processes
2. **Check Undercuts**: Red areas require side actions or redesign
3. **Consider Tolerances**: Marginal areas may need closer review
4. **Export Reports**: Save analysis for process planning documentation
5. **Use Binary Mode**: Quick pass/fail checks for production validation

### For Quality Control

1. **Binary Scheme**: Fastest way to verify compliance
2. **Set Strict Tolerances**: Use smaller tolerance values for critical parts
3. **Automate Checks**: Integrate with quality management system via API
4. **Track History**: Compare analysis results across versions
5. **Flag Warnings**: Pay attention to undercut and insufficient draft warnings

## Integration with Blueprint

Draft analysis results are saved as **display-only metadata** in Blueprint CAD documents:

- **Non-Editable**: Results cannot be modified by other users
- **Versioned**: Timestamps track when analysis was performed
- **Retrievable**: API endpoints support querying saved analyses
- **Lightweight**: Only statistics and face classifications stored, not full geometry

### Viewing Saved Results

```typescript
// Load draft analysis from file metadata
const response = await fetch(`/api/cad/files/${fileId}/metadata?type=draft-analysis`);
const { metadata } = await response.json();

// Parse and display
const analysis = DraftAnalyzer.importFromMetadata(metadata, geometry);
```

## Limitations

1. **Indexed Geometry Only**: Requires BufferGeometry with index attribute
2. **Vertex Coloring**: Applied per-vertex, may show interpolation at edges
3. **Static Analysis**: Does not account for material properties or shrinkage
4. **Linear Faces**: Assumes planar faces, may not work well with highly curved surfaces
5. **Single Direction**: Analyzes one pull direction at a time

## Future Enhancements

- [ ] Multi-direction analysis (both sides of parting line)
- [ ] Automatic parting line detection
- [ ] Core/cavity separation visualization
- [ ] Export to PDF report format
- [ ] Batch analysis for multiple parts
- [ ] Material-specific draft recommendations
- [ ] Integration with mold flow simulation
- [ ] Automated design suggestions

## Support

For issues or questions:
- Check warnings in analysis results
- Verify geometry has proper normals
- Ensure object is selected before running analysis
- Consult manufacturing process documentation for minimum draft requirements

## License

Part of Blueprint CAD platform. See main LICENSE file.

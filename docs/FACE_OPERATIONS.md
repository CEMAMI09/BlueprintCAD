# Advanced Face Operations

## Overview

Advanced face operations provide powerful CAD modeling capabilities including **Offset Face**, **Delete Face with Heal**, **Replace Face**, and **Mirror across Plane**. All operations automatically update downstream features through the feature tree and are fully integrated with Blueprint's branching and version control system.

## Features

### 1. **Offset Face** ⬆️
Push or pull selected faces to create insets/outsets while maintaining topology.

**Use Cases:**
- Create wall thickness variations
- Add mounting bosses or recesses
- Adjust surface levels for assembly
- Create stepped features

**Parameters:**
- **Offset Distance**: -50mm to +50mm (negative = inset, positive = outset)
- **Extend Adjacent**: Automatically extend neighboring faces to meet offset
- **Create Shell**: Generate connecting walls between original and offset faces

**Algorithm:**
1. Calculate average normal for each vertex on selected faces
2. Move vertices along normal vector by offset distance
3. Optionally extend adjacent faces to maintain connectivity
4. Optionally create shell/wall geometry

### 2. **Delete Face with Heal** 🗑️
Remove selected faces and optionally fill resulting holes automatically.

**Use Cases:**
- Remove unwanted features
- Clean up imported geometry
- Simplify complex models
- Create openings that need patching

**Parameters:**
- **Heal Geometry**: Automatically triangulate and fill holes
- **Tolerance**: 0.001mm to 1mm (gap tolerance for healing)

**Algorithm:**
1. Remove selected face indices from geometry
2. Identify boundary edges (edges used by only one face)
3. Calculate centroid of hole boundary
4. Create fan triangulation from centroid to boundary edges
5. Merge healed faces back into geometry

### 3. **Replace Face** 🔄
Substitute a face with custom geometry (plane, sphere, cylinder).

**Use Cases:**
- Change surface type (flat → curved)
- Add detail to existing faces
- Repair damaged surfaces
- Create complex feature variations

**Parameters:**
- **Replacement Type**: Plane, Sphere, or Cylinder
- **Blend Edges**: Smooth transition to adjacent faces
- **Tolerance**: Edge matching precision

**Algorithm:**
1. Calculate face center and orientation
2. Transform replacement geometry to face position
3. Remove original face from geometry
4. Merge replacement geometry with remaining faces
5. Optionally blend edges for smooth transitions

### 4. **Mirror across Plane** 🪞
Create symmetric geometry by mirroring across XY, XZ, YZ, or custom planes.

**Use Cases:**
- Create symmetric parts
- Model half geometry (faster modeling)
- Generate mirror patterns
- Ensure design symmetry

**Parameters:**
- **Mirror Plane**: XY, XZ, YZ, or custom plane
- **Plane Height**: Position offset along plane normal
- **Merge with Original**: Combine mirrored and original geometry

**Algorithm:**
1. For each vertex: calculate distance from plane
2. Mirror point: `P' = P - 2 * distance * normal`
3. Reverse face winding for correct normals
4. Optionally merge with original geometry

## Feature Tree Integration

All face operations are automatically integrated into the parametric feature tree:

```typescript
// Example feature tree entry
{
  id: "offset-face-1234567890",
  type: "offset-face",
  name: "Offset Face (5mm)",
  parameters: {
    faceIndices: [0, 2, 4],
    offsetDistance: 5,
    extendAdjacent: true
  },
  parents: ["extrude-123", "fillet-456"],
  children: ["mirror-789"],
  metadata: {
    branchId: "main",
    version: "1.0",
    tags: ["offset", "face-operation"]
  }
}
```

### Downstream Feature Updates

When a face operation is performed:

1. **Feature Added**: New node created in feature tree
2. **Dependencies Tracked**: Parent features recorded
3. **Children Notified**: Downstream features marked dirty
4. **Regeneration**: Affected features automatically rebuilt
5. **Validation**: Dependency cycles detected and prevented

## Blueprint Version Control

### Metadata Storage

Face operation results are saved as metadata in CAD files:

```json
{
  "operation": "offset-face",
  "timestamp": 1700000000000,
  "faceIndices": [0, 2, 4],
  "distance": 5,
  "success": true
}
```

### Branching Support

Each operation records its branch ID:

```typescript
featureTree.addFeature(feature, parentIds, {
  branchId: currentFile.branchId || 'main',
  version: '1.0'
});
```

### Version History

Operations are tracked in Blueprint's version control:

- **Commit Message**: Operation type and parameters
- **Diff**: Geometry changes visualized
- **Rollback**: Previous versions restorable
- **Merge**: Conflicts detected and resolved

## Usage Examples

### Offset Face for Wall Thickness

```typescript
// Create a 2mm wall inset on top face
const result = FaceOperations.offsetFace(geometry, {
  faceIndices: [0], // Top face
  offsetDistance: -2, // 2mm inset
  extendAdjacent: true,
  createShell: true // Create connecting walls
});
```

### Delete and Heal Holes

```typescript
// Remove mounting holes and patch
const result = FaceOperations.deleteFace(geometry, {
  faceIndices: [5, 6, 7, 8], // Hole faces
  healGeometry: true,
  tolerance: 0.01
});
```

### Replace with Curved Surface

```typescript
// Replace flat face with spherical dome
const sphereGeometry = new THREE.SphereGeometry(10, 32, 32);

const result = FaceOperations.replaceFace(geometry, {
  faceIndex: 2,
  replacementGeometry: sphereGeometry,
  blendEdges: true,
  tolerance: 0.01
});
```

### Mirror for Symmetry

```typescript
// Create symmetric part by mirroring across YZ plane
const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

const result = FaceOperations.mirrorFace(geometry, {
  plane,
  mergeMirrored: true, // Combine both halves
  tolerance: 0.01
});
```

## UI Integration

### Toolbar Buttons

- ⬆️ **Offset Face** (Pro tier)
- 🗑️ **Delete Face** (Pro tier)
- 🔄 **Replace Face** (Pro tier)
- 🪞 **Mirror** (Pro tier)

### Modal Interface

1. **Select Object**: Click geometry in viewport
2. **Choose Operation**: Click toolbar button
3. **Configure Parameters**: Adjust sliders and options
4. **Preview (future)**: Live preview of operation
5. **Apply**: Execute operation and update feature tree

### Keyboard Shortcuts (planned)

- `O` - Offset Face
- `D` - Delete Face
- `R` - Replace Face
- `M` - Mirror

## Performance

### Benchmarks

| Operation | Geometry Size | Time | Memory |
|-----------|--------------|------|--------|
| Offset Face | 1,000 faces | ~50ms | ~100KB |
| Delete Face | 1,000 faces | ~30ms | ~80KB |
| Replace Face | 1,000 faces | ~40ms | ~120KB |
| Mirror | 1,000 faces | ~60ms | ~200KB |

### Optimization Strategies

1. **Indexed Geometry**: Required for efficient face operations
2. **Vertex Sharing**: Minimizes memory usage
3. **Incremental Updates**: Only affected faces recalculated
4. **Parallel Processing**: Face-by-face operations parallelizable
5. **Geometry Caching**: Previous states cached for undo

## API Reference

### FaceOperations.offsetFace()

```typescript
static offsetFace(
  geometry: THREE.BufferGeometry,
  options: OffsetFaceOptions
): OffsetFaceResult
```

**Options:**
- `faceIndices: number[]` - Faces to offset
- `offsetDistance: number` - Offset amount in mm
- `extendAdjacent: boolean` - Extend neighboring faces
- `createShell: boolean` - Generate connecting walls

**Returns:**
- `success: boolean` - Operation status
- `geometry?: THREE.BufferGeometry` - Result geometry
- `offsetFaces: number[]` - Indices of offset faces
- `error?: string` - Error message if failed
- `metadata: object` - Operation details

### FaceOperations.deleteFace()

```typescript
static deleteFace(
  geometry: THREE.BufferGeometry,
  options: DeleteFaceOptions
): DeleteFaceResult
```

**Options:**
- `faceIndices: number[]` - Faces to delete
- `healGeometry: boolean` - Auto-fill holes
- `tolerance: number` - Healing precision

**Returns:**
- `success: boolean`
- `geometry?: THREE.BufferGeometry`
- `deletedFaces: number[]`
- `healedRegions?: number[][]` - Patched areas
- `error?: string`
- `metadata: object`

### FaceOperations.replaceFace()

```typescript
static replaceFace(
  geometry: THREE.BufferGeometry,
  options: ReplaceFaceOptions
): ReplaceFaceResult
```

**Options:**
- `faceIndex: number` - Face to replace (single)
- `replacementGeometry: THREE.BufferGeometry` - New geometry
- `blendEdges: boolean` - Smooth transitions
- `tolerance: number` - Edge matching precision

**Returns:**
- `success: boolean`
- `geometry?: THREE.BufferGeometry`
- `replacedFaceIndex: number`
- `error?: string`
- `metadata: object`

### FaceOperations.mirrorFace()

```typescript
static mirrorFace(
  geometry: THREE.BufferGeometry,
  options: MirrorFaceOptions
): MirrorFaceResult
```

**Options:**
- `plane: THREE.Plane` - Mirror plane
- `mergeMirrored: boolean` - Combine with original
- `tolerance: number` - Vertex matching precision

**Returns:**
- `success: boolean`
- `geometry?: THREE.BufferGeometry`
- `mirroredFaces: number[]`
- `error?: string`
- `metadata: object`

### FaceOperations.exportMetadata()

```typescript
static exportMetadata(
  result: OffsetFaceResult | DeleteFaceResult | 
          ReplaceFaceResult | MirrorFaceResult
): string
```

Exports operation metadata as JSON string for Blueprint storage.

## Best Practices

### For Designers

1. **Use Offset Face** for thickness variations instead of multiple extrudes
2. **Mirror Early** to save modeling time on symmetric parts
3. **Heal Deleted Faces** to avoid invalid geometry
4. **Preview Before Applying** (check parameters carefully)
5. **Name Operations** descriptively in feature tree

### For Engineers

1. **Validate Topology** after complex operations
2. **Check Downstream Features** for regeneration errors
3. **Use Replace Face** for parametric design variations
4. **Commit After Operations** to save version history
5. **Test Mirror Plane** orientation before applying

### For Developers

1. **Always Check result.success** before using geometry
2. **Handle Errors Gracefully** with user-friendly messages
3. **Save Metadata** for operation tracking
4. **Update Feature Tree** to maintain dependencies
5. **Validate Input Geometry** (must be indexed)

## Limitations

1. **Indexed Geometry Required**: Non-indexed geometry not supported
2. **Single Face Replacement**: Can only replace one face at a time
3. **Simple Healing**: Uses basic fan triangulation (not NURBS)
4. **No Blend Fillet**: Edge blending is simplified
5. **Memory Usage**: Large offsets may require significant memory

## Future Enhancements

- [ ] Face selection in viewport (click to select)
- [ ] Live preview before applying
- [ ] Multi-face replacement
- [ ] Advanced healing (NURBS surface fitting)
- [ ] Parametric offset (linked to other features)
- [ ] Pattern along face normal
- [ ] Variable offset (different distance per vertex)
- [ ] Batch operations (offset multiple selections)
- [ ] History brush (undo specific face operations)
- [ ] Export face operation scripts

## Troubleshooting

### "Geometry must be indexed"
**Solution**: Ensure geometry has an index buffer. Call `geometry.setIndex()`.

### "Operation failed: Invalid face index"
**Solution**: Verify face indices are within range `[0, faceCount-1]`.

### "Healing failed to close holes"
**Solution**: Increase tolerance or manually close complex holes.

### "Downstream features failed to regenerate"
**Solution**: Check feature tree for circular dependencies.

### "Mirror creates inside-out geometry"
**Solution**: Verify plane normal direction is correct.

## Support

For issues, questions, or feature requests:
- Check error messages in result.error
- Verify geometry is valid (indexed, has normals)
- Review feature tree for dependency issues
- Consult Blueprint version history for changes
- Submit bug reports with geometry files

## License

Part of Blueprint CAD platform. See main LICENSE file.

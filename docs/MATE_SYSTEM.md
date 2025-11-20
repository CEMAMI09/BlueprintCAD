# Mate System Implementation

## Overview
Implemented a comprehensive mate system for assembly constraints with 6 mate types, geometry picking, and full integration with the assembly editor.

## Files Created

### 1. `lib/cad/mate-system.ts` (~650 lines)
**Core mate constraint solver**

#### Mate Types (with DOF)
- **Fixed** (0 DOF) - Completely locks two parts together
- **Revolute** (1 DOF) - Rotation around a common axis
- **Slider** (1 DOF) - Translation along an axis  
- **Planar** (3 DOF) - Translation in plane + rotation around normal
- **Cylindrical** (2 DOF) - Rotation + translation along axis (like a bolt)
- **Ball** (3 DOF) - Spherical joint, rotation around a point

#### Key Classes
- `MateSystem` - Manages mate collection and constraint solving
- `Mate` interface - Mate definition with metadata
- `GeometryReference` - References to part geometry (faces, edges, vertices)
- `MateSolution` - Solved transform for constrained instances

#### Solver Features
- Individual mate solvers for each type
- Transform decomposition and recomposition
- Offset and angle parameter support
- Motion limits (min/max) for revolute/slider
- Suppression support (temporarily disable mates)
- JSON serialization for storage

### 2. `lib/cad/geometry-picker.ts` (~450 lines)
**Interactive geometry selection in 3D viewport**

#### Features
- **Raycasting-based picking** for faces, edges, vertices
- **Visual highlighting** with green overlay
- **Pick modes**:
  - Face picking with normal extraction
  - Edge picking with direction calculation
  - Vertex picking with closest-point algorithm
  - Point picking (any surface point)
  - Axis picking (for cylindrical surfaces)
  - Plane picking (planar faces)
- **Real-time feedback** with material highlighting
- **Proper cleanup** and disposal of Three.js resources

### 3. `components/cad/MateEditor.tsx` (~280 lines)
**UI for creating new mates**

#### Features
- **Mate type selector** with 6 types (icons, DOF display, descriptions)
- **Geometry picker buttons** for selection 1 & 2
- **Live picking status** with green ring indicator
- **Parameter inputs**:
  - Offset slider (for slider/planar/cylindrical)
  - Angle slider (for revolute) with degree display
  - Motion limits checkbox with min/max inputs
- **Geometry type selector** (Face, Edge, Vertex)
- **Visual feedback** for selected geometries
- **Instructions panel** with step-by-step guide

### 4. `components/cad/MateList.tsx` (~180 lines)
**Display and manage existing mates**

#### Features
- **Mate cards** with:
  - Type icon and name
  - Solved/unsolved status badge
  - Geometry references (truncated IDs)
  - Parameters display (offset, angle)
  - Motion limits display
  - Error messages if unsolved
- **Actions per mate**:
  - Suppress/unsuppress toggle
  - Delete with confirmation
- **Summary footer** showing total DOF reduction
- **Empty state** with helpful message

## Assembly System Integration

### Modified Files

#### `lib/cad/assembly-system.ts`
**Added:**
- `mateSystem: MateSystem` property
- `mates` array in `AssemblyDocument` interface
- `getMates()` - Get all mates
- `addMate()` - Add new mate
- `removeMate()` - Delete mate
- `setMateSuppressed()` - Toggle mate suppression
- `solveMates()` - Solve all mates and update transforms
- `loadMatesFromDocument()` - Load mates from JSON
- `exportMatesToDocument()` - Export mates to JSON
- Integrated mate loading in `loadAssembly()`
- Integrated mate saving in `saveAssembly()`

#### `app/assembly-editor/page.tsx`
**Added:**
- Import mate system components
- State for mate panel, geometry picker, selected geometries
- `geometryPickerRef` for picker instance
- `handleCreateMate()` - Create and solve new mate
- `handlePickGeometry()` - Start geometry picking mode
- `handleToggleMateSuppressed()` - Toggle mate suppression
- `handleDeleteMate()` - Remove mate
- **Geometry picking listener** - Click handler for 3D viewport
- **Mates panel toggle** button in toolbar
- **Right panel conditional** - Show either parts browser or mates
- **Picking indicator overlay** - Green floating panel during picking
- **Mates counter** in toolbar button

## Usage Flow

### Creating a Mate

1. **Open Mates Panel** - Click "🔗 Mates (n)" button in toolbar
2. **Select Mate Type** - Choose Fixed, Revolute, Slider, Planar, Cylindrical, or Ball
3. **Select Geometry Type** - Choose Face, Edge, or Vertex picking mode
4. **Pick Geometry 1**:
   - Click "🖱️ Pick" button for Geometry 1
   - Click on part in 3D viewport
   - Geometry is highlighted and captured
5. **Pick Geometry 2**:
   - Click "🖱️ Pick" button for Geometry 2
   - Click on another part in viewport
6. **Adjust Parameters** (if needed):
   - Set offset distance for slider/planar/cylindrical
   - Set angle for revolute
   - Enable motion limits and set min/max
7. **Create Mate** - Click "Create Mate" button
8. **Mate is solved** - Part transforms update automatically
9. **Save Assembly** - Click "💾 Save" to persist mates

### Managing Mates

- **View all mates** in MateList with status indicators
- **Suppress mate** - Temporarily disable without deleting
- **Delete mate** - Remove permanently with confirmation
- **Solve mates** - Automatically triggered on changes

## Technical Details

### Constraint Solving Algorithm

Each mate type has a specialized solver:

1. **Fixed Mate**: Align geometry positions exactly
2. **Revolute Mate**: 
   - Align axes (make parallel and opposite)
   - Apply angular offset
   - Align reference points on axis
3. **Slider Mate**:
   - Align axes (make parallel)
   - Project geometry onto axis
   - Apply translation offset
4. **Planar Mate**:
   - Align normals (make opposite for coplanar)
   - Project geometry onto plane
   - Apply distance offset
5. **Cylindrical Mate**:
   - Align axes
   - Project onto axis (like slider)
   - Allow rotation (5 DOF → 4 DOF)
6. **Ball Mate**:
   - Align points
   - Allow free rotation (6 DOF → 3 DOF)

### Transform Application

1. Decompose current transforms into position/rotation/scale
2. Calculate alignment quaternions using cross products
3. Calculate translation offsets using vector projections
4. Compose new transforms
5. Update instance transforms in assembly system
6. Trigger scene update to reflect changes

### Data Persistence

Mates are stored in assembly document JSON:

```json
{
  "id": "assembly-123",
  "mates": [
    {
      "id": "mate-456",
      "name": "Revolute 1",
      "type": "revolute",
      "geometry1": {
        "type": "axis",
        "instanceId": "instance-789",
        "position": { "x": 0, "y": 0, "z": 0 },
        "direction": { "x": 0, "y": 1, "z": 0 }
      },
      "geometry2": {
        "type": "axis",
        "instanceId": "instance-012",
        "position": { "x": 100, "y": 0, "z": 0 },
        "direction": { "x": 0, "y": 1, "z": 0 }
      },
      "angle": 1.57,
      "limits": { "min": 0, "max": 3.14 },
      "suppressed": false,
      "solved": true,
      "metadata": {
        "createdAt": 1700000000000,
        "updatedAt": 1700000001000
      }
    }
  ]
}
```

## Blueprint Integration

### Version History
- Mates are part of assembly document
- Each save creates new version in Blueprint
- Mate changes tracked in version history
- Can revert to previous mate configurations

### Permissions
- Mate creation requires `canEdit` permission
- Mate deletion requires `canEdit` permission
- Mate viewing available with `canView` permission
- Controlled by Blueprint folder permissions

## Future Enhancements

### Planned Features
1. **Advanced solvers**:
   - Tangent constraints
   - Concentric constraints
   - Distance/angle constraints
   - Pattern-based mates
2. **Collision detection** integration with mates
3. **Motion simulation** with animated mate DOFs
4. **Mate diagnostics** panel showing conflicts
5. **Mate patterns** for repeated constraints
6. **Assembly interference** checking
7. **Exploded view** respecting mate constraints
8. **Animation timeline** for mate-driven motion
9. **Contact sets** for physical simulation
10. **Mate groups** for organizing complex assemblies

### Performance Optimizations
- Iterative constraint solver for complex systems
- Mate graph analysis for dependency ordering
- Incremental solving (only affected mates)
- Caching of solved transforms
- GPU-accelerated collision detection

## Testing Checklist

- [ ] Create fixed mate between two parts
- [ ] Create revolute mate with angle offset
- [ ] Create slider mate with limits
- [ ] Create planar mate with distance offset
- [ ] Create cylindrical mate (bolt in hole)
- [ ] Create ball mate (spherical joint)
- [ ] Pick face geometry
- [ ] Pick edge geometry
- [ ] Pick vertex geometry
- [ ] Suppress/unsuppress mate
- [ ] Delete mate
- [ ] Save assembly with mates
- [ ] Load assembly with mates
- [ ] Verify mates in version history
- [ ] Test with multiple mates on same part
- [ ] Test with nested sub-assemblies

## Known Limitations

1. **Geometry loading**: Currently uses placeholder boxes, need real part geometry for accurate picking
2. **Solver robustness**: Single-pass solver may not handle complex over-constrained systems
3. **Edge detection**: Edge picking estimates from faces, needs proper edge topology
4. **Interference**: No collision checking during mate solving
5. **Undo/redo**: Mate operations not integrated with undo system yet

## Code Statistics

- **Total lines**: ~1,560
- **TypeScript/TSX**: 100%
- **New files**: 4
- **Modified files**: 2
- **Functions**: 45+
- **Classes**: 2
- **Interfaces**: 8+

## Dependencies

- Three.js - 3D graphics and raycasting
- React - UI components
- Assembly System - Instance management
- Geometry Kernel - (Future: real geometry loading)

# Parametric Feature Tree System

## Overview

Blueprint's parametric feature tree system implements a **Directed Acyclic Graph (DAG)** structure for managing CAD features with full dependency tracking, version control integration, and regeneration capabilities.

## Architecture

### Core Components

1. **FeatureTree** (`lib/cad/feature-tree.ts`)
   - DAG-based feature management
   - Topological sorting for execution order
   - Cycle detection and dependency validation
   - Parametric regeneration system
   - Undo/redo with 50-step history
   - Version control serialization

2. **FeatureTreeSidebar** (`components/cad/FeatureTreeSidebar.tsx`)
   - UI for feature visualization
   - Drag-and-drop reordering
   - Context menu operations
   - Status indicators (dirty, error, suppressed)
   - Filter controls and statistics

3. **Version Control API** (`app/api/cad/files/feature-tree/route.ts`)
   - POST: Save feature tree
   - GET: Load latest tree
   - PUT: Get version history
   - Branch support for collaborative workflows

4. **Database Schema** (`migrations/add_feature_trees.sql`)
   - `cad_feature_trees` table
   - Multi-version storage with branches
   - Foreign key to `cad_files`

## Features

### Dependency Management

```typescript
// Add feature with parent dependencies
featureTree.addFeature(
  feature,
  [parentId1, parentId2], // Parents
  {
    author: 'username',
    branchId: 'main',
    description: 'Fillet operation'
  }
);

// Validate dependencies (checks for cycles)
const validation = featureTree.validateDependencies(featureId, newParentIds);
if (!validation.valid) {
  console.error('Circular dependencies:', validation.cycles);
}
```

### Execution Order

Features are executed in **topological order** to ensure parents are built before children:

```typescript
// Automatic topological sorting
featureTree.computeExecutionOrder();
const order = featureTree.getState().executionOrder;
// ['sketch1', 'extrude1', 'fillet1', ...]
```

### Parametric Regeneration

```typescript
// Regenerate dirty features
const result = await featureTree.regenerate(undefined, geometryKernel);

if (result.success) {
  console.log(`Regenerated ${result.featuresRegenerated.length} features`);
  console.log(`Total time: ${result.totalTime}ms`);
} else {
  result.errors.forEach((msg, id) => {
    console.error(`${id}: ${msg}`);
  });
}
```

Supported feature types:
- **extrude**: 2D sketch → 3D solid
- **revolve**: 2D sketch → rotational solid
- **boolean**: Union/subtract/intersect operations
- **fillet**: Rounded edges
- **chamfer**: Beveled edges

### Suppress/Unsuppress

```typescript
// Hide feature without deleting
featureTree.toggleSuppress(featureId);

// Descendants become dirty (need regeneration)
const descendants = featureTree.getDescendants(featureId);
```

### Reordering

```typescript
// Manual reorder with constraint validation
try {
  featureTree.reorderFeature(featureId, 5);
} catch (error) {
  // Error if ancestors must come before
  // or descendants must come after
}
```

### Undo/Redo

```typescript
// 50-step history
featureTree.undo();
featureTree.redo();

const canUndo = featureTree.getState().canUndo;
const canRedo = featureTree.getState().canRedo;
```

### Version Control

```typescript
// Export to JSON
const json = featureTree.exportToJSON();

// Save to database
await fetch('/api/cad/files/feature-tree', {
  method: 'POST',
  body: JSON.stringify({
    fileId: currentFile.id,
    treeData: json,
    version: featureTree.getState().version,
    branchId: 'main'
  })
});

// Load from database
const response = await fetch(
  `/api/cad/files/feature-tree?fileId=${fileId}&branchId=main`
);
const data = await response.json();
featureTree.importFromJSON(data.treeData);
```

## UI Features

### Feature Tree Sidebar

Located on the left side of the CAD editor:

**Header:**
- 🔄 Regenerate button (shows dirty count)
- 💾 Export to JSON
- 🔗 Sync to version control
- Filter toggles:
  - Hide Suppressed
  - Show Dependencies

**Feature List:**
- Hierarchical display with execution order
- Status indicators:
  - ⚠ Yellow: Needs regeneration (dirty)
  - ❌ Red: Error during regeneration
  - 👁️‍🗨️ Gray: Suppressed
- Drag-and-drop reordering
- Click to select, double-click to edit

**Context Menu (right-click):**
- ✏️ Edit Feature
- 👁️ Suppress/Unsuppress
- 🔍 Show Dependencies
- 🗑️ Delete Feature

**Footer:**
- ↶ Undo button
- ↷ Redo button
- Statistics: Feature count, version, branch

## Integration with CAD Editor

### Setup

```typescript
// In cad-editor/page.tsx
import { FeatureTree } from '@/lib/cad/feature-tree';
import { GeometryKernel } from '@/lib/cad/geometry-kernel';

const featureTreeRef = useRef(new FeatureTree());
const geometryKernelRef = useRef(new GeometryKernel());
```

### Hook Feature Creation

```typescript
// When user creates extrude
const handleExtrudeConfirm = (params) => {
  const feature = geometryKernel.extrude(sketch, params);
  
  // Add to feature tree
  featureTreeRef.current.addFeature(
    feature,
    [sketchFeatureId], // Parent dependency
    {
      author: user?.username,
      branchId: currentFile?.branchId || 'main'
    }
  );
};
```

### Regeneration Handler

```typescript
const handleRegenerate = async () => {
  const result = await featureTreeRef.current.regenerate(
    undefined, // All dirty features
    geometryKernelRef.current
  );
  
  if (!result.success) {
    alert(`Errors: ${Array.from(result.errors.values()).join(', ')}`);
  }
};
```

### Feature Selection

```typescript
const handleFeatureSelect = (featureId: string) => {
  const node = featureTreeRef.current.getState().nodes.get(featureId);
  if (node?.feature.mesh) {
    setSelectedObjects([node.feature.mesh]);
  }
};
```

## Database Schema

```sql
CREATE TABLE cad_feature_trees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  tree_data TEXT NOT NULL,      -- JSON serialized tree
  version INTEGER NOT NULL DEFAULT 1,
  branch_id TEXT NOT NULL DEFAULT 'main',
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES cad_files(id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_trees_file ON cad_feature_trees(file_id);
CREATE INDEX idx_feature_trees_branch ON cad_feature_trees(branch_id);
CREATE INDEX idx_feature_trees_version ON cad_feature_trees(file_id, version);
```

## Algorithms

### Topological Sort

```typescript
// Post-order DFS traversal
function topoSort(node, visited, tempMark, result) {
  if (tempMark.has(node)) throw new Error('Cycle detected');
  if (visited.has(node)) return;
  
  tempMark.add(node);
  
  for (const child of node.children) {
    topoSort(child, visited, tempMark, result);
  }
  
  tempMark.delete(node);
  visited.add(node);
  result.push(node);
}
```

### Cycle Detection

```typescript
// DFS with recursion stack
function hasCycle(nodeId, visited, recursionStack) {
  visited.add(nodeId);
  recursionStack.add(nodeId);
  
  for (const childId of node.children) {
    if (!visited.has(childId)) {
      if (hasCycle(childId, visited, recursionStack)) {
        return true;
      }
    } else if (recursionStack.has(childId)) {
      return true; // Cycle found
    }
  }
  
  recursionStack.delete(nodeId);
  return false;
}
```

### Dirty Propagation

```typescript
// Recursive descendant marking
function markDirty(featureId) {
  state.dirty.add(featureId);
  
  const node = state.nodes.get(featureId);
  for (const childId of node.children) {
    markDirty(childId); // Recursive
  }
}
```

## Performance

- **Topological Sort**: O(V + E) where V = features, E = dependencies
- **Cycle Detection**: O(V + E)
- **Regeneration**: O(V) with async geometry operations
- **Undo/Redo**: O(V) for state cloning
- **Database Storage**: Indexed on file_id, branch_id, version

## Best Practices

### 1. Always validate dependencies

```typescript
const validation = featureTree.validateDependencies(id, parents);
if (!validation.valid) {
  alert(`Cannot add dependency: ${validation.cycles[0].join(' → ')}`);
  return;
}
```

### 2. Regenerate after parameter changes

```typescript
// Update feature parameters
feature.parameters.distance = newDistance;

// Mark dirty
featureTree.markDirty(feature.id);

// Regenerate
await featureTree.regenerate([feature.id], geometryKernel);
```

### 3. Sync to version control regularly

```typescript
// After significant changes
featureTreeRef.current.exportToJSON();
await handleSyncVersion();
```

### 4. Use suppress instead of delete

```typescript
// Preserve feature for later
featureTree.toggleSuppress(featureId);

// Instead of
// featureTree.removeFeature(featureId); // Permanent
```

### 5. Check reorder constraints

```typescript
try {
  featureTree.reorderFeature(featureId, newOrder);
} catch (error) {
  alert('Cannot reorder: violates dependency constraints');
}
```

## Testing

### Manual Testing Steps

1. **Create feature chain**:
   - Sketch → Extrude → Fillet
   - Verify execution order: 1, 2, 3

2. **Test dependencies**:
   - Try to delete sketch (should fail - has children)
   - Delete fillet (should succeed)
   - Try to add extrude as parent of sketch (should fail - cycle)

3. **Test regeneration**:
   - Modify sketch parameters
   - Click Regenerate
   - Verify geometry updates

4. **Test suppress**:
   - Suppress sketch
   - Verify extrude becomes dirty
   - Unsuppress and regenerate

5. **Test version control**:
   - Create features
   - Click Sync
   - Reload page
   - Verify features restored

6. **Test undo/redo**:
   - Create feature
   - Undo (feature removed)
   - Redo (feature restored)

## Troubleshooting

### Feature won't delete
- Check if feature has children
- Use `getDescendants()` to see dependents
- Delete children first, or suppress instead

### Regeneration fails
- Check `result.errors` Map for details
- Verify parent features are up-to-date
- Check feature parameters are valid

### Cycle detected
- Use `validateDependencies()` to see cycle path
- Remove circular dependencies
- Check if reorder created cycle

### Sync to version control fails
- Verify better-sqlite3 is installed
- Check database migration ran
- Verify currentFile has valid id

## Future Enhancements

- [ ] Branch visualization UI (tree diagram)
- [ ] Diff view between versions
- [ ] Merge conflict resolution
- [ ] Feature preview on hover
- [ ] Bulk suppress/unsuppress
- [ ] Export to STEP with history
- [ ] Real-time collaboration
- [ ] Feature search/filter
- [ ] Parameter expressions (e.g., `length = width * 2`)
- [ ] Pattern features (circular/linear arrays)

## References

- Topological Sorting: [Wikipedia](https://en.wikipedia.org/wiki/Topological_sorting)
- DAG: [Wikipedia](https://en.wikipedia.org/wiki/Directed_acyclic_graph)
- Cycle Detection: [GeeksforGeeks](https://www.geeksforgeeks.org/detect-cycle-in-a-graph/)
- Parametric CAD: [Siemens NX Documentation](https://docs.plm.automation.siemens.com/)

## License

MIT License - See LICENSE file for details

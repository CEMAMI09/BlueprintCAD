# Assembly Document System

## Overview

The Assembly Document System allows users to create multi-part assemblies by combining individual CAD parts with geometric constraints and hierarchical organization.

## Features

### Core Functionality
- **Part Instance Management**: Insert, transform, delete, and clone part instances
- **Geometric Constraints**: Define relationships between parts (mate, align, distance, angle, etc.)
- **Sub-Assemblies**: Group instances into hierarchical sub-assemblies
- **Transform Management**: Position, rotate, and scale instances with Matrix4 transforms
- **Visual Tree Structure**: Browse assembly hierarchy in tree view
- **Part Browser**: Search and insert parts from CAD file library
- **Permissions**: Blueprint folder-based access control

### Constraint Types
1. **Mate**: Aligns two faces and makes them coincident
2. **Align**: Makes two faces parallel while maintaining distance
3. **Distance**: Maintains a fixed distance between entities
4. **Angle**: Maintains a fixed angle between entities
5. **Insert**: (Placeholder for future implementation)
6. **Tangent**: (Placeholder for future implementation)
7. **Parallel**: (Placeholder for future implementation)
8. **Perpendicular**: (Placeholder for future implementation)
9. **Concentric**: (Placeholder for future implementation)

## Architecture

### Core Classes

#### AssemblySystem
Singleton class managing assembly documents, instances, and constraints.

```typescript
const assemblySystem = getAssemblySystem();

// Create new assembly
await assemblySystem.createAssembly('My Assembly', folderId);

// Insert part
const transform = new THREE.Matrix4();
const instance = await assemblySystem.insertPart(fileId, transform);

// Add constraint
await assemblySystem.addConstraint('mate', instance1.id, instance2.id, {
  entity1: { type: 'face', index: 0 },
  entity2: { type: 'face', index: 0 },
  offset: 0
});

// Save assembly
await assemblySystem.saveAssembly();
```

### Data Structures

#### PartInstance
Represents a single instance of a CAD part in the assembly.

```typescript
interface PartInstance {
  id: string;
  partFileId: number;
  partName: string;
  transform: THREE.Matrix4;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
  locked: boolean;
  color?: number;
  material?: string;
  parentInstanceId?: string;  // For sub-assemblies
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    version?: number;
  };
}
```

#### AssemblyConstraint
Defines a geometric relationship between two instances.

```typescript
interface AssemblyConstraint {
  id: string;
  type: 'mate' | 'align' | 'distance' | 'angle' | ...;
  instance1Id: string;
  instance2Id: string;
  entity1?: { type: 'face' | 'edge' | 'vertex'; index: number };
  entity2?: { type: 'face' | 'edge' | 'vertex'; index: number };
  offset?: number;
  angle?: number;
  locked: boolean;
  solved: boolean;
  error?: string;
}
```

#### AssemblyDocument
Complete assembly document with metadata and permissions.

```typescript
interface AssemblyDocument {
  id: string;
  name: string;
  folderId?: number;
  instances: PartInstance[];
  constraints: AssemblyConstraint[];
  subAssemblies: string[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    version: number;
    description: string;
    tags: string[];
  };
  permissions: {
    canEdit: boolean;
    canView: boolean;
    canDelete: boolean;
    isOwner: boolean;
  };
}
```

## UI Components

### AssemblyTreePanel
Hierarchical tree view displaying the assembly structure.

**Features:**
- Expand/collapse nodes
- Visibility toggle (eye icon)
- Lock toggle (lock icon)
- Context menu (clone, delete)
- Selection highlighting
- Part count display

### PartBrowserPanel
Browse and search available CAD parts for insertion.

**Features:**
- Part search/filter
- Folder navigation
- Thumbnail preview
- Drag-and-drop insertion
- Click to insert

### Assembly Editor Page
Main assembly editing interface.

**Features:**
- 3D viewport with OrbitControls
- Assembly tree sidebar (left)
- Part browser sidebar (right)
- Top toolbar with save/mode controls
- Status bar showing selection
- Grid and axes helpers

## API Endpoints

### GET /api/cad/assemblies
List assemblies (optionally filtered by folder or user).

**Query Parameters:**
- `folderId` (optional): Filter by Blueprint folder
- `userId` (optional): Filter by author

**Response:**
```json
{
  "assemblies": [
    {
      "id": "assembly-123",
      "name": "Motor Assembly",
      "folder_id": 5,
      "author_id": 1,
      "version": 3,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-16T14:20:00Z"
    }
  ]
}
```

### POST /api/cad/assemblies
Create a new assembly.

**Request Body:**
```json
{
  "name": "New Assembly",
  "folderId": 5,
  "userId": 1
}
```

**Response:**
```json
{
  "assembly": { /* AssemblyDocument */ },
  "dbId": 123
}
```

### GET /api/cad/assemblies/:id
Load a specific assembly document.

**Response:**
```json
{
  "assembly": {
    "id": "assembly-123",
    "name": "Motor Assembly",
    "instances": [...],
    "constraints": [...],
    "subAssemblies": [...],
    "metadata": {...},
    "permissions": {...}
  }
}
```

### PUT /api/cad/assemblies/:id
Update an assembly document.

**Request Body:**
```json
{
  "name": "Updated Name",
  "instances": [...],
  "constraints": [...],
  "subAssemblies": [...],
  "metadata": {...}
}
```

### DELETE /api/cad/assemblies/:id
Delete an assembly document.

**Response:**
```json
{
  "message": "Assembly deleted successfully",
  "id": "assembly-123"
}
```

### GET /api/cad/files
List available CAD files.

**Query Parameters:**
- `folderId` (optional): Filter by folder

**Response:**
```json
{
  "files": [
    {
      "id": 1,
      "filename": "bracket.step",
      "filepath": "/uploads/bracket.step",
      "folder_id": 5,
      "version": 1,
      "thumbnail": "/thumbnails/bracket.png"
    }
  ]
}
```

### GET /api/cad/files/:id/reference
Get part reference metadata for an instance.

**Response:**
```json
{
  "fileId": 1,
  "filename": "bracket.step",
  "filepath": "/uploads/bracket.step",
  "version": 1,
  "thumbnail": "/thumbnails/bracket.png",
  "boundingBox": {
    "min": { "x": 0, "y": 0, "z": 0 },
    "max": { "x": 100, "y": 50, "z": 25 }
  },
  "mass": 0.5,
  "material": "steel"
}
```

## Database Schema

### cad_assemblies Table
```sql
CREATE TABLE cad_assemblies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder_id INTEGER,
  author_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  description TEXT,
  tags TEXT,
  data TEXT,  -- JSON: {instances, constraints, subAssemblies}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### cad_files Table
```sql
CREATE TABLE cad_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  folder_id INTEGER,
  version INTEGER DEFAULT 1,
  thumbnail TEXT,
  data TEXT,  -- JSON: {boundingBox, mass, material, metadata}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

## Usage Examples

### Creating an Assembly
```typescript
// Initialize system
const assemblySystem = getAssemblySystem();

// Create assembly
await assemblySystem.createAssembly('Motor Mount Assembly', folderId);

// Insert base part
const baseTransform = new THREE.Matrix4();
const base = await assemblySystem.insertPart(baseFileId, baseTransform);

// Insert bracket part
const bracketTransform = new THREE.Matrix4();
bracketTransform.setPosition(new THREE.Vector3(100, 0, 0));
const bracket = await assemblySystem.insertPart(bracketFileId, bracketTransform);

// Add mate constraint
await assemblySystem.addConstraint('mate', base.id, bracket.id, {
  entity1: { type: 'face', index: 0 },
  entity2: { type: 'face', index: 0 },
  offset: 0
});

// Save
await assemblySystem.saveAssembly();
```

### Loading and Modifying an Assembly
```typescript
// Load assembly
await assemblySystem.loadAssembly('assembly-123');

// Get all instances
const instances = assemblySystem.getInstances();

// Clone an instance
const clonedInstance = await assemblySystem.cloneInstance(instances[0].id);

// Update transform
clonedInstance.position.x += 50;
await assemblySystem.updateInstanceTransform(clonedInstance.id, clonedInstance.transform);

// Delete an instance
await assemblySystem.deleteInstance(instances[1].id);

// Save changes
await assemblySystem.saveAssembly();
```

### Working with Sub-Assemblies
```typescript
// Create sub-assembly from selected instances
const instanceIds = ['instance-1', 'instance-2', 'instance-3'];
await assemblySystem.createSubAssembly('Wheel Assembly', instanceIds);

// Get hierarchical tree
const tree = assemblySystem.getAssemblyTree();
console.log(tree);
// {
//   id: 'assembly-123',
//   name: 'Car Assembly',
//   type: 'assembly',
//   children: [
//     {
//       id: 'subassembly-456',
//       name: 'Wheel Assembly',
//       type: 'assembly',
//       children: [...]
//     }
//   ]
// }
```

## Navigation

### Access Points
1. **Navbar**: "Assembly Editor" link in main navigation
2. **CAD Editor Toolbar**: "📦 Assembly" button
3. **Direct URL**: `/assembly-editor` or `/assembly-editor?id=assembly-123`

## Keyboard Shortcuts

(Not yet implemented - planned features)

- `Ctrl+S`: Save assembly
- `Delete`: Delete selected instance
- `Ctrl+D`: Clone selected instance
- `H`: Toggle visibility of selected instance
- `L`: Toggle lock of selected instance
- `Esc`: Clear selection

## Future Enhancements

### Planned Features
1. **Advanced Constraint Solving**: Implement full constraint solver with geometric calculations
2. **Interference Detection**: Check for collisions between parts
3. **Bill of Materials (BOM)**: Auto-generate BOM from assembly
4. **Exploded View**: Create exploded view animations
5. **Motion Study**: Animate constrained assemblies
6. **Assembly Export**: Export to STEP, IGES with assembly structure
7. **Constraint Visualization**: Show constraint indicators in 3D viewport
8. **Transform Gizmos**: Interactive 3D gizmos for moving/rotating parts
9. **Snapping**: Snap parts together automatically
10. **Assembly Templates**: Pre-configured assembly structures

### Technical Improvements
1. **Geometry Loading**: Load actual part geometry instead of placeholder boxes
2. **Performance**: Optimize scene updates for large assemblies
3. **Undo/Redo**: Implement assembly-specific history
4. **Real-time Collaboration**: Multi-user assembly editing
5. **Version Control**: Track assembly revisions
6. **Part Libraries**: Shared libraries of standard parts (fasteners, bearings, etc.)

## Troubleshooting

### Assembly won't save
- Check that you have edit permissions (canEdit = true)
- Verify network connection to API
- Check browser console for errors

### Parts don't appear in viewport
- Ensure parts have visible = true
- Check that CAD files table has entries
- Verify part file paths are valid

### Constraints not solving correctly
- Current implementation uses basic solving
- Advanced geometric constraint solving planned for future release
- Manually adjust transforms as needed

### Performance issues with large assemblies
- Toggle visibility on unused instances
- Use sub-assemblies to organize complex structures
- Close unused panels to maximize viewport area

## Support

For issues or feature requests, please visit:
- GitHub Issues: (link to repo)
- Forum: `/forum`
- Support: `/issues`

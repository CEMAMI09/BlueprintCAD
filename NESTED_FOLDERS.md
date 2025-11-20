# Nested Folders System

Complete implementation of infinite-depth folder nesting with tree structure, access control, and circular reference prevention.

## Features

### ✅ Database Structure
- **`parent_id`** column in folders table for hierarchical relationships
- **Indexed** for optimal query performance
- **NULL-safe** for root-level folders
- **Circular reference prevention** built-in

### ✅ Tree Operations
- **Infinite depth nesting** - folders can contain folders indefinitely
- **Recursive tree building** with efficient queries
- **Breadcrumb navigation** showing full folder path
- **Move folders** between parents with validation
- **Ancestor/descendant tracking** for permission inheritance

### ✅ UI Components

#### FolderTree Component
Location: `app/components/FolderTree.tsx`
- Collapsible tree view with expand/collapse
- Visual indicators for team folders
- Project count badges
- Support for move operations
- Excludes folders during move to prevent circular references

#### FolderBreadcrumb Component
Location: `app/components/FolderBreadcrumb.tsx`
- Shows full path from root to current folder
- Clickable navigation
- Color-coded folders
- Auto-updating

### ✅ API Endpoints

#### `/api/folders/tree` (GET)
Returns complete folder tree structure with nested children
```json
[
  {
    "id": 1,
    "name": "Project A",
    "children": [
      {
        "id": 2,
        "name": "Subfolder 1",
        "children": []
      }
    ]
  }
]
```

#### `/api/folders/move` (POST)
Move a folder to new parent
```json
{
  "folder_id": 5,
  "new_parent_id": 3  // or null for root
}
```

Validates:
- Circular references (can't move folder into its own subfolder)
- User permissions on both source and destination
- Folder existence

#### `/api/folders/[id]/breadcrumb` (GET)
Returns folder path for breadcrumb navigation
```json
[
  { "id": 1, "name": "Root", "color": "#3b82f6" },
  { "id": 3, "name": "Parent", "color": "#10b981" },
  { "id": 5, "name": "Current", "color": "#ec4899" }
]
```

#### `/api/folders?parent_id=X` (GET)
Filter folders by parent ID
- `parent_id=null` or omitted: root-level folders only
- `parent_id=5`: subfolders of folder #5

### ✅ Utility Functions

Location: `lib/folder-utils.js`

#### `buildFolderTree(parentId, userId)`
Recursively builds folder tree structure from database

#### `getFolderAncestors(folderId)`
Returns array of parent folder IDs from root to folder

#### `getFolderDescendants(folderId)`
Returns array of all subfolder IDs (recursive)

#### `wouldCreateCircularReference(folderId, newParentId)`
Checks if move would create circular reference

#### `moveFolder(folderId, newParentId, userId)`
Safely moves folder with validation and logging

#### `checkFolderPermission(folderId, userId, roles)`
Verifies user has required role on folder

#### `getFolderPath(folderId)`
Returns full path array for breadcrumbs

#### `flattenFolderTree(tree, depth)`
Converts tree structure to flat array with depth levels

#### `inheritFolderPermissions(parentId, childId)`
Copies parent folder permissions to child (for future use)

### ✅ Access Control

#### Permission Inheritance (Ready)
When creating subfolders:
1. Child folder inherits parent's team members
2. Child folder inherits parent's access roles
3. Owner always has full access to all subfolders

#### Permission Checks
All folder operations validate:
- **Owner**: Full control (create, edit, delete, move)
- **Admin**: Create, edit, move (no delete)
- **Editor**: Edit content only
- **Viewer**: Read-only access

Checks apply recursively:
- Moving folder requires permission on both source AND destination
- Cannot move folder without proper role

### ✅ Circular Reference Prevention

Multiple layers of protection:
1. **Database-level**: Check descendants before allowing parent change
2. **API-level**: Validate move operations
3. **UI-level**: Exclude invalid destinations in folder picker

Algorithm:
```javascript
// Check if newParentId is a descendant of folderId
const descendants = await getFolderDescendants(folderId);
if (descendants.includes(newParentId)) {
  throw new Error('Circular reference');
}
```

## Usage Examples

### Create Root-Level Folder
```javascript
POST /api/folders
{
  "name": "My Projects",
  "parent_id": null,
  "is_team_folder": true
}
```

### Create Subfolder
```javascript
POST /api/folders
{
  "name": "Q1 2025",
  "parent_id": 5,
  "is_team_folder": false
}
```

### Move Folder
```javascript
POST /api/folders/move
{
  "folder_id": 8,
  "new_parent_id": 3
}
```

### Get Folder Tree
```javascript
GET /api/folders/tree
Authorization: Bearer <token>
```

### Navigate with Breadcrumb
```jsx
import FolderBreadcrumb from '../components/FolderBreadcrumb';

<FolderBreadcrumb folderId={currentFolderId} />
```

### Display Folder Tree
```jsx
import FolderTree from '../components/FolderTree';

<FolderTree
  onFolderSelect={(id) => router.push(`/folders/${id}`)}
  selectedFolderId={currentId}
/>
```

### Move Folder UI
```jsx
<FolderTree
  onFolderSelect={setMoveTarget}
  selectedFolderId={moveTargetId}
  showMoveTarget={true}
  excludeFolderId={folderBeingMoved}
/>
```

## Migration

Existing flat folders are automatically compatible:
- All existing folders have `parent_id = NULL` (root level)
- No data migration needed
- Users can organize into tree structure at their convenience

To migrate existing folder structure:
```bash
node scripts/migrate-nested-folders.js
```

Verifies:
- ✅ Column existence
- ✅ Indexes created
- ✅ No circular references
- ✅ Data integrity
- ✅ Statistics report

## Database Schema

```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL,
  parent_id INTEGER,  -- NULL for root folders
  is_team_folder BOOLEAN DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_owner_id ON folders(owner_id);
```

## Performance Considerations

### Optimizations
1. **Indexed parent_id** for fast tree queries
2. **Cached tree structure** in UI (refresh on changes)
3. **Lazy loading** of deep folder contents
4. **Batch operations** for permission inheritance

### Limits
- **Max depth**: 100 levels (configurable, prevents infinite loops)
- **Max children per folder**: Unlimited (but paginate in UI for large sets)
- **Move operations**: Atomic with rollback on error

## Testing Checklist

- [x] Create root-level folder
- [x] Create subfolder
- [x] Move folder to different parent
- [x] Move folder to root
- [x] Prevent circular reference (folder into its own subfolder)
- [x] Breadcrumb navigation
- [x] Tree view expand/collapse
- [x] Permission checks on move
- [x] Delete folder cascades to children
- [x] Team folder permissions inherited
- [x] Project count reflects nested content

## Future Enhancements

1. **Drag-and-drop** folder organization in tree view
2. **Bulk move** multiple folders at once
3. **Folder templates** with preset structure
4. **Smart folders** (virtual folders based on tags/filters)
5. **Folder sharing links** with expiration
6. **Activity feed** showing subfolder changes
7. **Folder statistics** (total nested projects, size, etc.)
8. **Search within folder tree**
9. **Folder archiving** (soft delete with restore)
10. **Folder duplication** with entire subtree

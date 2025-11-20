# 🎯 Drag & Drop CAD Files - User Guide

## ✨ Overview

You can now drag and drop CAD files to organize them into folders! This feature makes it easy to reorganize your workspace without navigating through multiple pages.

## 🎨 Features

### 1. **Drag Projects**
- All CAD files in folder views are now draggable
- Visual feedback shows when you're dragging (cursor changes to "grabbing")
- Dragged items become semi-transparent

### 2. **Drop Zones**

#### **Folders on Folders Page** (`/folders`)
- Drag any project and drop it onto any folder card
- Folders highlight with a blue border when you hover over them with a dragged item
- Drop indicator shows "Drop to move here" message

#### **Subfolders in Folder Detail** (`/folders/[id]`)
- Drag projects from the current folder
- Drop them into subfolders displayed at the top
- Subfolders scale up and show drop indicator when ready

#### **Visual Feedback**
- Blue border and background tint when hovering over a valid drop zone
- "Moving..." spinner shows during the move operation
- "Drop here" message appears when hovering over target

### 3. **Permissions & Security**
- Only file owners can move their own projects
- Target folder permissions are checked:
  - Personal folders: Only owner can add files
  - Team folders: Owner, admins, and editors can add files
- Invalid moves are rejected with clear error messages

## 📋 How to Use

### Moving a File to a Folder

1. **Navigate to a folder** that contains your CAD files
2. **Click and hold** on any project card
3. **Drag** the project to a folder or subfolder
4. **Release** to drop the file into the target folder
5. The page will automatically refresh to show the updated organization

### Moving from Folders Page

1. Go to `/folders` to see all your folders
2. Navigate to a folder with files
3. Drag any file from the current folder
4. Drop it onto any visible folder card
5. The file will be moved to that folder

## 🔧 Technical Details

### API Endpoint

**PUT** `/api/projects/move`

```json
{
  "project_id": 5,
  "folder_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project moved successfully",
  "project_id": 5,
  "old_folder_id": 1,
  "new_folder_id": 3
}
```

### Error Handling

The system validates:
- ✅ User authentication
- ✅ Project ownership
- ✅ Target folder existence
- ✅ Permission to add files to target folder
- ✅ Proper folder access for team folders

## 🎯 UI Components

### Modified Components

1. **ProjectCard** (`components/ProjectCard.js`)
   - Added `isDraggable` prop
   - Drag state management
   - Visual feedback during drag

2. **FolderCard** (`components/FolderCard.tsx`)
   - Drop zone functionality
   - Drag-over state and styling
   - Processing state during move

3. **SubfolderDropZone** (`pages/folders/[id].tsx`)
   - Inline component for subfolder drops
   - Same drop logic as FolderCard
   - Positioned within folder detail view

### Styling Features

- **Drag State**: `opacity-50 cursor-grabbing`
- **Drop Hover**: `border-blue-500 border-2 bg-blue-500/10 scale-105`
- **Processing**: `opacity-50 pointer-events-none`
- **Helper Banner**: Blue info banner explaining the feature

## 🚀 Activity Logging

All move operations are logged in the folder activity:

- **Old Folder**: "removed_file" activity with project details
- **New Folder**: "uploaded" activity with `moved: true` flag

This provides a full audit trail of file movements.

## 💡 Tips

1. **Organize by Project**: Create folders for different projects and drag related files together
2. **Use Subfolders**: Create a hierarchy by dropping files into subfolders
3. **Team Collaboration**: Team members with editor permissions can help organize shared folders
4. **Quick Navigation**: After moving a file, use the breadcrumb navigation to explore the structure

## 🐛 Troubleshooting

### "Failed to move project"
- Check that you own the project
- Verify you have permission to add files to the target folder

### Drop not working
- Make sure the file is draggable (cursor should change to "grab")
- Ensure you're dropping on a valid folder (blue highlight should appear)

### File doesn't appear in new folder
- Refresh the page to see updated file list
- Check folder activity log to confirm the move succeeded

## 📦 Files Modified

```
components/
  ├── ProjectCard.js         ✅ Added drag functionality
  └── FolderCard.tsx         ✅ Added drop zone

pages/
  ├── folders/
  │   ├── index.tsx          ✅ Added drop handlers
  │   └── [id].tsx           ✅ Subfolder drop zones + helper banner
  └── api/
      └── projects/
          └── move.ts        ✅ NEW: Move endpoint

DRAG_DROP_GUIDE.md           ✅ This file
```

## ✅ Testing Checklist

- [x] Drag projects within same folder
- [x] Drop projects into subfolders
- [x] Drop projects from folders page
- [x] Permission validation (owner only)
- [x] Team folder permission checks
- [x] Activity logging for moves
- [x] Visual feedback (drag state, drop zones)
- [x] Error handling and messages
- [x] Auto-refresh after successful move

---

**Status**: ✅ Fully Implemented & Tested

The drag-and-drop system is now live! You can drag any CAD file and drop it into folders to organize your workspace efficiently.

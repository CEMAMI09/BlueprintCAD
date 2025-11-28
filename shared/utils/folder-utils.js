// Folder utility functions for nested folder operations
import { getDb } from '../../db/db.js';

/**
 * Build a recursive folder tree structure
 * @param {number|null} parentId - Parent folder ID (null for root level)
 * @param {number} userId - User ID to check permissions
 * @param {Array} allFolders - Optional: pre-fetched folders array
 * @returns {Promise<Array>} Tree structure with nested children
 */
export async function buildFolderTree(parentId = null, userId, allFolders = null) {
  const db = await getDb();
  
  // Fetch all accessible folders if not provided
  if (!allFolders) {
    allFolders = await db.all(
      `SELECT 
        f.*,
        u.username as owner_username,
        (SELECT COUNT(*) FROM folder_members WHERE folder_id = f.id) as member_count,
        (SELECT COUNT(*) FROM projects WHERE folder_id = f.id) as project_count,
        COALESCE(
          (SELECT role FROM folder_members WHERE folder_id = f.id AND user_id = ?),
          CASE WHEN f.owner_id = ? THEN 'owner' ELSE NULL END
        ) as user_role
       FROM folders f
       JOIN users u ON f.owner_id = u.id
       WHERE (f.owner_id = ? OR f.id IN (
         SELECT folder_id FROM folder_members WHERE user_id = ?
       ))
       ORDER BY f.is_team_folder DESC, f.name ASC`,
      [userId, userId, userId, userId]
    );
  }
  
  // Filter folders by parent_id
  const folders = allFolders.filter(f => {
    if (parentId === null) {
      return f.parent_id === null || f.parent_id === 0;
    }
    return f.parent_id === parentId;
  });
  
  // Recursively build children
  const tree = await Promise.all(
    folders.map(async (folder) => ({
      ...folder,
      children: await buildFolderTree(folder.id, userId, allFolders)
    }))
  );
  
  return tree;
}

/**
 * Get all ancestor folder IDs for a folder (parent path)
 * @param {number} folderId - Folder ID
 * @returns {Promise<Array<number>>} Array of ancestor IDs from root to parent
 */
export async function getFolderAncestors(folderId) {
  const db = await getDb();
  const ancestors = [];
  let currentId = folderId;
  let depth = 0;
  const maxDepth = 100; // Prevent infinite loops
  
  while (currentId && depth < maxDepth) {
    const folder = await db.get(
      'SELECT id, parent_id FROM folders WHERE id = ?',
      [currentId]
    );
    
    if (!folder || !folder.parent_id) break;
    
    ancestors.unshift(folder.parent_id); // Add to front
    currentId = folder.parent_id;
    depth++;
  }
  
  return ancestors;
}

/**
 * Get all descendant folder IDs (recursive children)
 * @param {number} folderId - Folder ID
 * @returns {Promise<Array<number>>} Array of all descendant folder IDs
 */
export async function getFolderDescendants(folderId) {
  const db = await getDb();
  const descendants = [];
  
  async function getChildren(parentId) {
    const children = await db.all(
      'SELECT id FROM folders WHERE parent_id = ?',
      [parentId]
    );
    
    for (const child of children) {
      descendants.push(child.id);
      await getChildren(child.id); // Recursive
    }
  }
  
  await getChildren(folderId);
  return descendants;
}

/**
 * Check if moving a folder would create a circular reference
 * @param {number} folderId - Folder to move
 * @param {number|null} newParentId - Target parent folder ID
 * @returns {Promise<boolean>} True if move would create circular reference
 */
export async function wouldCreateCircularReference(folderId, newParentId) {
  if (!newParentId) return false; // Moving to root is always safe
  if (folderId === newParentId) return true; // Can't be its own parent
  
  // Check if newParentId is a descendant of folderId
  const descendants = await getFolderDescendants(folderId);
  return descendants.includes(newParentId);
}

/**
 * Move a folder to a new parent
 * @param {number} folderId - Folder to move
 * @param {number|null} newParentId - New parent folder ID (null for root)
 * @param {number} userId - User performing the move
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function moveFolder(folderId, newParentId, userId) {
  const db = await getDb();
  
  try {
    // Get folder info
    const folder = await db.get(
      'SELECT * FROM folders WHERE id = ?',
      [folderId]
    );
    
    if (!folder) {
      return { success: false, error: 'Folder not found' };
    }
    
    // Check permissions on source folder
    const hasSourcePermission = await checkFolderPermission(folderId, userId, ['owner', 'admin', 'editor']);
    if (!hasSourcePermission) {
      return { success: false, error: 'Insufficient permissions on source folder' };
    }
    
    // Check permissions on destination folder (if not root)
    if (newParentId) {
      const hasDestPermission = await checkFolderPermission(newParentId, userId, ['owner', 'admin', 'editor']);
      if (!hasDestPermission) {
        return { success: false, error: 'Insufficient permissions on destination folder' };
      }
    }
    
    // Check for circular reference
    const isCircular = await wouldCreateCircularReference(folderId, newParentId);
    if (isCircular) {
      return { success: false, error: 'Cannot move folder into its own subfolder' };
    }
    
    // Perform the move
    await db.run(
      'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newParentId || null, folderId]
    );
    
    // Log activity
    await db.run(
      `INSERT INTO folder_activity (folder_id, user_id, action, details)
       VALUES (?, ?, 'moved', ?)`,
      [folderId, userId, JSON.stringify({ 
        from_parent_id: folder.parent_id, 
        to_parent_id: newParentId 
      })]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Move folder error:', error);
    return { success: false, error: 'Failed to move folder' };
  }
}

/**
 * Check if user has permission on a folder
 * @param {number} folderId - Folder ID
 * @param {number} userId - User ID
 * @param {Array<string>} requiredRoles - Acceptable roles (e.g., ['owner', 'admin'])
 * @returns {Promise<boolean>}
 */
export async function checkFolderPermission(folderId, userId, requiredRoles = ['owner']) {
  const db = await getDb();
  
  const folder = await db.get(
    'SELECT owner_id FROM folders WHERE id = ?',
    [folderId]
  );
  
  if (!folder) return false;
  
  // Owner always has permission
  if (folder.owner_id === userId) return true;
  
  // Check membership role
  const membership = await db.get(
    'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
    [folderId, userId]
  );
  
  if (membership && requiredRoles.includes(membership.role)) {
    return true;
  }
  
  return false;
}

/**
 * Get folder path (breadcrumb)
 * @param {number} folderId - Folder ID
 * @returns {Promise<Array>} Array of folder objects from root to current
 */
export async function getFolderPath(folderId) {
  const db = await getDb();
  const path = [];
  let currentId = folderId;
  let depth = 0;
  const maxDepth = 100;
  
  while (currentId && depth < maxDepth) {
    const folder = await db.get(
      'SELECT id, name, parent_id, color FROM folders WHERE id = ?',
      [currentId]
    );
    
    if (!folder) break;
    
    path.unshift(folder); // Add to front
    currentId = folder.parent_id;
    depth++;
  }
  
  return path;
}

/**
 * Flatten folder tree to array with depth level
 * @param {Array} tree - Folder tree structure
 * @param {number} depth - Current depth level
 * @returns {Array} Flat array with depth property
 */
export function flattenFolderTree(tree, depth = 0) {
  const result = [];
  
  for (const folder of tree) {
    const { children, ...folderData } = folder;
    result.push({ ...folderData, depth });
    
    if (children && children.length > 0) {
      result.push(...flattenFolderTree(children, depth + 1));
    }
  }
  
  return result;
}

/**
 * Copy folder permissions from parent to child
 * Used when creating subfolders to inherit parent permissions
 * @param {number} parentFolderId - Parent folder ID
 * @param {number} childFolderId - Child folder ID
 */
export async function inheritFolderPermissions(parentFolderId, childFolderId) {
  const db = await getDb();
  
  // Get parent folder members
  const parentMembers = await db.all(
    'SELECT user_id, role FROM folder_members WHERE folder_id = ?',
    [parentFolderId]
  );
  
  // Copy to child folder
  for (const member of parentMembers) {
    await db.run(
      `INSERT OR IGNORE INTO folder_members (folder_id, user_id, role)
       VALUES (?, ?, ?)`,
      [childFolderId, member.user_id, member.role]
    );
  }
}

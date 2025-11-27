/**
 * Activity Logger Utility
 * Centralized logging for folder and file activities
 */

const { getDb } = require('../../db/db');

/**
 * Log an activity
 * @param {Object} params
 * @param {number} params.userId - User who performed the action
 * @param {string} params.action - Action type (upload, delete, rename, etc.)
 * @param {string} params.entityType - Type of entity (folder, file, branch, member, role)
 * @param {number} [params.folderId] - Folder ID if applicable
 * @param {number} [params.projectId] - Project/File ID if applicable
 * @param {number} [params.entityId] - ID of the entity being acted upon
 * @param {string} [params.entityName] - Name of the entity (for display)
 * @param {Object} [params.details] - Additional details object (will be JSON stringified)
 * @param {Object} [params.metadata] - Additional metadata (will be JSON stringified)
 */
async function logActivity({
  userId,
  action,
  entityType,
  folderId = null,
  projectId = null,
  entityId = null,
  entityName = null,
  details = null,
  metadata = null
}) {
  try {
    const db = await getDb();
    
    await db.run(
      `INSERT INTO activity_log (
        folder_id, project_id, user_id, action, entity_type, 
        entity_id, entity_name, details, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folderId,
        projectId,
        userId,
        action,
        entityType,
        entityId,
        entityName,
        details ? JSON.stringify(details) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  } catch (error) {
    // Don't throw - logging should never break the main operation
    console.error('Error logging activity:', error);
  }
}

/**
 * Get activities for a folder
 * @param {number} folderId - Folder ID
 * @param {Object} options - Query options
 * @param {string} [options.action] - Filter by action
 * @param {string} [options.entityType] - Filter by entity type
 * @param {number} [options.limit] - Limit results
 * @param {number} [options.offset] - Offset for pagination
 * @returns {Promise<Array>} Array of activity records
 */
async function getFolderActivities(folderId, options = {}) {
  const db = await getDb();
  const { action, entityType, limit = 500, offset = 0 } = options;

  let query = `
    SELECT 
      al.*,
      u.username,
      u.profile_picture as avatar
    FROM activity_log al
    JOIN users u ON al.user_id = u.id
    WHERE al.folder_id = ?
  `;
  const params = [folderId];

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  if (entityType) {
    query += ' AND al.entity_type = ?';
    params.push(entityType);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return await db.all(query, params);
}

/**
 * Get activities for a project/file
 * @param {number} projectId - Project ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of activity records
 */
async function getProjectActivities(projectId, options = {}) {
  const db = await getDb();
  const { limit = 50, offset = 0 } = options;

  return await db.all(
    `SELECT 
      al.*,
      u.username,
      u.profile_picture as avatar
     FROM activity_log al
     JOIN users u ON al.user_id = u.id
     WHERE al.project_id = ?
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [projectId, limit, offset]
  );
}

module.exports = {
  logActivity,
  getFolderActivities,
  getProjectActivities
};


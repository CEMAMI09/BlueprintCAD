// Utility functions for extracting and calculating file metadata
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Calculate SHA-256 checksum of a file
 */
function calculateChecksum(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    console.error('Error calculating checksum:', error);
    return null;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return null;
  }
}

/**
 * Extract bounding box dimensions from a 3D file
 * Returns {width, height, depth} in millimeters
 */
function extractBoundingBox(filePath, fileType) {
  try {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    // Use existing STL parser if available
    if (ext === 'stl') {
      const { getSTLDimensions } = require('./stl-utils');
      const dims = getSTLDimensions(filePath);
      if (dims) {
        return {
          width: dims.x,
          height: dims.y,
          depth: dims.z
        };
      }
    }
    
    // For other formats, we could add parsers here
    // For now, return null if we can't parse it
    return null;
  } catch (error) {
    console.error('Error extracting bounding box:', error);
    return null;
  }
}

/**
 * Extract all metadata for a file
 */
function extractFileMetadata(filePath, fileType) {
  const metadata = {
    file_size_bytes: null,
    bounding_box_width: null,
    bounding_box_height: null,
    bounding_box_depth: null,
    file_format: null,
    upload_timestamp: new Date().toISOString(),
    file_checksum: null
  };

  try {
    // File size
    metadata.file_size_bytes = getFileSize(filePath);
    
    // File format (from file extension)
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    metadata.file_format = ext || fileType;
    
    // Bounding box
    const bbox = extractBoundingBox(filePath, fileType);
    if (bbox) {
      metadata.bounding_box_width = bbox.width;
      metadata.bounding_box_height = bbox.height;
      metadata.bounding_box_depth = bbox.depth;
    }
    
    // Checksum
    metadata.file_checksum = calculateChecksum(filePath);
    
  } catch (error) {
    console.error('Error extracting file metadata:', error);
  }

  return metadata;
}

/**
 * Get branch count for a project
 */
async function getBranchCount(projectId) {
  try {
    const { getDb } = require('../../db/db');
    const db = await getDb();
    const result = await db.get(
      'SELECT COUNT(*) as count FROM file_branches WHERE project_id = ?',
      [projectId]
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting branch count:', error);
    return 0;
  }
}

module.exports = {
  calculateChecksum,
  getFileSize,
  extractBoundingBox,
  extractFileMetadata,
  getBranchCount
};


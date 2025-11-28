import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { metadata, changes } = req.body;

    // Verify authentication
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get current file
    const file = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cad_files WHERE id = ?`,
        [parseInt(id)],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions
    if (file.user_id !== decoded.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check tier limits
    const userTier = decoded.tier || 'free';
    const tierLimits = {
      free: { maxFiles: 5, maxFileSize: 10 * 1024 * 1024 },
      pro: { maxFiles: 25, maxFileSize: 50 * 1024 * 1024 },
      team: { maxFiles: 50, maxFileSize: 100 * 1024 * 1024 },
      enterprise: { maxFiles: -1, maxFileSize: -1 }
    };

    const limits = tierLimits[userTier];

    // Create new version entry
    const newVersion = file.version + 1;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO cad_file_versions (cad_file_id, version, file_path, file_size, changes_description, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [file.id, newVersion, file.file_path, file.file_size, changes || 'Manual save', decoded.userId],
        function(err) {
          if (err) reject(err);
          resolve();
        }
      );
    });

    // Update main file record
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE cad_files 
         SET version = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP, is_draft = 0
         WHERE id = ?`,
        [newVersion, metadata || file.metadata, file.id],
        function(err) {
          if (err) reject(err);
          resolve();
        }
      );
    });

    // Get updated file
    const updatedFile = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cad_files WHERE id = ?`,
        [parseInt(id)],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    return res.status(200).json({
      success: true,
      message: 'File saved successfully',
      file: updatedFile,
      version: newVersion
    });
  } catch (error) {
    console.error('Error saving CAD file:', error);
    return res.status(500).json({ error: 'Failed to save file' });
  }
}

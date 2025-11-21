import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../db/db';

/**
 * API endpoint to save display-only metadata to CAD files
 * Used for draft analysis, simulation results, etc.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query; // File ID
  
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      
      // Verify user owns the file (simplified - should use proper token verification)
      const { metadataType, metadata, displayOnly } = req.body;

      if (!metadataType || !metadata) {
        return res.status(400).json({ error: 'Missing metadataType or metadata' });
      }

      // Get existing metadata
      const fileQuery = 'SELECT metadata FROM cad_files WHERE id = $1';
      const fileResult = await pool.query(fileQuery, [id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      let existingMetadata = {};
      try {
        existingMetadata = JSON.parse(fileResult.rows[0].metadata || '{}');
      } catch {
        existingMetadata = {};
      }

      // Add/update the specific metadata type
      const updatedMetadata = {
        ...existingMetadata,
        [metadataType]: {
          data: metadata,
          displayOnly: displayOnly !== false, // Default to true
          timestamp: Date.now(),
          version: 1
        }
      };

      // Update file metadata
      const updateQuery = `
        UPDATE cad_files 
        SET metadata = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING id, filename, metadata
      `;
      
      const result = await pool.query(updateQuery, [
        JSON.stringify(updatedMetadata),
        id
      ]);

      res.status(200).json({
        success: true,
        file: result.rows[0]
      });

    } catch (error) {
      console.error('Error saving metadata:', error);
      res.status(500).json({ error: 'Failed to save metadata' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get metadata for a file
      const { type } = req.query;
      
      const query = 'SELECT metadata FROM cad_files WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      let metadata = {};
      try {
        metadata = JSON.parse(result.rows[0].metadata || '{}');
      } catch {
        metadata = {};
      }

      // Return specific type or all metadata
      if (type && typeof type === 'string') {
        res.status(200).json({
          success: true,
          metadata: metadata[type] || null
        });
      } else {
        res.status(200).json({
          success: true,
          metadata
        });
      }

    } catch (error) {
      console.error('Error retrieving metadata:', error);
      res.status(500).json({ error: 'Failed to retrieve metadata' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type } = req.query;
      
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Missing metadata type' });
      }

      // Get existing metadata
      const fileQuery = 'SELECT metadata FROM cad_files WHERE id = $1';
      const fileResult = await pool.query(fileQuery, [id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      let existingMetadata = {};
      try {
        existingMetadata = JSON.parse(fileResult.rows[0].metadata || '{}');
      } catch {
        existingMetadata = {};
      }

      // Remove the specific metadata type
      delete existingMetadata[type];

      // Update file metadata
      const updateQuery = `
        UPDATE cad_files 
        SET metadata = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING id, filename, metadata
      `;
      
      const result = await pool.query(updateQuery, [
        JSON.stringify(existingMetadata),
        id
      ]);

      res.status(200).json({
        success: true,
        file: result.rows[0]
      });

    } catch (error) {
      console.error('Error deleting metadata:', error);
      res.status(500).json({ error: 'Failed to delete metadata' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

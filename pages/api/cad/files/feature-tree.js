// Feature tree API endpoint
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'forge.db');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { fileId, treeData, version, branchId } = req.body;

      if (!fileId || !treeData) {
        return res.status(400).json({ error: 'File ID and tree data required' });
      }

      const db = new Database(dbPath);

      try {
        // Check if file exists
        const file = db.prepare('SELECT * FROM cad_files WHERE id = ?').get(fileId);
        
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Store feature tree
        const stmt = db.prepare(`
          INSERT INTO cad_feature_trees (file_id, tree_data, version, branch_id, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `);

        const result = stmt.run(
          fileId,
          treeData,
          version || 1,
          branchId || 'main'
        );

        // Update file's updated_at
        db.prepare('UPDATE cad_files SET updated_at = datetime("now") WHERE id = ?').run(fileId);

        return res.status(200).json({
          success: true,
          treeId: result.lastInsertRowid,
          version,
          branchId: branchId || 'main'
        });

      } finally {
        db.close();
      }
    } catch (error) {
      console.error('Feature tree save error:', error);
      return res.status(500).json({ error: 'Failed to save feature tree' });
    }
  } else if (req.method === 'GET') {
    try {
      const { fileId, branchId = 'main' } = req.query;

      if (!fileId) {
        return res.status(400).json({ error: 'File ID required' });
      }

      const db = new Database(dbPath);

      try {
        // Get latest feature tree for file and branch
        const tree = db.prepare(`
          SELECT * FROM cad_feature_trees 
          WHERE file_id = ? AND branch_id = ?
          ORDER BY version DESC, created_at DESC
          LIMIT 1
        `).get(fileId, branchId);

        if (!tree) {
          return res.status(404).json({ error: 'Feature tree not found' });
        }

        return res.status(200).json({
          treeData: tree.tree_data,
          version: tree.version,
          branchId: tree.branch_id,
          createdAt: tree.created_at
        });

      } finally {
        db.close();
      }
    } catch (error) {
      console.error('Feature tree load error:', error);
      return res.status(500).json({ error: 'Failed to load feature tree' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { fileId, branchId } = req.body;

      if (!fileId) {
        return res.status(400).json({ error: 'File ID required' });
      }

      const db = new Database(dbPath);

      try {
        const history = db.prepare(`
          SELECT id, version, branch_id, created_at
          FROM cad_feature_trees 
          WHERE file_id = ? ${branchId ? 'AND branch_id = ?' : ''}
          ORDER BY created_at DESC
          LIMIT 50
        `).all(branchId ? [fileId, branchId] : [fileId]);

        return res.status(200).json({ history });

      } finally {
        db.close();
      }
    } catch (error) {
      console.error('Feature tree history error:', error);
      return res.status(500).json({ error: 'Failed to load history' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}


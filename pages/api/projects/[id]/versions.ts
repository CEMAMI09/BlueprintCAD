// API endpoint to get file version history
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get version history
    try {
      const db = await getDb();
      
      // First, get the project to check permissions
      const project = await db.get(
        'SELECT id, user_id, title FROM projects WHERE id = ?',
        [id]
      );

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get all versions for this project, ordered by version number descending
      const versions = await db.all(`
        SELECT 
          fv.id,
          fv.version_number,
          fv.file_path,
          fv.file_size,
          fv.thumbnail_path,
          fv.uploaded_by,
          fv.created_at,
          fv.is_current,
          fv.change_notes,
          u.username as uploaded_by_username
        FROM file_versions fv
        LEFT JOIN users u ON fv.uploaded_by = u.id
        WHERE fv.project_id = ?
        ORDER BY fv.version_number DESC
      `, [id]);

      return res.status(200).json({
        project_id: project.id,
        project_title: project.title,
        versions
      });
    } catch (error) {
      console.error('Get versions error:', error);
      return res.status(500).json({ error: 'Failed to get version history' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

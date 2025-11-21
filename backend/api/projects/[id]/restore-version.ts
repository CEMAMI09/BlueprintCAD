// API endpoint to restore a file version
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../backend/lib/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const { id } = req.query;
  const { versionId } = req.body;

  if (!versionId) {
    return res.status(400).json({ error: 'Version ID is required' });
  }

  try {
    const db = await getDb();

    // Get the project
    const project = await db.get(
      'SELECT id, user_id FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user owns the project
    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to restore versions' });
    }

    // Get the version to restore
    const version = await db.get(
      'SELECT * FROM file_versions WHERE id = ? AND project_id = ?',
      [versionId, id]
    );

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Mark all versions as not current
    await db.run(
      'UPDATE file_versions SET is_current = 0 WHERE project_id = ?',
      [id]
    );

    // Mark the selected version as current
    await db.run(
      'UPDATE file_versions SET is_current = 1 WHERE id = ?',
      [versionId]
    );

    // Update the project with the restored version's file path
    await db.run(
      'UPDATE projects SET file_path = ?, thumbnail = ?, current_version_id = ? WHERE id = ?',
      [version.file_path, version.thumbnail_path, versionId, id]
    );

    return res.status(200).json({
      message: 'Version restored successfully',
      version: {
        id: version.id,
        version_number: version.version_number,
        file_path: version.file_path
      }
    });
  } catch (error) {
    console.error('Restore version error:', error);
    return res.status(500).json({ error: 'Failed to restore version' });
  }
}

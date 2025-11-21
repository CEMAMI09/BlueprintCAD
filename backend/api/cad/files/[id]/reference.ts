import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'File ID is required' });
  }

  if (req.method === 'GET') {
    return handleGetFileReference(id, req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetFileReference(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }

    const query = `
      SELECT 
        id,
        filename,
        filepath,
        folder_id,
        version,
        thumbnail,
        data,
        created_at,
        updated_at
      FROM cad_files
      WHERE id = ?
    `;

    const file = await db.get(query, [fileId]);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Parse data JSON for additional metadata
    const data = file.data ? JSON.parse(file.data) : {};

    // Return part reference
    return res.status(200).json({
      fileId: file.id,
      filename: file.filename,
      filepath: file.filepath,
      version: file.version,
      thumbnail: file.thumbnail || '/placeholder-thumbnail.png',
      boundingBox: data.boundingBox || {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 100, y: 100, z: 100 }
      },
      mass: data.mass || 1.0,
      material: data.material || 'steel'
    });
  } catch (error) {
    console.error('Error getting file reference:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

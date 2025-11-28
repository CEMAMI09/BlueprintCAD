import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../db/db.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetFiles(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetFiles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { folderId } = req.query;
    const db = await getDb();

    let query = `
      SELECT 
        id,
        filename,
        filepath,
        folder_id,
        version,
        thumbnail,
        created_at,
        updated_at
      FROM cad_files
    `;

    const params: any[] = [];

    if (folderId) {
      query += ' WHERE folder_id = ?';
      params.push(parseInt(folderId as string));
    }

    query += ' ORDER BY updated_at DESC';

    const files = await db.all(query, params);

    return res.status(200).json({
      files
    });
  } catch (error) {
    console.error('Error getting files:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

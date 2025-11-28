import type { NextApiRequest, NextApiResponse } from 'next';
import { getFolderPath } from '../../../../shared/utils/folder-utils.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const path = await getFolderPath(Number(id));
    res.status(200).json(path);
  } catch (error) {
    console.error('Get folder path error:', error);
    res.status(500).json({ error: 'Failed to get folder path' });
  }
}

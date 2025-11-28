import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../shared/utils/auth.js';
import { moveFolder } from '../../../shared/utils/folder-utils.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const { folder_id, new_parent_id } = req.body;

  if (!folder_id) {
    return res.status(400).json({ error: 'folder_id is required' });
  }

  try {
    const result = await moveFolder(
      folder_id,
      new_parent_id || null,
      userId
    );

    if (result.success) {
      res.status(200).json({ message: 'Folder moved successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Move folder API error:', error);
    res.status(500).json({ error: 'Failed to move folder' });
  }
}

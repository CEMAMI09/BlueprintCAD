import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../shared/utils/auth.js';
import { buildFolderTree } from '../../../shared/utils/folder-utils.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;

  try {
    const tree = await buildFolderTree(null, userId);
    res.status(200).json(tree);
  } catch (error) {
    console.error('Build folder tree error:', error);
    res.status(500).json({ error: 'Failed to build folder tree' });
  }
}

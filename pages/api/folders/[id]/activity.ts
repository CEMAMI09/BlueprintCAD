import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../shared/utils/auth';
import { getFolderActivities } from '../../../../shared/utils/activity-logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const user = getUserFromRequest(req);

  if (req.method === 'GET') {
    try {
      const { action, entityType, limit, offset } = req.query;

      const activities = await getFolderActivities(parseInt(id as string), {
        action: action as string | undefined,
        entityType: entityType as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });

      res.status(200).json(activities);
    } catch (error) {
      console.error('Fetch activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
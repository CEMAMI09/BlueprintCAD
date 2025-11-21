// Serve profile pictures
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter required' });
  }

  try {
    const filePath = path.join(process.cwd(), 'uploads', 'profiles', file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file extension to determine content type
    const ext = path.extname(file).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Profile picture serve error:', error);
    res.status(500).json({ error: 'Failed to serve profile picture' });
  }
}

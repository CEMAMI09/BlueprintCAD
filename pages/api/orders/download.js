/**
 * Secure file download with token verification
 * GET /api/orders/download?token=xxx
 */

import { getDb } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Download token required' });
    }

    const db = await getDb();

    // Get order with token
    const order = await db.get(
      `SELECT o.*, p.file_path, p.title
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       WHERE o.download_token = ? AND o.payment_status = 'succeeded'`,
      [token]
    );

    if (!order) {
      return res.status(404).json({ error: 'Invalid or expired download link' });
    }

    // Check if expired
    if (order.expires_at) {
      const expiresAt = new Date(order.expires_at);
      if (expiresAt < new Date()) {
        return res.status(403).json({ error: 'Download link has expired' });
      }
    }

    // Check download limit
    if (order.download_count >= order.download_limit) {
      return res.status(403).json({ error: 'Download limit reached' });
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), 'uploads', order.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Increment download count
    await db.run(
      `UPDATE orders SET download_count = download_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [order.id]
    );

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Set headers for download
    const fileName = path.basename(order.file_path);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process download' });
    }
  }
}

/**
 * Get user's orders (purchases and sales)
 * GET /api/orders/my-orders
 */

import { getDb } from '../../../backend/lib/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.userId;
    const { type = 'all' } = req.query; // 'purchases', 'sales', or 'all'

    const db = await getDb();

    let purchases = [];
    let sales = [];

    if (type === 'purchases' || type === 'all') {
      purchases = await db.all(
        `SELECT 
          o.id, o.order_number, o.amount, o.currency, o.status, o.payment_status,
          o.download_token, o.download_count, o.download_limit, o.created_at,
          o.expires_at, o.refund_amount, o.refunded_at,
          p.id as project_id, p.title as project_title, p.thumbnail_path,
          seller.username as seller_username, seller.profile_picture as seller_picture
        FROM orders o
        JOIN projects p ON o.project_id = p.id
        JOIN users seller ON o.seller_id = seller.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC`,
        [userId]
      );
    }

    if (type === 'sales' || type === 'all') {
      sales = await db.all(
        `SELECT 
          o.id, o.order_number, o.amount, o.currency, o.status, o.payment_status,
          o.created_at, o.refund_amount, o.refunded_at,
          p.id as project_id, p.title as project_title, p.thumbnail_path,
          buyer.username as buyer_username, buyer.profile_picture as buyer_picture
        FROM orders o
        JOIN projects p ON o.project_id = p.id
        JOIN users buyer ON o.buyer_id = buyer.id
        WHERE o.seller_id = ?
        ORDER BY o.created_at DESC`,
        [userId]
      );
    }

    // Calculate totals
    const totalEarnings = sales
      .filter(s => s.payment_status === 'succeeded')
      .reduce((sum, s) => sum + s.amount - (s.refund_amount || 0), 0);

    const totalSpent = purchases
      .filter(p => p.payment_status === 'succeeded')
      .reduce((sum, p) => sum + p.amount - (p.refund_amount || 0), 0);

    res.status(200).json({
      purchases,
      sales,
      stats: {
        totalPurchases: purchases.length,
        totalSales: sales.length,
        totalSpent: totalSpent.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2),
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

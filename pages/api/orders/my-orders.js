/**
 * Get user's orders (purchases and sales)
 * GET /api/orders/my-orders
 */

import { getDb } from '../../../db/db';
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

    // Create manufacturing_orders table if it doesn't exist
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS manufacturing_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          order_number TEXT UNIQUE NOT NULL,
          file_name TEXT NOT NULL,
          manufacturing_option TEXT NOT NULL,
          estimated_cost TEXT NOT NULL,
          delivery_time TEXT,
          material TEXT,
          scale_percentage INTEGER,
          dimensions TEXT,
          weight_grams REAL,
          print_time_hours REAL,
          ai_estimate TEXT,
          breakdown TEXT,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (err) {
      console.log('Error creating manufacturing_orders table:', err);
    }

    let purchases = [];
    let sales = [];
    let manufacturingOrders = [];

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

    // Get manufacturing orders (only for the current user - private)
    try {
      manufacturingOrders = await db.all(
        `SELECT 
          id, order_number, file_name, manufacturing_option, estimated_cost,
          delivery_time, material, scale_percentage, dimensions, weight_grams,
          print_time_hours, status, created_at, updated_at
        FROM manufacturing_orders
        WHERE user_id = ?
        ORDER BY created_at DESC`,
        [userId]
      );
    } catch (err) {
      // Table might not exist yet, that's okay
      console.log('Error fetching manufacturing orders:', err);
      manufacturingOrders = [];
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
      manufacturingOrders,
      stats: {
        totalPurchases: purchases.length,
        totalSales: sales.length,
        totalManufacturingOrders: manufacturingOrders.length,
        totalSpent: totalSpent.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2),
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

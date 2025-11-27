// Update manufacturing order status and send notifications
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'shipped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const db = await getDb();

    // Get order
    const order = await db.get(
      'SELECT user_id, order_number, file_name, status as current_status FROM manufacturing_orders WHERE id = ?',
      [id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow status updates by order owner or admin (for now, just owner)
    if (order.user_id !== user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Update status
    await db.run(
      'UPDATE manufacturing_orders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, notes || null, id]
    );

    // Create notification for status change
    const statusMessages = {
      'pending': 'Your manufacturing order is pending review',
      'processing': 'Your manufacturing order is now being processed',
      'completed': 'Your manufacturing order has been completed!',
      'cancelled': 'Your manufacturing order has been cancelled',
      'shipped': 'Your manufacturing order has been shipped!'
    };

    await db.run(
      'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
      [order.user_id, 'order_status', id, `${statusMessages[status]} - Order ${order.order_number}`]
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Manufacturing order status update error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}


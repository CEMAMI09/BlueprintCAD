/**
 * Confirm payment and update order status
 * POST /api/orders/confirm
 */

import { getDb } from '../../../db/db.js';
import { getUserFromRequest } from '../../../shared/utils/auth.js';
const { getPaymentIntent } = require('../../shared/utils/stripe-utils.js');
const { sendEmail, emailTemplates } = require('../../shared/utils/email-templates.js');
const crypto = require('crypto');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: 'Order number required' });
    }

    const db = await getDb();

    // Get order
    const order = await db.get(
      `SELECT o.*, p.title as project_title, p.file_path,
              buyer.email as buyer_email, buyer.username as buyer_username,
              seller.email as seller_email, seller.username as seller_username
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE o.order_number = ?`,
      [orderNumber]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.buyer_id !== user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check payment status with Stripe
    const paymentIntent = await getPaymentIntent(order.stripe_payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Generate secure download token
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      // Update order
      await db.run(
        `UPDATE orders 
         SET status = 'completed', 
             payment_status = 'succeeded',
             stripe_charge_id = ?,
             download_token = ?,
             expires_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [paymentIntent.latest_charge, downloadToken, expiresAt.toISOString(), order.id]
      );

      // Send emails
      try {
        // Email to buyer
        await sendEmail(
          order.buyer_email,
          'Purchase Confirmed - Blueprint',
          emailTemplates.purchaseConfirmation(
            order.buyer_username,
            order.project_title,
            order.order_number,
            order.amount,
            downloadToken
          )
        );

        // Email to seller
        await sendEmail(
          order.seller_email,
          'You made a sale! - Blueprint',
          emailTemplates.saleNotification(
            order.seller_username,
            order.project_title,
            order.buyer_username,
            order.amount,
            order.order_number
          )
        );

        // Create notification for seller about the sale
        await db.run(
          `INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)`,
          [order.seller_id, 'purchase', order.id, `${order.buyer_username} purchased your design "${order.project_title}" for $${order.amount}`]
        );

        // Check if seller just hit $100 earnings milestone
        const totalEarnings = await db.get(
          `SELECT COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0) as total
           FROM orders
           WHERE seller_id = ? AND payment_status = 'succeeded'`,
          [order.seller_id]
        );
        
        const earnings = parseFloat(totalEarnings?.total || 0);
        if (earnings >= 100) {
          // Check if we've already notified about $100 milestone
          const existingMilestone = await db.get(
            'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message LIKE ?',
            [order.seller_id, 'milestone', '%$100%']
          );
          
          if (!existingMilestone) {
            await db.run(
              'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
              [order.seller_id, 'milestone', null, `💰 Congratulations! You've earned your first $100 on Blueprint!`]
            );
          }
        }

      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the request if email fails
      }

      res.status(200).json({
        success: true,
        orderNumber: order.order_number,
        downloadToken,
        message: 'Payment confirmed successfully'
      });

    } else if (paymentIntent.status === 'processing') {
      res.status(200).json({
        success: false,
        status: 'processing',
        message: 'Payment is being processed'
      });
    } else {
      res.status(400).json({
        success: false,
        status: paymentIntent.status,
        message: 'Payment not completed'
      });
    }

  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
}

/**
 * Confirm payment and update order status
 * POST /api/orders/confirm
 */

import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';
const { getPaymentIntent } = require('../../../lib/stripe-utils');
const { sendEmail, emailTemplates } = require('../../../lib/email-templates');
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

        // Record notifications
        await db.run(
          `INSERT INTO order_notifications (order_id, user_id, type) VALUES (?, ?, 'purchase')`,
          [order.id, order.buyer_id]
        );

        await db.run(
          `INSERT INTO order_notifications (order_id, user_id, type) VALUES (?, ?, 'sale')`,
          [order.id, order.seller_id]
        );

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

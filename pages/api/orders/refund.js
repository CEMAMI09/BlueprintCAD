/**
 * Request a refund for an order
 * POST /api/orders/refund
 */

import { getDb } from '../../../db/db.js';
import { getUserFromRequest } from '../../../shared/utils/auth.js';
const { createRefund } = require('../../shared/utils/stripe-utils.js');
const { sendEmail, emailTemplates } = require('../../shared/utils/email-templates.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderNumber, reason } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: 'Order number required' });
    }

    const db = await getDb();

    // Get order
    const order = await db.get(
      `SELECT o.*, p.title as project_title,
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

    // Only buyer or seller can request refund
    if (order.buyer_id !== user.userId && order.seller_id !== user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (order.payment_status !== 'succeeded') {
      return res.status(400).json({ error: 'Order not paid' });
    }

    if (order.refund_id) {
      return res.status(400).json({ error: 'Already refunded' });
    }

    // Create Stripe refund
    const refund = await createRefund(
      order.stripe_payment_intent_id,
      null, // Full refund
      reason || 'requested_by_customer'
    );

    // Update order
    await db.run(
      `UPDATE orders 
       SET refund_id = ?,
           refund_amount = ?,
           refund_reason = ?,
           refunded_at = CURRENT_TIMESTAMP,
           status = 'refunded',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [refund.id, order.amount, reason || 'Refund requested', order.id]
    );

    // Send notification emails
    try {
      await sendEmail(
        order.buyer_email,
        'Refund Processed - Blueprint',
        emailTemplates.refundNotification(
          order.buyer_username,
          order.project_title,
          order.order_number,
          order.amount
        )
      );

      await sendEmail(
        order.seller_email,
        'Order Refunded - Blueprint',
        emailTemplates.sellerRefundNotification(
          order.seller_username,
          order.project_title,
          order.order_number,
          order.amount
        )
      );
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundId: refund.id,
      amount: order.amount
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
}

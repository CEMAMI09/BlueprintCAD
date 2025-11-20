/**
 * Create a checkout session / payment intent for purchasing a project
 * POST /api/orders/checkout
 */

import { getDb } from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';
const { createPaymentIntent } = require('../../../lib/stripe-utils');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const buyerId = user.userId;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const db = await getDb();

    // Get project details
    const project = await db.get(
      `SELECT id, title, price, for_sale, user_id, file_path 
       FROM projects WHERE id = ?`,
      [projectId]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.for_sale || !project.price) {
      return res.status(400).json({ error: 'Project is not for sale' });
    }

    if (project.user_id === buyerId) {
      return res.status(400).json({ error: 'Cannot purchase your own project' });
    }

    // Check if already purchased
    const existingOrder = await db.get(
      `SELECT id FROM orders 
       WHERE buyer_id = ? AND project_id = ? AND payment_status = 'succeeded'`,
      [buyerId, projectId]
    );

    if (existingOrder) {
      return res.status(400).json({ error: 'You have already purchased this project' });
    }

    const amount = parseFloat(project.price);
    
    // Generate order number
    const orderNumber = `BLU-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent(amount, 'usd', {
      order_number: orderNumber,
      project_id: projectId.toString(),
      buyer_id: buyerId.toString(),
      seller_id: project.user_id.toString(),
      project_title: project.title,
    });

    // Create order record
    const result = await db.run(
      `INSERT INTO orders (
        order_number, buyer_id, seller_id, project_id, amount,
        stripe_payment_intent_id, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [orderNumber, buyerId, project.user_id, projectId, amount, paymentIntent.id]
    );

    const orderId = result.lastID;

    // Return payment intent client secret
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      orderNumber,
      amount,
      projectTitle: project.title,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

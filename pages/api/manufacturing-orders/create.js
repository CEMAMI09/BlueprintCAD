import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const {
      fileName,
      manufacturingOption,
      estimatedCost,
      deliveryTime,
      material,
      scalePercentage,
      dimensions,
      weight,
      printTime,
      aiEstimate,
      breakdown
    } = req.body;

    // Validate required fields
    if (!fileName || !manufacturingOption || !estimatedCost) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Open database
    const db = await open({
      filename: path.resolve('./forge.db'),
      driver: sqlite3.Database
    });

    // Create manufacturing_orders table if it doesn't exist
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

    // Generate order number
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const orderNumber = `MFG-${timestamp}-${random}`;

    // Insert order
    const result = await db.run(
      `INSERT INTO manufacturing_orders (
        user_id, order_number, file_name, manufacturing_option,
        estimated_cost, delivery_time, material, scale_percentage,
        dimensions, weight_grams, print_time_hours, ai_estimate, breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        orderNumber,
        fileName,
        manufacturingOption,
        estimatedCost,
        deliveryTime,
        material,
        scalePercentage,
        dimensions,
        weight,
        printTime,
        aiEstimate,
        JSON.stringify(breakdown)
      ]
    );

    await db.close();

    res.status(200).json({
      success: true,
      orderId: result.lastID,
      orderNumber,
      message: 'Manufacturing order created successfully'
    });

  } catch (error) {
    console.error('Manufacturing order error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

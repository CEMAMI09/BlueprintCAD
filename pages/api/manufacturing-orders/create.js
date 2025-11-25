import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = user.userId;

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

    // Get database connection
    const db = await getDb();

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

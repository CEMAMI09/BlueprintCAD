const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../forge.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Orders Database Status\n');

// Check if orders table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'", (err, row) => {
  if (err) {
    console.error('❌ Error checking orders table:', err);
    return;
  }
  
  if (row) {
    console.log('✅ Orders table exists');
    
    // Get order count
    db.get('SELECT COUNT(*) as count FROM orders', (err, result) => {
      if (err) {
        console.error('❌ Error counting orders:', err);
      } else {
        console.log(`📦 Total orders: ${result.count}`);
      }
      
      // Get orders by status
      db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status', (err, rows) => {
        if (err) {
          console.error('❌ Error getting order stats:', err);
        } else {
          console.log('\n📊 Orders by status:');
          if (rows.length === 0) {
            console.log('  No orders yet');
          } else {
            rows.forEach(row => {
              console.log(`  ${row.status}: ${row.count}`);
            });
          }
        }
        
        // Show recent orders
        db.all('SELECT order_number, amount, status, payment_status, created_at FROM orders ORDER BY created_at DESC LIMIT 5', (err, orders) => {
          if (err) {
            console.error('❌ Error getting recent orders:', err);
          } else {
            console.log('\n📋 Recent orders:');
            if (orders.length === 0) {
              console.log('  No orders yet');
            } else {
              orders.forEach(order => {
                console.log(`  ${order.order_number} - $${order.amount} - ${order.status} - ${order.created_at}`);
              });
            }
          }
          
          db.close();
        });
      });
    });
  } else {
    console.log('❌ Orders table not found - run migration first');
    db.close();
  }
});

/**
 * Database initialization script for orders
 * Run this to create orders tables
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'blueprint.db');
const db = new sqlite3.Database(dbPath);

const sqlFile = fs.readFileSync(path.join(__dirname, '002_orders_schema.sql'), 'utf8');

db.exec(sqlFile, (err) => {
  if (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
  console.log('✅ Orders tables created successfully');
  db.close();
});

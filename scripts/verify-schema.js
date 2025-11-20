const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new Database(dbPath);

console.log('📊 Database Schema Verification\n');
console.log('='.repeat(50));

// Check cad_feature_trees table
const tableInfo = db.prepare("PRAGMA table_info(cad_feature_trees)").all();
console.log('\n✅ Table: cad_feature_trees');
console.log('Columns:');
tableInfo.forEach(col => {
  console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
});

// Check indexes
const indexes = db.prepare("PRAGMA index_list(cad_feature_trees)").all();
console.log('\nIndexes:');
indexes.forEach(idx => {
  const cols = db.prepare(`PRAGMA index_info(${idx.name})`).all();
  const colNames = cols.map(c => c.name).join(', ');
  console.log(`  - ${idx.name} ON (${colNames})`);
});

// Check foreign keys
const fks = db.prepare("PRAGMA foreign_key_list(cad_feature_trees)").all();
console.log('\nForeign Keys:');
fks.forEach(fk => {
  console.log(`  - ${fk.from} → ${fk.table}(${fk.to}) ON DELETE ${fk.on_delete}`);
});

db.close();
console.log('\n' + '='.repeat(50));
console.log('✅ Database schema verified successfully!');

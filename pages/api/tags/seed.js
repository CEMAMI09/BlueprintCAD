// Seed script to add common tags to the database
const { getDb } = require('../../../db/db');

const commonTags = [
  // 3D Printing
  '3d-printing',
  '3d-print',
  '3d-model',
  '3d-design',
  
  // Materials
  'pla',
  'abs',
  'petg',
  'tpu',
  'wood-filament',
  'metal-filament',
  'carbon-fiber',
  
  // Categories
  'mechanical',
  'electronics',
  'arduino',
  'raspberry-pi',
  'prototype',
  'functional',
  'decorative',
  'art',
  'sculpture',
  'jewelry',
  'miniature',
  'figurine',
  'toy',
  'game',
  'board-game',
  'puzzle',
  'gadget',
  'tool',
  'holder',
  'stand',
  'bracket',
  'mount',
  'case',
  'enclosure',
  'box',
  'organizer',
  'storage',
  'container',
  
  // Technical
  'gear',
  'bearing',
  'pulley',
  'bracket',
  'mount',
  'adapter',
  'connector',
  'joint',
  'hinge',
  'clamp',
  'clip',
  'hook',
  'handle',
  'knob',
  'button',
  
  // Hobby & DIY
  'diy',
  'hobby',
  'maker',
  'maker-project',
  'custom',
  'modification',
  'upgrade',
  'replacement',
  'repair',
  'fix',
  
  // Vehicles & Transportation
  'car',
  'vehicle',
  'drone',
  'quadcopter',
  'rc',
  'remote-control',
  'airplane',
  'helicopter',
  'boat',
  'submarine',
  
  // Home & Living
  'home',
  'household',
  'kitchen',
  'bathroom',
  'furniture',
  'lamp',
  'light',
  'vase',
  'planter',
  'garden',
  'outdoor',
  
  // Fashion & Accessories
  'fashion',
  'accessory',
  'watch',
  'bracelet',
  'ring',
  'necklace',
  'earring',
  'glasses',
  'sunglasses',
  'phone-case',
  'laptop-case',
  
  // Educational
  'educational',
  'learning',
  'science',
  'engineering',
  'math',
  'geometry',
  'physics',
  'biology',
  'chemistry',
  
  // Architecture & Building
  'architecture',
  'building',
  'structure',
  'model-building',
  'scale-model',
  'maquette',
  
  // Medical & Health
  'medical',
  'prosthetic',
  'assistive',
  'accessibility',
  'health',
  'fitness',
  
  // Robotics
  'robot',
  'robotics',
  'automation',
  'servo',
  'motor',
  'actuator',
  'sensor',
  
  // Cosplay & Props
  'cosplay',
  'prop',
  'costume',
  'replica',
  'movie',
  'game-prop',
  'weapon',
  'armor',
  
  // Nature & Organic
  'organic',
  'nature',
  'plant',
  'flower',
  'tree',
  'animal',
  'bird',
  'insect',
  'marine',
  
  // Geometric & Abstract
  'geometric',
  'abstract',
  'pattern',
  'tessellation',
  'fractal',
  'mandala',
  'ornament',
  
  // Size Categories
  'small',
  'medium',
  'large',
  'miniature',
  'life-size',
  'scale-model',
  
  // Complexity
  'simple',
  'intermediate',
  'advanced',
  'expert',
  'beginner-friendly',
  
  // Print Settings
  'no-supports',
  'no-raft',
  'no-brim',
  'low-poly',
  'high-poly',
  'parametric',
  'customizable',
  
  // Use Cases
  'gift',
  'decoration',
  'functional',
  'display',
  'collection',
  'artwork',
  'commission',
  
  // Industries
  'aerospace',
  'automotive',
  'medical-device',
  'consumer-product',
  'industrial',
  'commercial',
  
  // File Formats
  'stl',
  'obj',
  'step',
  'iges',
  'fusion-360',
  'solidworks',
  'openscad',
  'blender',
  
  // Special Features
  'parametric',
  'customizable',
  'modular',
  'interlocking',
  'snap-fit',
  'threaded',
  'geared',
  'articulated',
  'flexible',
  'rigid',
  
  // Popular Projects
  'phone-stand',
  'cable-organizer',
  'headphone-stand',
  'laptop-stand',
  'monitor-stand',
  'keyboard',
  'mouse',
  'controller',
  'gamepad',
  'joystick',
];

async function seedTags() {
  const db = await getDb();
  
  // Create tags table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      usage_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  let inserted = 0;
  let updated = 0;
  
  for (const tagName of commonTags) {
    try {
      await db.run(
        'INSERT INTO tags (name, usage_count) VALUES (?, 1)',
        [tagName]
      );
      inserted++;
    } catch (err) {
      // Tag already exists, increment usage count
      if (err.message && err.message.includes('UNIQUE constraint')) {
        await db.run(
          'UPDATE tags SET usage_count = usage_count + 1 WHERE name = ?',
          [tagName]
        );
        updated++;
      } else {
        console.error(`Error seeding tag ${tagName}:`, err);
      }
    }
  }
  
  console.log(`Tags seeded: ${inserted} new, ${updated} updated`);
  return { inserted, updated };
}

// If run directly, seed the tags
if (require.main === module) {
  seedTags()
    .then(({ inserted, updated }) => {
      console.log(`✅ Seeded ${inserted} new tags, updated ${updated} existing tags`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error seeding tags:', err);
      process.exit(1);
    });
}

module.exports = { seedTags };


// API endpoint for tags - fetch all tags or create new ones
const { getDb } = require('../../../db/db');
const { getUserFromRequest } = require('../../../shared/utils/auth');

export default async function handler(req, res) {
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

  // Seed common tags if table is empty (first time setup)
  const tagCount = await db.get('SELECT COUNT(*) as count FROM tags');
  if (tagCount.count === 0) {
    const { seedTags } = require('./seed');
    await seedTags();
  }

  // GET - Fetch all tags
  if (req.method === 'GET') {
    try {
      const { search } = req.query;
      
      let query = 'SELECT name, usage_count FROM tags';
      let params = [];
      
      if (search) {
        query += ' WHERE name LIKE ? COLLATE NOCASE';
        params.push(`%${search}%`);
      }
      
      // Order by: tags that start with search term first, then by usage count, then alphabetically
      if (search) {
        query += ` ORDER BY 
          CASE WHEN name LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
          usage_count DESC, 
          name ASC 
          LIMIT 50`;
        params.push(`${search}%`);
      } else {
        query += ' ORDER BY usage_count DESC, name ASC LIMIT 50';
      }
      
      const tags = await db.all(query, params);
      
      return res.status(200).json(tags.map(t => t.name));
    } catch (error) {
      console.error('Error fetching tags:', error);
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
  }

  // POST - Create new tag(s)
  if (req.method === 'POST') {
    try {
      const { tags } = req.body;
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: 'Tags array is required' });
      }

      const createdTags = [];
      
      for (const tagName of tags) {
        const normalizedTag = tagName.trim().toLowerCase();
        if (!normalizedTag) continue;

        try {
          // Try to insert new tag
          await db.run(
            'INSERT INTO tags (name, usage_count) VALUES (?, 1)',
            [normalizedTag]
          );
          createdTags.push(normalizedTag);
        } catch (err) {
          // Tag already exists, increment usage count
          if (err.message && err.message.includes('UNIQUE constraint')) {
            await db.run(
              'UPDATE tags SET usage_count = usage_count + 1 WHERE name = ?',
              [normalizedTag]
            );
            createdTags.push(normalizedTag);
          } else {
            console.error('Error creating tag:', err);
          }
        }
      }

      return res.status(200).json({ success: true, tags: createdTags });
    } catch (error) {
      console.error('Error creating tags:', error);
      return res.status(500).json({ error: 'Failed to create tags' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


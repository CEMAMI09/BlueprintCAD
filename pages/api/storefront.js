// Storefront customization API
import { getDb } from '../../db/db';
import { getUserFromRequest } from '../../backend/lib/auth';
import { getUserTier } from '../../backend/lib/subscription-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const tier = await getUserTier(userId);

  // Check if user has access to storefront customization
  if (tier !== 'creator' && tier !== 'enterprise') {
    return res.status(403).json({ error: 'Storefront customization requires Creator subscription or higher' });
  }

  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const storefront = await db.get(
        'SELECT * FROM storefronts WHERE user_id = ?',
        [userId]
      );

      if (!storefront) {
        return res.status(200).json(null);
      }

      res.status(200).json(storefront);
    } catch (error) {
      console.error('Storefront GET error:', error);
      res.status(500).json({ error: 'Failed to fetch storefront' });
    }
  } else if (req.method === 'PUT') {
    try {
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'storage', 'storefronts'),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(400).json({ error: 'Failed to parse form data' });
        }

        const storeName = Array.isArray(fields.store_name) ? fields.store_name[0] : fields.store_name;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
        const primaryColor = Array.isArray(fields.primary_color) ? fields.primary_color[0] : fields.primary_color;
        const secondaryColor = Array.isArray(fields.secondary_color) ? fields.secondary_color[0] : fields.secondary_color;
        const accentColor = Array.isArray(fields.accent_color) ? fields.accent_color[0] : fields.accent_color;
        const customDomain = Array.isArray(fields.custom_domain) ? fields.custom_domain[0] : fields.custom_domain;
        const featuredProjects = Array.isArray(fields.featured_projects) 
          ? JSON.parse(fields.featured_projects[0]) 
          : JSON.parse(fields.featured_projects || '[]');

        let bannerImagePath = null;
        let logoPath = null;

        if (files.banner_image) {
          const file = Array.isArray(files.banner_image) ? files.banner_image[0] : files.banner_image;
          bannerImagePath = `/storefronts/${path.basename(file.filepath)}`;
          // Move file to public directory
          const publicPath = path.join(process.cwd(), 'public', bannerImagePath);
          fs.mkdirSync(path.dirname(publicPath), { recursive: true });
          fs.copyFileSync(file.filepath, publicPath);
        }

        if (files.logo) {
          const file = Array.isArray(files.logo) ? files.logo[0] : files.logo;
          logoPath = `/storefronts/${path.basename(file.filepath)}`;
          // Move file to public directory
          const publicPath = path.join(process.cwd(), 'public', logoPath);
          fs.mkdirSync(path.dirname(publicPath), { recursive: true });
          fs.copyFileSync(file.filepath, publicPath);
        }

        // Check if storefront exists
        const existing = await db.get(
          'SELECT id FROM storefronts WHERE user_id = ?',
          [userId]
        );

        if (existing) {
          // Update existing
          await db.run(
            `UPDATE storefronts 
             SET store_name = ?, description = ?, primary_color = ?, secondary_color = ?, accent_color = ?,
                 banner_image = COALESCE(?, banner_image), logo = COALESCE(?, logo),
                 custom_domain = ?, featured_projects = ?, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [
              storeName,
              description,
              primaryColor,
              secondaryColor,
              accentColor,
              bannerImagePath,
              logoPath,
              customDomain || null,
              JSON.stringify(featuredProjects),
              userId,
            ]
          );
        } else {
          // Create new
          await db.run(
            `INSERT INTO storefronts 
             (user_id, store_name, description, primary_color, secondary_color, accent_color, banner_image, logo, custom_domain, featured_projects)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              storeName,
              description,
              primaryColor,
              secondaryColor,
              accentColor,
              bannerImagePath,
              logoPath,
              customDomain || null,
              JSON.stringify(featuredProjects),
            ]
          );
        }

        const updated = await db.get(
          'SELECT * FROM storefronts WHERE user_id = ?',
          [userId]
        );

        res.status(200).json(updated);
      });
    } catch (error) {
      console.error('Storefront PUT error:', error);
      res.status(500).json({ error: 'Failed to update storefront' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}


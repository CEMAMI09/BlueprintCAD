// Get public storefront by username
import { getDb } from '@/db/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    const db = await getDb();

    // Get user by username
    const user = await db.get('SELECT id, username, profile_picture, created_at FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get storefront
    const storefront = await db.get(
      `SELECT 
        id, store_name, tagline, description, banner_image, logo,
        primary_color, secondary_color, accent_color, custom_domain,
        featured_projects, pinned_products, seo_description,
        refund_policy, license_summary, bio, skills, social_links
      FROM storefronts WHERE user_id = ?`,
      [user.id]
    );

    if (!storefront) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    // Parse JSON fields
    const featuredProjects = storefront.featured_projects ? JSON.parse(storefront.featured_projects) : [];
    const pinnedProducts = storefront.pinned_products ? JSON.parse(storefront.pinned_products) : [];
    const skills = storefront.skills ? JSON.parse(storefront.skills) : null;
    const socialLinks = storefront.social_links ? JSON.parse(storefront.social_links) : null;

    // Get products (for_sale = true)
    const products = await db.all(
      `SELECT 
        p.id, p.title, p.description, p.price, p.thumbnail_path,
        p.sales_count, p.average_rating, p.review_count, p.created_at
      FROM projects p
      WHERE p.user_id = ? AND p.for_sale = 1 AND p.is_public = 1
      ORDER BY p.created_at DESC`,
      [user.id]
    );

    // Get available licenses for each product
    for (const product of products) {
      const licenses = await db.all(
        `SELECT 
          pl.license_type_code as type,
          lt.name,
          pl.price
        FROM product_licenses pl
        JOIN license_types lt ON pl.license_type_code = lt.code
        WHERE pl.project_id = ? AND pl.is_active = 1
        ORDER BY pl.price ASC`,
        [product.id]
      );
      product.available_licenses = licenses;
    }

    // Get reviews
    const reviews = await db.all(
      `SELECT 
        r.id, r.rating, r.review_text, r.is_verified_buyer, r.created_at,
        u.username, u.profile_picture,
        p.title as product_title
      FROM storefront_reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN projects p ON r.project_id = p.id
      WHERE r.storefront_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50`,
      [user.id]
    );

    // Check if current user is following (if authenticated)
    let following = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        const currentUserId = decoded.userId;

        const follow = await db.get(
          'SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND status = 1',
          [currentUserId, user.id]
        );
        following = !!follow;
      } catch (e) {
        // Not authenticated or invalid token
      }
    }

    // Check seller verification
    const verification = await db.get(
      'SELECT is_verified FROM seller_verification WHERE user_id = ?',
      [user.id]
    );

    res.status(200).json({
      storefront: {
        ...storefront,
        featured_projects: featuredProjects,
        pinned_products: pinnedProducts,
        skills,
        social_links: socialLinks,
      },
      owner: {
        ...user,
        is_verified: verification?.is_verified || false,
      },
      products,
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        review_text: r.review_text,
        is_verified_buyer: r.is_verified_buyer === 1,
        created_at: r.created_at,
        reviewer: {
          username: r.username,
          profile_picture: r.profile_picture,
        },
        product_title: r.product_title,
      })),
      following,
    });
  } catch (error) {
    console.error('Storefront fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch storefront' });
  }
}


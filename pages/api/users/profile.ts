// API endpoint for updating user profile
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../shared/utils/auth';
import { getDb } from '../../../db/db';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;

  try {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'storage', 'uploads', 'profiles'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filename: (name, ext, part) => {
        return `${Date.now()}-${part.originalFilename}`;
      }
    });

    // Create profiles directory if it doesn't exist
    const profilesDir = path.join(process.cwd(), 'storage', 'uploads', 'profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);

    const bio = fields.bio?.[0] || '';
    const location = fields.location?.[0] || '';
    const website = fields.website?.[0] || '';
    const username = fields.username?.[0] || '';
    const profilePrivate = fields.profile_private?.[0] === 'true' || fields.profile_private?.[0] === '1';
    const socialLinks = fields.social_links?.[0] || '{}';
    const visibilityOptions = fields.visibility_options?.[0] || '{}';
    
    const db = await getDb();

    // Get current user data
    const currentUser = await db.get('SELECT username, profile_picture, banner FROM users WHERE id = ?', [userId]);

    // Validate and update username if changed
    if (username && username !== currentUser?.username) {
      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' });
      }

      // Check if username is already taken
      const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    // Validate inputs
    if (bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or less' });
    }
    if (location.length > 100) {
      return res.status(400).json({ error: 'Location must be 100 characters or less' });
    }
    if (website.length > 200) {
      return res.status(400).json({ error: 'Website URL must be 200 characters or less' });
    }

    // Validate website URL format if provided
    if (website && website.trim() !== '') {
      try {
        new URL(website.startsWith('http') ? website : `https://${website}`);
      } catch {
        return res.status(400).json({ error: 'Invalid website URL format' });
      }
    }

    // Validate JSON fields
    let parsedSocialLinks = {};
    let parsedVisibilityOptions = {};
    try {
      parsedSocialLinks = JSON.parse(socialLinks);
      parsedVisibilityOptions = JSON.parse(visibilityOptions);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }

    let profilePicturePath = currentUser?.profile_picture || null;
    let bannerPath = currentUser?.banner || null;

    // Handle profile picture upload
    if (files.profile_picture && files.profile_picture[0]) {
      const file = files.profile_picture[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype || '')) {
        // Delete uploaded file
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
      }

      // Delete old profile picture if exists
      if (currentUser?.profile_picture) {
        const oldPath = path.join(process.cwd(), 'storage', 'uploads', 'profiles', currentUser.profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      profilePicturePath = path.basename(file.filepath);
    }

    // Handle banner upload
    if (files.banner && files.banner[0]) {
      const file = files.banner[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype || '')) {
        // Delete uploaded file
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ error: 'Invalid banner file type. Only images are allowed.' });
      }

      // Validate file size (10MB max for banner)
      if (file.size > 10 * 1024 * 1024) {
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ error: 'Banner file size must be less than 10MB' });
      }

      // Delete old banner if exists
      if (currentUser?.banner) {
        const oldPath = path.join(process.cwd(), 'storage', 'uploads', 'profiles', currentUser.banner);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      bannerPath = path.basename(file.filepath);
    }

    // Update user profile
    const updateFields = [];
    const updateValues = [];

    if (username && username !== currentUser?.username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateValues.push(bio);
    }
    if (profilePicturePath !== null) {
      updateFields.push('profile_picture = ?');
      updateValues.push(profilePicturePath);
    }
    if (bannerPath !== null) {
      updateFields.push('banner = ?');
      updateValues.push(bannerPath);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(website);
    }
    updateFields.push('social_links = ?');
    updateValues.push(JSON.stringify(parsedSocialLinks));
    updateFields.push('visibility_options = ?');
    updateValues.push(JSON.stringify(parsedVisibilityOptions));
    updateFields.push('profile_private = ?');
    updateValues.push(profilePrivate ? 1 : 0);

    updateValues.push(userId);

    await db.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedUser = await db.get(
      `SELECT 
        id, username, email, bio, profile_picture, banner,
        location, website, social_links, visibility_options, created_at 
      FROM users WHERE id = ?`,
      [userId]
    );

    // Parse JSON fields
    const userWithParsedFields = {
      ...updatedUser,
      social_links: updatedUser.social_links ? JSON.parse(updatedUser.social_links) : {},
      visibility_options: updatedUser.visibility_options ? JSON.parse(updatedUser.visibility_options) : {}
    };

    return res.status(200).json(userWithParsedFields);
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

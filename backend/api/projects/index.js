// GET all projects, POST new project
import { getDb } from '../../../backend/lib/db';
import { getUserFromRequest, verifyAuth } from '../../../backend/lib/auth';
import { filterProjectsByPrivacy } from '../../../backend/lib/privacy-utils';
import { requireEmailVerification } from '../../../backend/lib/verification-middleware';

export default async function handler(req, res) {
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const { username, for_sale, search, sort } = req.query;
      
      // Get viewer's username
      let viewerUsername = null;
      try {
        const auth = await verifyAuth(req);
        viewerUsername = auth?.username || null;
      } catch (e) {
        // Not logged in, continue as anonymous
      }
      
      let query = `
        SELECT p.*, u.username, u.profile_private
        FROM projects p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.is_public = 1
      `;
      const params = [];

      if (username) {
        query += ' AND u.username = ?';
        params.push(username);
      }

      if (for_sale === 'true') {
        query += ' AND p.for_sale = 1';
      } else if (for_sale === 'false') {
        query += ' AND (p.for_sale = 0 OR p.for_sale IS NULL)';
      }

      if (search) {
        query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Handle sorting
      if (sort === 'recent') {
        query += ' ORDER BY p.created_at DESC';
      } else if (sort === 'popular') {
        query += ' ORDER BY (p.likes * 2 + p.views) DESC, p.created_at DESC';
      } else if (sort === 'trending') {
        query += ` ORDER BY (
          (p.views * 0.3 + p.likes * 0.7 + 
           CASE WHEN p.updated_at > datetime('now', '-7 days') THEN 10 ELSE 0 END)
        ) DESC, p.updated_at DESC`;
      } else {
        query += ' ORDER BY p.created_at DESC';
      }

      const projects = await db.all(query, params);
      
      // Filter by privacy settings
      const filteredProjects = await filterProjectsByPrivacy(projects, viewerUsername);
      
      res.status(200).json(filteredProjects);
    } catch (error) {
      console.error('Fetch projects error:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  } else if (req.method === 'POST') {
    // Verify user is authenticated and email is verified
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const {
        title,
        description,
        file_path,
        file_type,
        tags,
        is_public,
        for_sale,
        price,
        ai_estimate,
        folder_id,
        thumbnail_path,
        dimensions,
        scale_percentage,
        weight_grams,
        print_time_hours
      } = req.body;

      if (!title || !file_path) {
        return res.status(400).json({ error: 'Title and file are required' });
      }

      const result = await db.run(
        `INSERT INTO projects (
          user_id, title, description, file_path, file_type,
          tags, is_public, for_sale, price, ai_estimate, folder_id, thumbnail_path,
          dimensions, scale_percentage, weight_grams, print_time_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.userId,
          title,
          description || null,
          file_path,
          file_type || null,
          tags || null,
          is_public ? 1 : 0,
          for_sale ? 1 : 0,
          price || null,
          ai_estimate || null,
          folder_id || null,
          thumbnail_path || null,
          dimensions || null,
          scale_percentage || 100,
          weight_grams || null,
          print_time_hours || null
        ]
      );

      const projectId = result.lastID;

      // Create initial version (version 1)
      const fs = require('fs');
      const path = require('path');
      let fileSize = null;
      try {
        const fullPath = path.join(process.cwd(), 'uploads', file_path);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          fileSize = stats.size;
        }
      } catch (e) {
        console.warn('Could not get file size:', e.message);
      }

      const versionResult = await db.run(
        `INSERT INTO file_versions (
          project_id, parent_version_id, version_number, file_path,
          file_size, thumbnail_path, uploaded_by, is_current, change_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          null,
          1,
          file_path,
          fileSize,
          thumbnail_path,
          user.userId,
          1,
          'Initial upload'
        ]
      );

      // Update project with current_version_id
      await db.run(
        'UPDATE projects SET current_version_id = ? WHERE id = ?',
        [versionResult.lastID, projectId]
      );

      const project = await db.get(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );

      res.status(201).json(project);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
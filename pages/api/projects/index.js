// GET all projects, POST new project
import { getDb } from '../../../db/db';
import { getUserFromRequest, verifyAuth } from '../../../backend/lib/auth';
import { filterProjectsByPrivacy } from '../../../backend/lib/privacy-utils';
import { requireEmailVerification } from '../../../backend/lib/verification-middleware';
import fs from 'fs';
import path from 'path';

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
        SELECT p.*, u.username, u.profile_private, u.profile_picture, u.subscription_tier
        FROM projects p 
        JOIN users u ON p.user_id = u.id 
        WHERE 1=1
      `;
      const params = [];

      if (username) {
        query += ' AND u.username = ?';
        params.push(username);
        
        // If viewing own profile, include private projects
        // Otherwise, check if viewer can see private projects
        if (viewerUsername !== username) {
          // Get target user info to check if account is private
          const targetUser = await db.get(
            'SELECT id, profile_private FROM users WHERE username = ?',
            [username]
          );
          
          if (targetUser?.profile_private) {
            // Account is private - check if viewer is following
            if (viewerUsername) {
              const viewerUser = await db.get(
                'SELECT id FROM users WHERE username = ?',
                [viewerUsername]
              );
              
              if (viewerUser) {
                // Check if viewer is following (status = 1 means accepted)
                const followRecord = await db.get(
                  'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?',
                  [viewerUser.id, targetUser.id]
                );
                
                if (followRecord?.status === 1) {
                  // Viewer is following - show all projects (public and private)
                  // Don't filter by is_public
                } else {
                  // Viewer is not following - only show public projects
                  query += ' AND p.is_public = 1';
                }
              } else {
                // Viewer user not found - only show public projects
                query += ' AND p.is_public = 1';
              }
            } else {
              // Not logged in - only show public projects
              query += ' AND p.is_public = 1';
            }
          } else {
            // Account is public - only show public projects (user can see all public projects)
            query += ' AND p.is_public = 1';
          }
        }
        // If viewer is the owner, show all projects (both public and private)
      } else {
        // If no username specified, only show public projects
        query += ' AND p.is_public = 1';
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
      // If viewer is viewing their own profile, they should see all their projects (public and private)
      // Otherwise, filter based on privacy settings
      let filteredProjects;
      if (username && viewerUsername === username) {
        // Owner viewing their own profile - show all projects
        filteredProjects = projects;
      } else {
        // Filter by privacy settings for other viewers
        filteredProjects = await filterProjectsByPrivacy(projects, viewerUsername);
      }
      
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
      let {
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

      // Check subscription limits
      const { canPerformAction } = require('../../../backend/lib/subscription-utils');
      
      // Check project limit
      const projectCheck = await canPerformAction(user.userId, 'maxProjects');
      if (!projectCheck.allowed) {
        return res.status(403).json({ 
          error: 'Project limit reached',
          reason: projectCheck.reason,
          requiredTier: projectCheck.requiredTier,
          current: projectCheck.current,
          limit: projectCheck.limit
        });
      }

      // Check private project limit if making private
      if (is_public === false || is_public === 0) {
        const privateCheck = await canPerformAction(user.userId, 'maxPrivateProjects');
        if (!privateCheck.allowed) {
          return res.status(403).json({ 
            error: 'Private projects require Pro subscription',
            reason: privateCheck.reason,
            requiredTier: privateCheck.requiredTier
          });
        }
      }

      // Check if can sell
      if (for_sale === true || for_sale === 1) {
        const sellCheck = await canPerformAction(user.userId, 'canSell');
        if (!sellCheck.allowed) {
          return res.status(403).json({ 
            error: 'Selling designs requires Pro subscription',
            reason: sellCheck.reason,
            requiredTier: sellCheck.requiredTier
          });
        }
      }

      // Extract file metadata
      let fileMetadata = {
        file_size_bytes: null,
        bounding_box_width: null,
        bounding_box_height: null,
        bounding_box_depth: null,
        file_format: null,
        upload_timestamp: new Date().toISOString(),
        file_checksum: null,
        branch_count: 0
      };

      try {
        const { extractFileMetadata } = require('../../../backend/lib/file-metadata-utils');
        // Handle different file path formats
        let fullFilePath;
        if (file_path.startsWith('/storage/')) {
          // Path like /storage/uploads/filename.stl
          fullFilePath = path.join(process.cwd(), file_path.replace('/storage/', 'storage/'));
        } else if (file_path.startsWith('storage/')) {
          // Path like storage/uploads/filename.stl
          fullFilePath = path.join(process.cwd(), file_path);
        } else {
          // Relative path like filename.stl or uploads/filename.stl
          fullFilePath = path.join(process.cwd(), 'storage', 'uploads', file_path);
        }
        
        if (fs.existsSync(fullFilePath)) {
          fileMetadata = extractFileMetadata(fullFilePath, file_type);
          fileMetadata.upload_timestamp = new Date().toISOString();
          console.log(`[Metadata] Extracted metadata for project:`, {
            file_size_bytes: fileMetadata.file_size_bytes,
            checksum: fileMetadata.file_checksum ? fileMetadata.file_checksum.substring(0, 16) + '...' : null,
            bounding_box: fileMetadata.bounding_box_width ? `${fileMetadata.bounding_box_width}x${fileMetadata.bounding_box_height}x${fileMetadata.bounding_box_depth}` : null
          });
        } else {
          console.warn(`[Metadata] File not found for metadata extraction: ${fullFilePath}`);
        }
      } catch (metadataError) {
        console.error('[Metadata] Error extracting file metadata (non-fatal):', metadataError);
        // Continue with project creation even if metadata extraction fails
      }

      const result = await db.run(
        `INSERT INTO projects (
          user_id, title, description, file_path, file_type,
          tags, is_public, for_sale, price, ai_estimate, folder_id, thumbnail_path,
          dimensions, scale_percentage, weight_grams, print_time_hours,
          file_size_bytes, bounding_box_width, bounding_box_height, bounding_box_depth,
          file_format, upload_timestamp, file_checksum, branch_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          print_time_hours || null,
          fileMetadata.file_size_bytes,
          fileMetadata.bounding_box_width,
          fileMetadata.bounding_box_height,
          fileMetadata.bounding_box_depth,
          fileMetadata.file_format || file_type,
          fileMetadata.upload_timestamp,
          fileMetadata.file_checksum,
          fileMetadata.branch_count
        ]
      );

      const projectId = result.lastID;

      // If project is in a folder, create a default master branch with the project title as the branch name
      // Only if user has access to branching feature
      if (folder_id) {
        try {
          const { hasFeature } = require('../../../backend/lib/subscription-utils');
          const canCreateBranches = await hasFeature(user.userId, 'canCreateBranches');
          
          if (canCreateBranches) {
            const branchName = title.trim() || 'Untitled';
            await db.run(
              `INSERT INTO file_branches (project_id, folder_id, branch_name, file_path, is_master, created_by)
               VALUES (?, ?, ?, ?, 1, ?)`,
              [projectId, folder_id, branchName, file_path, user.userId]
            );
            console.log(`Created master branch "${branchName}" for project ${projectId} in folder ${folder_id}`);
            
            // Update branch count
            await db.run(
              'UPDATE projects SET branch_count = 1 WHERE id = ?',
              [projectId]
            );
          } else {
            console.log(`User ${user.userId} does not have access to branching, skipping branch creation`);
          }
        } catch (branchError) {
          console.error('Error creating default branch:', branchError);
          // Don't fail project creation if branch creation fails
        }
      }

      // Log activity
      const { logActivity } = require('../../../backend/lib/activity-logger');
      await logActivity({
        userId: user.userId,
        action: 'upload',
        entityType: 'file',
        folderId: folder_id || null,
        projectId: projectId,
        entityId: projectId,
        entityName: title,
        details: {
          file_type: file_type,
          is_public: is_public,
          for_sale: for_sale
        }
      });

      // Save tags to tags table if tags are provided
      if (tags) {
        try {
          const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
          if (tagList.length > 0) {
            // Import tags API logic
            const { getDb: getTagsDb } = require('../../../db/db');
            const tagsDb = await getTagsDb();
            
            // Create tags table if it doesn't exist
            await tagsDb.exec(`
              CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                usage_count INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `);

            // Insert or update tags
            for (const tagName of tagList) {
              try {
                await tagsDb.run(
                  'INSERT INTO tags (name, usage_count) VALUES (?, 1)',
                  [tagName]
                );
              } catch (err) {
                // Tag already exists, increment usage count
                if (err.message && err.message.includes('UNIQUE constraint')) {
                  await tagsDb.run(
                    'UPDATE tags SET usage_count = usage_count + 1 WHERE name = ?',
                    [tagName]
                  );
                }
              }
            }
          }
        } catch (tagError) {
          console.error('Error saving tags:', tagError);
          // Don't fail the project creation if tag saving fails
        }
      }

      // Generate thumbnail after project is created (so we have the project ID)
      // Always generate thumbnail if file_path exists, even if thumbnail_path was provided
      // This ensures new uploads always get thumbnails
      if (file_path) {
        // Generate thumbnail - MUST complete before response is sent
        // This ensures the thumbnail is available when the page loads
        let thumbnailGenerated = false;
        const fullFilePath = path.join(process.cwd(), 'storage', 'uploads', file_path);
        
        console.log(`[Thumbnail] ========================================`);
        console.log(`[Thumbnail] Generating thumbnail for project ${projectId}`);
        console.log(`[Thumbnail] File path from DB: ${file_path}`);
        console.log(`[Thumbnail] Full file path: ${fullFilePath}`);
        console.log(`[Thumbnail] File exists: ${fs.existsSync(fullFilePath)}`);
        console.log(`[Thumbnail] Current working directory: ${process.cwd()}`);
        console.log(`[Thumbnail] Storage/uploads exists: ${fs.existsSync(path.join(process.cwd(), 'storage', 'uploads'))}`);
        
        // Ensure thumbnails directory exists
        const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
        if (!fs.existsSync(thumbsDir)) {
          console.log(`[Thumbnail] Creating thumbnails directory: ${thumbsDir}`);
          fs.mkdirSync(thumbsDir, { recursive: true });
        }
        
        try {
          if (fs.existsSync(fullFilePath)) {
            console.log(`[Thumbnail] File exists, generating thumbnail...`);
            console.log(`[Thumbnail] File path: ${fullFilePath}`);
            const fileStats = fs.statSync(fullFilePath);
            console.log(`[Thumbnail] File size: ${fileStats.size} bytes`);
            
            // Small delay to ensure file is fully written (especially important for large files)
            // Increased delay to ensure file is completely written to disk
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify file is still accessible and has content
            if (!fs.existsSync(fullFilePath)) {
              throw new Error(`File disappeared: ${fullFilePath}`);
            }
            
            // Verify file has actual content (not empty)
            const fileStatsAfterDelay = fs.statSync(fullFilePath);
            if (fileStatsAfterDelay.size === 0) {
              throw new Error(`File is empty: ${fullFilePath}`);
            }
            console.log(`[Thumbnail] File verified after delay: ${fileStatsAfterDelay.size} bytes`);
            
            // Try 3D generation directly first, bypassing the wrapper that falls back to placeholder
            const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
            if (!fs.existsSync(thumbsDir)) {
              fs.mkdirSync(thumbsDir, { recursive: true });
            }
            const thumbnailPath = path.join(thumbsDir, `${projectId}_thumb.png`);
            const thumbnailUrl = `thumbnails/${projectId}_thumb.png`;
            
            let generationSucceeded = false;
            
            try {
              // Try direct 3D generation first
              const { generateThumbnail } = require('../../../backend/lib/generateThumbnail');
              console.log(`[Thumbnail] Attempting direct 3D generation for project ${projectId}...`);
              console.log(`[Thumbnail] Input file: ${fullFilePath}`);
              console.log(`[Thumbnail] Output path: ${thumbnailPath}`);
              
              // Verify input file exists before attempting generation
              if (!fs.existsSync(fullFilePath)) {
                throw new Error(`Input file does not exist: ${fullFilePath}`);
              }
              
              const inputFileStats = fs.statSync(fullFilePath);
              console.log(`[Thumbnail] Input file size: ${inputFileStats.size} bytes`);
              
              await generateThumbnail(fullFilePath, thumbnailPath, {
                width: 800,
                height: 600,
              });
              
              // Small delay to ensure file is written to disk
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Verify the file was created and is substantial
              if (fs.existsSync(thumbnailPath)) {
                const thumbStats = fs.statSync(thumbnailPath);
                console.log(`[Thumbnail] 3D render created: ${thumbnailPath}, size: ${thumbStats.size} bytes`);
                
                if (thumbStats.size > 15000) {
                  // Success! Update database
                  await db.run(
                    'UPDATE projects SET thumbnail_path = ? WHERE id = ?',
                    [thumbnailUrl, projectId]
                  );
                  thumbnail_path = thumbnailUrl;
                  thumbnailGenerated = true;
                  generationSucceeded = true;
                  console.log(`[Thumbnail] ✅ Successfully generated 3D thumbnail for project ${projectId}: ${thumbnailUrl}`);
                } else {
                  console.warn(`[Thumbnail] ⚠️ 3D render file too small (${thumbStats.size} bytes), might be corrupted or placeholder`);
                  throw new Error(`3D render file too small: ${thumbStats.size} bytes`);
                }
              } else {
                throw new Error(`3D render file not created at ${thumbnailPath}`);
              }
            } catch (directError) {
              console.error(`[Thumbnail] ❌ Direct 3D generation failed for project ${projectId}:`, directError.message);
              console.error(`[Thumbnail] Error type: ${directError.constructor.name}`);
              console.error(`[Thumbnail] Error stack:`, directError.stack);
              
              // If direct generation fails, try the wrapper (which will fall back to placeholder)
              if (!generationSucceeded) {
                console.log(`[Thumbnail] Falling back to generateThumbnailForDesign wrapper...`);
                try {
                  const { generateThumbnailForDesign } = require('../../../backend/lib/generateThumbnail');
                  const generatedThumbnail = await generateThumbnailForDesign(fullFilePath, projectId, {
                    width: 800,
                    height: 600,
                  });
                  
                  console.log(`[Thumbnail] Wrapper generation result: ${generatedThumbnail}`);
                  
                  if (generatedThumbnail) {
                    const thumbFileName = generatedThumbnail.replace('thumbnails/', '');
                    const thumbFilePath = path.join(thumbsDir, thumbFileName);
                    
                    if (fs.existsSync(thumbFilePath)) {
                      const thumbStats = fs.statSync(thumbFilePath);
                      console.log(`[Thumbnail] Wrapper thumbnail file: ${thumbFilePath}, size: ${thumbStats.size} bytes`);
                      
                      // Only use if it's a real 3D render (not placeholder)
                      if (thumbStats.size > 15000) {
                        await db.run(
                          'UPDATE projects SET thumbnail_path = ? WHERE id = ?',
                          [generatedThumbnail, projectId]
                        );
                        thumbnail_path = generatedThumbnail;
                        thumbnailGenerated = true;
                        generationSucceeded = true;
                        console.log(`[Thumbnail] Updated database with wrapper-generated thumbnail for project ${projectId}`);
                      } else {
                        console.warn(`[Thumbnail] Wrapper returned placeholder (${thumbStats.size} bytes), will create minimal placeholder instead`);
                        throw new Error(`Wrapper returned placeholder: ${thumbStats.size} bytes`);
                      }
                    } else {
                      throw new Error(`Wrapper thumbnail file not found: ${thumbFilePath}`);
                    }
                  } else {
                    throw new Error('generateThumbnailForDesign returned null');
                  }
                } catch (wrapperError) {
                  console.error(`[Thumbnail] Wrapper also failed:`, wrapperError.message);
                  // Will fall through to placeholder generation below
                }
              }
            }
            
            // If generation failed, create placeholder
            if (!generationSucceeded) {
              console.error(`[Thumbnail] All thumbnail generation methods failed for project ${projectId}`);
              
              // Only generate placeholder if 3D generation actually failed
              try {
                const { generatePlaceholderThumbnail } = require('../../../backend/lib/generateThumbnail');
                const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
                if (!fs.existsSync(thumbsDir)) {
                  fs.mkdirSync(thumbsDir, { recursive: true });
                }
                const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
                await generatePlaceholderThumbnail(fullFilePath, placeholderPath, { width: 800, height: 600 });
                const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
                await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
                thumbnail_path = placeholderUrl;
                thumbnailGenerated = true;
                console.log(`[Thumbnail] Generated placeholder after 3D generation failed for project ${projectId}: ${placeholderUrl}`);
              } catch (placeholderError) {
                console.error(`[Thumbnail] Failed to generate placeholder:`, placeholderError.message);
                console.error(`[Thumbnail] Placeholder error stack:`, placeholderError.stack);
                // Force create a minimal placeholder file
                try {
                  const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
                  if (!fs.existsSync(thumbsDir)) {
                    fs.mkdirSync(thumbsDir, { recursive: true });
                  }
                  const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
                  // Create a minimal 1x1 PNG as absolute fallback
                  const { createCanvas } = require('canvas');
                  const canvas = createCanvas(800, 600);
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#0a0f18';
                  ctx.fillRect(0, 0, 800, 600);
                  ctx.fillStyle = '#0088ff';
                  ctx.font = '48px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('📦', 400, 300);
                  const buffer = canvas.toBuffer('image/png');
                  fs.writeFileSync(placeholderPath, buffer);
                  const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
                  await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
                  thumbnail_path = placeholderUrl;
                  thumbnailGenerated = true;
                  console.log(`[Thumbnail] Created minimal fallback placeholder for project ${projectId}`);
                } catch (minimalError) {
                  console.error(`[Thumbnail] Even minimal placeholder failed:`, minimalError.message);
                }
              }
            }
          } else {
            console.warn(`[Thumbnail] File not found: ${fullFilePath}`);
            console.warn(`[Thumbnail] Current working directory: ${process.cwd()}`);
            console.warn(`[Thumbnail] Storage/uploads exists: ${fs.existsSync(path.join(process.cwd(), 'storage', 'uploads'))}`);
            // Still try to generate placeholder
            try {
              const { generatePlaceholderThumbnail } = require('../../../backend/lib/generateThumbnail');
              const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
              if (!fs.existsSync(thumbsDir)) {
                fs.mkdirSync(thumbsDir, { recursive: true });
              }
              const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
              await generatePlaceholderThumbnail(file_path, placeholderPath, { width: 800, height: 600 });
              const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
              await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
              thumbnail_path = placeholderUrl;
              thumbnailGenerated = true;
              console.log(`[Thumbnail] Generated placeholder despite missing file: ${placeholderUrl}`);
            } catch (placeholderError) {
              console.error(`[Thumbnail] Failed to generate placeholder:`, placeholderError.message);
              // Force create minimal placeholder
              try {
                const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
                if (!fs.existsSync(thumbsDir)) {
                  fs.mkdirSync(thumbsDir, { recursive: true });
                }
                const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
                const { createCanvas } = require('canvas');
                const canvas = createCanvas(800, 600);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#0a0f18';
                ctx.fillRect(0, 0, 800, 600);
                ctx.fillStyle = '#0088ff';
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📦', 400, 300);
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(placeholderPath, buffer);
                const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
                await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
                thumbnail_path = placeholderUrl;
                thumbnailGenerated = true;
                console.log(`[Thumbnail] Created minimal fallback placeholder for project ${projectId}`);
              } catch (minimalError) {
                console.error(`[Thumbnail] Even minimal placeholder failed:`, minimalError.message);
              }
            }
          }
          
          if (!thumbnailGenerated) {
            console.error(`[Thumbnail] WARNING: No thumbnail was generated for project ${projectId}!`);
            // Last resort - create minimal placeholder
            try {
              const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
              if (!fs.existsSync(thumbsDir)) {
                fs.mkdirSync(thumbsDir, { recursive: true });
              }
              const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
              const { createCanvas } = require('canvas');
              const canvas = createCanvas(800, 600);
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#0a0f18';
              ctx.fillRect(0, 0, 800, 600);
              ctx.fillStyle = '#0088ff';
              ctx.font = '48px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('📦', 400, 300);
              const buffer = canvas.toBuffer('image/png');
              fs.writeFileSync(placeholderPath, buffer);
              const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
              await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
              thumbnail_path = placeholderUrl;
              console.log(`[Thumbnail] Created last-resort minimal placeholder for project ${projectId}`);
            } catch (minimalError) {
              console.error(`[Thumbnail] Last-resort placeholder also failed:`, minimalError.message);
            }
          }
          
          console.log(`[Thumbnail] ========================================`);
        } catch (thumbError) {
          console.error(`[Thumbnail] ========================================`);
          console.error(`[Thumbnail] Generation failed for project ${projectId}:`, thumbError.message);
          console.error(`[Thumbnail] Error type: ${thumbError.constructor.name}`);
          console.error(`[Thumbnail] Stack:`, thumbError.stack);
          // Still try to generate placeholder on error
          try {
            const { generatePlaceholderThumbnail } = require('../../../backend/lib/generateThumbnail');
            const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
            if (!fs.existsSync(thumbsDir)) {
              fs.mkdirSync(thumbsDir, { recursive: true });
            }
            const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
            await generatePlaceholderThumbnail(file_path, placeholderPath, { width: 800, height: 600 });
            const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
            await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
            thumbnail_path = placeholderUrl;
            console.log(`[Thumbnail] Generated placeholder after error: ${placeholderUrl}`);
          } catch (placeholderError) {
            console.error(`[Thumbnail] Failed to generate placeholder after error:`, placeholderError.message);
            // Last resort - create minimal placeholder
            try {
              const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
              if (!fs.existsSync(thumbsDir)) {
                fs.mkdirSync(thumbsDir, { recursive: true });
              }
              const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
              const { createCanvas } = require('canvas');
              const canvas = createCanvas(800, 600);
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#0a0f18';
              ctx.fillRect(0, 0, 800, 600);
              ctx.fillStyle = '#0088ff';
              ctx.font = '48px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('📦', 400, 300);
              const buffer = canvas.toBuffer('image/png');
              fs.writeFileSync(placeholderPath, buffer);
              const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
              await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
              thumbnail_path = placeholderUrl;
              console.log(`[Thumbnail] Created minimal fallback after all errors for project ${projectId}`);
            } catch (minimalError) {
              console.error(`[Thumbnail] Even minimal fallback failed:`, minimalError.message);
            }
          }
          console.error(`[Thumbnail] ========================================`);
        }
      } else {
        console.log(`[Thumbnail] Skipping - no file_path for project ${projectId}`);
      }

      // Create initial version (version 1)
      let fileSize = null;
      try {
        const fullPath = path.join(process.cwd(), 'storage', 'uploads', file_path);
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
          thumbnail_path || null, // Use the generated thumbnail_path if available
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

      // Get the updated project with thumbnail_path (after thumbnail generation completes)
      // Re-fetch to ensure we have the latest thumbnail_path
      const project = await db.get(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );

      // Ensure thumbnail_path is included in response
      // Use thumbnail_path variable if it was set during generation
      if (thumbnail_path) {
        project.thumbnail_path = thumbnail_path;
        // Update the database one more time to be sure
        await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [thumbnail_path, projectId]);
      } else if (!project.thumbnail_path && file_path) {
        // Only create emergency placeholder if we truly have no thumbnail
        // Check if thumbnail file actually exists on disk first
        const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
        const possibleThumbPath = path.join(thumbsDir, `${projectId}_thumb.png`);
        
        if (!fs.existsSync(possibleThumbPath)) {
          console.error(`[Thumbnail] CRITICAL: No thumbnail file exists for project ${projectId}, generating minimal placeholder NOW`);
          try {
            if (!fs.existsSync(thumbsDir)) {
              fs.mkdirSync(thumbsDir, { recursive: true });
            }
            const placeholderPath = path.join(thumbsDir, `${projectId}_thumb.png`);
            const { createCanvas } = require('canvas');
            const canvas = createCanvas(800, 600);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0a0f18';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#0088ff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('📦', 400, 300);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(placeholderPath, buffer);
            const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
            await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
            project.thumbnail_path = placeholderUrl;
            console.log(`[Thumbnail] Created emergency placeholder for project ${projectId}`);
          } catch (emergencyError) {
            console.error(`[Thumbnail] Emergency placeholder failed:`, emergencyError.message);
          }
        } else {
          // File exists but database doesn't have it - update database
          const placeholderUrl = `thumbnails/${projectId}_thumb.png`;
          await db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [placeholderUrl, projectId]);
          project.thumbnail_path = placeholderUrl;
          console.log(`[Thumbnail] Found existing thumbnail file, updated database for project ${projectId}`);
        }
      }
      
      console.log(`[Thumbnail] Final project response for ${projectId}:`, {
        thumbnail_path: project.thumbnail_path,
        file_path: project.file_path,
        hasThumbnail: !!project.thumbnail_path
      });

      res.status(201).json(project);
    } catch (error) {
      console.error('Create project error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      res.status(500).json({ 
        error: 'Failed to create project',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
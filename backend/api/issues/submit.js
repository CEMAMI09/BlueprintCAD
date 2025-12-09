import jwt from 'jsonwebtoken';
import db from '../../../db/db';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data with file upload
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'storage', 'uploads', 'issues'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      filter: function ({mimetype}) {
        // Allow only images
        return mimetype && mimetype.includes('image');
      }
    });

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'storage', 'uploads', 'issues');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Extract fields (formidable returns arrays for each field)
    const issueType = Array.isArray(fields.issue_type) ? fields.issue_type[0] : fields.issue_type;
    const severity = Array.isArray(fields.severity) ? fields.severity[0] : fields.severity;
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const message = Array.isArray(fields.message) ? fields.message[0] : fields.message;
    const browserInfo = Array.isArray(fields.browser_info) ? fields.browser_info[0] : fields.browser_info;
    const url = Array.isArray(fields.url) ? fields.url[0] : fields.url;

    // Validation
    if (!issueType || !severity || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['bug', 'feature', 'question', 'other'].includes(issueType)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Title too long (max 200 characters)' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    // Get user info from JWT (optional - can submit without login)
    let userId = null;
    let username = null;
    let email = null;

    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
        username = decoded.username;
        email = decoded.email;
      } catch (err) {
        // Token invalid but continue - anonymous submission
        console.log('Invalid token for issue submission, continuing as anonymous');
      }
    }

    // Handle screenshot upload
    let screenshotPath = null;
    const screenshot = files.screenshot?.[0] || files.screenshot;
    if (screenshot) {
      // Get relative path for database
      const filename = path.basename(screenshot.filepath);
      screenshotPath = `/uploads/issues/${filename}`;
    }

    // Get user agent from headers
    const userAgent = req.headers['user-agent'] || null;

    // Insert issue into database
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO issues (
          user_id, username, email, issue_type, severity, 
          title, message, screenshot_path, browser_info, 
          user_agent, url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [
          userId, username, email, issueType, severity,
          title, message, screenshotPath, browserInfo,
          userAgent, url
        ],
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });

    return res.status(201).json({
      success: true,
      issueId: result.id,
      message: 'Issue submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting issue:', error);
    return res.status(500).json({ error: 'Failed to submit issue' });
  }
}

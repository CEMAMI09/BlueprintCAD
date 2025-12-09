import jwt from 'jsonwebtoken';
import db from '../../../db/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, status, severity, issue_type, assigned_to, page = '1', limit = '20' } = req.query;

    // Get user info from JWT
    let currentUserId = null;
    let isAdmin = false;

    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.userId;
        isAdmin = decoded.isAdmin || false;
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build query based on filters
    let query = `
      SELECT 
        i.*,
        u.username as assigned_admin_username
      FROM issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, only show own issues
    if (!isAdmin && user_id) {
      query += ` AND i.user_id = ?`;
      params.push(parseInt(user_id));
    } else if (!isAdmin) {
      query += ` AND i.user_id = ?`;
      params.push(currentUserId);
    } else if (user_id) {
      // Admin viewing specific user's issues
      query += ` AND i.user_id = ?`;
      params.push(parseInt(user_id));
    }

    // Apply filters
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    if (severity) {
      query += ` AND i.severity = ?`;
      params.push(severity);
    }

    if (issue_type) {
      query += ` AND i.issue_type = ?`;
      params.push(issue_type);
    }

    if (assigned_to) {
      query += ` AND i.assigned_to = ?`;
      params.push(parseInt(assigned_to));
    }

    // Order by priority: critical first, then by created date
    query += ` ORDER BY 
      CASE i.severity 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      i.created_at DESC
    `;

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    // Get issues
    const issues = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM issues WHERE 1=1`;
    const countParams = [];

    if (!isAdmin && user_id) {
      countQuery += ` AND user_id = ?`;
      countParams.push(parseInt(user_id));
    } else if (!isAdmin) {
      countQuery += ` AND user_id = ?`;
      countParams.push(currentUserId);
    } else if (user_id) {
      countQuery += ` AND user_id = ?`;
      countParams.push(parseInt(user_id));
    }

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    if (severity) {
      countQuery += ` AND severity = ?`;
      countParams.push(severity);
    }

    if (issue_type) {
      countQuery += ` AND issue_type = ?`;
      countParams.push(issue_type);
    }

    if (assigned_to) {
      countQuery += ` AND assigned_to = ?`;
      countParams.push(parseInt(assigned_to));
    }

    const totalCount = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        resolve(row?.total || 0);
      });
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching issues:', error);
    return res.status(500).json({ error: 'Failed to fetch issues' });
  }
}

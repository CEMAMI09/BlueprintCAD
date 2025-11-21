import jwt from 'jsonwebtoken';
import db from '../../../../backend/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { status, assigned_to, admin_notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Issue ID required' });
    }

    // Get user info from JWT - must be admin
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check admin status
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate status if provided
    if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      // If status is resolved or closed, set resolved_at
      if (status === 'resolved' || status === 'closed') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
      }
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to === null ? null : parseInt(assigned_to));
    }

    if (admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      params.push(admin_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Always update updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(parseInt(id));

    const query = `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`;

    await new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        if (this.changes === 0) {
          reject(new Error('Issue not found'));
        }
        resolve();
      });
    });

    // Get updated issue
    const updatedIssue = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          i.*,
          u.username as assigned_admin_username
        FROM issues i
        LEFT JOIN users u ON i.assigned_to = u.id
        WHERE i.id = ?`,
        [parseInt(id)],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    return res.status(200).json({
      success: true,
      issue: updatedIssue
    });

  } catch (error) {
    console.error('Error updating issue:', error);
    if (error.message === 'Issue not found') {
      return res.status(404).json({ error: 'Issue not found' });
    }
    return res.status(500).json({ error: 'Failed to update issue' });
  }
}

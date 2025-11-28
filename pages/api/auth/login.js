// Handle user login
import { getDb } from '../../../db/db';
import { verifyPassword, generateToken } from '../../../shared/utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email or username and password are required' });
    }

    const db = await getDb();

    // Find user by email OR username
    const user = await db.get(
      'SELECT id, username, email, password, profile_picture, bio, email_verified, tier FROM users WHERE email = ? OR username = ?',
      [email || null, username || null]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.username);

    res.status(200).json({
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        profile_picture: user.profile_picture,
        bio: user.bio,
        email_verified: Boolean(user.email_verified),
        tier: user.tier || 'free'
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}
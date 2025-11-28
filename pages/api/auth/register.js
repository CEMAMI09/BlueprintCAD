// Handle user registration
import { getDb } from '../../../db/db';
import { hashPassword, generateToken } from '../../../shared/utils/auth';
import { createVerificationToken } from '../../../shared/utils/email-verification';
import { getVerificationEmailHTML, getVerificationEmailText } from '../../../shared/utils/email-templates';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = await getDb();

    // Check if user exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (email_verified defaults to 0)
    const result = await db.run(
      'INSERT INTO users (username, email, password, email_verified) VALUES (?, ?, ?, 0)',
      [username, email, hashedPassword]
    );

    const userId = result.lastID;

    // Generate verification token
    const verificationToken = await createVerificationToken(userId, email);
    
    // Create verification link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;

    // Send verification email (async, don't block registration)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Blueprint'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email - Blueprint',
        text: getVerificationEmailText(username, verificationLink),
        html: getVerificationEmailHTML(username, verificationLink),
      });

      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken(userId, username);

    res.status(201).json({
      user: { 
        id: userId, 
        username, 
        email,
        profile_picture: null,
        bio: null,
        email_verified: false
      },
      token,
      message: 'Account created! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}
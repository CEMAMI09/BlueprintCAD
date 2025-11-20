// API route to resend verification email
import { createVerificationToken, checkVerificationRateLimit, recordVerificationAttempt } from '../../../lib/email-verification';
import { getVerificationEmailHTML, getVerificationEmailText } from '../../../lib/email-templates';
import { verifyAuth } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is logged in
    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, email, email_verified FROM users WHERE id = ?',
      [auth.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Check rate limiting
    const rateLimit = await checkVerificationRateLimit(user.id, user.email, 'send');
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Too many verification emails sent. Please try again in 15 minutes.',
        retryAfter: rateLimit.retryAfter
      });
    }

    // Get client IP
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Record attempt
    await recordVerificationAttempt(user.id, user.email, 'send', ipAddress);

    // Generate new token
    const token = await createVerificationToken(user.id, user.email);
    
    // Create verification link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    // Send email
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
      to: user.email,
      subject: 'Verify Your Email - Blueprint',
      text: getVerificationEmailText(user.username, verificationLink),
      html: getVerificationEmailHTML(user.username, verificationLink),
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}

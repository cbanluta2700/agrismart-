import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { validateEmail } from '@/lib/auth/utils';
import { sendEmail } from '@/lib/email'; // You'll need to implement this

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token (hashed)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update or create password reset token
    await db.passwordReset.upsert({
      where: { email },
      update: {
        token: hashedToken,
        expires: resetTokenExpiry
      },
      create: {
        email,
        token: hashedToken,
        expires: resetTokenExpiry
      }
    });

    // Send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      text: `To reset your password, click the following link: ${resetUrl}`,
      html: `
        <p>You requested a password reset.</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `
    });

    return NextResponse.json({
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validatePassword } from '@/lib/auth/utils';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid reset token
    const resetRequest = await db.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expires: {
          gt: new Date()
        }
      }
    });

    if (!resetRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: resetRequest.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await db.user.update({
      where: { email: resetRequest.email },
      data: { password: hashedPassword }
    });

    // Delete used reset token
    await db.passwordReset.delete({
      where: { email: resetRequest.email }
    });

    return NextResponse.json({
      message: 'Password successfully reset'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
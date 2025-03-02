import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/api-response';
import { authService } from '@/server/express/services/AuthService';
import { db } from '@/lib/db';
import { generateVerificationToken } from '@/lib/auth/token';
import { emailService } from '@/lib/email/email-service';

interface ForgotPasswordRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as ForgotPasswordRequest;

    if (!email) {
      return createApiResponse({
        success: false,
        message: 'Email is required',
        status: 400,
      });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        status: true,
      },
    });

    // Even if the user doesn't exist, don't disclose this information
    // Just return success to prevent email enumeration attacks
    if (!user) {
      return createApiResponse({
        success: true,
        message: 'If your email is registered, you will receive password reset instructions',
        status: 200,
      });
    }

    if (user.status === 'suspended') {
      return createApiResponse({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        status: 403,
      });
    }

    // Generate password reset token
    const resetToken = generateVerificationToken({
      userId: user.id,
      email: user.email,
      type: 'password_reset',
    });

    // Store token in database
    await db.passwordReset.upsert({
      where: { userId: user.id },
      update: {
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
      create: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
    });

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name || 'User',
      resetUrl,
    });

    return createApiResponse({
      success: true,
      message: 'If your email is registered, you will receive password reset instructions',
      status: 200,
    });
  } catch (error) {
    console.error('[FORGOT_PASSWORD_ERROR]', error);
    return createApiResponse({
      success: false,
      message: 'An error occurred while processing your request',
      status: 500,
    });
  }
}

// Handle OPTIONS request for CORS preflight
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

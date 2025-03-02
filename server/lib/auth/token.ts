import jwt from 'jsonwebtoken';

// Type definitions
export interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface AccessTokenPayload extends TokenPayload {
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends TokenPayload {
  // Only userId required for refresh tokens
}

export interface VerificationTokenPayload extends TokenPayload {
  email: string;
  type: 'email_verification' | 'password_reset';
}

/**
 * Generate a JWT access token
 * @param payload Information to include in the token
 * @returns Signed JWT token
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRY || '15m';

  return jwt.sign(payload, secret, {
    expiresIn,
    audience: 'api.agrismart.com',
    issuer: 'agrismart.com',
  });
}

/**
 * Generate a JWT refresh token
 * @param payload Information to include in the token
 * @returns Signed JWT token
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = '7d'; // Refresh tokens typically have a longer lifespan

  return jwt.sign(payload, secret, {
    expiresIn,
    audience: 'api.agrismart.com',
    issuer: 'agrismart.com',
  });
}

/**
 * Generate a verification token (for email verification or password reset)
 * @param payload Information to include in the token
 * @returns Signed JWT token
 */
export function generateVerificationToken(payload: VerificationTokenPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = '1h'; // Verification tokens typically have a shorter lifespan

  return jwt.sign(payload, secret, {
    expiresIn,
    audience: 'api.agrismart.com',
    issuer: 'agrismart.com',
  });
}

/**
 * Verify and decode a JWT token
 * @param token The JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken<T extends TokenPayload>(token: string): T | null {
  try {
    const secret = process.env.JWT_SECRET!;
    return jwt.verify(token, secret, {
      audience: 'api.agrismart.com',
      issuer: 'agrismart.com',
    }) as T;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token The JWT token to check
 * @returns True if the token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp: number };
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Token expiry check failed:', error);
    return true; // If there's an error, assume the token is expired
  }
}

// Auth Error Codes
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  INVALID_PASSWORD_RESET = 'INVALID_PASSWORD_RESET',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED'
}

// Role and status types
export type Role = "USER" | "ADMIN" | "MODERATOR" | "SELLER";
export type AccountStatus = "active" | "suspended" | "pending";

// User interfaces
export interface UserBaseInfo {
  id: string;
  email: string;
  name: string;
  role: Role;
  isVerified: boolean;
  status: AccountStatus;
  image?: string | null;
}

export interface UserLoginResponse {
  user: UserBaseInfo;
  accessToken: string;
  refreshToken: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface PasswordResetData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface EmailVerificationData {
  token: string;
}

// Request contexts
export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

// Token types
export interface JwtPayload {
  userId: string;
  [key: string]: any;
}

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  role: Role;
}

export interface RefreshTokenPayload extends JwtPayload {
  // Only userId required for refresh tokens
}

export interface VerificationTokenPayload extends JwtPayload {
  email: string;
  type: 'email_verification' | 'password_reset';
}

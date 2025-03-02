import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  avatar?: string | null;
  phone?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  rating?: number | null;
  storeInfo?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TokenPayload {
  sub: string;
  roles: Role[];
  email: string;
  iat?: number;
  exp?: number;
}

export interface VerifyTokenData {
  token: string;
  email: string;
}
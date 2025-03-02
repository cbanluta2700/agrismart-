import { jwtVerify, SignJWT } from 'jose'
import { User } from '@/types/store.types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long!!!'
)

const JWT_EXPIRES_IN = '1h'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

export interface JWTPayload {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class AuthUtils {
  static async generateTokens(user: User): Promise<TokenResponse> {
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 60 * 60 // 1 hour

    // Generate access token
    const accessToken = await new SignJWT({ 
      sub: user.id,
      email: user.email,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(JWT_SECRET)

    // Generate refresh token
    const refreshToken = await new SignJWT({ 
      sub: user.id,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(iat)
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    return {
      accessToken,
      refreshToken,
      expiresIn: exp,
    }
  }

  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return payload as JWTPayload
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  static async verifyRefreshToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token')
      }
      return payload.sub as string
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.')
      const { exp = 0 } = JSON.parse(Buffer.from(payload, 'base64').toString())
      return Date.now() >= exp * 1000
    } catch {
      return true
    }
  }
}
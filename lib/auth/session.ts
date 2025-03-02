ximport { Redis } from 'ioredis'
import { User } from '@/types/store.types'
import { UAParser } from 'ua-parser-js'

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface Session {
  id: string
  userId: string
  userAgent: string
  ip: string
  device: string
  browser: string
  location: string
  lastActive: Date
  createdAt: Date
  expiresAt: Date
}

export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:'
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:'
  private static readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

  static async createSession(
    user: User,
    userAgent: string,
    ip: string
  ): Promise<Session> {
    const parser = new UAParser(userAgent)
    const sessionId = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION)

    const session: Session = {
      id: sessionId,
      userId: user.id,
      userAgent,
      ip,
      device: `${parser.getDevice().vendor || ''} ${parser.getDevice().model || 'Unknown'}`.trim(),
      browser: `${parser.getBrowser().name || 'Unknown'} ${parser.getBrowser().version || ''}`.trim(),
      location: 'Unknown', // Could be resolved using GeoIP service
      lastActive: now,
      createdAt: now,
      expiresAt
    }

    // Store session in Redis
    await redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_DURATION / 1000,
      JSON.stringify(session)
    )

    // Add to user's session list
    await redis.sadd(
      `${this.USER_SESSIONS_PREFIX}${user.id}`,
      sessionId
    )

    return session
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    const sessionData = await redis.get(`${this.SESSION_PREFIX}${sessionId}`)
    if (!sessionData) return null

    const session = JSON.parse(sessionData)
    return {
      ...session,
      lastActive: new Date(session.lastActive),
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt)
    }
  }

  static async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) return

    session.lastActive = new Date()
    await redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_DURATION / 1000,
      JSON.stringify(session)
    )
  }

  static async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`)
    const sessions = await Promise.all(
      sessionIds.map(id => this.getSession(id))
    )
    return sessions.filter((session): session is Session => session !== null)
  }

  static async revokeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) return

    await Promise.all([
      redis.del(`${this.SESSION_PREFIX}${sessionId}`),
      redis.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, sessionId)
    ])
  }

  static async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.getUserSessions(userId)
    await Promise.all(
      sessions
        .filter(session => session.id !== exceptSessionId)
        .map(session => this.revokeSession(session.id))
    )
  }

  static async cleanupExpiredSessions(): Promise<void> {
    // This could be run periodically as a cron job
    const allSessionKeys = await redis.keys(`${this.SESSION_PREFIX}*`)
    const now = new Date()

    for (const key of allSessionKeys) {
      const sessionData = await redis.get(key)
      if (!sessionData) continue

      const session = JSON.parse(sessionData)
      if (new Date(session.expiresAt) < now) {
        await this.revokeSession(session.id)
      }
    }
  }
}
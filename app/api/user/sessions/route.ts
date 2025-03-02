import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { AuthUtils } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const payload = await AuthUtils.verifyToken(token)

    // Get user's sessions
    const sessions = await SessionManager.getUserSessions(payload.sub)

    // Add current session flag
    const currentSessionId = request.cookies.get('sessionId')?.value
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      current: session.id === currentSessionId
    }))

    return NextResponse.json({ sessions: sessionsWithCurrent })
  } catch (error) {
    console.error('Failed to get sessions:', error)
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const payload = await AuthUtils.verifyToken(token)

    // Check if revoking specific session or all sessions
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Revoke specific session
      const session = await SessionManager.getSession(sessionId)
      if (!session || session.userId !== payload.sub) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      await SessionManager.revokeSession(sessionId)
    } else {
      // Revoke all sessions except current
      const currentSessionId = request.cookies.get('sessionId')?.value
      await SessionManager.revokeAllUserSessions(payload.sub, currentSessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke session(s):', error)
    return NextResponse.json(
      { error: 'Failed to revoke session(s)' },
      { status: 500 }
    )
  }
}
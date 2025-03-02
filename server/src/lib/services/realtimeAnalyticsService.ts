import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Real-time analytics service using Socket.io
 */
class RealtimeAnalyticsService {
  private io: SocketServer | null = null;

  /**
   * Initialize the Socket.io server
   */
  initialize(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      path: '/api/socket/analytics',
      cors: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupSocketHandlers();
    console.log('Realtime analytics service initialized');
  }

  /**
   * Set up socket.io event handlers
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      console.log('Client connected to analytics socket:', socket.id);

      // Authenticate the socket connection
      const session = await this.getSession(socket.handshake.headers.cookie);
      if (!session?.user) {
        console.log('Unauthenticated connection attempt, disconnecting');
        socket.disconnect(true);
        return;
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        console.log('Non-admin connection attempt, disconnecting');
        socket.disconnect(true);
        return;
      }

      // Join user to admin analytics room
      socket.join('admin-analytics');

      // Handle subscription to specific analytics channels
      socket.on('subscribe', (channel) => {
        console.log(`Client subscribed to channel: ${channel}`);
        socket.join(channel);
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (channel) => {
        console.log(`Client unsubscribed from channel: ${channel}`);
        socket.leave(channel);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected from analytics socket:', socket.id);
      });
    });
  }

  /**
   * Broadcast an analytics event to all connected admin clients
   */
  broadcastEvent(event: {
    type: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    groupId?: string;
    metadata?: any;
  }) {
    if (!this.io) return;

    // Broadcast to all admins
    this.io.to('admin-analytics').emit('analytics:event', {
      ...event,
      timestamp: new Date(),
    });

    // Broadcast to specific channels if applicable
    if (event.groupId) {
      this.io.to(`group-analytics:${event.groupId}`).emit('analytics:event', {
        ...event,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast updated metrics to all connected admin clients
   */
  async broadcastMetricsUpdate(metrics: any) {
    if (!this.io) return;

    this.io.to('admin-analytics').emit('analytics:metrics-update', {
      metrics,
      timestamp: new Date(),
    });
  }

  /**
   * Get session from cookie
   */
  private async getSession(cookie?: string) {
    if (!cookie) return null;
    
    // This is a simplified example - a real implementation would need to 
    // parse the cookie and validate the session
    try {
      return await getServerSession(authOptions);
    } catch (error) {
      console.error('Error getting session from cookie:', error);
      return null;
    }
  }
}

export const realtimeAnalyticsService = new RealtimeAnalyticsService();
export default realtimeAnalyticsService;

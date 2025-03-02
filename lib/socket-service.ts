"use client";

import { io, Socket } from "socket.io-client";
import { useState, useEffect, useCallback } from "react";

let socket: Socket | null = null;

type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export const useSocketService = (userId: string) => {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const connect = useCallback(() => {
    if (!userId) {
      setError('User ID is required to connect');
      setStatus('error');
      return;
    }
    
    try {
      if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
          auth: {
            userId,
          },
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
      }
      
      setStatus('connecting');
      
      socket.on('connect', () => {
        setStatus('connected');
        setError(null);
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setStatus('error');
        setError(`Connection error: ${err.message}`);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setStatus('disconnected');
      });
      
      socket.connect();
    } catch (err) {
      console.error('Error initializing socket:', err);
      setStatus('error');
      setError(`Failed to initialize socket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [userId]);
  
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setStatus('disconnected');
    }
  }, []);
  
  const subscribe = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
    
    return () => {
      if (socket) {
        socket.off(event, callback);
      }
    };
  }, []);
  
  const emit = useCallback((event: string, ...args: any[]) => {
    if (socket && socket.connected) {
      socket.emit(event, ...args);
      return true;
    }
    return false;
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);
  
  return {
    status,
    error,
    connect,
    disconnect,
    subscribe,
    emit,
    connected: status === 'connected',
  };
};

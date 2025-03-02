"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocketService } from "./socket-service";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participants: {
    id: string;
    name: string;
  }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  productId?: string; // Optional, for marketplace chats related to a product
  orderId?: string; // Optional, for marketplace chats related to an order
  createdAt: string;
  updatedAt: string;
}

export function useMarketplaceChat() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const { status, connect, disconnect, subscribe, emit, connected } = useSocketService(userId);
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Connect to socket when session is available
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => disconnect();
  }, [userId, connect, disconnect]);
  
  // Subscribe to socket events
  useEffect(() => {
    if (!connected) return;
    
    // New message received
    const unsubscribeNewMessage = subscribe('marketplace:new_message', (message: ChatMessage) => {
      setMessages((prev) => {
        const conversationMessages = [...(prev[message.conversationId] || [])];
        // Only add if not already in the list (prevent duplicates)
        if (!conversationMessages.some(m => m.id === message.id)) {
          conversationMessages.push(message);
        }
        return {
          ...prev,
          [message.conversationId]: conversationMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        };
      });
      
      // Update conversation list with the new message
      setConversations((prev) => {
        return prev.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: message.senderId !== userId ? conv.unreadCount + 1 : conv.unreadCount,
              updatedAt: message.timestamp
            };
          }
          return conv;
        }).sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      
      // Show notification if message is not from current user and not in current conversation
      if (message.senderId !== userId && currentConversation !== message.conversationId) {
        toast(`New message from ${message.senderName}`, {
          description: message.content.length > 50 
            ? `${message.content.substring(0, 50)}...` 
            : message.content,
          action: {
            label: "View",
            onClick: () => setCurrentConversation(message.conversationId),
          },
        });
      }
    });
    
    // Message read status updated
    const unsubscribeMessageRead = subscribe('marketplace:message_read', (data: { 
      conversationId: string, 
      messageId: string,
      readBy: string 
    }) => {
      if (data.readBy !== userId) {
        setMessages((prev) => {
          const conversationMessages = [...(prev[data.conversationId] || [])];
          return {
            ...prev,
            [data.conversationId]: conversationMessages.map(m => 
              m.id === data.messageId ? { ...m, read: true } : m
            )
          };
        });
      }
    });
    
    // Conversation list updated
    const unsubscribeConversationUpdate = subscribe('marketplace:conversation_update', (updatedConversations: ChatConversation[]) => {
      setConversations(updatedConversations.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    });
    
    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageRead();
      unsubscribeConversationUpdate();
    };
  }, [connected, subscribe, userId, currentConversation]);
  
  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/chat/conversations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch conversations');
      }
      
      const data = await response.json();
      setConversations(data.sort((a: ChatConversation, b: ChatConversation) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/marketplace/chat/conversations/${conversationId}/messages`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages((prev) => ({
        ...prev,
        [conversationId]: data.sort((a: ChatMessage, b: ChatMessage) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      }));
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
      
      // Update current conversation
      setCurrentConversation(conversationId);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Send a message
  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (!userId || !conversationId || !content.trim() || !connected) {
      return false;
    }
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: userId,
      senderName: session?.user?.name || 'You',
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    // Optimistically add to UI
    setMessages((prev) => {
      const conversationMessages = [...(prev[conversationId] || [])];
      conversationMessages.push(tempMessage);
      return {
        ...prev,
        [conversationId]: conversationMessages
      };
    });
    
    // Emit socket event
    return emit('marketplace:send_message', {
      conversationId,
      content,
      tempId,
    });
  }, [userId, session, connected, emit]);
  
  // Mark all messages in a conversation as read
  const markMessagesAsRead = useCallback((conversationId: string) => {
    if (!userId || !conversationId || !connected) {
      return false;
    }
    
    // Update UI optimistically
    setConversations((prev) => {
      return prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unreadCount: 0,
          };
        }
        return conv;
      });
    });
    
    // Emit socket event
    return emit('marketplace:mark_read', { conversationId });
  }, [userId, connected, emit]);
  
  // Create a new conversation
  const createConversation = useCallback(async (
    otherUserId: string, 
    options?: { productId?: string; orderId?: string }
  ) => {
    if (!userId || !otherUserId) {
      return null;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: otherUserId,
          productId: options?.productId,
          orderId: options?.orderId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }
      
      const conversation = await response.json();
      
      // Update conversation list
      setConversations((prev) => {
        // Check if already exists
        if (prev.some(c => c.id === conversation.id)) {
          return prev;
        }
        return [conversation, ...prev];
      });
      
      // Set as current conversation
      setCurrentConversation(conversation.id);
      
      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Load initial data
  useEffect(() => {
    if (userId && connected) {
      fetchConversations();
    }
  }, [userId, connected, fetchConversations]);
  
  return {
    status,
    conversations,
    currentConversation,
    messages: currentConversation ? messages[currentConversation] || [] : [],
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    createConversation,
    setCurrentConversation,
  };
}

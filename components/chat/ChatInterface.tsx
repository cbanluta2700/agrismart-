import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar } from '../ui/avatar';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Loader2, Send, MoreVertical, Trash, Share } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';

// Types for context data and chat props
type ContextData = Record<string, any>;

interface ChatInterfaceProps {
  initialContext?: ContextData;
  conversationId?: string;
  title?: string;
  onConversationIdChange?: (id: string) => void;
}

export default function ChatInterface({
  initialContext,
  conversationId: initialConversationId,
  title = 'Chat with AgriSmart AI',
  onConversationIdChange,
}: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [contextData, setContextData] = useState<ContextData>(initialContext || {});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize chat using vercel/ai hooks
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    error,
    data,
  } = useChat({
    api: '/api/chat',
    initialMessages: [],
    // Include conversation ID and context if available
    body: {
      conversationId: initialConversationId,
      contextData,
    },
    onResponse: (response) => {
      // Extract conversation ID from header
      const conversationId = response.headers.get('X-Conversation-ID');
      if (conversationId && onConversationIdChange) {
        onConversationIdChange(conversationId);
      }
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show error if user is not logged in
  if (!session) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Chat requires login</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please sign in with your Google account to use the chat feature.</p>
        </CardContent>
      </Card>
    );
  }

  // Update context data and notify backend
  const updateContext = async (newContext: ContextData) => {
    if (!data?.conversationId) return;
    
    setContextData((prev) => ({ ...prev, ...newContext }));
    
    try {
      const response = await fetch(`/api/chat/conversations/${data.conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData: newContext }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update context');
      }
    } catch (error) {
      console.error('Error updating context:', error);
      toast.error('Failed to update context data');
    }
  };

  // Delete conversation
  const deleteCurrentConversation = async () => {
    if (!data?.conversationId) return;
    
    try {
      const response = await fetch(`/api/chat/conversations/${data.conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      // Clear messages
      setMessages([]);
      toast.success('Conversation deleted');
      
      // Notify parent
      if (onConversationIdChange) {
        onConversationIdChange('');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={deleteCurrentConversation}>
              <Trash className="mr-2 h-4 w-4" />
              Clear conversation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // Example of adding farm-specific context
                updateContext({
                  currentView: 'farm',
                  farmId: 'farm_123',
                  farmName: 'Green Acres'
                });
                toast.success('Added farm context to conversation');
              }}
            >
              <Share className="mr-2 h-4 w-4" />
              Add farm context
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="p-4 h-[400px] overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation with AgriSmart AI
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3",
                  message.role === 'user' ? 'bg-muted' : 'bg-background'
                )}
              >
                <Avatar>
                  {message.role === 'user' ? (
                    <img 
                      src={session.user?.image || ''} 
                      alt={session.user?.name || 'User'} 
                    />
                  ) : (
                    <img 
                      src="/images/agrismart-logo-small.png" 
                      alt="AgriSmart AI" 
                    />
                  )}
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="font-semibold">
                    {message.role === 'user' ? session.user?.name : 'AgriSmart AI'}
                  </div>
                  <div className="prose-sm max-w-none">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form 
          onSubmit={handleSubmit} 
          className="flex w-full items-center space-x-2"
        >
          <Textarea
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

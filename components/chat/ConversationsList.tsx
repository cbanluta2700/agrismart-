import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { MessageSquare, Loader2, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

// Types
interface Conversation {
  id: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationsListProps {
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export default function ConversationsList({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationsListProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch conversations when session changes
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chat/conversations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, [session]);

  // Format the conversation title by extracting the first message
  const getConversationTitle = (conversation: Conversation) => {
    // Find the first user message
    const firstUserMessage = conversation.messages.find(
      (msg) => msg.role === 'user'
    );
    
    if (!firstUserMessage) return 'New conversation';
    
    // Limit title length
    const content = firstUserMessage.content;
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  };

  if (!session) {
    return null;
  }

  return (
    <Card className="w-full max-w-xs h-[500px] overflow-hidden flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Your Conversations</CardTitle>
        <CardDescription>
          Chat history with AgriSmart AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto">
        <div className="p-4">
          <Button
            onClick={onNewConversation}
            variant="outline"
            className="w-full justify-start"
          >
            <Plus className="mr-2 h-4 w-4" />
            New conversation
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {conversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left px-4 py-2 h-auto items-start",
                  selectedConversationId === conversation.id && "bg-muted"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-xs line-clamp-1">
                    {getConversationTitle(conversation)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conversation.updatedAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

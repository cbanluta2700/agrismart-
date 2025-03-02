"use client";

import React from "react";
import { ChatConversation } from "@/lib/marketplace-chat-service";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatConversationListProps {
  conversations: ChatConversation[];
  currentConversation: string | null;
  onSelectConversation: (id: string) => void;
  currentUserId: string;
}

export default function ChatConversationList({
  conversations,
  currentConversation,
  onSelectConversation,
  currentUserId,
}: ChatConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-muted-foreground">No conversations found</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => {
        // Find the other participant (not the current user)
        const otherParticipant = conversation.participants.find(
          (p) => p.id !== currentUserId
        );
        
        const isSelected = conversation.id === currentConversation;
        
        return (
          <div
            key={conversation.id}
            className={cn(
              "flex items-start p-3 hover:bg-accent/50 cursor-pointer transition-colors",
              isSelected && "bg-accent"
            )}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <Avatar className="h-10 w-10 mr-3 mt-0.5">
              <AvatarImage src={otherParticipant?.image || ""} />
              <AvatarFallback>
                {otherParticipant?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium truncate">
                  {otherParticipant?.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(conversation.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground truncate">
                {conversation.lastMessage?.content || "No messages yet"}
              </div>
              
              <div className="flex items-center mt-1 text-xs">
                {conversation.productId && (
                  <span className="truncate max-w-[120px]">
                    {conversation.product?.name || "Product"}
                  </span>
                )}
                
                {conversation.orderId && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    Order #{conversation.orderId.substring(0, 8)}
                  </Badge>
                )}
                
                {conversation.unreadCount > 0 && (
                  <Badge className="ml-auto bg-primary text-primary-foreground">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/marketplace-chat-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export default function ChatMessageList({
  messages,
  currentUserId,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-muted-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start the conversation by sending a message
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { [date: string]: ChatMessage[] } = {};
  
  messages.forEach((message) => {
    const date = format(new Date(message.timestamp), "yyyy-MM-dd");
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  return (
    <div className="space-y-6 p-1">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-4">
          <div className="relative flex justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative bg-background px-2 text-xs text-muted-foreground">
              {format(new Date(date), "MMMM d, yyyy")}
            </div>
          </div>

          <div className="space-y-2">
            {dateMessages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2 max-w-[80%]",
                    isCurrentUser ? "ml-auto" : "mr-auto"
                  )}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.senderImage || ""} />
                      <AvatarFallback>
                        {message.senderName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex flex-col">
                    <div
                      className={cn(
                        "rounded-lg p-3 text-sm",
                        isCurrentUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent"
                      )}
                    >
                      {message.content}
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <span>
                        {format(new Date(message.timestamp), "h:mm a")}
                      </span>
                      
                      {isCurrentUser && (
                        <span className="ml-1">
                          {message.read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

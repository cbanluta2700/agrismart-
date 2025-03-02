"use client";

import { useMarketplaceChat } from "@/lib/marketplace-chat-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatConversationList from "./ChatConversationList";
import ChatMessageList from "./ChatMessageList";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function ChatContainer() {
  const { data: session } = useSession();
  const [messageInput, setMessageInput] = useState("");
  const {
    status,
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    sendMessage,
    setCurrentConversation,
  } = useMarketplaceChat();

  // Get current conversation details
  const currentConversationData = conversations.find(
    (conv) => conv.id === currentConversation
  );

  // Find the other participant (not the current user)
  const otherParticipant = currentConversationData?.participants.find(
    (p) => p.id !== session?.user?.id
  );

  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !currentConversation) return;
    
    sendMessage(currentConversation, messageInput);
    setMessageInput("");
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xl">Marketplace Chat</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex overflow-hidden">
        <Tabs defaultValue="conversations" className="flex flex-col w-full h-full">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="messages" disabled={!currentConversation}>Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversations.length > 0 ? (
                <ChatConversationList 
                  conversations={conversations}
                  currentConversation={currentConversation}
                  onSelectConversation={setCurrentConversation}
                  currentUserId={session?.user?.id || ""}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-muted-foreground mb-2">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation from a product page or order details
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="messages" className="flex flex-col flex-1 overflow-hidden data-[state=inactive]:hidden">
            {currentConversation && currentConversationData ? (
              <>
                <div className="border-b pb-2 mb-2">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={otherParticipant?.image || ""} />
                      <AvatarFallback>
                        {otherParticipant?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {otherParticipant?.name || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentConversationData.productId && (
                          <span>
                            Product:{" "}
                            {currentConversationData.product?.name || "Item"}
                          </span>
                        )}
                        {currentConversationData.orderId && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Order #{currentConversationData.orderId.substring(0, 8)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(currentConversationData.updatedAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto mb-2">
                  <ChatMessageList 
                    messages={messages} 
                    currentUserId={session?.user?.id || ""} 
                  />
                </div>
                
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="submit"
                    size="icon"
                    disabled={!messageInput.trim() || status !== "connected"}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground">
                  Select a conversation to start chatting
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {status === "connecting" && (
        <div className="px-4 py-2 text-sm text-muted-foreground flex items-center">
          <Loader2 className="h-3 w-3 animate-spin mr-2" />
          Connecting to chat...
        </div>
      )}
      
      {status === "error" && (
        <div className="px-4 py-2 text-sm text-destructive">
          Error connecting to chat. Please refresh.
        </div>
      )}
    </Card>
  );
}

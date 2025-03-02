"use client";

import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ChatContainer from "./chat/ChatContainer";
import { useMarketplaceChat } from "@/lib/marketplace-chat-service";
import { cn } from "@/lib/utils";

interface ChatButtonProps extends ButtonProps {
  sellerId: string;
  productId?: string;
  orderId?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export default function ChatButton({
  sellerId,
  productId,
  orderId,
  variant = "default",
  label = "Chat with Seller",
  showIcon = true,
  className,
  ...props
}: ChatButtonProps) {
  const [open, setOpen] = useState(false);
  const { createConversation } = useMarketplaceChat();

  const handleOpenChat = async () => {
    const conversation = await createConversation(sellerId, {
      productId,
      orderId,
    });
    
    if (conversation) {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        onClick={handleOpenChat}
        className={cn(className)}
        {...props}
      >
        {showIcon && <MessageCircle className="mr-2 h-4 w-4" />}
        {label}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <ChatContainer />
        </DialogContent>
      </Dialog>
    </>
  );
}

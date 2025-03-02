"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import ChatContainer from "@/components/marketplace/chat/ChatContainer";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Marketplace Chat | AgriSmart",
  description: "Chat with buyers and sellers on AgriSmart Marketplace",
};

export default function ChatPage() {
  const { data: session, status } = useSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login?callbackUrl=/marketplace/chat");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[600px]">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/marketplace">Marketplace</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Chat</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ChatContainer />
        </div>
        
        <div>
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Chat Guidelines</h2>
            <ul className="space-y-2 text-sm">
              <li>Be respectful and courteous to other users</li>
              <li>Do not share personal information like phone numbers or addresses</li>
              <li>Use the chat for product inquiries and order coordination</li>
              <li>Report any suspicious behavior or spam</li>
              <li>Never make payments outside the platform</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

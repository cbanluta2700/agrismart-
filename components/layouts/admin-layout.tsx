"use client";

import { Sidebar } from "@/components/admin/sidebar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  
  // Fix hydration issues by waiting for client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin?callbackUrl=/admin");
    }
  }, [status]);
  
  // Show loading state
  if (status === "loading" || !isClient) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 flex-shrink-0" />
        <div className="flex-1 p-8">
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1">
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

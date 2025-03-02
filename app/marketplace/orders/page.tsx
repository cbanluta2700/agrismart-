"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OrderHistory from "@/components/marketplace/OrderHistory";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/marketplace/orders");
    }
  }, [status, router]);
  
  // Loading state
  if (status === "loading") {
    return (
      <div className="container max-w-6xl py-10">
        <div className="flex justify-center py-20">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show login prompt
  if (!session?.user) {
    return (
      <div className="container max-w-6xl py-10">
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <h3 className="text-xl font-medium mb-4">Login Required</h3>
            <p className="text-gray-500 mb-6">
              Please login to view your orders
            </p>
            <Button onClick={() => router.push("/login?callbackUrl=/marketplace/orders")}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-500">
          View and manage your marketplace purchases and sales
        </p>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">
            Track your orders, update status, and manage your marketplace activity
          </p>
        </div>
        <Button onClick={() => router.push("/marketplace/create")}>
          Create New Listing
        </Button>
      </div>
      
      <OrderHistory userId={session.user.id} />
    </div>
  );
}

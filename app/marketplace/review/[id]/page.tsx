"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReviewForm } from "@/components/marketplace/reviews/review-form";

export default function OrderReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/marketplace/orders/${params.id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }
        
        const orderData = await response.json();
        
        // Check if the logged-in user is the buyer of this order
        if (orderData.buyer.id !== session?.user?.id) {
          throw new Error("You don't have permission to review this order");
        }
        
        // Check if the order is delivered
        if (orderData.status !== "delivered") {
          throw new Error("You can only review orders that have been delivered");
        }
        
        setOrder(orderData);
        
        // Check if the user has already reviewed this order
        const reviewsResponse = await fetch(`/api/marketplace/reviews?orderId=${params.id}`);
        const reviewsData = await reviewsResponse.json();
        
        if (reviewsData.reviews && reviewsData.reviews.length > 0) {
          setAlreadyReviewed(true);
        }
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user) {
      fetchOrderDetails();
    }
  }, [params.id, session]);
  
  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/marketplace/review/${params.id}`);
    }
  }, [status, router, params.id]);
  
  const handleReviewSuccess = () => {
    router.push(`/marketplace/${order.product.id}`);
  };
  
  const handleCancel = () => {
    router.push(`/marketplace/orders/${params.id}`);
  };
  
  if (loading) {
    return (
      <div className="container max-w-4xl py-10">
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-4xl py-10">
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/marketplace/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }
  
  if (alreadyReviewed) {
    return (
      <div className="container max-w-4xl py-10">
        <Alert className="mb-4">
          <AlertTitle>Already Reviewed</AlertTitle>
          <AlertDescription>
            You have already submitted a review for this order.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/marketplace/orders/${params.id}`)}>
            Back to Order
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/marketplace/${order.product.id}`)}
          >
            View Product
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Purchase</CardTitle>
        </CardHeader>
        <CardContent>
          {order && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-medium">{order.product.name}</h3>
                  <p className="text-sm text-gray-500">
                    Order #{order.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              
              <ReviewForm 
                orderId={params.id} 
                onSuccess={handleReviewSuccess}
                onCancel={handleCancel}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

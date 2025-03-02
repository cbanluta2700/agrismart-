"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/marketplace-utils";
import OrderStatusBadge from "@/components/marketplace/OrderStatusBadge";
import { toast } from "sonner";

interface OrderDetails {
  id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  quantity: number;
  totalAmount: {
    amount: number;
    currency: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
    category: {
      id: string;
      name: string;
    };
    seller: {
      id: string;
      name: string;
    };
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  };
}

export default function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if the user is the buyer or seller of the order
  const isOrderOwner = () => {
    if (!order || !session?.user) return false;
    
    return (
      order.buyer.id === session.user.id ||
      order.product.seller.id === session.user.id
    );
  };
  
  // Check if the user is the seller of the order
  const isSeller = () => {
    if (!order || !session?.user) return false;
    return order.product.seller.id === session.user.id;
  };
  
  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!params.id || !session?.user) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/marketplace/orders/${params.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch order details");
        }
        
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch order details"
        );
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user) {
      fetchOrderDetails();
    }
  }, [params.id, session]);
  
  // Update order status
  const updateOrderStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/marketplace/orders/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order status");
      }
      
      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      toast.success(`Order ${newStatus} successfully`);
    } catch (err) {
      console.error("Error updating order status:", err);
      toast.error("Failed to update order status");
    }
  };
  
  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/marketplace/orders/${params.id}`);
    }
  }, [status, router, params.id]);
  
  // Loading state
  if (loading) {
    return (
      <div className="container max-w-6xl py-10">
        <div className="flex justify-center py-20">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container max-w-6xl py-10">
        <Card className="border-red-200">
          <CardContent className="py-10 text-center">
            <h3 className="text-xl font-medium mb-4 text-red-600">Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push("/marketplace/orders")}>
              Go Back to Orders
            </Button>
          </CardContent>
        </Card>
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
              Please login to view order details
            </p>
            <Button
              onClick={() =>
                router.push(`/login?callbackUrl=/marketplace/orders/${params.id}`)
              }
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If order not found or user is not owner
  if (!order || !isOrderOwner()) {
    return (
      <div className="container max-w-6xl py-10">
        <Card className="border-yellow-200">
          <CardContent className="py-10 text-center">
            <h3 className="text-xl font-medium mb-4 text-yellow-700">
              Order Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              The order you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => router.push("/marketplace/orders")}>
              Go Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-gray-500">
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative h-24 w-24 flex-shrink-0">
                  {order.product.images && order.product.images.length > 0 ? (
                    <Image
                      src={order.product.images[0]}
                      alt={order.product.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-xs text-gray-500">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">
                    <Link
                      href={`/marketplace/${order.product.id}`}
                      className="hover:underline"
                    >
                      {order.product.name}
                    </Link>
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.product.category.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isSeller()
                      ? `Buyer: ${order.buyer.name}`
                      : `Seller: ${order.product.seller.name}`}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p>
                      {formatPrice(order.product.price, 
                        order.totalAmount.currency)} × {order.quantity}
                    </p>
                    <p className="font-medium">
                      {formatPrice(
                        order.product.price * order.quantity,
                        order.totalAmount.currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-500">Subtotal</p>
                  <p>
                    {formatPrice(
                      order.product.price * order.quantity,
                      order.totalAmount.currency
                    )}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-500">Shipping</p>
                  <p>
                    {formatPrice(
                      order.totalAmount.amount -
                        order.product.price * order.quantity,
                      order.totalAmount.currency
                    )}
                  </p>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <p>Total</p>
                  <p>
                    {formatPrice(
                      order.totalAmount.amount,
                      order.totalAmount.currency
                    )}
                  </p>
                </div>
              </div>
              
              {order.trackingNumber && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Tracking Number</p>
                  <p className="text-sm mt-1">{order.trackingNumber}</p>
                </div>
              )}
              
              {order.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Notes</p>
                  <p className="text-sm mt-1">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-gray-500 capitalize">
                    {order.paymentMethod.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Payment Status</p>
                  <p
                    className={`inline-flex items-center ${
                      order.paymentStatus === "paid"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    <span
                      className={`mr-2 inline-block w-2 h-2 rounded-full ${
                        order.paymentStatus === "paid"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    ></span>
                    {order.paymentStatus.charAt(0).toUpperCase() +
                      order.paymentStatus.slice(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Shipping Address</p>
                  <div className="text-gray-500 space-y-1 mt-1">
                    <p>{order.shippingAddress.street}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
                
                {isSeller() && (
                  <div>
                    <p className="font-medium">Buyer Contact</p>
                    <p className="text-gray-500 mt-1">{order.buyer.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Order Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Order Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isSeller() ? (
                  <>
                    {order.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => updateOrderStatus("confirmed")}
                          className="w-full"
                        >
                          Confirm Order
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateOrderStatus("cancelled")}
                          className="w-full"
                        >
                          Cancel Order
                        </Button>
                      </div>
                    )}
                    
                    {order.status === "confirmed" && (
                      <Button
                        onClick={() => updateOrderStatus("shipped")}
                        className="w-full"
                      >
                        Mark as Shipped
                      </Button>
                    )}
                    
                    {order.status === "shipped" && (
                      <Button
                        onClick={() => updateOrderStatus("delivered")}
                        className="w-full"
                      >
                        Mark as Delivered
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {order.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={() => updateOrderStatus("cancelled")}
                        className="w-full"
                      >
                        Cancel Order
                      </Button>
                    )}
                    
                    {order.status === "delivered" && (
                      <Button
                        onClick={() =>
                          router.push(`/marketplace/review/${order.id}`)
                        }
                        className="w-full"
                      >
                        Leave Review
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => router.push("/marketplace/orders")}
                  className="w-full"
                >
                  Back to Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

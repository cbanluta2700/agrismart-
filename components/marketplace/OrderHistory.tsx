"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/marketplace-utils";
import OrderStatusBadge from "./OrderStatusBadge";
import { toast } from "sonner";

interface OrderHistoryProps {
  userId: string;
}

interface Order {
  id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  quantity: number;
  totalAmount: {
    amount: number;
    currency: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
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
  };
}

export default function OrderHistory({ userId }: OrderHistoryProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("purchases");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch orders based on active tab and filters
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("pageSize", "10");
      
      const response = await fetch(`/api/marketplace/orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      
      const data = await response.json();
      setOrders(data.items || []);
      
      // Calculate total pages
      setTotalPages(Math.ceil(data.total / data.pageSize));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/marketplace/orders/${orderId}`, {
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
      
      toast.success(`Order ${newStatus} successfully`);
      
      // Refresh the order list
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "purchases") {
      return order.buyer.id === userId;
    } else {
      return order.product.seller.id === userId;
    }
  });

  // Load orders when component mounts or filters change
  useEffect(() => {
    fetchOrders();
  }, [activeTab, statusFilter, page]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="purchases" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="purchases">My Purchases</TabsTrigger>
            <TabsTrigger value="sales">My Sales</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="purchases" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-gray-500">
                  You haven't made any purchases yet.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/marketplace")}
                >
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/marketplace/orders/${order.id}`}
                          className="hover:underline"
                        >
                          Order #{order.id.slice(0, 8)}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
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
                      <p className="text-sm text-gray-500">
                        Sold by: {order.product.seller.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {order.quantity}
                      </p>
                      <p className="font-medium mt-1">
                        {formatPrice(order.totalAmount.amount, order.totalAmount.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-sm text-gray-500">
                    <span className="inline-flex items-center">
                      Payment: {order.paymentMethod.replace(/_/g, " ")}
                      <span
                        className={`ml-2 inline-block w-2 h-2 rounded-full ${
                          order.paymentStatus === "paid"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      ></span>
                    </span>
                  </div>
                  {order.status === "delivered" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/marketplace/review/${order.id}`)}
                    >
                      Leave Review
                    </Button>
                  )}
                  {order.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, "cancelled")}
                    >
                      Cancel Order
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="sales" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-gray-500">
                  You haven't made any sales yet.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/marketplace/create")}
                >
                  Create Listing
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/marketplace/orders/${order.id}`}
                          className="hover:underline"
                        >
                          Order #{order.id.slice(0, 8)}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
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
                      <p className="text-sm text-gray-500">
                        Buyer: {order.buyer.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {order.quantity}
                      </p>
                      <p className="font-medium mt-1">
                        {formatPrice(order.totalAmount.amount, order.totalAmount.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-sm text-gray-500">
                    <span className="inline-flex items-center">
                      Payment: {order.paymentMethod.replace(/_/g, " ")}
                      <span
                        className={`ml-2 inline-block w-2 h-2 rounded-full ${
                          order.paymentStatus === "paid"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      ></span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "confirmed")}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {order.status === "confirmed" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "shipped")}
                      >
                        Mark as Shipped
                      </Button>
                    )}
                    {order.status === "shipped" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "delivered")}
                      >
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || loading}
            >
              &lt;
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages || loading}
            >
              &gt;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

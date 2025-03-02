"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/marketplace-utils";
import { format } from "date-fns";
import Link from "next/link";
import { Eye, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Order {
  id: string;
  productName: string;
  productImage: string | null;
  buyerName: string;
  buyerId: string;
  buyerImage: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface SellerOrdersTableProps {
  orders: Order[];
  isRecent?: boolean;
}

export default function SellerOrdersTable({
  orders,
  isRecent = false,
}: SellerOrdersTableProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
      case "confirmed":
        return "default";
      case "shipped":
        return "outline";
      case "delivered":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders to display
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                #{order.id.substring(0, 8)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {order.productImage ? (
                    <div className="w-8 h-8 rounded overflow-hidden">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                      No img
                    </div>
                  )}
                  <span className="truncate max-w-[120px]">
                    {order.productName}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={order.buyerImage || ""} />
                    <AvatarFallback>
                      {order.buyerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{order.buyerName}</span>
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                  >
                    <Link href={`/marketplace/orders/${order.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                  >
                    <Link href={`/marketplace/chat?initiate=${order.buyerId}&orderId=${order.id}`}>
                      <MessageCircle className="h-4 w-4" />
                      <span className="sr-only">Chat</span>
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {isRecent && orders.length > 0 && (
        <div className="p-4 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace/seller/orders">View All Orders</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

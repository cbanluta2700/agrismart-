import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const updateOrderStatusSchema = z.object({
  status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]),
});

// Helper function to check if user is part of the order
async function getUserOrderRole(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { buyerId: true, sellerId: true },
  });
  
  if (!order) return null;
  
  if (order.buyerId === userId) return "buyer";
  if (order.sellerId === userId) return "seller";
  
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const orderId = params.id;
    
    // Check if user is part of the order
    const userRole = await getUserOrderRole(orderId, userId);
    
    if (!userRole) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    
    return NextResponse.json(
      { message: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const orderId = params.id;
    
    // Check if user is part of the order
    const userRole = await getUserOrderRole(orderId, userId);
    
    if (!userRole) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    const validatedData = updateOrderStatusSchema.parse(data);
    
    // Get current order status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, buyerId: true, sellerId: true },
    });
    
    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    // Check permissions based on requested status update
    if (validatedData.status === "cancelled") {
      // Both buyer and seller can cancel, but only in certain statuses
      if (!["pending", "confirmed"].includes(order.status)) {
        return NextResponse.json(
          { message: "Cannot cancel order in current status" },
          { status: 400 }
        );
      }
    } else {
      // Only seller can update to confirmed, shipped, delivered
      if (userRole !== "seller") {
        return NextResponse.json(
          { message: "Only sellers can update order status" },
          { status: 403 }
        );
      }
      
      // Check valid transitions
      const validTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["shipped", "cancelled"],
        shipped: ["delivered", "cancelled"],
        delivered: [],
        cancelled: [],
      };
      
      if (!validTransitions[order.status].includes(validatedData.status)) {
        return NextResponse.json(
          { message: `Cannot transition from ${order.status} to ${validatedData.status}` },
          { status: 400 }
        );
      }
    }
    
    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: validatedData.status },
      include: {
        product: true,
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // If order is cancelled, make product available again
    if (validatedData.status === "cancelled") {
      await prisma.product.update({
        where: { id: updatedOrder.productId },
        data: { status: "active" },
      });
    }
    
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Order update error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid order status", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to update order" },
      { status: 500 }
    );
  }
}

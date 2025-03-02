import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createOrderSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  shippingAddress: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().min(1, "Postal code is required"),
  }),
  paymentMethod: z.enum(["credit_card", "bank_transfer", "cash_on_delivery"], {
    required_error: "Please select a payment method",
  }),
});

const orderFilterSchema = z.object({
  status: z.enum(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    
    // Validate query parameters
    const validatedParams = orderFilterSchema.parse({
      status,
      page,
      pageSize,
    });
    
    // Build where conditions
    const where: any = {
      OR: [
        { buyerId: userId },
        { "product.sellerId": userId },
      ],
    };
    
    if (validatedParams.status && validatedParams.status !== "all") {
      where.status = validatedParams.status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Execute query
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
              seller: {
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
        },
      }),
      prisma.order.count({ where }),
    ]);
    
    return NextResponse.json({
      items: orders,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Order listing error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const data = await request.json();
    
    const validatedData = createOrderSchema.parse(data);
    
    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId },
      select: {
        id: true,
        name: true,
        price: true,
        sellerId: true,
        status: true,
      },
    });
    
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }
    
    // Check if product is available
    if (product.status !== "active") {
      return NextResponse.json(
        { message: "Product is not available for purchase" },
        { status: 400 }
      );
    }
    
    // Prevent self-purchase
    if (product.sellerId === userId) {
      return NextResponse.json(
        { message: "You cannot purchase your own product" },
        { status: 400 }
      );
    }
    
    // Calculate total price
    const totalPrice = product.price * validatedData.quantity;
    
    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: product.sellerId,
        product: {
          connect: { id: product.id },
        },
        quantity: validatedData.quantity,
        totalAmount: {
          amount: totalPrice,
          currency: "USD", // Default currency
        },
        shippingAddress: validatedData.shippingAddress,
        paymentMethod: validatedData.paymentMethod,
        status: "pending",
        paymentStatus: "pending",
      },
      include: {
        product: true,
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Update product status
    await prisma.product.update({
      where: { id: product.id },
      data: { status: "sold" },
    });
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid order data", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to create order" },
      { status: 500 }
    );
  }
}

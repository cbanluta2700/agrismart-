import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const updateProductSchema = z.object({
  name: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  price: z.number().min(0, "Price cannot be negative").optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  condition: z.enum(["new", "used"]).optional(),
  images: z.array(z.string().url()).min(1, "At least one image is required").optional(),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
    address: z.string().min(1, "Address is required"),
  }).optional(),
});

// Helper function to check if user owns the product
async function userOwnsProduct(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true },
  });
  
  return product?.sellerId === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
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
    });
    
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    
    return NextResponse.json(
      { message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const productId = params.id;
    
    // Check if user owns the product
    const isOwner = await userOwnsProduct(productId, userId);
    
    if (!isOwner) {
      return NextResponse.json(
        { message: "You don't have permission to update this product" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    const validatedData = updateProductSchema.parse(data);
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: validatedData,
      include: {
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
    });
    
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Product update error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid product data", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const productId = params.id;
    
    // Check if user owns the product
    const isOwner = await userOwnsProduct(productId, userId);
    
    if (!isOwner) {
      return NextResponse.json(
        { message: "You don't have permission to delete this product" },
        { status: 403 }
      );
    }
    
    await prisma.product.delete({
      where: { id: productId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product deletion error:", error);
    
    return NextResponse.json(
      { message: "Failed to delete product" },
      { status: 500 }
    );
  }
}

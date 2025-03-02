import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseQueryString } from "@/lib/utils";

const createProductSchema = z.object({
  name: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().min(0, "Price cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
  condition: z.enum(["new", "used"], {
    required_error: "Please select a condition",
  }),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
    address: z.string().min(1, "Address is required"),
  }),
});

const productFilterSchema = z.object({
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
  condition: z.enum(["new", "used", "all"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  sortBy: z.enum(["price", "date", "distance", "relevance"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = parseQueryString(searchParams);
    
    const validatedParams = productFilterSchema.parse(queryParams);
    
    // Build where conditions
    const where: any = {};
    
    if (validatedParams.search) {
      where.OR = [
        { name: { contains: validatedParams.search, mode: 'insensitive' } },
        { description: { contains: validatedParams.search, mode: 'insensitive' } }
      ];
    }
    
    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId;
    }
    
    if (validatedParams.sellerId) {
      where.sellerId = validatedParams.sellerId;
    }
    
    if (validatedParams.condition && validatedParams.condition !== 'all') {
      where.condition = validatedParams.condition;
    }
    
    if (validatedParams.minPrice || validatedParams.maxPrice) {
      where.price = {};
      if (validatedParams.minPrice) where.price.gte = validatedParams.minPrice;
      if (validatedParams.maxPrice) where.price.lte = validatedParams.maxPrice;
    }
    
    // Handle pagination
    const page = validatedParams.page || 1;
    const pageSize = validatedParams.pageSize || 20;
    const skip = (page - 1) * pageSize;
    
    // Handle sorting
    const orderBy: any = {};
    if (validatedParams.sortBy === 'price') {
      orderBy.price = validatedParams.sortOrder || 'asc';
    } else if (validatedParams.sortBy === 'date') {
      orderBy.createdAt = validatedParams.sortOrder || 'desc';
    } else {
      // Default sorting
      orderBy.createdAt = 'desc';
    }
    
    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
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
      }),
      prisma.product.count({ where }),
    ]);
    
    return NextResponse.json({
      items: products,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Product search error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to fetch products" },
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
    
    // Check if user is verified seller
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    
    if (!user?.roles.includes("SELLER")) {
      return NextResponse.json(
        { message: "You must be a verified seller to create products" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    const validatedData = createProductSchema.parse(data);
    
    const product = await prisma.product.create({
      data: {
        ...validatedData,
        sellerId: userId,
      },
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
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid product data", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to create product" },
      { status: 500 }
    );
  }
}

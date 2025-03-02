import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    
    return NextResponse.json(
      { message: "Failed to fetch categories" },
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
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles.includes("ADMIN")) {
      return NextResponse.json(
        { message: "Only administrators can create categories" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    const validatedData = createCategorySchema.parse(data);
    
    // Check if category with same name already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: validatedData.name, mode: "insensitive" } },
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { message: "A category with this name already exists" },
        { status: 400 }
      );
    }
    
    const category = await prisma.category.create({
      data: validatedData,
    });
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid category data", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to create category" },
      { status: 500 }
    );
  }
}

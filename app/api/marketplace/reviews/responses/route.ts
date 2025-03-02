import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review response creation
const createResponseSchema = z.object({
  reviewId: z.string().uuid(),
  content: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await req.json();
    
    // Validate request body
    const validationResult = createResponseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { reviewId, content } = validationResult.data;
    
    // Check if review exists
    const review = await db.marketplaceReview.findUnique({
      where: {
        id: reviewId,
      },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    });
    
    if (!review) {
      return NextResponse.json(
        { message: "Review not found" },
        { status: 404 }
      );
    }
    
    // Check if user is the seller or the reviewer
    const isSeller = review.product.sellerId === userId;
    const isReviewer = review.userId === userId;
    
    if (!isSeller && !isReviewer) {
      return NextResponse.json(
        { message: "You don't have permission to respond to this review" },
        { status: 403 }
      );
    }
    
    // Create the response
    const response = await db.marketplaceReviewResponse.create({
      data: {
        reviewId,
        userId,
        content,
      },
    });
    
    return NextResponse.json({
      message: "Response submitted successfully",
      response,
    });
  } catch (error) {
    console.error("Error creating review response:", error);
    return NextResponse.json(
      { message: "An error occurred while submitting your response" },
      { status: 500 }
    );
  }
}

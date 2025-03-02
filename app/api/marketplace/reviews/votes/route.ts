import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review vote
const reviewVoteSchema = z.object({
  reviewId: z.string().uuid(),
  isHelpful: z.boolean(),
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
    const validationResult = reviewVoteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { reviewId, isHelpful } = validationResult.data;
    
    // Check if review exists
    const review = await db.marketplaceReview.findUnique({
      where: {
        id: reviewId,
      },
    });
    
    if (!review) {
      return NextResponse.json(
        { message: "Review not found" },
        { status: 404 }
      );
    }
    
    // Check if user has already voted on this review
    const existingVote = await db.marketplaceReviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });
    
    if (existingVote) {
      // Update existing vote
      const updatedVote = await db.marketplaceReviewVote.update({
        where: {
          id: existingVote.id,
        },
        data: {
          isHelpful,
        },
      });
      
      return NextResponse.json({
        message: "Vote updated successfully",
        vote: updatedVote,
      });
    }
    
    // Create new vote
    const vote = await db.marketplaceReviewVote.create({
      data: {
        reviewId,
        userId,
        isHelpful,
      },
    });
    
    return NextResponse.json({
      message: "Vote submitted successfully",
      vote,
    });
  } catch (error) {
    console.error("Error processing review vote:", error);
    return NextResponse.json(
      { message: "An error occurred while processing your vote" },
      { status: 500 }
    );
  }
}

// Delete a vote
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("reviewId");
    
    if (!reviewId) {
      return NextResponse.json(
        { message: "Review ID is required" },
        { status: 400 }
      );
    }
    
    // Delete the vote
    await db.marketplaceReviewVote.deleteMany({
      where: {
        reviewId,
        userId,
      },
    });
    
    return NextResponse.json({
      message: "Vote removed successfully",
    });
  } catch (error) {
    console.error("Error removing review vote:", error);
    return NextResponse.json(
      { message: "An error occurred while removing your vote" },
      { status: 500 }
    );
  }
}

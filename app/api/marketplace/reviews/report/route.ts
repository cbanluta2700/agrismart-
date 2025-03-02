import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review reporting
const reportReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(["spam", "offensive", "irrelevant", "misleading", "other"]),
  description: z.string().optional(),
});

/**
 * POST /api/marketplace/reviews/report
 * Report a review for moderation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Validate input
    const validationResult = reportReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { reviewId, reason, description } = validationResult.data;
    
    // Check if review exists
    const review = await db.marketplaceReview.findUnique({
      where: { id: reviewId },
    });
    
    if (!review) {
      return NextResponse.json(
        { message: "Review not found" },
        { status: 404 }
      );
    }
    
    // Check if user has already reported this review
    const existingReport = await db.marketplaceReviewReport.findFirst({
      where: {
        reviewId,
        reporterId: session.user.id,
        status: { not: "dismissed" }, // Allow re-reporting if previous report was dismissed
      },
    });
    
    if (existingReport) {
      return NextResponse.json(
        { message: "You have already reported this review" },
        { status: 400 }
      );
    }
    
    // Create report
    await db.marketplaceReviewReport.create({
      data: {
        reviewId,
        reporterId: session.user.id,
        reason,
        description,
      },
    });
    
    // Update review report count and change status if this is a first report
    await db.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        reportCount: { increment: 1 },
        // If reports reach threshold, change status to flagged for moderation
        status: { set: "flagged" },
        moderationStatus: { set: "pending" }
      },
    });
    
    return NextResponse.json(
      { message: "Review reported successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[REVIEW_REPORT_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to report review" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/reviews/report
 * Get all reports for a review (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles?.includes("ADMIN")) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }
    
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("reviewId");
    const status = url.searchParams.get("status") || undefined;
    
    // If reviewId is provided, get reports for that specific review
    if (reviewId) {
      const reports = await db.marketplaceReviewReport.findMany({
        where: {
          reviewId,
          status: status as any,
        },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      
      return NextResponse.json({ reports }, { status: 200 });
    }
    
    // Otherwise get all reports, possibly filtered by status
    const reports = await db.marketplaceReviewReport.findMany({
      where: {
        status: status as any,
      },
      include: {
        review: true,
        reporter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to prevent excessive data
    });
    
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("[REVIEW_REPORTS_GET_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to fetch review reports" },
      { status: 500 }
    );
  }
}

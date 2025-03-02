import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review moderation
const moderateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(["approve", "reject", "hide"]),
  reason: z.string().optional(),
  updateReports: z.boolean().default(true),
});

/**
 * POST /api/marketplace/reviews/moderate
 * Moderate a review (admin only)
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
    
    const body = await req.json();
    
    // Validate input
    const validationResult = moderateReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { reviewId, action, reason, updateReports } = validationResult.data;
    
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
    
    // Determine new status and moderation status based on action
    let newStatus = review.status;
    let newModerationStatus = "pending";
    
    if (action === "approve") {
      newStatus = "published";
      newModerationStatus = "approved";
    } else if (action === "reject" || action === "hide") {
      newStatus = "hidden";
      newModerationStatus = action === "reject" ? "rejected" : "approved";
    }
    
    // Update review
    await db.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
        moderationStatus: newModerationStatus,
        moderationReason: reason,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
      },
    });
    
    // If requested, update any pending reports for this review
    if (updateReports) {
      await db.marketplaceReviewReport.updateMany({
        where: {
          reviewId,
          status: "pending",
        },
        data: {
          status: "resolved",
          resolvedBy: session.user.id,
          resolvedAt: new Date(),
        },
      });
    }
    
    return NextResponse.json(
      { message: `Review ${action}ed successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[REVIEW_MODERATE_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to moderate review" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/reviews/moderate
 * Get reviews that need moderation (admin only)
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
    const status = url.searchParams.get("status");
    const take = parseInt(url.searchParams.get("limit") || "20", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    
    // Construct filter based on moderation status
    let filter: any = {};
    
    if (status === "pending") {
      filter = {
        OR: [
          { moderationStatus: "pending" },
          { 
            moderationStatus: null,
            status: "flagged", 
          },
          {
            isAutomatedlyFlagged: true,
            moderationStatus: { not: "approved" }
          }
        ]
      };
    } else if (status === "approved") {
      filter = { moderationStatus: "approved" };
    } else if (status === "rejected") {
      filter = { moderationStatus: "rejected" };
    } else if (status === "flagged") {
      filter = { status: "flagged" };
    } else if (status === "all") {
      // No additional filter
    } else {
      // Default to pending reviews that need attention
      filter = {
        OR: [
          { moderationStatus: "pending" },
          { status: "flagged" },
          { isAutomatedlyFlagged: true }
        ]
      };
    }
    
    // Get reviews needing moderation
    const reviews = await db.marketplaceReview.findMany({
      where: filter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        reports: {
          select: {
            id: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true,
            reporter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            status: "pending"
          }
        },
        _count: {
          select: {
            reports: true,
          },
        },
      },
      orderBy: [
        { reportCount: "desc" },
        { createdAt: "desc" }
      ],
      take,
      skip,
    });
    
    // Get total count for pagination
    const totalCount = await db.marketplaceReview.count({
      where: filter,
    });
    
    return NextResponse.json({
      reviews,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / take),
        currentPage: Math.floor(skip / take) + 1,
        pageSize: take,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("[REVIEW_MODERATION_LIST_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to fetch reviews for moderation" },
      { status: 500 }
    );
  }
}

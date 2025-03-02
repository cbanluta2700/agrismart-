import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

/**
 * API route to get reviews for moderation
 * GET /api/marketplace/reviews/moderation?status=pending&take=10&skip=0
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles?.includes("ADMIN")) {
      return NextResponse.json(
        { error: "Not authorized. Admin role required" },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";
    const take = parseInt(url.searchParams.get("take") || "10", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    
    // Construct where condition based on status
    let whereCondition: any = {};
    
    if (status === "pending") {
      whereCondition = {
        moderationStatus: "pending",
        OR: [
          { reportCount: { gt: 0 } },
          { automaticallyFlagged: true }
        ]
      };
    } else if (status === "flagged") {
      whereCondition = {
        OR: [
          { reportCount: { gt: 0 } },
          { automaticallyFlagged: true }
        ]
      };
    } else if (status !== "all") {
      whereCondition = {
        moderationStatus: status
      };
    }
    
    // Get total count for pagination
    const total = await db.marketplaceReview.count({
      where: whereCondition
    });
    
    // Get reviews with related data
    const reviews = await db.marketplaceReview.findMany({
      where: whereCondition,
      take,
      skip,
      orderBy: [
        // Order by report count (highest first) then creation date (newest first)
        { reportCount: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        reports: {
          take: 5, // Include a few reports for context
          orderBy: { createdAt: "desc" },
          include: {
            reportedBy: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            reports: true,
          }
        }
      }
    });
    
    // Calculate pagination data
    const pages = Math.ceil(total / take);
    const currentPage = Math.floor(skip / take) + 1;
    
    return NextResponse.json({
      reviews,
      pagination: {
        total,
        pages,
        currentPage,
        pageSize: take
      }
    });
  } catch (error) {
    console.error("[GET_REVIEWS_FOR_MODERATION_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews for moderation" },
      { status: 500 }
    );
  }
}

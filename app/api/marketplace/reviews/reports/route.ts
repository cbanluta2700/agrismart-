import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

/**
 * API route to get reports for a specific review
 * GET /api/marketplace/reviews/reports?reviewId=<reviewId>&take=10&skip=0
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
    const reviewId = url.searchParams.get("reviewId");
    const take = parseInt(url.searchParams.get("take") || "10", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    
    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }
    
    // Get total count for pagination
    const total = await db.marketplaceReviewReport.count({
      where: { reviewId }
    });
    
    // Get reports with related data
    const reports = await db.marketplaceReviewReport.findMany({
      where: { reviewId },
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        review: {
          select: {
            id: true,
            content: true,
            rating: true,
            productId: true,
            product: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    });
    
    // Calculate pagination data
    const pages = Math.ceil(total / take);
    const currentPage = Math.floor(skip / take) + 1;
    
    return NextResponse.json({
      reports,
      pagination: {
        total,
        pages,
        currentPage,
        pageSize: take
      }
    });
  } catch (error) {
    console.error("[GET_REVIEW_REPORTS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch review reports" },
      { status: 500 }
    );
  }
}

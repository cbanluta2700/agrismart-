import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

/**
 * API for tracking search analytics and user interactions with search results
 * POST /api/marketplace/search/analytics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Get the request body
    const body = await req.json();
    const {
      query,
      action,
      productId,
      categoryId,
      sellerId,
      resultsCount,
      position,
      filters,
    } = body;
    
    // Create a record in the SearchAnalytics table
    // Note: You would need to create this model in your Prisma schema
    await db.searchAnalytics.create({
      data: {
        query,
        action,
        userId: userId || null,
        productId: productId || null,
        categoryId: categoryId || null,
        sellerId: sellerId || null,
        resultsCount: resultsCount || null,
        position: position || null,
        filters: filters ? JSON.stringify(filters) : null,
        ip: req.headers.get("x-forwarded-for") || null,
        userAgent: req.headers.get("user-agent") || null,
        timestamp: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEARCH_ANALYTICS_ERROR]", error);
    // Don't break the user experience if analytics fails
    return NextResponse.json({ success: false });
  }
}

/**
 * Get popular search terms for admins
 * GET /api/marketplace/search/analytics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles?.includes("ADMIN")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    // Get date for filtering by time period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get the most popular search terms within the time period
    const popularSearches = await db.$queryRaw`
      SELECT 
        query, 
        COUNT(*) as count,
        COUNT(DISTINCT userId) as uniqueUsers
      FROM SearchAnalytics
      WHERE timestamp >= ${startDate}
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    
    // Get the searches with zero results
    const zeroResultSearches = await db.$queryRaw`
      SELECT 
        query, 
        COUNT(*) as count
      FROM SearchAnalytics
      WHERE 
        timestamp >= ${startDate} AND
        resultsCount = 0
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    
    // Get the most clicked products from search
    const popularProducts = await db.$queryRaw`
      SELECT 
        p.id,
        p.title,
        COUNT(*) as count
      FROM SearchAnalytics sa
      JOIN MarketplaceProduct p ON sa.productId = p.id
      WHERE 
        sa.timestamp >= ${startDate} AND
        sa.action = 'click'
      GROUP BY p.id, p.title
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    
    return NextResponse.json({
      popularSearches,
      zeroResultSearches,
      popularProducts,
    });
  } catch (error) {
    console.error("[SEARCH_ANALYTICS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve search analytics" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Search suggestions API for autocomplete functionality
 * GET /api/marketplace/search/suggestions?query=app
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    
    // If query is empty or too short, return empty results
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }
    
    // Get product title suggestions
    const productSuggestions = await db.marketplaceProduct.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
        isActive: true,
        approved: true,
      },
      select: {
        title: true,
      },
      distinct: ["title"],
      take: 5,
    });
    
    // Get category suggestions
    const categorySuggestions = await db.marketplaceCategory.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
      take: 3,
    });
    
    // Get seller suggestions
    const sellerSuggestions = await db.user.findMany({
      where: {
        isSeller: true,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
      take: 3,
    });
    
    // Get keyword suggestions from previous searches
    // In a production system, you might have a SearchQuery model to track popular searches
    // For now, we'll just return placeholder suggestions
    
    // Format and categorize the suggestions
    const suggestions = [
      ...productSuggestions.map(p => ({
        text: p.title,
        type: "product" as const,
      })),
      ...categorySuggestions.map(c => ({
        text: c.name,
        type: "category" as const,
      })),
      ...sellerSuggestions.map(s => ({
        text: s.name,
        type: "seller" as const,
      })),
      // Add common completions for the query
      // In a real app, these would come from analytics or a dedicated suggestion system
      ...(query.length >= 3 ? [
        { text: `${query} organic`, type: "completion" as const },
        { text: `${query} premium`, type: "completion" as const },
      ] : []),
    ];
    
    // Remove duplicates and limit to 10 suggestions
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(item => [item.text, item])).values()
    ).slice(0, 10);
    
    // Track the search query for analytics (in a real app)
    // This would log to a database or analytics service
    
    return NextResponse.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error("[SEARCH_SUGGESTIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get search suggestions" },
      { status: 500 }
    );
  }
}

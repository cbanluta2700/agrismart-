import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import prisma from "@/lib/prisma";
import { removeStopWords } from "@/lib/search/stopwords";
import { expandQueryWithSynonyms } from "@/lib/search/synonym-matching";
import { applyTypoTolerance } from "@/lib/search/typo-tolerance";

// Helper to get search relevance settings
async function getSearchRelevanceSettings() {
  const settings = await prisma.setting.findFirst({
    where: {
      key: "search_relevance",
    },
  });
  
  if (!settings) {
    return {
      titleWeight: 1.5,
      descriptionWeight: 1.0,
      categoryWeight: 1.2,
      attributesWeight: 1.0,
      sellerWeight: 0.8,
      priceWeight: 0.6,
      ratingWeight: 0.7,
      enableSynonyms: true,
      enableTypoTolerance: true,
      enableStopwords: true,
    };
  }
  
  return JSON.parse(settings.value);
}

/**
 * Advanced search API with support for full-text search, faceted filtering, and sorting
 * GET /api/marketplace/search?query=keyword&category=id&minPrice=num&maxPrice=num&attributes=...&page=1&pageSize=20&sort=relevance
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract search parameters
    const query = searchParams.get("query") || "";
    const categoryId = searchParams.get("category");
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const sortBy = searchParams.get("sort") || "relevance";
    
    // Get relevance settings
    const relevanceSettings = await getSearchRelevanceSettings();
    
    // Apply search enhancements to the query
    let enhancedQuery = query;
    
    // Apply stopwords filtering if enabled
    if (relevanceSettings.enableStopwords && query.trim().length > 0) {
      enhancedQuery = await removeStopWords(query);
    }
    
    // Expand query with synonyms if enabled
    let synonymsExpanded = query;
    if (relevanceSettings.enableSynonyms && query.trim().length > 0) {
      synonymsExpanded = await expandQueryWithSynonyms(query);
    }
    
    // Handle attribute filtering (format: attributes=attr1:value1,attr2:value2)
    const attributes = searchParams.get("attributes");
    const attributeFilters: Record<string, string[]> = {};
    
    if (attributes) {
      const attributePairs = attributes.split(",");
      attributePairs.forEach(pair => {
        const [key, value] = pair.split(":");
        if (key && value) {
          if (!attributeFilters[key]) {
            attributeFilters[key] = [];
          }
          attributeFilters[key].push(value);
        }
      });
    }
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Build the where clause for prisma
    const where: any = {
      // Ensure product is active and approved
      isActive: true,
      approved: true,
    };
    
    // Store product IDs that match via typo tolerance for later filtering
    let typoMatchedProductIds: string[] = [];
    
    // Apply typo tolerance if enabled and query has content
    if (relevanceSettings.enableTypoTolerance && query.trim().length > 0) {
      // Get all products for typo matching
      const allProducts = await db.marketplaceProduct.findMany({
        where: {
          isActive: true,
          approved: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
        },
      });
      
      // Apply typo tolerance
      typoMatchedProductIds = applyTypoTolerance(
        query,
        allProducts.map(p => ({ 
          id: p.id, 
          text: `${p.title} ${p.description || ''}` 
        }))
      );
    }
    
    // Add full-text search if query is provided
    if (query && query.trim().length > 0) {
      where.OR = [
        {
          title: {
            search: enhancedQuery,
            mode: "insensitive",
          },
        },
        {
          description: {
            search: enhancedQuery,
            mode: "insensitive",
          },
        },
        {
          seller: {
            name: {
              contains: enhancedQuery,
              mode: "insensitive",
            },
          },
        },
      ];
      
      // Add synonym matching
      if (relevanceSettings.enableSynonyms && synonymsExpanded !== query) {
        where.OR.push({
          title: {
            search: synonymsExpanded,
            mode: "insensitive",
          },
        });
        
        where.OR.push({
          description: {
            search: synonymsExpanded,
            mode: "insensitive",
          },
        });
      }
      
      // Add typo tolerance results if any were found
      if (relevanceSettings.enableTypoTolerance && typoMatchedProductIds.length > 0) {
        where.OR.push({
          id: {
            in: typoMatchedProductIds
          }
        });
      }
    }
    
    // Add category filter if provided
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    // Add price range filter if provided
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }
    
    // Add attribute filters if provided
    if (Object.keys(attributeFilters).length > 0) {
      // This assumes attributes are stored as a JSON field in the Product model
      where.attributes = {
        path: "$",
        array_contains: attributeFilters,
      };
    }
    
    // Determine sort order
    let orderBy: any = {};
    
    switch (sortBy) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "rating":
        orderBy = { averageRating: "desc" };
        break;
      case "relevance":
      default:
        // For relevance sorting, we'll use a custom algorithm
        // For now, we'll default to newest as a fallback
        if (!query || query.trim().length === 0) {
          orderBy = { createdAt: "desc" };
        } else {
          // For real relevance ordering, we'd use a more sophisticated approach
          // This is a simplified version giving preference to title matches
          orderBy = [
            {
              title: {
                contains: query ? "desc" : "asc",
              },
            },
            { averageRating: "desc" },
            { totalReviews: "desc" },
            { createdAt: "desc" },
          ];
        }
        break;
    }
    
    // Execute the query
    const products = await db.marketplaceProduct.findMany({
      where,
      include: {
        category: true,
        images: true,
        seller: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    });
    
    // Count total results for pagination
    const totalResults = await db.marketplaceProduct.count({ where });
    
    // Get available categories for faceted navigation
    const categories = await db.marketplaceCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where,
            },
          },
        },
      },
    });
    
    // Get price range for the current query
    const priceRange = await db.marketplaceProduct.aggregate({
      where,
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
    });
    
    // Calculate facets for filtering
    const facets = {
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        count: cat._count.products,
      })),
      priceRange: {
        min: priceRange._min.price || 0,
        max: priceRange._max.price || 0,
      },
      // In a real implementation, you would add more facets here based on your data model
    };
    
    // Log search analytics
    try {
      await prisma.searchAnalytics.create({
        data: {
          query: query,
          action: "search",
          resultsCount: totalResults,
          timestamp: new Date(),
        },
      });
    } catch (analyticsError) {
      console.error("[SEARCH_ANALYTICS_ERROR]", analyticsError);
      // Don't fail the search if analytics logging fails
    }
    
    return NextResponse.json({
      products: products.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        discount: product.discount,
        averageRating: product.averageRating,
        totalReviews: product.totalReviews,
        images: product.images.map(img => img.url),
        seller: product.seller,
        category: product.category,
        createdAt: product.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalResults / pageSize),
        totalResults,
      },
      facets,
      searchInfo: {
        originalQuery: query,
        enhancedQuery: enhancedQuery !== query ? enhancedQuery : undefined,
        synonymsExpanded: synonymsExpanded !== query ? synonymsExpanded : undefined,
        typoMatches: typoMatchedProductIds.length > 0 ? typoMatchedProductIds.length : undefined,
      }
    });
  } catch (error) {
    console.error("[SEARCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

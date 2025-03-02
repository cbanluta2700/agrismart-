import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") || "4");

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Find the product
    const product = await db.marketplaceProduct.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // First check for pre-computed similar product recommendations
    const precomputedRecommendations = await db.productRecommendation.findMany({
      where: {
        sourceProductId: productId,
        type: "similar"
      },
      orderBy: { score: "desc" },
      take: limit,
      include: {
        recommendedProduct: {
          include: {
            category: true,
            seller: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          }
        }
      }
    });

    if (precomputedRecommendations.length > 0) {
      return NextResponse.json({
        recommendations: precomputedRecommendations.map(rec => rec.recommendedProduct)
      });
    }

    // If no pre-computed recommendations, find similar products based on category and price range
    const priceLowerBound = product.price * 0.7;  // 70% of the price
    const priceUpperBound = product.price * 1.3;  // 130% of the price

    const similarProducts = await db.marketplaceProduct.findMany({
      where: {
        id: { not: productId },
        categoryId: product.categoryId,
        price: {
          gte: priceLowerBound,
          lte: priceUpperBound
        },
        status: "active"
      },
      orderBy: [
        // Products with more similar price first
        {
          price: {
            sort: "asc",
            // In Prisma you can't directly sort by the absolute difference
            // So we'll get products ordered by price and take the closest ones later
          }
        }
      ],
      take: limit * 2, // Get more than needed to find best matches
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      }
    });

    // Sort by price similarity and get top matches
    const sortedProducts = [...similarProducts].sort((a, b) => {
      const aPriceDiff = Math.abs(a.price - product.price);
      const bPriceDiff = Math.abs(b.price - product.price);
      return aPriceDiff - bPriceDiff;
    }).slice(0, limit);

    return NextResponse.json({ recommendations: sortedProducts });
  } catch (error) {
    console.error("Error getting similar product recommendations:", error);
    return NextResponse.json({ error: "Failed to get similar products" }, { status: 500 });
  }
}

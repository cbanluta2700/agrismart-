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
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // First try to get pre-computed recommendations
    const recommendations = await db.productRecommendation.findMany({
      where: {
        sourceProductId: productId,
        type: "also_bought"
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

    if (recommendations.length > 0) {
      // Return pre-computed recommendations
      return NextResponse.json({
        recommendations: recommendations.map(rec => rec.recommendedProduct)
      });
    }

    // If no pre-computed recommendations, find products bought by users who also bought this product
    const buyersOfThisProduct = await db.marketplaceOrder.findMany({
      where: { productId },
      select: { buyerId: true },
    });

    const buyerIds = buyersOfThisProduct.map(order => order.buyerId);

    // Find other products bought by these buyers
    const otherProducts = await db.marketplaceOrder.findMany({
      where: {
        buyerId: { in: buyerIds },
        productId: { not: productId }, // Exclude the current product
        product: { status: "active" }, // Only active products
      },
      select: {
        productId: true,
        product: {
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
        },
      },
      take: 100, // Get a good sample size
    });

    // Count occurrences of each product
    const productCounts = otherProducts.reduce((acc, order) => {
      const id = order.productId;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by count and take the top results
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => otherProducts.find(p => p.productId === id)?.product)
      .filter(Boolean);

    return NextResponse.json({ recommendations: topProducts });
  } catch (error) {
    console.error("Error getting also bought recommendations:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}

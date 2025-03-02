import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8");
    const seasonName = searchParams.get("season") || getCurrentSeason();

    // Get products tagged with the current season that are active
    const seasonalProducts = await db.seasonalProduct.findMany({
      where: {
        seasonName,
        // Check if we're within the date range if specified
        ...(seasonName !== "all" && {
          OR: [
            {
              startDate: { lte: new Date() },
              endDate: { gte: new Date() }
            },
            {
              startDate: null,
              endDate: null
            }
          ]
        })
      },
      orderBy: { priority: "desc" },
      take: limit,
      include: {
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
        }
      }
    });

    // Extract the products
    const products = seasonalProducts.map(sp => sp.product);

    // If not enough seasonal products, fill with popular products
    if (products.length < limit) {
      const additionalCount = limit - products.length;
      const existingIds = products.map(p => p.id);
      
      const popularProducts = await db.marketplaceProduct.findMany({
        where: {
          status: "active",
          id: { notIn: existingIds }
        },
        orderBy: {
          orders: { _count: "desc" }
        },
        take: additionalCount,
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
      
      products.push(...popularProducts);
    }

    return NextResponse.json({ recommendations: products });
  } catch (error) {
    console.error("Error getting seasonal recommendations:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}

// Helper function to determine the current season
function getCurrentSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  
  // Special holiday season check (November and December)
  if (month === 11 || month === 12) {
    return "holiday";
  }
  
  // Standard seasons
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get products the user has viewed
    const userViews = await db.userProductView.findMany({
      where: { userId: session.user.id },
      orderBy: { lastViewed: "desc" },
      take: 20, // Consider last 20 views
      include: { product: { select: { categoryId: true } } },
    });

    // Extract category IDs from viewed products
    const categoryIds = [...new Set(userViews.map(view => view.product.categoryId))];

    // Get products from categories the user has viewed, but which they haven't viewed themselves
    const recommendations = await db.marketplaceProduct.findMany({
      where: {
        categoryId: { in: categoryIds },
        status: "active",
        id: {
          notIn: userViews.map(view => view.productId),
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}

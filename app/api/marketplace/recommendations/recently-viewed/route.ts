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
    const limit = parseInt(searchParams.get("limit") || "6");

    // Get recent product views for the user
    const recentViews = await db.userProductView.findMany({
      where: { userId: session.user.id },
      orderBy: { lastViewed: "desc" },
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

    const recommendations = recentViews.map(view => view.product);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error getting recently viewed products:", error);
    return NextResponse.json({ error: "Failed to get recently viewed products" }, { status: 500 });
  }
}

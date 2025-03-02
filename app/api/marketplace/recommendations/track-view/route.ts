import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await req.json();
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

    // Update or create the user product view record
    const userProductView = await db.userProductView.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId,
        },
      },
      update: {
        viewCount: { increment: 1 },
        lastViewed: new Date(),
      },
      create: {
        userId: session.user.id,
        productId: productId,
        viewCount: 1,
      },
    });

    return NextResponse.json({ success: true, userProductView });
  } catch (error) {
    console.error("Error tracking product view:", error);
    return NextResponse.json({ error: "Failed to track product view" }, { status: 500 });
  }
}

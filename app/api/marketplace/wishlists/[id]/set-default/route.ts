import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/marketplace/wishlists/[id]/set-default
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in to access this endpoint" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const wishlistId = params.id;

    // Check if wishlist exists and belongs to the user
    const wishlist = await prisma.wishlist.findUnique({
      where: {
        id: wishlistId,
        userId,
      },
    });

    if (!wishlist) {
      return NextResponse.json(
        { error: "Wishlist not found" },
        { status: 404 }
      );
    }

    // Update all user wishlists to set isDefault to false
    await prisma.wishlist.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set the current wishlist as default
    const updatedWishlist = await prisma.wishlist.update({
      where: {
        id: wishlistId,
      },
      data: {
        isDefault: true,
      },
    });

    return NextResponse.json(updatedWishlist);
  } catch (error) {
    console.error("Error setting wishlist as default:", error);
    return NextResponse.json(
      { error: "Failed to set wishlist as default" },
      { status: 500 }
    );
  }
}

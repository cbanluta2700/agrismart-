import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace/wishlists/[id]/shared
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wishlistId = params.id;

    // Get wishlist with items, ensuring it's public
    const wishlist = await prisma.wishlist.findUnique({
      where: {
        id: wishlistId,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: {
            addedAt: "desc",
          },
        },
      },
    });

    if (!wishlist) {
      return NextResponse.json(
        { error: "Wishlist not found or is not public" },
        { status: 404 }
      );
    }

    return NextResponse.json(wishlist);
  } catch (error) {
    console.error("Error fetching shared wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared wishlist" },
      { status: 500 }
    );
  }
}

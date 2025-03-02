import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Add an item to a wishlist
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const wishlistId = params.id;
    const { productId, notes } = await req.json();
    
    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Check if wishlist exists and belongs to the user
    const wishlist = await db.wishlist.findUnique({
      where: {
        id: wishlistId,
      },
    });
    
    if (!wishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      );
    }
    
    if (wishlist.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if product exists
    const product = await db.marketplaceProduct.findUnique({
      where: {
        id: productId,
      },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Check if item already exists in this wishlist
    const existingItem = await db.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId,
          productId,
        },
      },
    });
    
    if (existingItem) {
      return NextResponse.json(
        { error: 'Item already exists in this wishlist' },
        { status: 409 }
      );
    }
    
    // Add item to wishlist
    const wishlistItem = await db.wishlistItem.create({
      data: {
        wishlistId,
        productId,
        userId,
        notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Update the wishlist's updatedAt
    await db.wishlist.update({
      where: {
        id: wishlistId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(wishlistItem, { status: 201 });
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    return NextResponse.json(
      { error: 'Error adding item to wishlist' },
      { status: 500 }
    );
  }
}

// Get all items in a wishlist
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const wishlistId = params.id;
    
    // Check if wishlist exists
    const wishlist = await db.wishlist.findUnique({
      where: {
        id: wishlistId,
      },
    });
    
    if (!wishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has access to the wishlist
    if (wishlist.userId !== userId && !wishlist.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Fetch wishlist items
    const items = await db.wishlistItem.findMany({
      where: {
        wishlistId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            images: true,
            status: true,
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
        addedAt: 'desc',
      },
    });
    
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    return NextResponse.json(
      { error: 'Error fetching wishlist items' },
      { status: 500 }
    );
  }
}

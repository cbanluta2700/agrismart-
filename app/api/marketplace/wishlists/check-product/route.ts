import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Check if a product is in any of the user's wishlists
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Find all wishlist items for this product and user
    const wishlistItems = await db.wishlistItem.findMany({
      where: {
        userId,
        productId,
      },
      include: {
        wishlist: {
          select: {
            id: true,
            name: true,
            isDefault: true,
          },
        },
      },
    });
    
    // Return wishlist information if product is saved
    if (wishlistItems.length > 0) {
      return NextResponse.json({
        inWishlists: true,
        wishlists: wishlistItems.map(item => ({
          wishlistId: item.wishlistId,
          wishlistName: item.wishlist.name,
          isDefault: item.wishlist.isDefault,
          itemId: item.id,
        })),
      });
    }
    
    // Product is not in any wishlists
    return NextResponse.json({
      inWishlists: false,
      wishlists: [],
    });
  } catch (error) {
    console.error('Error checking product in wishlists:', error);
    return NextResponse.json(
      { error: 'Error checking product in wishlists' },
      { status: 500 }
    );
  }
}

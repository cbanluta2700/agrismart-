import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Get a specific wishlist item
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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
    const { id: wishlistId, itemId } = params;
    
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
    
    // Fetch the wishlist item
    const item = await db.wishlistItem.findUnique({
      where: {
        id: itemId,
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
    });
    
    if (!item || item.wishlistId !== wishlistId) {
      return NextResponse.json(
        { error: 'Item not found in this wishlist' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching wishlist item:', error);
    return NextResponse.json(
      { error: 'Error fetching wishlist item' },
      { status: 500 }
    );
  }
}

// Update a wishlist item (notes only for now)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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
    const { id: wishlistId, itemId } = params;
    const { notes } = await req.json();
    
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
    
    // Check if item exists and belongs to the wishlist
    const item = await db.wishlistItem.findUnique({
      where: {
        id: itemId,
      },
    });
    
    if (!item || item.wishlistId !== wishlistId) {
      return NextResponse.json(
        { error: 'Item not found in this wishlist' },
        { status: 404 }
      );
    }
    
    // Update the item
    const updatedItem = await db.wishlistItem.update({
      where: {
        id: itemId,
      },
      data: {
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
      },
    });
    
    // Update the wishlist's updatedAt timestamp
    await db.wishlist.update({
      where: {
        id: wishlistId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    return NextResponse.json(
      { error: 'Error updating wishlist item' },
      { status: 500 }
    );
  }
}

// Delete a wishlist item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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
    const { id: wishlistId, itemId } = params;
    
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
    
    // Check if item exists and belongs to the wishlist
    const item = await db.wishlistItem.findUnique({
      where: {
        id: itemId,
      },
    });
    
    if (!item || item.wishlistId !== wishlistId) {
      return NextResponse.json(
        { error: 'Item not found in this wishlist' },
        { status: 404 }
      );
    }
    
    // Delete the item
    await db.wishlistItem.delete({
      where: {
        id: itemId,
      },
    });
    
    // Update the wishlist's updatedAt timestamp
    await db.wishlist.update({
      where: {
        id: wishlistId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    return NextResponse.json(
      { error: 'Error deleting wishlist item' },
      { status: 500 }
    );
  }
}

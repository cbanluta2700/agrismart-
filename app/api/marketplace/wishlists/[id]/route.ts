import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Get a specific wishlist by ID
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
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const includeItems = searchParams.get('includeItems') !== 'false'; // Default to true
    
    // Fetch the wishlist
    const wishlist = await db.wishlist.findUnique({
      where: {
        id: wishlistId,
      },
      include: {
        items: includeItems ? {
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
        } : false,
      },
    });
    
    if (!wishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has access to this wishlist
    if (wishlist.userId !== userId && !wishlist.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Error fetching wishlist' },
      { status: 500 }
    );
  }
}

// Update a wishlist
export async function PUT(
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
    const { name, description, isPublic } = await req.json();
    
    // Check if wishlist exists and belongs to the user
    const existingWishlist = await db.wishlist.findUnique({
      where: {
        id: wishlistId,
      },
    });
    
    if (!existingWishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      );
    }
    
    if (existingWishlist.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // If the name is changing, check if the new name already exists
    if (name && name !== existingWishlist.name) {
      const nameExists = await db.wishlist.findUnique({
        where: {
          userId_name: {
            userId,
            name,
          },
        },
      });
      
      if (nameExists) {
        return NextResponse.json(
          { error: 'A wishlist with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    // Update the wishlist
    const updatedWishlist = await db.wishlist.update({
      where: {
        id: wishlistId,
      },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(updatedWishlist);
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return NextResponse.json(
      { error: 'Error updating wishlist' },
      { status: 500 }
    );
  }
}

// Delete a wishlist
export async function DELETE(
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
    
    // Check if wishlist exists and belongs to the user
    const existingWishlist = await db.wishlist.findUnique({
      where: {
        id: wishlistId,
      },
    });
    
    if (!existingWishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      );
    }
    
    if (existingWishlist.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Delete the wishlist and all its items (cascade delete will handle items)
    await db.wishlist.delete({
      where: {
        id: wishlistId,
      },
    });
    
    // If this was the default wishlist, set another one as default if available
    if (existingWishlist.isDefault) {
      const anotherWishlist = await db.wishlist.findFirst({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      if (anotherWishlist) {
        await db.wishlist.update({
          where: {
            id: anotherWishlist.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    return NextResponse.json(
      { error: 'Error deleting wishlist' },
      { status: 500 }
    );
  }
}

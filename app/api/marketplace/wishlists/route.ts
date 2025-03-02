import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Get all wishlists for the authenticated user
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
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const includeItems = searchParams.get('includeItems') === 'true';
    
    // Fetch user's wishlists with optional items
    const wishlists = await db.wishlist.findMany({
      where: {
        userId,
      },
      include: {
        items: includeItems ? {
          include: {
            product: {
              select: {
                id: true,
                name: true,
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
        } : false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return NextResponse.json(wishlists);
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return NextResponse.json(
      { error: 'Error fetching wishlists' },
      { status: 500 }
    );
  }
}

// Create a new wishlist
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { name, description, isPublic = false } = await req.json();
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Wishlist name is required' },
        { status: 400 }
      );
    }
    
    // Check if wishlist with the same name already exists for this user
    const existingWishlist = await db.wishlist.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });
    
    if (existingWishlist) {
      return NextResponse.json(
        { error: 'A wishlist with this name already exists' },
        { status: 409 }
      );
    }
    
    // Check if this will be the first wishlist for the user
    const wishlistCount = await db.wishlist.count({
      where: {
        userId,
      },
    });
    
    // Create a new wishlist
    const wishlist = await db.wishlist.create({
      data: {
        userId,
        name,
        description,
        isPublic,
        isDefault: wishlistCount === 0, // Make it default if it's the first one
      },
    });
    
    return NextResponse.json(wishlist, { status: 201 });
  } catch (error) {
    console.error('Error creating wishlist:', error);
    return NextResponse.json(
      { error: 'Error creating wishlist' },
      { status: 500 }
    );
  }
}

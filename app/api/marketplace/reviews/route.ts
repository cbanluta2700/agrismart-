import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review creation
const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(5),
  images: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    const { rating, title, content, images, productId, orderId } = body;
    
    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }
    
    if (!content) {
      return NextResponse.json(
        { message: "Review content is required" },
        { status: 400 }
      );
    }
    
    // Check if we have either productId or orderId
    if (!productId && !orderId) {
      return NextResponse.json(
        { message: "Either Product ID or Order ID is required" },
        { status: 400 }
      );
    }
    
    let product;
    let order;
    
    // If an orderId is provided, fetch the order and get the product from it
    if (orderId) {
      order = await db.marketplaceOrder.findUnique({
        where: {
          id: orderId,
        },
        include: {
          product: true,
        },
      });
      
      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 }
        );
      }
      
      // Verify the user is the buyer of this order
      if (order.buyerId !== session.user.id) {
        return NextResponse.json(
          { message: "You can only review orders you have purchased" },
          { status: 403 }
        );
      }
      
      // Check if the order status is delivered
      if (order.status !== "delivered") {
        return NextResponse.json(
          { message: "You can only review orders that have been delivered" },
          { status: 400 }
        );
      }
      
      // Check if the user has already reviewed this order
      const existingReview = await db.marketplaceReview.findFirst({
        where: {
          orderId,
          userId: session.user.id,
        },
      });
      
      if (existingReview) {
        return NextResponse.json(
          { message: "You have already reviewed this order" },
          { status: 400 }
        );
      }
      
      // Use the product from the order
      product = order.product;
    } else {
      // If only productId is provided, fetch the product
      product = await db.marketplaceProduct.findUnique({
        where: {
          id: productId,
        },
      });
      
      if (!product) {
        return NextResponse.json(
          { message: "Product not found" },
          { status: 404 }
        );
      }
    }
    
    // Create a new review
    const review = await db.marketplaceReview.create({
      data: {
        rating,
        title: title || "",
        content,
        images: images || [],
        product: {
          connect: {
            id: product.id,
          },
        },
        user: {
          connect: {
            id: session.user.id,
          },
        },
        // If we have an order, connect it to the review
        ...(orderId && {
          order: {
            connect: {
              id: orderId,
            },
          },
        }),
        status: "published", // Auto-publish the review
      },
    });
    
    return NextResponse.json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the review" },
      { status: 500 }
    );
  }
}

// Get all reviews for a product
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    const orderId = url.searchParams.get("orderId");
    
    if (!productId && !orderId) {
      return NextResponse.json(
        { message: "Either Product ID or Order ID is required" },
        { status: 400 }
      );
    }
    
    // Filter criteria for the query
    const whereClause: any = {
      status: "published", // Only return published reviews by default
    };
    
    if (productId) {
      whereClause.productId = productId;
    }
    
    if (orderId) {
      whereClause.orderId = orderId;
    }
    
    // Get all reviews based on the filter
    const reviews = await db.marketplaceReview.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        helpfulVotes: {
          select: {
            id: true,
            userId: true,
            isHelpful: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // If we're filtering by orderId, we only need to return the reviews
    if (orderId) {
      return NextResponse.json({
        reviews,
      });
    }
    
    // If we're filtering by productId, calculate the rating stats
    if (productId) {
      // Calculate product rating stats
      const ratingStats = await db.marketplaceReview.groupBy({
        by: ["rating"],
        where: {
          productId,
          status: "published",
        },
        _count: {
          rating: true,
        },
      });
      
      // Format rating stats
      const formattedRatingStats = {
        average: 0,
        total: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
      
      let totalRating = 0;
      let totalCount = 0;
      
      ratingStats.forEach((stat) => {
        const rating = stat.rating;
        const count = stat._count.rating;
        formattedRatingStats.distribution[rating] = count;
        totalRating += rating * count;
        totalCount += count;
      });
      
      formattedRatingStats.average = totalCount > 0 ? totalRating / totalCount : 0;
      formattedRatingStats.total = totalCount;
      
      return NextResponse.json({
        reviews,
        ratingStats: formattedRatingStats,
      });
    }
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching reviews" },
      { status: 500 }
    );
  }
}

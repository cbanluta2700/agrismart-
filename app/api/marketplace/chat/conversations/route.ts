import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

// GET handler to retrieve all conversations for current user
export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get all conversations where the user is a participant
    const conversations = await db.marketplaceConversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    
    // Calculate unread count for each conversation
    const conversationsWithUnreadCount = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await db.marketplaceMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: {
              not: userId,
            },
            readBy: {
              none: {
                userId,
              },
            },
          },
        });
        
        return {
          id: conversation.id,
          participants: conversation.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            image: p.user.image,
          })),
          lastMessage: conversation.messages[0] || null,
          unreadCount,
          productId: conversation.productId,
          orderId: conversation.orderId,
          product: conversation.product,
          order: conversation.order,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      })
    );
    
    return NextResponse.json(conversationsWithUnreadCount);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching conversations" },
      { status: 500 }
    );
  }
}

// Schema for creating a new conversation
const CreateConversationSchema = z.object({
  participantId: z.string(),
  productId: z.string().optional(),
  orderId: z.string().optional(),
});

// POST handler to create a new conversation
export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse request body
    const body = await req.json();
    const validationResult = CreateConversationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Invalid request data",
          errors: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { participantId, productId, orderId } = validationResult.data;
    
    // Prevent creating conversation with self
    if (participantId === userId) {
      return NextResponse.json(
        { message: "Cannot create conversation with yourself" },
        { status: 400 }
      );
    }
    
    // Check if participant exists
    const participant = await db.user.findUnique({
      where: {
        id: participantId,
      },
    });
    
    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      );
    }
    
    // Check if product exists if provided
    if (productId) {
      const product = await db.marketplaceProduct.findUnique({
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
    
    // Check if order exists if provided
    if (orderId) {
      const order = await db.marketplaceOrder.findUnique({
        where: {
          id: orderId,
        },
      });
      
      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 }
        );
      }
    }
    
    // Check if conversation already exists between users
    const existingConversation = await db.marketplaceConversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: participantId,
              },
            },
          },
          {
            productId: productId || null,
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });
    
    if (existingConversation) {
      const unreadCount = await db.marketplaceMessage.count({
        where: {
          conversationId: existingConversation.id,
          senderId: {
            not: userId,
          },
          readBy: {
            none: {
              userId,
            },
          },
        },
      });
      
      return NextResponse.json({
        id: existingConversation.id,
        participants: existingConversation.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
        })),
        unreadCount,
        productId: existingConversation.productId,
        orderId: existingConversation.orderId,
        createdAt: existingConversation.createdAt,
        updatedAt: existingConversation.updatedAt,
      });
    }
    
    // Create new conversation
    const newConversation = await db.marketplaceConversation.create({
      data: {
        productId,
        orderId,
        participants: {
          create: [
            {
              user: {
                connect: {
                  id: userId,
                },
              },
            },
            {
              user: {
                connect: {
                  id: participantId,
                },
              },
            },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      id: newConversation.id,
      participants: newConversation.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
      })),
      unreadCount: 0,
      productId: newConversation.productId,
      orderId: newConversation.orderId,
      product: newConversation.product,
      order: newConversation.order,
      createdAt: newConversation.createdAt,
      updatedAt: newConversation.updatedAt,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { message: "An error occurred while creating conversation" },
      { status: 500 }
    );
  }
}

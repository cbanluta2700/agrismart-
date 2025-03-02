import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

// GET handler to retrieve messages for a specific conversation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const conversationId = params.id;
    
    // Check if conversation exists and user is a participant
    const conversation = await db.marketplaceConversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId,
          },
        },
      },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found or you are not a participant" },
        { status: 404 }
      );
    }
    
    // Get messages for the conversation
    const messages = await db.marketplaceMessage.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        readBy: {
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    // Mark messages as read
    const unreadMessages = messages.filter(
      (message) =>
        message.senderId !== userId &&
        !message.readBy.some((read) => read.userId === userId)
    );
    
    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map((message) =>
          db.marketplaceMessageRead.create({
            data: {
              messageId: message.id,
              userId,
            },
          })
        )
      );
    }
    
    // Format messages for response
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderImage: message.sender.image,
      content: message.content,
      timestamp: message.createdAt,
      read: message.readBy.some((read) => read.userId !== message.senderId),
    }));
    
    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching messages" },
      { status: 500 }
    );
  }
}

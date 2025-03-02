const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const http = require("http");

const prisma = new PrismaClient();

// Create HTTP server
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store user socket connections
const userSockets = new Map();

// Socket middleware to authenticate users
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    
    if (!userId) {
      return next(new Error("Authentication failed"));
    }
    
    // Store user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
    // Attach user ID to socket
    socket.userId = userId;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", async (socket) => {
  console.log(`User ${socket.userId} connected with socket ${socket.id}`);
  
  // Join user to their specific room
  socket.join(`user:${socket.userId}`);
  
  // Handle new messages
  socket.on("marketplace:send_message", async (data) => {
    try {
      const { conversationId, content, tempId } = data;
      
      // Validate data
      if (!conversationId || !content || !socket.userId) {
        socket.emit("marketplace:error", { 
          message: "Invalid message data",
          tempId,
        });
        return;
      }
      
      // Check if user is participant in conversation
      const conversation = await prisma.marketplaceConversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: socket.userId,
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
                },
              },
            },
          },
        },
      });
      
      if (!conversation) {
        socket.emit("marketplace:error", { 
          message: "You are not a participant in this conversation",
          tempId,
        });
        return;
      }
      
      // Create message
      const user = await prisma.user.findUnique({
        where: {
          id: socket.userId,
        },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });
      
      const message = await prisma.marketplaceMessage.create({
        data: {
          content,
          conversation: {
            connect: {
              id: conversationId,
            },
          },
          sender: {
            connect: {
              id: socket.userId,
            },
          },
        },
      });
      
      // Update conversation timestamp
      await prisma.marketplaceConversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      });
      
      // Send to all participants
      const formattedMessage = {
        id: message.id,
        conversationId,
        senderId: user.id,
        senderName: user.name,
        senderImage: user.image,
        content: message.content,
        timestamp: message.createdAt,
        read: false,
        tempId,
      };
      
      // Emit to all participants
      for (const participant of conversation.participants) {
        // Skip sender
        if (participant.userId === socket.userId) continue;
        
        // Get participant sockets
        const participantSockets = userSockets.get(participant.userId);
        if (participantSockets && participantSockets.size > 0) {
          // Emit to all their active sockets
          io.to(Array.from(participantSockets)).emit("marketplace:new_message", formattedMessage);
        }
      }
      
      // Emit back to sender (with the actual ID instead of tempId)
      socket.emit("marketplace:new_message", formattedMessage);
      
      // Update conversation list for all participants
      updateConversationList(conversation.participants.map(p => p.userId));
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("marketplace:error", { 
        message: "Failed to send message",
        tempId: data.tempId,
      });
    }
  });
  
  // Handle marking messages as read
  socket.on("marketplace:mark_read", async (data) => {
    try {
      const { conversationId } = data;
      
      // Validate data
      if (!conversationId || !socket.userId) {
        return;
      }
      
      // Check if user is participant in conversation
      const conversation = await prisma.marketplaceConversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: socket.userId,
            },
          },
        },
        include: {
          participants: {
            select: {
              userId: true,
            },
          },
        },
      });
      
      if (!conversation) {
        return;
      }
      
      // Get unread messages not sent by current user
      const unreadMessages = await prisma.marketplaceMessage.findMany({
        where: {
          conversationId,
          senderId: {
            not: socket.userId,
          },
          NOT: {
            readBy: {
              some: {
                userId: socket.userId,
              },
            },
          },
        },
      });
      
      // Mark messages as read
      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map((message) =>
            prisma.marketplaceMessageRead.create({
              data: {
                message: {
                  connect: {
                    id: message.id,
                  },
                },
                user: {
                  connect: {
                    id: socket.userId,
                  },
                },
              },
            })
          )
        );
        
        // Notify senders that their messages were read
        const senderIds = [...new Set(unreadMessages.map((msg) => msg.senderId))];
        
        for (const senderId of senderIds) {
          const senderMessages = unreadMessages.filter(
            (msg) => msg.senderId === senderId
          );
          
          // Emit to sender if they are online
          const senderSockets = userSockets.get(senderId);
          if (senderSockets && senderSockets.size > 0) {
            for (const messageId of senderMessages.map((msg) => msg.id)) {
              io.to(Array.from(senderSockets)).emit("marketplace:message_read", {
                conversationId,
                messageId,
                readBy: socket.userId,
              });
            }
          }
        }
        
        // Update conversation list for all participants
        updateConversationList(conversation.participants.map(p => p.userId));
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });
  
  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected from socket ${socket.id}`);
    
    // Remove socket from userSockets
    if (socket.userId && userSockets.has(socket.userId)) {
      const userSocketSet = userSockets.get(socket.userId);
      userSocketSet.delete(socket.id);
      
      // If no more sockets, delete the user entry
      if (userSocketSet.size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  });
});

// Helper function to update conversation list for users
async function updateConversationList(userIds) {
  for (const userId of userIds) {
    // Get user sockets
    const userSocketSet = userSockets.get(userId);
    if (!userSocketSet || userSocketSet.size === 0) continue;
    
    try {
      // Get all conversations for the user
      const conversations = await prisma.marketplaceConversation.findMany({
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
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
              readBy: {
                select: {
                  userId: true,
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
        orderBy: {
          updatedAt: "desc",
        },
      });
      
      // Calculate unread count for each conversation
      const conversationsWithUnreadCount = await Promise.all(
        conversations.map(async (conversation) => {
          const unreadCount = await prisma.marketplaceMessage.count({
            where: {
              conversationId: conversation.id,
              senderId: {
                not: userId,
              },
              NOT: {
                readBy: {
                  some: {
                    userId,
                  },
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
            lastMessage: conversation.messages[0]
              ? {
                  id: conversation.messages[0].id,
                  conversationId: conversation.id,
                  senderId: conversation.messages[0].senderId,
                  senderName: conversation.messages[0].sender.name,
                  content: conversation.messages[0].content,
                  timestamp: conversation.messages[0].createdAt,
                  read: conversation.messages[0].readBy.some(
                    (read) => read.userId !== conversation.messages[0].senderId
                  ),
                }
              : null,
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
      
      // Emit to all user sockets
      io.to(Array.from(userSocketSet)).emit(
        "marketplace:conversation_update",
        conversationsWithUnreadCount
      );
    } catch (error) {
      console.error(`Error updating conversation list for user ${userId}:`, error);
    }
  }
}

// Start server
const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});

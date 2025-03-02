# ChatGPT Integration with Google Authentication

This module integrates OpenAI's ChatGPT API with the AgriSmart platform, using the user's own Google account for authentication while providing AgriSmart-specific context and information flow.

## Features

- **Google Authentication**: Users sign in with their Google accounts via NextAuth
- **Context-Aware Conversations**: Automatically injects AgriSmart farm data and user context
- **Conversation Management**: Save, retrieve, and manage chat histories
- **Streaming Responses**: Real-time streaming of ChatGPT responses
- **Controlled Conversation Flow**: AgriSmart controls the context and information provided to ChatGPT

## Implementation Components

### Backend Components

1. **Chat Integration Library (`lib/chat/chat-integration.ts`)**
   - Core functionality for creating, managing, and retrieving chat conversations
   - Handles context injection and OpenAI API interactions
   - Manages conversation storage in Vercel KV

2. **API Routes**
   - `/api/chat`: Main endpoint for chat completion requests
   - `/api/chat/conversations`: Endpoints for managing conversation history
   - `/api/chat/conversations/[conversationId]`: CRUD operations for specific conversations

### Frontend Components

1. **ChatInterface Component**
   - Handles user input and displays conversation
   - Manages streaming responses and error handling
   - Provides options for adding AgriSmart-specific context

2. **ConversationsList Component**
   - Displays conversation history
   - Allows selecting previous conversations
   - Supports creating new conversations

3. **Chat Page**
   - Integrates the chat components
   - Handles routing and conversation selection
   - Provides information about the chat service

## Technical Architecture

The chat system uses a hybrid database architecture:

1. **MongoDB** for conversation storage:
   - Stores all chat messages and conversation metadata
   - Provides scalability for high-volume append-heavy data
   - Independent scaling from the main application database

2. **PostgreSQL** (via Prisma) for user identity and analytics:
   - Maintains user authentication and profiles
   - Tracks usage statistics and metrics
   - Provides a single source of truth for user data

This separation allows the chat system to scale independently as usage grows without impacting the performance of the main marketplace features.

### Database Schema

**MongoDB Collections:**
- `conversations`: Stores conversation content and metadata

**PostgreSQL Tables:**
- `ChatUsage`: Tracks usage statistics for reporting and limits

### Environment Variables

To use the chat system, you'll need to set up the following environment variables:

```
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=agrismart_chat

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## Usage

The chat interface allows users to:
1. Ask questions about agriculture and farming
2. Receive personalized responses based on their farm data
3. View and continue previous conversations
4. Add specific context to conversations (e.g., farm-specific data)

## Data Flow

1. User authenticates with Google account
2. User sends a message through the chat interface
3. Message is sent to the API endpoint with user context
4. Server retrieves additional user-specific data from the database
5. Combined message and context are sent to OpenAI API
6. Response is streamed back to the user
7. Conversation is saved to Vercel KV for future reference

## Privacy and Security

- All chat data is associated with user accounts and not shared with other users
- Conversations are stored in Vercel KV with appropriate encryption
- Users can delete their conversation history at any time
- Google authentication ensures that only verified users can access the chat feature

## Extension Points

The system is designed to be extensible for future features:
- Support for file uploads and document analysis
- Integration with agricultural knowledge bases
- Enhanced context awareness with crop and soil data
- Multi-modal interactions (e.g., image recognition for plant diseases)

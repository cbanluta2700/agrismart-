import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ChatInterface from '../../components/chat/ChatInterface';
import ConversationsList from '../../components/chat/ConversationsList';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: "Chat with AgriSmart AI | AgriSmart",
  description: "Chat with our AI assistant to get help with farming, agriculture, and sustainability questions.",
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: conversationId } = router.query;
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(
    typeof conversationId === 'string' ? conversationId : undefined
  );

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    router.push(`/chat?id=${id}`, undefined, { shallow: true });
  };

  // Handle new conversation
  const handleNewConversation = () => {
    setSelectedConversationId(undefined);
    router.push('/chat', undefined, { shallow: true });
  };

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/api/auth/signin');
    return null;
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Chat with AgriSmart AI | AgriSmart</title>
        <meta name="description" content="Chat with our AI assistant to get help with farming, agriculture, and sustainability questions." />
      </Head>

      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Chat with AgriSmart AI</h1>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/4">
            <ConversationsList
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
            />
          </div>
          
          <div className="md:w-3/4">
            <ChatInterface
              conversationId={selectedConversationId}
              onConversationIdChange={(id) => {
                if (id && id !== selectedConversationId) {
                  setSelectedConversationId(id);
                  router.push(`/chat?id=${id}`, undefined, { shallow: true });
                }
              }}
            />
            
            <Card className="mt-4">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-2">About AgriSmart AI</h3>
                <p className="text-muted-foreground text-sm">
                  AgriSmart AI uses your Google account for authentication while providing personalized
                  assistance with agriculture topics. It can access your farm data from AgriSmart
                  to provide contextual recommendations. All conversations are private and secured.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/privacy-policy', '_blank')}
                  >
                    Privacy Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// Generate static params at build time
export function generateStaticParams() {
  return [{ path: [] }];
}

// Configure dynamic params
export const dynamicParams = true;

// Configure caching behavior
export const revalidate = 0; // Disable caching for real-time updates

// Configure runtime
export const runtime = "edge"; // Use edge runtime for better performance
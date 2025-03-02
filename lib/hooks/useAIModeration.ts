import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface AIModerationOptions {
  /**
   * Sensitivity level for moderation (0-1)
   */
  sensitivityLevel?: number;
  
  /**
   * Categories to check for moderation
   */
  categories?: string[];
  
  /**
   * Content type (for analytics)
   */
  contentType?: 'comment' | 'post' | 'message' | 'profile' | 'other';
  
  /**
   * Whether to automatically show a toast for flagged content
   */
  showToasts?: boolean;
  
  /**
   * Callback when content is flagged
   */
  onFlagged?: (result: AIModerationResult) => void;
  
  /**
   * Callback when content passes moderation
   */
  onApproved?: (result: AIModerationResult) => void;
}

interface AIModerationResult {
  /**
   * Whether the content was flagged
   */
  flagged: boolean;
  
  /**
   * Content ID (generated or provided)
   */
  contentId: string;
  
  /**
   * Categories that were checked
   */
  categories?: Record<string, boolean>;
  
  /**
   * Scores for each category
   */
  categoryScores?: Record<string, number>;
  
  /**
   * Categories that caused the content to be flagged
   */
  flaggedCategories?: string[];
  
  /**
   * Any error that occurred
   */
  error?: string;
}

/**
 * Hook for using AI moderation features
 */
export function useAIModeration(options: AIModerationOptions = {}) {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<AIModerationResult | null>(null);
  
  const checkContent = useCallback(
    async (content: string, contentId?: string): Promise<AIModerationResult> => {
      const {
        sensitivityLevel = 0.7,
        categories,
        contentType = 'comment',
        showToasts = true,
        onFlagged,
        onApproved
      } = options;
      
      setIsChecking(true);
      
      try {
        const response = await fetch('/api/moderation/ai-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            contentId,
            contentType,
            sensitivityLevel,
            categories
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to check content');
        }
        
        const result = await response.json();
        setLastResult(result);
        
        if (result.flagged) {
          // Content was flagged
          if (showToasts) {
            toast.error(
              `Your content was flagged for the following reason(s): ${
                result.flaggedCategories?.join(', ') || 'policy violation'
              }`
            );
          }
          
          // Call the flagged callback if provided
          if (onFlagged) {
            onFlagged(result);
          }
        } else {
          // Content passed moderation
          if (onApproved) {
            onApproved(result);
          }
        }
        
        return result;
      } catch (error) {
        const errorMessage = (error as Error).message || 'An error occurred during content moderation';
        
        if (showToasts) {
          toast.error(`Moderation check failed: ${errorMessage}`);
        }
        
        const errorResult = {
          flagged: false, // Fail open to avoid blocking legitimate content
          contentId: contentId || 'error',
          error: errorMessage
        };
        
        setLastResult(errorResult);
        return errorResult;
      } finally {
        setIsChecking(false);
      }
    },
    [options]
  );
  
  const getMessageForFlag = useCallback((categories: string[]): string => {
    if (!categories || categories.length === 0) {
      return 'Your content may violate our community guidelines.';
    }
    
    const categoryMessages: Record<string, string> = {
      hate: 'Content that expresses, incites, or promotes hate based on identity.',
      harassment: 'Content that harasses, intimidates, or bullies an individual.',
      sexual: 'Sexual content that may be inappropriate.',
      'self-harm': 'Content that promotes, encourages, or depicts acts of self-harm.',
      violence: 'Content that promotes or glorifies violence or suffering.'
    };
    
    const messages = categories.map(cat => categoryMessages[cat] || cat);
    return `Your content may violate our community guidelines: ${messages.join(' ')}`;
  }, []);
  
  return {
    checkContent,
    isChecking,
    lastResult,
    getMessageForFlag,
    isModeratorUser: session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR'
  };
}

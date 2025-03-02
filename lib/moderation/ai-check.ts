import { ContentType } from '@prisma/client';
import { OpenAI } from 'openai';

interface AIModeratorResult {
  flagged: boolean;
  confidenceScore: number;
  categories?: {
    [category: string]: {
      flagged: boolean;
      score: number;
    }
  };
  reason?: string;
}

/**
 * Check content with AI moderation service
 * @param content The text content to be checked
 * @param contentType The type of content being moderated
 * @returns AI moderation result with flagging information
 */
export async function checkContentWithAI(
  content: string,
  contentType: ContentType
): Promise<AIModeratorResult> {
  try {
    // Initialize result
    const result: AIModeratorResult = {
      flagged: false,
      confidenceScore: 0
    };
    
    // Use OpenAI moderation API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    if (!openai.apiKey) {
      console.warn('OpenAI API key not provided, skipping AI content moderation');
      return result;
    }
    
    // Call OpenAI moderation endpoint
    const response = await openai.moderations.create({
      input: content,
    });
    
    // Process results
    if (response.results && response.results.length > 0) {
      const moderationResult = response.results[0];
      
      // Calculate overall confidence as the highest category score
      let highestScore = 0;
      let flaggedReason = '';
      
      // Check individual categories
      const categories: { [key: string]: { flagged: boolean; score: number } } = {};
      
      for (const [category, score] of Object.entries(moderationResult.category_scores)) {
        const isFlagged = score > 0.5; // Flag if score > 0.5
        categories[category] = {
          flagged: isFlagged,
          score
        };
        
        if (score > highestScore) {
          highestScore = score;
          if (isFlagged) {
            flaggedReason = category;
          }
        }
      }
      
      // Set result values
      result.flagged = moderationResult.flagged;
      result.confidenceScore = highestScore;
      result.categories = categories;
      
      if (result.flagged) {
        result.reason = `AI flagged content for: ${flaggedReason}`;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error during AI content moderation:', error);
    
    // Return safe default in case of error
    return {
      flagged: false,
      confidenceScore: 0,
      reason: 'AI moderation error'
    };
  }
}

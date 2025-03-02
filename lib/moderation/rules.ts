import prisma from '@/lib/prisma';
import { ContentType, ModerationPriority, ModerationAction, ModerationStatus } from '@prisma/client';

interface ModerationRuleResult {
  autoFlagged: boolean;
  priority?: ModerationPriority;
  autoAction?: ModerationAction;
  status: ModerationStatus;
  reason?: string;
}

/**
 * Apply moderation rules to content
 * @param contentType Type of content being moderated
 * @param content The actual content text
 * @param metadata Additional metadata about the content
 * @returns ModerationRuleResult with flagging and priority information
 */
export async function applyModerationRules(
  contentType: ContentType,
  content: string,
  metadata?: Record<string, any>
): Promise<ModerationRuleResult> {
  // Default result
  const result: ModerationRuleResult = {
    autoFlagged: false,
    status: 'PENDING'
  };
  
  // Get all enabled moderation rules for this content type
  const rules = await prisma.moderationRule.findMany({
    where: {
      contentType,
      enabled: true
    },
    orderBy: {
      priority: 'desc' // Apply highest priority rules first
    }
  });
  
  if (rules.length === 0) {
    return result;
  }
  
  // Apply each rule
  for (const rule of rules) {
    const matched = await checkRuleMatch(rule, content, metadata);
    
    if (matched) {
      result.autoFlagged = true;
      result.priority = rule.priority;
      result.reason = `Matched rule: ${rule.name}`;
      
      // Apply auto-action if configured
      if (rule.autoAction) {
        result.autoAction = rule.autoAction;
        
        // Set status based on action
        switch (rule.autoAction) {
          case 'APPROVED':
            result.status = 'AUTO_APPROVED';
            break;
          case 'REJECTED':
            result.status = 'AUTO_REJECTED';
            break;
          default:
            result.status = 'NEEDS_REVIEW';
        }
        
        // We found a match with an action, no need to check more rules
        break;
      }
      
      // If no auto-action but we have a match, set status to NEEDS_REVIEW
      result.status = 'NEEDS_REVIEW';
    }
  }
  
  return result;
}

/**
 * Check if content matches a specific rule
 */
async function checkRuleMatch(
  rule: any,
  content: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  // Check for keyword matches if keywords are defined
  if (rule.keywords) {
    const keywords = rule.keywords.split(',').map((k: string) => k.trim().toLowerCase());
    const contentLower = content.toLowerCase();
    
    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        return true;
      }
    }
  }
  
  // Check image content through metadata if available
  if (metadata?.hasImage && rule.name.includes('image')) {
    return true;
  }
  
  // Check for user reputation if applicable
  if (metadata?.userId && rule.name.includes('user_reputation')) {
    const user = await prisma.user.findUnique({
      where: { id: metadata.userId },
      include: {
        userReputation: true
      }
    });
    
    // Flag content from users with low reputation
    if (user?.userReputation?.reputationScore && user.userReputation.reputationScore < 10) {
      return true;
    }
  }
  
  // Apply additional custom rule logic based on rule name
  
  // Rule for post length
  if (rule.name === 'short_content' && content.length < 5) {
    return true;
  }
  
  // Rule for spam detection (many links)
  if (rule.name === 'spam_detection') {
    const linkCount = (content.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      return true;
    }
  }
  
  // Rule for new user content
  if (rule.name === 'new_user_content' && metadata?.userCreatedAt) {
    const userCreatedAt = new Date(metadata.userCreatedAt);
    const daysSinceCreation = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 7) {
      return true;
    }
  }
  
  return false;
}

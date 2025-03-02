import { ReputationActivityType, TrustLevel, BadgeCategory } from '@prisma/client';

// Point values for different activities
export const ACTIVITY_POINTS: Record<ReputationActivityType, number> = {
  RESOURCE_CREATED: 50,
  RESOURCE_UPVOTED: 5,
  COMMENT_UPVOTED: 2,
  ANSWER_HELPFUL: 15,
  ENDORSEMENT_RECEIVED: 20,
  DAILY_LOGIN: 1,
  PROFILE_COMPLETED: 25,
  CREDENTIAL_VERIFIED: 50,
  REPORT_ACCEPTED: 10,
  CONTENT_FEATURED: 100,
  GROUP_CREATED: 30,
  EVENT_ORGANIZED: 40,
  POLL_CREATED: 15,
  SURVEY_COMPLETED: 10
};

// Daily limits for activities
export const ACTIVITY_DAILY_LIMITS: Partial<Record<ReputationActivityType, number>> = {
  RESOURCE_CREATED: 3,
  RESOURCE_UPVOTED: 100,
  COMMENT_UPVOTED: 50,
  ANSWER_HELPFUL: 20,
  ENDORSEMENT_RECEIVED: 5,
  DAILY_LOGIN: 1,
  REPORT_ACCEPTED: 5,
  CONTENT_FEATURED: 1
};

// Cooldown periods for activities in milliseconds
export const ACTIVITY_COOLDOWNS: Partial<Record<ReputationActivityType, number>> = {
  RESOURCE_UPVOTED: 24 * 60 * 60 * 1000, // 1 day per user
  COMMENT_UPVOTED: 24 * 60 * 60 * 1000, // 1 day per user
  ENDORSEMENT_RECEIVED: 7 * 24 * 60 * 60 * 1000, // 7 days per user
  DAILY_LOGIN: 24 * 60 * 60 * 1000 // 24 hours
};

// Points required for each trust level
export const TRUST_LEVEL_THRESHOLDS: Record<TrustLevel, number> = {
  NEW_USER: 0,
  MEMBER: 100,
  ESTABLISHED: 500,
  TRUSTED: 1500,
  LEADER: 5000,
  EXPERT: 10000
};

// Trust level labels for display
export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  NEW_USER: 'New User',
  MEMBER: 'Member',
  ESTABLISHED: 'Established Member',
  TRUSTED: 'Trusted Member',
  LEADER: 'Community Leader',
  EXPERT: 'Expert'
};

// Badge definitions
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  points: number;
  icon: string;
  requirements: {
    type: 'count' | 'achievement' | 'milestone';
    target?: number;
    activityType?: ReputationActivityType;
    customCheck?: string;
  };
}

// Initial badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Contributor badges
  {
    id: 'first_post',
    name: 'First Post',
    description: 'Created your first post in the community',
    category: BadgeCategory.CONTRIBUTOR,
    points: 10,
    icon: 'edit',
    requirements: {
      type: 'count',
      target: 1,
      activityType: ReputationActivityType.RESOURCE_CREATED
    }
  },
  {
    id: 'consistent_contributor',
    name: 'Consistent Contributor',
    description: 'Posted weekly for at least a month',
    category: BadgeCategory.CONTRIBUTOR,
    points: 50,
    icon: 'calendar-check',
    requirements: {
      type: 'achievement',
      customCheck: 'consistentWeeklyPosts'
    }
  },
  {
    id: 'content_creator_bronze',
    name: 'Content Creator Bronze',
    description: 'Created 10 resources',
    category: BadgeCategory.CONTRIBUTOR,
    points: 100,
    icon: 'file-text',
    requirements: {
      type: 'count',
      target: 10,
      activityType: ReputationActivityType.RESOURCE_CREATED
    }
  },
  {
    id: 'content_creator_silver',
    name: 'Content Creator Silver',
    description: 'Created 50 resources',
    category: BadgeCategory.CONTRIBUTOR,
    points: 300,
    icon: 'file-text',
    requirements: {
      type: 'count',
      target: 50,
      activityType: ReputationActivityType.RESOURCE_CREATED
    }
  },
  
  // Knowledge badges
  {
    id: 'topic_expert',
    name: 'Topic Expert',
    description: 'Endorsed by 5+ users in a category',
    category: BadgeCategory.KNOWLEDGE,
    points: 200,
    icon: 'award',
    requirements: {
      type: 'achievement',
      customCheck: 'topicExpert'
    }
  },
  {
    id: 'featured_author',
    name: 'Featured Author',
    description: 'Had content featured by admins',
    category: BadgeCategory.KNOWLEDGE,
    points: 150,
    icon: 'star',
    requirements: {
      type: 'count',
      target: 1,
      activityType: ReputationActivityType.CONTENT_FEATURED
    }
  },
  
  // Community badges
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first 3 months',
    category: BadgeCategory.COMMUNITY,
    points: 50,
    icon: 'clock',
    requirements: {
      type: 'achievement',
      customCheck: 'earlyAdopter'
    }
  },
  {
    id: 'group_leader',
    name: 'Group Leader',
    description: 'Created and managed an active group',
    category: BadgeCategory.COMMUNITY,
    points: 100,
    icon: 'users',
    requirements: {
      type: 'count',
      target: 1,
      activityType: ReputationActivityType.GROUP_CREATED
    }
  }
];

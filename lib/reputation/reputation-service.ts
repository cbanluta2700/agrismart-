import { prisma } from '@/lib/prisma';
import { 
  ReputationActivityType, 
  TrustLevel, 
  BadgeCategory,
  Prisma,
  User
} from '@prisma/client';
import { 
  ACTIVITY_POINTS, 
  ACTIVITY_DAILY_LIMITS, 
  ACTIVITY_COOLDOWNS,
  TRUST_LEVEL_THRESHOLDS,
  BADGE_DEFINITIONS
} from './constants';

/**
 * Records a reputation activity for a user and awards points
 * @param userId The ID of the user
 * @param activityType The type of activity
 * @param metadata Optional metadata about the activity
 * @returns The created activity record
 */
export async function recordActivity(
  userId: string, 
  activityType: ReputationActivityType, 
  metadata?: Record<string, any>
) {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  // Check if the user has reached the daily limit for this activity
  if (ACTIVITY_DAILY_LIMITS[activityType]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activitiesCount = await prisma.reputationActivity.count({
      where: {
        userId,
        type: activityType,
        createdAt: {
          gte: today
        }
      }
    });
    
    if (activitiesCount >= ACTIVITY_DAILY_LIMITS[activityType]!) {
      throw new Error(`Daily limit reached for activity ${activityType}`);
    }
  }
  
  // Check cooldown if applicable
  if (ACTIVITY_COOLDOWNS[activityType] && metadata?.targetId) {
    const cooldownPeriod = ACTIVITY_COOLDOWNS[activityType]!;
    const cooldownDate = new Date(Date.now() - cooldownPeriod);
    
    const recentActivity = await prisma.reputationActivity.findFirst({
      where: {
        userId,
        type: activityType,
        createdAt: {
          gte: cooldownDate
        },
        metadata: {
          path: ['targetId'],
          equals: metadata.targetId
        }
      }
    });
    
    if (recentActivity) {
      throw new Error(`Cooldown period not elapsed for activity ${activityType}`);
    }
  }
  
  // Calculate points for the activity
  const points = ACTIVITY_POINTS[activityType];
  
  // Create transaction to update user points and record activity
  const [activity, updatedUser] = await prisma.$transaction([
    // Record the activity
    prisma.reputationActivity.create({
      data: {
        userId,
        type: activityType,
        points,
        metadata: metadata ? Prisma.JsonValue : undefined
      }
    }),
    
    // Update user's reputation points
    prisma.user.update({
      where: { id: userId },
      data: {
        reputationPoints: {
          increment: points
        }
      }
    })
  ]);
  
  // Check if user needs trust level update
  await updateTrustLevel(updatedUser);
  
  // Check for badges
  await checkAndAwardBadges(userId);
  
  return activity;
}

/**
 * Updates a user's trust level based on their reputation points
 * @param user The user object
 * @returns The updated user if trust level changed, null if no change
 */
export async function updateTrustLevel(user: User) {
  let newTrustLevel: TrustLevel | null = null;
  
  // Determine the appropriate trust level based on points
  for (const [level, threshold] of Object.entries(TRUST_LEVEL_THRESHOLDS)) {
    if (user.reputationPoints >= threshold) {
      newTrustLevel = level as TrustLevel;
    } else {
      break;
    }
  }
  
  // If trust level should change, update the user
  if (newTrustLevel && newTrustLevel !== user.trustLevel) {
    return prisma.user.update({
      where: { id: user.id },
      data: { trustLevel: newTrustLevel }
    });
  }
  
  return null;
}

/**
 * Checks and awards badges to a user based on their activities
 * @param userId The ID of the user to check
 * @returns Array of newly awarded badges
 */
export async function checkAndAwardBadges(userId: string) {
  const newBadges: string[] = [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { earnedBadges: true }
  });
  
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  // Get all badges the user has already earned
  const earnedBadgeIds = user.earnedBadges.map(badge => badge.badgeId);
  
  // Check each badge definition to see if the user qualifies
  for (const badgeDef of BADGE_DEFINITIONS) {
    // Skip if user already has this badge
    if (earnedBadgeIds.includes(badgeDef.id)) {
      continue;
    }
    
    let qualifies = false;
    
    // Check qualification based on requirement type
    if (badgeDef.requirements.type === 'count' && badgeDef.requirements.activityType) {
      // Count-based badges (e.g., "Created 10 resources")
      const activityCount = await prisma.reputationActivity.count({
        where: {
          userId,
          type: badgeDef.requirements.activityType
        }
      });
      
      qualifies = activityCount >= (badgeDef.requirements.target || 1);
    } 
    else if (badgeDef.requirements.type === 'achievement' && badgeDef.requirements.customCheck) {
      // Achievement badges with custom logic
      qualifies = await checkCustomBadgeRequirement(
        userId, 
        badgeDef.requirements.customCheck
      );
    }
    
    // If user qualifies, award the badge
    if (qualifies) {
      // First, ensure the badge exists in the database
      let badge = await prisma.badge.findUnique({
        where: { id: badgeDef.id }
      });
      
      if (!badge) {
        badge = await prisma.badge.create({
          data: {
            id: badgeDef.id,
            name: badgeDef.name,
            description: badgeDef.description,
            category: badgeDef.category,
            points: badgeDef.points,
            icon: badgeDef.icon
          }
        });
      }
      
      // Award the badge to the user
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id
        }
      });
      
      // Add points for earning the badge
      await prisma.user.update({
        where: { id: userId },
        data: {
          reputationPoints: {
            increment: badgeDef.points
          }
        }
      });
      
      newBadges.push(badge.id);
    }
  }
  
  return newBadges;
}

/**
 * Handles custom badge requirement checks
 * @param userId The ID of the user
 * @param checkName The name of the custom check to perform
 * @returns Boolean indicating if the user qualifies
 */
async function checkCustomBadgeRequirement(userId: string, checkName: string): Promise<boolean> {
  switch (checkName) {
    case 'consistentWeeklyPosts':
      return checkConsistentWeeklyPosts(userId);
    case 'topicExpert':
      return checkTopicExpert(userId);
    case 'earlyAdopter':
      return checkEarlyAdopter(userId);
    default:
      return false;
  }
}

/**
 * Checks if a user has posted consistently for at least 4 weeks
 */
async function checkConsistentWeeklyPosts(userId: string): Promise<boolean> {
  // Get creation activities from the last month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const activities = await prisma.reputationActivity.findMany({
    where: {
      userId,
      type: ReputationActivityType.RESOURCE_CREATED,
      createdAt: {
        gte: oneMonthAgo
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // If fewer than 4 activities, user hasn't posted enough
  if (activities.length < 4) {
    return false;
  }
  
  // Group activities by week
  const weekMap = new Map<number, boolean>();
  
  for (const activity of activities) {
    // Get ISO week number
    const date = new Date(activity.createdAt);
    const weekNumber = getWeekNumber(date);
    weekMap.set(weekNumber, true);
  }
  
  // Check if at least 4 different weeks have posts
  return weekMap.size >= 4;
}

/**
 * Gets the ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Checks if a user has been endorsed by 5+ users in any category
 */
async function checkTopicExpert(userId: string): Promise<boolean> {
  // Group endorsements by skill and count
  const endorsements = await prisma.userEndorsement.groupBy({
    by: ['skill'],
    where: {
      receiverId: userId
    },
    _count: {
      giverId: true
    },
    having: {
      giverId: {
        _count: {
          gte: 5
        }
      }
    }
  });
  
  return endorsements.length > 0;
}

/**
 * Checks if a user is an early adopter (joined in first 3 months)
 */
async function checkEarlyAdopter(userId: string): Promise<boolean> {
  // Get the user's created date
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true }
  });
  
  if (!user) return false;
  
  // Get the earliest user account as a reference for platform launch
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  
  if (!firstUser) return false;
  
  // Calculate the date 3 months after platform launch
  const threeMonthsAfterLaunch = new Date(firstUser.createdAt);
  threeMonthsAfterLaunch.setMonth(threeMonthsAfterLaunch.getMonth() + 3);
  
  // Check if user joined before that date
  return user.createdAt <= threeMonthsAfterLaunch;
}

/**
 * Creates or updates a user endorsement
 * @param giverId ID of the user giving the endorsement
 * @param receiverId ID of the user receiving the endorsement
 * @param skill The skill being endorsed
 * @returns The created or updated endorsement
 */
export async function createEndorsement(
  giverId: string,
  receiverId: string,
  skill: string
) {
  // Prevent self-endorsements
  if (giverId === receiverId) {
    throw new Error('Users cannot endorse themselves');
  }
  
  // Check if this endorsement already exists
  const existingEndorsement = await prisma.userEndorsement.findFirst({
    where: {
      giverId,
      receiverId,
      skill
    }
  });
  
  if (existingEndorsement) {
    throw new Error('Endorsement already exists');
  }
  
  // Create the endorsement
  const endorsement = await prisma.userEndorsement.create({
    data: {
      giverId,
      receiverId,
      skill
    }
  });
  
  // Record reputation activity for receiving an endorsement
  await recordActivity(
    receiverId,
    ReputationActivityType.ENDORSEMENT_RECEIVED,
    { 
      giverId,
      skill,
      endorsementId: endorsement.id
    }
  );
  
  return endorsement;
}

/**
 * Verifies a user credential
 * @param userId ID of the user
 * @param credential The credential to verify
 * @returns The updated credential record
 */
export async function verifyCredential(
  userId: string,
  credential: string
) {
  // Check if this credential already exists
  let existingCredential = await prisma.userCredential.findFirst({
    where: {
      userId,
      credential
    }
  });
  
  if (existingCredential) {
    // Update existing credential to verified
    existingCredential = await prisma.userCredential.update({
      where: { id: existingCredential.id },
      data: { verified: true }
    });
  } else {
    // Create new verified credential
    existingCredential = await prisma.userCredential.create({
      data: {
        userId,
        credential,
        verified: true
      }
    });
  }
  
  // Record reputation activity for verified credential
  await recordActivity(
    userId,
    ReputationActivityType.CREDENTIAL_VERIFIED,
    { credential }
  );
  
  return existingCredential;
}

/**
 * Gets a user's reputation profile including points, trust level, badges, etc.
 * @param userId ID of the user
 * @returns The user's complete reputation profile
 */
export async function getUserReputationProfile(userId: string) {
  // Get user with related reputation data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      reputationPoints: true,
      trustLevel: true,
      earnedBadges: {
        include: {
          badge: true
        },
        orderBy: {
          earnedAt: 'desc'
        }
      },
      endorsementsReceived: {
        select: {
          id: true,
          skill: true,
          giver: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      verifiedCredentials: {
        where: {
          verified: true
        },
        select: {
          id: true,
          credential: true,
          createdAt: true
        }
      }
    }
  });
  
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  // Get recent reputation activities
  const recentActivities = await prisma.reputationActivity.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });
  
  // Calculate next trust level info
  const currentLevel = user.trustLevel;
  const nextLevel = getNextTrustLevel(currentLevel);
  
  const currentLevelThreshold = TRUST_LEVEL_THRESHOLDS[currentLevel];
  const nextLevelThreshold = nextLevel ? TRUST_LEVEL_THRESHOLDS[nextLevel] : null;
  
  const pointsToNextLevel = nextLevelThreshold 
    ? nextLevelThreshold - user.reputationPoints 
    : 0;
  
  const progressToNextLevel = nextLevelThreshold 
    ? ((user.reputationPoints - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100 
    : 100;
  
  // Group endorsements by skill
  const endorsementsBySkill = user.endorsementsReceived.reduce((acc, endorsement) => {
    const skill = endorsement.skill;
    if (!acc[skill]) {
      acc[skill] = [];
    }
    acc[skill].push(endorsement);
    return acc;
  }, {} as Record<string, typeof user.endorsementsReceived>);
  
  // Return complete reputation profile
  return {
    user: {
      id: user.id,
      name: user.name,
      reputationPoints: user.reputationPoints,
      trustLevel: user.trustLevel
    },
    trustLevelProgress: {
      currentLevel,
      nextLevel,
      pointsToNextLevel,
      progressPercentage: progressToNextLevel
    },
    badges: user.earnedBadges.map(badge => ({
      id: badge.badge.id,
      name: badge.badge.name,
      description: badge.badge.description,
      category: badge.badge.category,
      icon: badge.badge.icon,
      earnedAt: badge.earnedAt
    })),
    badgeCounts: {
      total: user.earnedBadges.length,
      byCategory: user.earnedBadges.reduce((acc, badge) => {
        const category = badge.badge.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<BadgeCategory, number>)
    },
    endorsements: {
      total: user.endorsementsReceived.length,
      bySkill: endorsementsBySkill
    },
    credentials: user.verifiedCredentials,
    recentActivities
  };
}

/**
 * Gets the next trust level after the current one
 * @param currentLevel The current trust level
 * @returns The next trust level, or null if at max level
 */
function getNextTrustLevel(currentLevel: TrustLevel): TrustLevel | null {
  const levels = Object.values(TrustLevel);
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return null;
  }
  
  return levels[currentIndex + 1];
}

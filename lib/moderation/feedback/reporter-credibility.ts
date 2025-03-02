import { PrismaClient } from '@prisma/client';
import { kv } from '@vercel/kv';
import { fluidCompute } from '@/lib/vercel/fluid-compute';

const prisma = new PrismaClient();

// Constants for scoring adjustments
const SCORE_ADJUSTMENTS = {
  ACCURATE_REPORT: 2.0,   // Points added for accurate reports
  FALSE_REPORT: -3.0,     // Points deducted for false reports
  FIRST_REPORT: 0.0,      // No adjustment for first report
  MIN_SCORE: 0.0,         // Minimum possible score
  MAX_SCORE: 100.0,       // Maximum possible score
  INITIAL_SCORE: 50.0,    // Starting score for new reporters
};

/**
 * Interface for reporting the outcome of a content report
 */
export interface ReportOutcome {
  userId: string;
  reportId: string;
  wasAccurate: boolean;
  moderatorNotes?: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize or get a user's reporter credibility profile
 */
export const getReporterCredibility = fluidCompute(
  async (userId: string, initialize = false) => {
    try {
      // Check if the reporter already has a credibility profile
      let credibility = await prisma.reporterCredibility.findUnique({
        where: { userId },
      });

      // If not found and initialize is true, create a new profile
      if (!credibility && initialize) {
        credibility = await prisma.reporterCredibility.create({
          data: {
            userId,
            credibilityScore: SCORE_ADJUSTMENTS.INITIAL_SCORE,
          },
        });
      }

      return credibility;
    } catch (error) {
      console.error('Error getting reporter credibility:', error);
      throw new Error('Failed to get reporter credibility');
    }
  },
  { 
    cacheKey: (userId) => `reporter-credibility:${userId}`,
    cacheTtl: 300 // 5 minutes
  }
);

/**
 * Update a reporter's credibility based on report outcome
 */
export const updateReporterCredibility = fluidCompute(
  async (outcome: ReportOutcome) => {
    try {
      // Get or initialize the reporter's credibility
      let credibility = await getReporterCredibility(outcome.userId, true);
      
      if (!credibility) {
        throw new Error('Failed to initialize reporter credibility');
      }

      // Calculate score adjustment
      let scoreAdjustment = 0;
      
      if (credibility.totalReports === 0) {
        // First report - no adjustment
        scoreAdjustment = SCORE_ADJUSTMENTS.FIRST_REPORT;
      } else if (outcome.wasAccurate) {
        // Accurate report
        scoreAdjustment = SCORE_ADJUSTMENTS.ACCURATE_REPORT;
      } else {
        // False report
        scoreAdjustment = SCORE_ADJUSTMENTS.FALSE_REPORT;
      }

      // Calculate new score and ensure it's within bounds
      const newScore = Math.max(
        SCORE_ADJUSTMENTS.MIN_SCORE,
        Math.min(
          SCORE_ADJUSTMENTS.MAX_SCORE,
          credibility.credibilityScore + scoreAdjustment
        )
      );

      // Update the credibility record
      const updatedCredibility = await prisma.reporterCredibility.update({
        where: { userId: outcome.userId },
        data: {
          credibilityScore: newScore,
          totalReports: credibility.totalReports + 1,
          accurateReports: outcome.wasAccurate 
            ? credibility.accurateReports + 1 
            : credibility.accurateReports,
          falseReports: !outcome.wasAccurate 
            ? credibility.falseReports + 1 
            : credibility.falseReports,
          metadata: {
            ...(credibility.metadata || {}),
            lastReportOutcome: {
              reportId: outcome.reportId,
              wasAccurate: outcome.wasAccurate,
              date: new Date().toISOString(),
              moderatorNotes: outcome.moderatorNotes,
              ...outcome.metadata,
            },
          },
        },
      });

      // Invalidate cache
      await kv.del(`reporter-credibility:${outcome.userId}`);
      
      return {
        updatedCredibility,
        scoreAdjustment,
        previousScore: credibility.credibilityScore,
      };
    } catch (error) {
      console.error('Error updating reporter credibility:', error);
      throw new Error('Failed to update reporter credibility');
    }
  }
);

/**
 * Get top reporters based on credibility score and accurate reports
 */
export const getTopReporters = fluidCompute(
  async (limit = 10) => {
    const cacheKey = `top-reporters:${limit}`;
    
    // Try to get from cache first
    const cachedReporters = await kv.get(cacheKey);
    if (cachedReporters) {
      return JSON.parse(cachedReporters as string);
    }
    
    try {
      // Get reporters with high credibility and at least 5 reports
      const topReporters = await prisma.reporterCredibility.findMany({
        where: {
          totalReports: { gte: 5 },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: [
          { credibilityScore: 'desc' },
          { accurateReports: 'desc' },
        ],
        take: limit,
      });
      
      // Calculate accuracy percentage for each reporter
      const reportersWithStats = topReporters.map(reporter => ({
        ...reporter,
        accuracyPercentage: 
          reporter.totalReports > 0
            ? (reporter.accurateReports / reporter.totalReports) * 100
            : 0,
      }));
      
      // Cache the results
      await kv.set(cacheKey, JSON.stringify(reportersWithStats));
      await kv.expire(cacheKey, 3600); // 1 hour
      
      return reportersWithStats;
    } catch (error) {
      console.error('Error getting top reporters:', error);
      throw new Error('Failed to get top reporters');
    }
  }
);

/**
 * Get a weighted trust score for a user's report
 * This score factors in the user's credibility when evaluating reports
 */
export const getReportTrustScore = fluidCompute(
  async (userId: string, reportId: string) => {
    try {
      // Get the reporter's credibility
      const credibility = await getReporterCredibility(userId);
      
      if (!credibility) {
        // No credibility record - use the default initial score
        return {
          reportId,
          userId,
          trustScore: SCORE_ADJUSTMENTS.INITIAL_SCORE / SCORE_ADJUSTMENTS.MAX_SCORE,
          credibilityScore: SCORE_ADJUSTMENTS.INITIAL_SCORE,
          isFirstReport: true,
        };
      }
      
      // Calculate a normalized trust score between 0 and 1
      const trustScore = credibility.credibilityScore / SCORE_ADJUSTMENTS.MAX_SCORE;
      
      return {
        reportId,
        userId,
        trustScore,
        credibilityScore: credibility.credibilityScore,
        accuracyRate: credibility.totalReports > 0
          ? credibility.accurateReports / credibility.totalReports
          : null,
        totalReports: credibility.totalReports,
        isFirstReport: credibility.totalReports === 0,
      };
    } catch (error) {
      console.error('Error calculating report trust score:', error);
      throw new Error('Failed to calculate report trust score');
    }
  },
  { 
    cacheKey: (userId, reportId) => `report-trust-score:${userId}:${reportId}`,
    cacheTtl: 60 // 1 minute
  }
);

/**
 * Get credibility statistics across the system
 */
export const getCredibilityStats = fluidCompute(
  async () => {
    const cacheKey = 'credibility-system-stats';
    
    // Try to get from cache first
    const cachedStats = await kv.get(cacheKey);
    if (cachedStats) {
      return JSON.parse(cachedStats as string);
    }
    
    try {
      // Count total reporters
      const totalReporters = await prisma.reporterCredibility.count();
      
      // Get aggregate statistics
      const aggregateStats = await prisma.$queryRaw`
        SELECT 
          AVG("credibilityScore") as "avgScore",
          MIN("credibilityScore") as "minScore",
          MAX("credibilityScore") as "maxScore",
          SUM("totalReports") as "totalReportsSubmitted",
          SUM("accurateReports") as "totalAccurateReports",
          SUM("falseReports") as "totalFalseReports"
        FROM "ReporterCredibility"
      `;
      
      // Get distribution of credibility scores
      const scoreDistribution = await prisma.$queryRaw`
        SELECT 
          CASE
            WHEN "credibilityScore" BETWEEN 0 AND 20 THEN '0-20'
            WHEN "credibilityScore" BETWEEN 20 AND 40 THEN '20-40'
            WHEN "credibilityScore" BETWEEN 40 AND 60 THEN '40-60'
            WHEN "credibilityScore" BETWEEN 60 AND 80 THEN '60-80'
            WHEN "credibilityScore" BETWEEN 80 AND 100 THEN '80-100'
          END as "range",
          COUNT(*) as "count"
        FROM "ReporterCredibility"
        GROUP BY "range"
        ORDER BY "range"
      `;
      
      const stats = {
        totalReporters,
        aggregateStats: aggregateStats[0],
        scoreDistribution,
        systemAccuracy: 
          aggregateStats[0].totalReportsSubmitted > 0
            ? (aggregateStats[0].totalAccurateReports / aggregateStats[0].totalReportsSubmitted) * 100
            : 0,
        lastUpdated: new Date().toISOString(),
      };
      
      // Cache the results
      await kv.set(cacheKey, JSON.stringify(stats));
      await kv.expire(cacheKey, 3600); // 1 hour
      
      return stats;
    } catch (error) {
      console.error('Error getting credibility stats:', error);
      throw new Error('Failed to get credibility stats');
    }
  }
);

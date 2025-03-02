/**
 * Vercel Analytics API integration for AgriSmart
 */

// Vercel API base URL
const VERCEL_API_URL = 'https://api.vercel.com';

/**
 * Interface for analytics query parameters
 */
export interface AnalyticsQueryParams {
  from?: string;   // ISO date string
  to?: string;     // ISO date string
  filter?: string; // Filter expression
  limit?: number;  // Results limit
  next?: string;   // Pagination token
}

/**
 * Interface for analytics data point
 */
export interface AnalyticsDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Interface for analytics query response
 */
export interface AnalyticsQueryResponse {
  data: AnalyticsDataPoint[];
  pagination?: {
    next?: string;
    count: number;
  };
}

/**
 * Get Vercel API token from environment variables
 */
function getVercelToken() {
  return process.env.VERCEL_API_TOKEN;
}

/**
 * Get Vercel team ID from environment variables
 */
function getVercelTeamId() {
  return process.env.VERCEL_TEAM_ID;
}

/**
 * Make an authenticated request to the Vercel API
 */
async function fetchVercelAPI(endpoint: string, params: Record<string, any> = {}) {
  const token = getVercelToken();
  const teamId = getVercelTeamId();
  
  if (!token) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }
  
  // Convert params to query string
  const queryParams = new URLSearchParams();
  
  // Add team ID if available
  if (teamId) {
    queryParams.append('teamId', teamId);
  }
  
  // Add all other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  const url = `${VERCEL_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vercel API error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * Get web analytics data
 */
export async function getWebAnalytics(
  metric: 'visitors' | 'pageviews' | 'duration',
  params: AnalyticsQueryParams = {}
): Promise<AnalyticsQueryResponse> {
  return fetchVercelAPI(`/v1/web/analytics/${metric}`, params);
}

/**
 * Get endpoint analytics data
 */
export async function getEndpointAnalytics(
  endpoint: string,
  metric: 'invocations' | 'latency' | 'status',
  params: AnalyticsQueryParams = {}
): Promise<AnalyticsQueryResponse> {
  return fetchVercelAPI(`/v1/edge-config/analytics/${endpoint}/${metric}`, params);
}

/**
 * Get moderation endpoint performance data
 * This specifically targets the moderation-related API endpoints
 */
export async function getModerationEndpointAnalytics(
  params: AnalyticsQueryParams = {}
): Promise<Record<string, AnalyticsQueryResponse>> {
  // Define the moderation-related endpoints to monitor
  const moderationEndpoints = [
    '/api/admin/resources/bulk-moderate',
    '/api/admin/resources/moderate',
    '/api/notifications'
  ];
  
  const results: Record<string, AnalyticsQueryResponse> = {};
  
  // Fetch analytics for each endpoint
  for (const endpoint of moderationEndpoints) {
    try {
      results[endpoint] = await getEndpointAnalytics(endpoint, 'invocations', params);
    } catch (error) {
      console.error(`Error fetching analytics for ${endpoint}:`, error);
      results[endpoint] = { data: [] };
    }
  }
  
  return results;
}

/**
 * Get resource pages performance data
 */
export async function getResourcePagesAnalytics(
  params: AnalyticsQueryParams = {}
): Promise<AnalyticsQueryResponse> {
  // Set filter to only include resource-related pages
  const filter = 'path.startsWith("/resources")';
  return getWebAnalytics('pageviews', { ...params, filter });
}

/**
 * Get user engagement metrics for moderation-related features
 */
export async function getModerationFeatureEngagement(
  params: AnalyticsQueryParams = {}
): Promise<AnalyticsQueryResponse> {
  // Set filter to only include moderation-related admin pages
  const filter = 'path.startsWith("/admin") AND (path.includes("moderation") OR path.includes("resources"))';
  return getWebAnalytics('duration', { ...params, filter });
}

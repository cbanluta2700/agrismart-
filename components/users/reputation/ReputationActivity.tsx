import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReputationActivityType } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: ReputationActivityType;
  points: number;
  createdAt: string;
  metadata?: {
    resourceTitle?: string;
    resourceId?: string;
    commentId?: string;
    badgeName?: string;
    targetUserId?: string;
    targetUserName?: string;
  };
}

interface ReputationActivityProps {
  activities: Activity[];
  loading?: boolean;
}

export default function ReputationActivity({ activities, loading = false }: ReputationActivityProps) {
  // Format the activity message based on type and metadata
  const getActivityMessage = (activity: Activity) => {
    const { type, metadata } = activity;
    
    switch (type) {
      case 'RESOURCE_CREATION':
        return metadata?.resourceTitle
          ? `Created resource "${metadata.resourceTitle}"`
          : 'Created a resource';
          
      case 'RESOURCE_UPVOTE':
        return 'Received an upvote on your resource';
        
      case 'COMMENT_CREATION':
        return metadata?.resourceTitle
          ? `Commented on "${metadata.resourceTitle}"`
          : 'Posted a comment';
          
      case 'COMMENT_UPVOTE':
        return 'Received an upvote on your comment';
        
      case 'BADGE_EARNED':
        return metadata?.badgeName
          ? `Earned the ${metadata.badgeName} badge`
          : 'Earned a badge';
          
      case 'ENDORSED_BY_USER':
        return metadata?.targetUserName
          ? `Received an endorsement from ${metadata.targetUserName}`
          : 'Received an endorsement';
          
      case 'CREDENTIAL_VERIFIED':
        return 'Had a credential verified';
        
      case 'DAILY_VISIT':
        return 'Visited the site';
        
      case 'PROFILE_COMPLETION':
        return 'Completed your profile';
        
      default:
        return 'Reputation activity';
    }
  };
  
  // Helper function to format activity type for display
  const formatActivityType = (type: ReputationActivityType): string => {
    return type.toString()
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Your recent reputation-earning activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex flex-col space-y-4 w-full">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-md w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Your recent reputation-earning activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No recent activity. Start participating to earn reputation points!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>
          Your recent reputation-earning activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start justify-between border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {getActivityMessage(activity)}
                    </p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      +{activity.points}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-100 text-xs">
                      {formatActivityType(activity.type)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

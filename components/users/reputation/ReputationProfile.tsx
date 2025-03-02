import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Award, Shield, Users, Star, Clock } from 'lucide-react';
import { TrustLevel, BadgeCategory } from '@prisma/client';
import { TRUST_LEVEL_LABELS } from '@/lib/reputation/constants';
import { formatDistanceToNow } from 'date-fns';
import { useAnalytics } from '@vercel/analytics/react';

interface ReputationProfileProps {
  userId: string;
}

export default function ReputationProfile({ userId }: ReputationProfileProps) {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();
  
  const isOwnProfile = session?.user?.id === userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  
  // Fetch reputation profile data
  useEffect(() => {
    const fetchReputationProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/users/${userId}/reputation`);
        setProfileData(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load reputation data');
        console.error('Error fetching reputation data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchReputationProfile();
    }
  }, [userId]);
  
  // Get the badge icon component
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'award':
        return <Award className="h-4 w-4" />;
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'star':
        return <Star className="h-4 w-4" />;
      case 'clock':
        return <Clock className="h-4 w-4" />;
      case 'shield':
        return <Shield className="h-4 w-4" />;
      case 'check':
        return <BadgeCheck className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };
  
  // Get color based on badge category
  const getBadgeCategoryColor = (category: BadgeCategory) => {
    switch (category) {
      case 'CONTRIBUTOR':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'KNOWLEDGE':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'COMMUNITY':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  // Recalculate badges (admin or self only)
  const handleRecalculateBadges = async () => {
    if (!isOwnProfile && !isAdmin) return;
    
    try {
      setLoading(true);
      const response = await axios.patch(`/api/users/${userId}/reputation/badges`);
      
      if (response.data.newBadges.length > 0) {
        // Refetch the reputation profile to get updated data
        const profileResponse = await axios.get(`/api/users/${userId}/reputation`);
        setProfileData(profileResponse.data);
        
        // Track the event
        analytics.track('Recalculated Badges', {
          userId,
          newBadgesCount: response.data.newBadges.length,
          isAdmin: isAdmin
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to recalculate badges');
      console.error('Error recalculating badges:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !profileData) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!profileData) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No reputation data available for this user.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Reputation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Reputation Profile
            <Badge variant="outline" className="ml-2">
              {TRUST_LEVEL_LABELS[profileData.user.trustLevel as TrustLevel]}
            </Badge>
          </CardTitle>
          <CardDescription>
            Track your contributions and recognition in the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reputation Points */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Reputation Points</div>
                <div className="text-2xl font-bold">{profileData.user.reputationPoints}</div>
              </div>
              
              {/* Progress to next level */}
              {profileData.trustLevelProgress.nextLevel && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {TRUST_LEVEL_LABELS[profileData.trustLevelProgress.nextLevel as TrustLevel]}</span>
                    <span>{profileData.trustLevelProgress.pointsToNextLevel} points needed</span>
                  </div>
                  <Progress value={profileData.trustLevelProgress.progressPercentage} />
                </div>
              )}
            </div>
            
            {/* Badge counts */}
            <div className="flex flex-col">
              <div className="text-sm font-medium mb-2">Badges Earned</div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-md border p-3 text-center">
                  <div className="text-2xl font-bold">{profileData.badgeCounts.total || 0}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="flex-1 rounded-md border p-3 text-center bg-blue-50">
                  <div className="text-2xl font-bold text-blue-700">
                    {profileData.badgeCounts.byCategory?.CONTRIBUTOR || 0}
                  </div>
                  <div className="text-xs text-blue-700">Contributor</div>
                </div>
                <div className="flex-1 rounded-md border p-3 text-center bg-green-50">
                  <div className="text-2xl font-bold text-green-700">
                    {profileData.badgeCounts.byCategory?.KNOWLEDGE || 0}
                  </div>
                  <div className="text-xs text-green-700">Knowledge</div>
                </div>
                <div className="flex-1 rounded-md border p-3 text-center bg-purple-50">
                  <div className="text-2xl font-bold text-purple-700">
                    {profileData.badgeCounts.byCategory?.COMMUNITY || 0}
                  </div>
                  <div className="text-xs text-purple-700">Community</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Reputation Tabs */}
      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>
        
        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Earned Badges</h3>
            {(isOwnProfile || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateBadges}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check for new badges'}
              </Button>
            )}
          </div>
          
          {profileData.badges.length === 0 ? (
            <Alert>
              <AlertDescription>
                No badges earned yet. Contribute to the community to earn badges!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profileData.badges.map((badge: any) => (
                <TooltipProvider key={badge.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-3 p-3 rounded-md border ${getBadgeCategoryColor(badge.category as BadgeCategory)}`}>
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                          {getBadgeIcon(badge.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{badge.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Endorsements Tab */}
        <TabsContent value="endorsements" className="space-y-4">
          <h3 className="text-lg font-semibold">Skill Endorsements</h3>
          
          {Object.keys(profileData.endorsements.bySkill || {}).length === 0 ? (
            <Alert>
              <AlertDescription>
                No endorsements received yet. Connect with other community members to receive endorsements for your skills.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {Object.entries(profileData.endorsements.bySkill || {}).map(([skill, endorsers]: [string, any[]]) => (
                <Card key={skill}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {skill} <Badge variant="secondary" className="ml-2">{endorsers.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {endorsers.map((endorser: any) => (
                        <TooltipProvider key={endorser.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 border hover:ring-2 hover:ring-primary/50">
                                <AvatarImage src={endorser.giver.image} alt={endorser.giver.name} />
                                <AvatarFallback>
                                  {endorser.giver.name?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{endorser.giver.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(endorser.createdAt), { addSuffix: true })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <h3 className="text-lg font-semibold">Verified Credentials</h3>
          
          {profileData.credentials.length === 0 ? (
            <Alert>
              <AlertDescription>
                No verified credentials yet. Verified credentials help establish your expertise in specific areas.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData.credentials.map((credential: any) => (
                <div key={credential.id} className="flex items-center gap-2 p-3 rounded-md border">
                  <BadgeCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">{credential.credential}</div>
                    <div className="text-xs text-muted-foreground">
                      Verified {formatDistanceToNow(new Date(credential.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

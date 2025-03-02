import React from 'react';
import { BadgeCategory } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Users, Star, Clock, Shield, BadgeCheck } from 'lucide-react';

interface BadgeProps {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  earnedAt?: Date;
}

interface UserBadgesProps {
  badges: BadgeProps[];
  limit?: number;
  showEmpty?: boolean;
}

export default function UserBadges({ badges, limit, showEmpty = true }: UserBadgesProps) {
  const displayBadges = limit ? badges.slice(0, limit) : badges;
  
  // Get the badge icon component
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'award':
        return <Award className="h-3 w-3" />;
      case 'users':
        return <Users className="h-3 w-3" />;
      case 'star':
        return <Star className="h-3 w-3" />;
      case 'clock':
        return <Clock className="h-3 w-3" />;
      case 'shield':
        return <Shield className="h-3 w-3" />;
      case 'check':
        return <BadgeCheck className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
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
  
  if (badges.length === 0 && !showEmpty) {
    return null;
  }
  
  if (badges.length === 0) {
    return <span className="text-sm text-muted-foreground">No badges yet</span>;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayBadges.map((badge) => (
        <TooltipProvider key={badge.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${getBadgeCategoryColor(badge.category)}`}
              >
                {getBadgeIcon(badge.icon)}
                <span className="ml-1 text-xs">{badge.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{badge.name}</p>
              <p className="text-xs">{badge.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      
      {limit && badges.length > limit && (
        <Badge variant="outline" className="bg-gray-100">
          +{badges.length - limit} more
        </Badge>
      )}
    </div>
  );
}

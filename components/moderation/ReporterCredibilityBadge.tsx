import React, { useEffect, useState } from 'react';
import { 
  Tooltip, 
  Badge, 
  Chip,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSession } from 'next-auth/react';

interface ReporterCredibilityProps {
  userId: string;
  showScore?: boolean;
  displayStyle?: 'badge' | 'chip' | 'text';
  size?: 'small' | 'medium';
}

export default function ReporterCredibilityBadge({
  userId,
  showScore = false,
  displayStyle = 'badge',
  size = 'medium'
}: ReporterCredibilityProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [credibility, setCredibility] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if the component is mounted and there's a user session
    if (userId && session) {
      const fetchCredibility = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/users/${userId}/reporter-credibility`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch reporter credibility');
          }
          
          const data = await response.json();
          setCredibility(data.credibility);
        } catch (err) {
          console.error('Error fetching reporter credibility:', err);
          setError('Could not load credibility data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCredibility();
    }
  }, [userId, session]);

  const getCredibilityLevel = () => {
    if (!credibility) return 'unknown';
    
    const score = credibility.credibilityScore;
    
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'low';
    return 'very_low';
  };
  
  const getCredibilityColor = () => {
    const level = getCredibilityLevel();
    
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'info';
      case 'low': return 'warning';
      case 'very_low': return 'error';
      default: return 'default';
    }
  };
  
  const getCredibilityIcon = () => {
    const level = getCredibilityLevel();
    
    switch (level) {
      case 'high': return <VerifiedUserIcon />;
      case 'medium': return <VerifiedUserIcon />;
      case 'low': return <ErrorIcon />;
      case 'very_low': return <ErrorIcon />;
      default: return <HelpOutlineIcon />;
    }
  };
  
  const getTooltipText = () => {
    if (!credibility) return 'Reporter credibility not available';
    
    const score = credibility.credibilityScore.toFixed(1);
    const level = getCredibilityLevel();
    const totalReports = credibility.totalReports;
    const accurateReports = credibility.accurateReports;
    const accuracyPercentage = totalReports > 0
      ? ((accurateReports / totalReports) * 100).toFixed(1)
      : 'N/A';
    
    let levelText = '';
    switch (level) {
      case 'high':
        levelText = 'Highly Trusted Reporter';
        break;
      case 'medium':
        levelText = 'Trusted Reporter';
        break;
      case 'low':
        levelText = 'Low Trust Reporter';
        break;
      case 'very_low':
        levelText = 'Unreliable Reporter';
        break;
      default:
        levelText = 'New Reporter';
        break;
    }
    
    return `${levelText}
Credibility Score: ${score}/100
Reports Submitted: ${totalReports}
Accuracy Rate: ${accuracyPercentage}%`;
  };
  
  if (loading) {
    return <CircularProgress size={20} />;
  }
  
  if (error) {
    return null; // Don't display anything if there's an error
  }
  
  // If no credibility record exists yet, don't show anything
  if (!credibility) {
    return null;
  }
  
  // For admin/moderator users, show the actual score
  const isStaff = session?.user?.roles?.includes('ADMIN') || 
                 session?.user?.roles?.includes('MODERATOR');
  
  // Content to display
  const content = (
    <>
      {showScore && isStaff ? (
        <Typography variant={size === 'small' ? 'caption' : 'body2'}>
          {credibility.credibilityScore.toFixed(1)}
        </Typography>
      ) : null}
    </>
  );
  
  // Render based on displayStyle
  switch (displayStyle) {
    case 'chip':
      return (
        <Tooltip title={getTooltipText()} arrow placement="top">
          <Chip
            icon={getCredibilityIcon()}
            label={showScore && isStaff ? credibility.credibilityScore.toFixed(1) : ''}
            size={size}
            color={getCredibilityColor() as any}
            variant="outlined"
          />
        </Tooltip>
      );
      
    case 'text':
      return (
        <Tooltip title={getTooltipText()} arrow placement="top">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getCredibilityIcon()}
            {content}
          </Box>
        </Tooltip>
      );
      
    case 'badge':
    default:
      return (
        <Tooltip title={getTooltipText()} arrow placement="top">
          <Badge
            color={getCredibilityColor() as any}
            overlap="circular"
            badgeContent=" "
            variant="dot"
          >
            {content || <Box component="span" sx={{ mx: 1 }} />}
          </Badge>
        </Tooltip>
      );
  }
}

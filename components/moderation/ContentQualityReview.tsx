import { useState, useEffect } from 'react';
import axios from 'axios';
import { ResourceType, ResourceStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ContentQualityReviewProps {
  resource: {
    id: string;
    title: string;
    description?: string;
    type: ResourceType;
    status: ResourceStatus;
    flagReason?: string;
    author: {
      name: string;
      email: string;
    };
  };
  onFeedbackSubmit: (feedback: {
    moderatorNotes: string;
    actionTaken: 'approved' | 'rejected' | 'improvements_requested';
    overrideQualityScore?: number;
  }) => void;
}

export default function ContentQualityReview({
  resource,
  onFeedbackSubmit,
}: ContentQualityReviewProps) {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [resourceDetails, setResourceDetails] = useState<any>(resource);
  const [feedback, setFeedback] = useState({
    moderatorNotes: '',
    actionTaken: '' as 'approved' | 'rejected' | 'improvements_requested',
    overrideQualityScore: undefined as number | undefined,
  });
  const [showContent, setShowContent] = useState(false);
  const [resourceContent, setResourceContent] = useState<string>('');
  
  // Fetch resource details and assessments
  useEffect(() => {
    const fetchResourceDetails = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`/api/admin/resources/moderation/quality-assessment?resourceId=${resource.id}`);
        
        setResourceDetails(response.data.resource);
        setAssessments(response.data.assessments);
        
        // Fetch the resource content if needed
        try {
          const contentResponse = await axios.get(`/api/resources/${resource.id}/content`);
          if (contentResponse.data && contentResponse.data.content) {
            setResourceContent(
              typeof contentResponse.data.content === 'string'
                ? contentResponse.data.content
                : JSON.stringify(contentResponse.data.content, null, 2)
            );
          }
        } catch (error) {
          console.error('Error fetching resource content:', error);
          setResourceContent(resource.description || 'No content available');
        }
      } catch (error) {
        console.error('Error fetching resource details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResourceDetails();
  }, [resource.id]);
  
  // Get the latest assessment
  const latestAssessment = assessments.length > 0 ? assessments[0] : null;
  
  // Handle feedback input
  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback({
      ...feedback,
      moderatorNotes: e.target.value,
    });
  };
  
  // Handle action buttons
  const handleAction = (action: 'approved' | 'rejected' | 'improvements_requested') => {
    setFeedback({
      ...feedback,
      actionTaken: action,
    });
    
    onFeedbackSubmit({
      ...feedback,
      actionTaken: action,
    });
  };
  
  // Handle loading state
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">{resourceDetails.title}</h2>
        <p className="text-sm text-gray-500">
          Submitted by {resourceDetails.author.name} ({resourceDetails.author.email})
        </p>
      </div>
      
      {latestAssessment ? (
        <Card className="p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">AI Quality Assessment</h3>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Quality Score</span>
              <span className={`font-bold ${
                latestAssessment.qualityScore >= 80 
                  ? 'text-green-500' 
                  : latestAssessment.qualityScore >= 50 
                    ? 'text-yellow-500' 
                    : 'text-red-500'
              }`}>
                {latestAssessment.qualityScore}/100
              </span>
            </div>
            <Progress 
              value={latestAssessment.qualityScore} 
              max={100}
              className={`h-2 ${
                latestAssessment.qualityScore >= 80 
                  ? 'bg-green-200' 
                  : latestAssessment.qualityScore >= 50 
                    ? 'bg-yellow-200' 
                    : 'bg-red-200'
              }`}
            />
          </div>
          
          {/* Detailed scores */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {latestAssessment.details && Object.entries(latestAssessment.details).map(([key, value]: [string, any]) => (
              <div key={key} className="flex flex-col">
                <span className="text-xs font-medium capitalize">{key}</span>
                <div className="flex items-center">
                  <Progress value={value * 10} max={100} className="h-1 flex-grow mr-2" />
                  <span className="text-xs font-bold">{value}/10</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Flags */}
          {latestAssessment.flags && latestAssessment.flags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Issues Detected</h4>
              <ul className="space-y-2">
                {latestAssessment.flags.map((flag: any, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium capitalize">{flag.type}</span>
                      <span className="text-gray-500 ml-2">
                        ({Math.round(flag.confidence * 100)}% confidence)
                      </span>
                      <p className="text-xs text-gray-600">{flag.details}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Suggestions */}
          {latestAssessment.suggestions && latestAssessment.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Improvement Suggestions</h4>
              <ul className="space-y-1 text-sm">
                {latestAssessment.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-4 bg-gray-50 text-center">
          <p className="text-gray-500">No quality assessment available for this resource</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={async () => {
              try {
                setLoading(true);
                const response = await axios.post('/api/admin/resources/moderation/quality-assessment', {
                  resourceId: resource.id,
                });
                
                if (response.data.assessment) {
                  setAssessments([response.data.assessment]);
                }
              } catch (error) {
                console.error('Error analyzing content:', error);
              } finally {
                setLoading(false);
              }
            }}
          >
            Run AI Quality Assessment
          </Button>
        </Card>
      )}
      
      {/* Content Preview */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Content Preview</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowContent(!showContent)}>
            {showContent ? 'Hide Content' : 'Show Content'}
          </Button>
        </div>
        
        {showContent && (
          <div className="max-h-[300px] overflow-y-auto p-3 bg-gray-50 rounded-md text-sm">
            <pre className="whitespace-pre-wrap">{resourceContent}</pre>
          </div>
        )}
      </Card>
      
      {/* Moderator Feedback */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Moderator Feedback</h3>
        
        <Textarea
          placeholder="Enter your feedback, suggestions, or reasons for approval/rejection..."
          className="mb-4"
          rows={4}
          value={feedback.moderatorNotes}
          onChange={handleFeedbackChange}
        />
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-1 bg-green-50 hover:bg-green-100"
            onClick={() => handleAction('approved')}
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-1 bg-red-50 hover:bg-red-100"
            onClick={() => handleAction('rejected')}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100"
            onClick={() => handleAction('improvements_requested')}
          >
            <MessageCircle className="h-4 w-4" />
            Request Improvements
          </Button>
        </div>
      </Card>
    </div>
  );
}

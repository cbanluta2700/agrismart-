import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Collapse, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import PublicIcon from '@mui/icons-material/Public';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { CommentQualityEnhancementResult } from '@/lib/moderation/comment/quality-enhancement';

interface CommentQualityEnhancerProps {
  commentId: string;
  commentContent: string;
  onContentUpdate?: (newContent: string) => void;
  isAuthor: boolean;
}

export default function CommentQualityEnhancer({ 
  commentId, 
  commentContent, 
  onContentUpdate,
  isAuthor 
}: CommentQualityEnhancerProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [enhancementData, setEnhancementData] = useState<CommentQualityEnhancementResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(commentContent);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing enhancements when component mounts or comment changes
  useEffect(() => {
    if (commentId && session?.user) {
      fetchEnhancements();
    }
  }, [commentId, session]);

  // Reset edited content when comment content changes
  useEffect(() => {
    setEditedContent(commentContent);
  }, [commentContent]);

  const fetchEnhancements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments/${commentId}/enhancements`);
      
      if (response.ok) {
        const data = await response.json();
        setEnhancementData(data);
      } else if (response.status !== 404) {
        // Only show error if it's not a "not found" error
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch enhancement suggestions');
      }
    } catch (err) {
      console.error('Error fetching comment enhancements:', err);
      setError('Failed to load enhancement suggestions');
    } finally {
      setLoading(false);
    }
  };

  const generateEnhancements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/comments/${commentId}/enhancements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnhancementData(data);
        setExpanded(true);
        setSuccess('Enhancement suggestions generated successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate enhancement suggestions');
      }
    } catch (err) {
      console.error('Error generating comment enhancements:', err);
      setError('Failed to generate enhancement suggestions');
    } finally {
      setLoading(false);
    }
  };

  const applyEnhancements = async () => {
    if (!enhancementData || appliedSuggestions.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/comments/${commentId}/enhancements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commentId,
          enhancedContent: editedContent,
          appliedSuggestions
        })
      });
      
      if (response.ok) {
        // Update parent component with new content
        if (onContentUpdate) {
          onContentUpdate(editedContent);
        }
        
        setSuccess('Enhancements applied successfully');
        setEditMode(false);
        setAppliedSuggestions([]);
        
        // Refetch to get updated enhancement data
        fetchEnhancements();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to apply enhancements');
      }
    } catch (err) {
      console.error('Error applying comment enhancements:', err);
      setError('Failed to apply enhancements');
    } finally {
      setLoading(false);
    }
  };

  const toggleEditMode = () => {
    if (!editMode) {
      setEditMode(true);
    } else {
      setEditMode(false);
      setEditedContent(commentContent);
      setAppliedSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string, type: string) => {
    if (!isAuthor) return;
    
    const suggestionKey = `${type}: ${suggestion}`;
    
    if (appliedSuggestions.includes(suggestionKey)) {
      setAppliedSuggestions(appliedSuggestions.filter(s => s !== suggestionKey));
    } else {
      setAppliedSuggestions([...appliedSuggestions, suggestionKey]);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      {!enhancementData && !loading && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoFixHighIcon />}
          onClick={generateEnhancements}
          disabled={loading}
        >
          Generate Quality Suggestions
        </Button>
      )}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading suggestions...</Typography>
        </Box>
      )}

      {enhancementData && (
        <Card variant="outlined" sx={{ mt: 1 }}>
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHighIcon />
                Quality Enhancement Suggestions
              </Typography>
              <Button
                size="small"
                onClick={() => setExpanded(!expanded)}
                endIcon={<ExpandMoreIcon />}
              >
                {expanded ? 'Hide' : 'Show'}
              </Button>
            </Box>

            {isAuthor && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Readability Score: {enhancementData.readabilityScore}/10
                </Typography>
                <Button 
                  size="small" 
                  variant="contained" 
                  color={editMode ? "error" : "primary"}
                  onClick={toggleEditMode}
                  disabled={loading}
                >
                  {editMode ? "Cancel Edit" : "Edit & Apply"}
                </Button>
              </Box>
            )}

            <Collapse in={expanded}>
              {/* Edit Mode */}
              {editMode && isAuthor && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    label="Edit your comment"
                  />
                  
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button 
                      color="primary" 
                      variant="contained" 
                      onClick={applyEnhancements}
                      disabled={loading || appliedSuggestions.length === 0}
                    >
                      Apply Selected Enhancements
                    </Button>
                  </Box>

                  {appliedSuggestions.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Applied suggestions:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {appliedSuggestions.map((suggestion, index) => (
                          <Chip key={index} label={suggestion} size="small" onDelete={() => {
                            setAppliedSuggestions(appliedSuggestions.filter(s => s !== suggestion));
                          }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpellcheckIcon fontSize="small" /> Readability Suggestions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {enhancementData.readabilitySuggestions.map((suggestion, index) => (
                      <ListItem 
                        key={index} 
                        onClick={() => handleSuggestionClick(suggestion, 'Readability')}
                        sx={{ 
                          cursor: isAuthor ? 'pointer' : 'default',
                          bgcolor: isAuthor && appliedSuggestions.includes(`Readability: ${suggestion}`) 
                            ? 'action.selected' 
                            : 'transparent',
                          borderRadius: 1
                        }}
                      >
                        <ListItemIcon>
                          <FormatQuoteIcon />
                        </ListItemIcon>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiObjectsIcon fontSize="small" /> Constructive Feedback
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {enhancementData.constructiveFeedback.map((feedback, index) => (
                      <ListItem 
                        key={index}
                        onClick={() => handleSuggestionClick(feedback, 'Feedback')}
                        sx={{ 
                          cursor: isAuthor ? 'pointer' : 'default',
                          bgcolor: isAuthor && appliedSuggestions.includes(`Feedback: ${feedback}`) 
                            ? 'action.selected' 
                            : 'transparent',
                          borderRadius: 1
                        }}
                      >
                        <ListItemIcon>
                          <LightbulbIcon />
                        </ListItemIcon>
                        <ListItemText primary={feedback} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoFixHighIcon fontSize="small" /> Improvement Prompts
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {enhancementData.improvementPrompts.map((prompt, index) => (
                      <ListItem 
                        key={index}
                        onClick={() => handleSuggestionClick(prompt, 'Improvement')}
                        sx={{ 
                          cursor: isAuthor ? 'pointer' : 'default',
                          bgcolor: isAuthor && appliedSuggestions.includes(`Improvement: ${prompt}`) 
                            ? 'action.selected' 
                            : 'transparent',
                          borderRadius: 1
                        }}
                      >
                        <ListItemIcon>
                          <AutoFixHighIcon />
                        </ListItemIcon>
                        <ListItemText primary={prompt} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublicIcon fontSize="small" /> Engagement Optimization
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {enhancementData.engagementSuggestions.map((suggestion, index) => (
                      <ListItem 
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion, 'Engagement')}
                        sx={{ 
                          cursor: isAuthor ? 'pointer' : 'default',
                          bgcolor: isAuthor && appliedSuggestions.includes(`Engagement: ${suggestion}`) 
                            ? 'action.selected' 
                            : 'transparent',
                          borderRadius: 1
                        }}
                      >
                        <ListItemIcon>
                          <PublicIcon />
                        </ListItemIcon>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              {enhancementData.contentEnrichment && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LightbulbIcon fontSize="small" /> Content Enrichment
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {enhancementData.contentEnrichment.relevantTopics && 
                     enhancementData.contentEnrichment.relevantTopics.length > 0 && (
                      <>
                        <Typography variant="subtitle2">Related Topics:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 1 }}>
                          {enhancementData.contentEnrichment.relevantTopics.map((topic, index) => (
                            <Chip 
                              key={index} 
                              label={topic} 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleSuggestionClick(`Include topic: ${topic}`, 'Enrichment')}
                              sx={{ 
                                bgcolor: isAuthor && appliedSuggestions.includes(`Enrichment: Include topic: ${topic}`) 
                                  ? 'action.selected' 
                                  : 'transparent'
                              }}
                            />
                          ))}
                        </Box>
                      </>
                    )}

                    {enhancementData.contentEnrichment.recommendedLinks && 
                     enhancementData.contentEnrichment.recommendedLinks.length > 0 && (
                      <>
                        <Typography variant="subtitle2">Recommended Links:</Typography>
                        <List dense>
                          {enhancementData.contentEnrichment.recommendedLinks.map((link, index) => (
                            <ListItem 
                              key={index}
                              onClick={() => handleSuggestionClick(`Add link: ${link}`, 'Enrichment')}
                              sx={{ 
                                cursor: isAuthor ? 'pointer' : 'default',
                                bgcolor: isAuthor && appliedSuggestions.includes(`Enrichment: Add link: ${link}`) 
                                  ? 'action.selected' 
                                  : 'transparent',
                                borderRadius: 1
                              }}
                            >
                              <ListItemText 
                                primary={link} 
                                primaryTypographyProps={{ 
                                  style: { 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap' 
                                  } 
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}

                    {enhancementData.contentEnrichment.additionalContext && (
                      <>
                        <Typography variant="subtitle2">Additional Context:</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {enhancementData.contentEnrichment.additionalContext}
                        </Typography>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
            </Collapse>
          </CardContent>
        </Card>
      )}

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

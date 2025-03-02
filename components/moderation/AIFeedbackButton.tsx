import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AISystemComponent, FeedbackResult } from '@prisma/client';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  Radio, 
  FormControlLabel, 
  TextField, 
  Snackbar, 
  Alert,
  Typography,
  Box
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import FeedbackIcon from '@mui/icons-material/Feedback';

interface AIFeedbackButtonProps {
  systemComponent: AISystemComponent;
  originalQuery: string;
  originalResponse: string;
  buttonLabel?: string;
  buttonVariant?: 'text' | 'outlined' | 'contained';
  buttonSize?: 'small' | 'medium' | 'large';
  metadata?: Record<string, any>;
  onFeedbackSubmitted?: () => void;
}

export default function AIFeedbackButton({
  systemComponent,
  originalQuery,
  originalResponse,
  buttonLabel = 'Provide Feedback',
  buttonVariant = 'outlined',
  buttonSize = 'small',
  metadata,
  onFeedbackSubmitted
}: AIFeedbackButtonProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form
    setFeedbackResult(null);
    setUserFeedback('');
  };

  const handleSubmit = async () => {
    if (!feedbackResult) {
      setSnackbarMessage('Please select an accuracy rating');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!session?.user) {
      setSnackbarMessage('You must be logged in to submit feedback');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/moderation/feedback/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemComponent,
          originalQuery,
          originalResponse,
          userFeedback: userFeedback || undefined,
          feedbackResult,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSnackbarMessage('Thank you for your feedback!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSnackbarMessage('Error submitting feedback. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleClickOpen}
        startIcon={<FeedbackIcon />}
      >
        {buttonLabel}
      </Button>
      
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>AI Feedback</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Help us improve our AI by providing feedback on the accuracy and quality of the response you received.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Your Query:</Typography>
            <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              {originalQuery}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2">AI Response:</Typography>
            <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              {originalResponse}
            </Typography>
          </Box>
          
          <FormControl component="fieldset" required sx={{ mb: 3 }}>
            <FormLabel component="legend">How accurate was this response?</FormLabel>
            <RadioGroup
              value={feedbackResult}
              onChange={(e) => setFeedbackResult(e.target.value as FeedbackResult)}
            >
              <FormControlLabel 
                value="ACCURATE" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ThumbUpIcon color="success" sx={{ mr: 1 }} />
                    <Typography>Accurate - The information was correct and helpful</Typography>
                  </Box>
                } 
              />
              <FormControlLabel 
                value="PARTIALLY_ACCURATE" 
                control={<Radio />} 
                label="Partially Accurate - The information was partly correct" 
              />
              <FormControlLabel 
                value="INACCURATE" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ThumbDownIcon color="error" sx={{ mr: 1 }} />
                    <Typography>Inaccurate - The information was wrong or unhelpful</Typography>
                  </Box>
                } 
              />
            </RadioGroup>
          </FormControl>
          
          <TextField
            label="Additional Feedback (Optional)"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            placeholder="Please share any additional feedback about the AI response..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting || !feedbackResult}
            color="primary"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

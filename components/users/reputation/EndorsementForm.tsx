import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ThumbsUp } from 'lucide-react';
import { useAnalytics } from '@vercel/analytics/react';

// Common skill options for agriculture and community
const COMMON_SKILLS = [
  'Crop Management',
  'Livestock Care',
  'Sustainable Farming',
  'Organic Practices',
  'Water Management',
  'Soil Health',
  'Pest Control',
  'Farm Equipment',
  'Weather Forecasting',
  'Market Analysis',
  'Community Building',
  'Knowledge Sharing',
  'Mentoring',
  'Technical Support',
  'Content Creation'
];

// Form schema
const endorsementSchema = z.object({
  skill: z.string().min(2, {
    message: 'Skill must be at least 2 characters.',
  }).max(50, {
    message: 'Skill must be 50 characters or less.'
  })
});

interface EndorsementFormProps {
  userId: string;
  onEndorsementComplete: () => void;
}

export default function EndorsementForm({ userId, onEndorsementComplete }: EndorsementFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();
  const analytics = useAnalytics();
  
  // Initialize form
  const form = useForm<z.infer<typeof endorsementSchema>>({
    resolver: zodResolver(endorsementSchema),
    defaultValues: {
      skill: ''
    }
  });
  
  // Check if user is trying to endorse themselves
  const isSelfEndorsement = session?.user?.id === userId;
  
  // Handle skill input change to provide suggestions
  const handleSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value.length > 1) {
      // Filter common skills that match the input
      const filteredSuggestions = COMMON_SKILLS.filter(skill => 
        skill.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions.slice(0, 5)); // Limit to 5 suggestions
    } else {
      setSuggestions([]);
    }
  };
  
  // Handle suggestion selection
  const handleSelectSuggestion = (skill: string) => {
    form.setValue('skill', skill);
    setSuggestions([]);
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof endorsementSchema>) => {
    if (isSelfEndorsement) {
      toast({
        title: 'Cannot endorse yourself',
        description: 'You cannot endorse your own skills.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await axios.post(`/api/users/${userId}/reputation/endorsements`, {
        skill: values.skill
      });
      
      if (response.data.success) {
        toast({
          title: 'Endorsement added',
          description: `You've successfully endorsed this user for ${values.skill}.`,
          variant: 'default'
        });
        
        // Track the endorsement event
        analytics.track('User Endorsed', {
          skill: values.skill,
          endorsedUserId: userId
        });
        
        // Reset form
        form.reset();
        
        // Notify parent component
        onEndorsementComplete();
      }
    } catch (error: any) {
      console.error('Error adding endorsement:', error);
      toast({
        title: 'Failed to add endorsement',
        description: error.response?.data?.error || 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!session) {
    return null;
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Endorse Skills</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="skill"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Skill or Expertise</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Crop Management, Community Building"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleSkillInputChange(e);
                      }}
                      disabled={isSelfEndorsement || isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Endorse this user for a skill they've demonstrated.
                  </FormDescription>
                  <FormMessage />
                  
                  {/* Suggestions dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white rounded-md border border-gray-200 shadow-lg mt-1">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isSelfEndorsement || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? 'Adding...' : 'Endorse'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Validation schema for the credential form
const credentialSchema = z.object({
  name: z.string().min(2, 'Credential name is required').max(100),
  issuer: z.string().min(2, 'Issuer name is required').max(100),
  description: z.string().max(500).optional(),
  documentUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// TypeScript type based on the schema
type CredentialFormValues = z.infer<typeof credentialSchema> & {
  issuedAt: Date;
  expiresAt?: Date | null;
};

interface CredentialFormProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function CredentialForm({ userId, onComplete, onCancel }: CredentialFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedAt, setIssuedAt] = useState<Date>(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  // Initialize form
  const { register, handleSubmit, formState: { errors } } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: '',
      issuer: '',
      description: '',
      documentUrl: '',
    },
  });
  
  // Submit handler
  const onSubmit = async (data: CredentialFormValues) => {
    // Add dates to the form data
    const formData = {
      ...data,
      issuedAt,
      expiresAt,
    };
    
    setIsSubmitting(true);
    
    try {
      // Submit the credential to the API
      await axios.post(`/api/users/${userId}/reputation/credentials`, formData);
      
      toast({
        title: 'Credential Added',
        description: 'Your credential has been submitted for verification.',
      });
      
      onComplete();
    } catch (error) {
      console.error('Error submitting credential:', error);
      toast({
        title: 'Error',
        description: 'Failed to add credential. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Credential</CardTitle>
        <CardDescription>
          Add your professional certifications, degrees, or other credentials.
          Our team will review and verify your submission.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Credential Name*</Label>
            <Input
              id="name"
              placeholder="e.g. Bachelor of Agriculture, Certified Crop Advisor"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="issuer">Issuing Organization*</Label>
            <Input
              id="issuer"
              placeholder="e.g. University of California, American Society of Agronomy"
              {...register('issuer')}
            />
            {errors.issuer && (
              <p className="text-sm text-red-500">{errors.issuer.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Briefly describe this credential"
              className="resize-none"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Issue Date*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !issuedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issuedAt ? format(issuedAt, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={issuedAt}
                    onSelect={(date) => date && setIssuedAt(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP") : "No expiration"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiresAt || undefined}
                    onSelect={setExpiresAt}
                    initialFocus
                    fromDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="documentUrl">Document URL (Optional)</Label>
            <Input
              id="documentUrl"
              placeholder="https://example.com/my-credential"
              {...register('documentUrl')}
            />
            {errors.documentUrl && (
              <p className="text-sm text-red-500">{errors.documentUrl.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Link to a digital version of your credential (e.g., PDF, certification verification page)
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Credential'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

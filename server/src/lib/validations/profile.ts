import { z } from 'zod';

// Validation error class
export class ValidationError extends Error {
  constructor(public errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// Basic profile schema (server side validation)
export const profileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .optional(),
  
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .nullable(),
  
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .optional()
    .nullable(),
  
  website: z.string()
    .url('Please enter a valid URL')
    .max(200, 'Website URL must be less than 200 characters')
    .optional()
    .nullable(),

  phoneNumber: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .nullable(),
  
  avatarUrl: z.string()
    .url('Please enter a valid URL for the avatar')
    .optional()
    .nullable(),
  
  jobTitle: z.string()
    .max(100, 'Job title must be less than 100 characters')
    .optional()
    .nullable(),
  
  company: z.string() 
    .max(100, 'Company name must be less than 100 characters')
    .optional()
    .nullable(),

  // Social media handles
  twitter: z.string()
    .max(50, 'Twitter handle must be less than 50 characters')
    .optional()
    .nullable(),
  
  github: z.string()
    .max(50, 'GitHub handle must be less than 50 characters')
    .optional()
    .nullable(),
  
  linkedin: z.string()
    .max(50, 'LinkedIn handle must be less than 50 characters')
    .optional()
    .nullable(),

  // Preferences
  theme: z.enum(['light', 'dark', 'system'])
    .optional(),
  
  language: z.string()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code must be less than 10 characters')
    .optional(),
  
  timezone: z.string()
    .optional(),

  // Privacy settings
  profileVisibility: z.enum(['public', 'private', 'connections'])
    .optional(),
  
  showEmail: z.boolean()
    .optional(),
  
  showLocation: z.boolean()
    .optional(),

  // Email notifications
  notifyMarketing: z.boolean()
    .optional(),
  
  notifySecurity: z.boolean()
    .optional(),
  
  notifyUpdates: z.boolean()
    .optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;

/**
 * Validates profile data
 * @param data Profile data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateProfileData(data: unknown): ProfileData {
  try {
    return profileSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        fieldErrors[field] = fieldErrors[field] || [];
        fieldErrors[field].push(issue.message);
      }
      
      throw new ValidationError(fieldErrors);
    }
    throw error;
  }
}

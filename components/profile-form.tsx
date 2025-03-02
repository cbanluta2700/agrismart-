'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserProfile } from '@prisma/client';

const profileSchema = z.object({
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
  linkedin: z.string().optional(),
  theme: z.string(),
  language: z.string(),
  timezone: z.string().optional(),
  profileVisibility: z.string(),
  showEmail: z.boolean(),
  showLocation: z.boolean(),
  notifyMarketing: z.boolean(),
  notifySecurity: z.boolean(),
  notifyUpdates: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: UserProfile;
}

const ProfileForm = ({ profile }: ProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...profile,
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="bio" className="block text-sm font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            {...register('bio')}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            rows={4}
          />
          {errors.bio && (
            <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium">
            Location
          </label>
          <input
            type="text"
            id="location"
            {...register('location')}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
          {errors.location && (
            <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium">
            Website
          </label>
          <input
            type="url"
            id="website"
            {...register('website')}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
          {errors.website && (
            <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            {...register('phoneNumber')}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
          {errors.phoneNumber && (
            <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;

import { useState } from 'react';
import { useRouter } from 'next/router';
import { ResourceContentType, ResourceStatus } from '@/types/resources';

interface UseModerationOptions {
  onSuccess?: (action: 'approve' | 'reject' | 'delete') => void;
  redirectToList?: boolean;
}

export function useResourceModeration(options: UseModerationOptions = {}) {
  const { onSuccess, redirectToList = false } = options;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveResource = async (
    id: string, 
    contentType: ResourceContentType
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/resources/moderation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          contentType
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve resource');
      }
      
      if (redirectToList) {
        router.push('/admin/resources/moderation?action=approved');
      }
      
      if (onSuccess) onSuccess('approve');
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'An error occurred while approving the resource');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectResource = async (
    id: string, 
    contentType: ResourceContentType,
    reason: string
  ) => {
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/resources/moderation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          contentType,
          reason
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject resource');
      }
      
      if (redirectToList) {
        router.push('/admin/resources/moderation?action=rejected');
      }
      
      if (onSuccess) onSuccess('reject');
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'An error occurred while rejecting the resource');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteResource = async (
    id: string, 
    contentType: ResourceContentType
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/resources/${contentType}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete resource');
      }
      
      if (redirectToList) {
        router.push('/admin/resources/moderation?action=deleted');
      }
      
      if (onSuccess) onSuccess('delete');
      return await response.json();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the resource');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    approveResource,
    rejectResource,
    deleteResource,
    isLoading,
    error
  };
}

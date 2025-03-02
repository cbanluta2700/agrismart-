import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Hook to track product views for a given product ID
 * @param productId The ID of the product to track views for
 */
export const useProductView = (productId: string | null) => {
  const { data: session } = useSession();

  useEffect(() => {
    // Only track views if we have a productId and a logged-in user
    if (!productId || !session?.user) return;

    const trackView = async () => {
      try {
        await fetch('/api/marketplace/recommendations/track-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId }),
        });
      } catch (error) {
        console.error('Error tracking product view:', error);
      }
    };

    // Track the view
    trackView();

    // We only want to track a view once per session, so dependencies are empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, session]);
};

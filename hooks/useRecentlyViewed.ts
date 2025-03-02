import { useState, useEffect } from 'react';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 20;

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  image?: string;
  price: number;
  timestamp: number;
}

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  // Load recently viewed products from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentlyViewed(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading recently viewed products:', error);
    }
  }, []);

  // Add a product to recently viewed
  const addToRecentlyViewed = (product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  }) => {
    if (typeof window === 'undefined') return;
    
    const timestamp = Date.now();
    
    setRecentlyViewed(prev => {
      // Remove the product if it already exists
      const filtered = prev.filter(p => p.id !== product.id);
      
      // Add the product at the beginning of the array
      const updated = [
        { ...product, timestamp },
        ...filtered
      ].slice(0, MAX_ITEMS); // Keep only the most recent items
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recently viewed products:', error);
      }
      
      return updated;
    });
  };

  // Clear all recently viewed products
  const clearRecentlyViewed = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(STORAGE_KEY);
    setRecentlyViewed([]);
  };

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed
  };
};

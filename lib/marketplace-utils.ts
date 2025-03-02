/**
 * Utility functions for the marketplace feature
 */

/**
 * Format a price for display with currency symbol and proper decimal places
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(price);
}

/**
 * Calculate total price including any applicable fees
 */
export function calculateTotalPrice(
  basePrice: number,
  quantity: number = 1,
  shippingFee: number = 0,
  taxRate: number = 0
): {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
} {
  const subtotal = basePrice * quantity;
  const tax = subtotal * taxRate;
  
  return {
    subtotal,
    shipping: shippingFee,
    tax,
    total: subtotal + shippingFee + tax,
  };
}

/**
 * Format a date for display in product listings
 */
export function formatListingDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Generate breadcrumb paths for marketplace navigation
 */
export function generateMarketplaceBreadcrumbs(
  paths: Array<{ name: string; href: string }>
): Array<{ name: string; href: string }> {
  return [
    { name: 'Home', href: '/' },
    { name: 'Marketplace', href: '/marketplace' },
    ...paths,
  ];
}

/**
 * Get status style configurations for different product statuses
 */
export function getProductStatusConfig(status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
} {
  switch (status.toLowerCase()) {
    case 'active':
      return {
        label: 'Active',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        icon: 'check-circle',
      };
    case 'pending':
      return {
        label: 'Pending',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        icon: 'clock',
      };
    case 'sold':
      return {
        label: 'Sold',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        icon: 'shopping-bag',
      };
    case 'inactive':
      return {
        label: 'Inactive',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        icon: 'x-circle',
      };
    default:
      return {
        label: status,
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
      };
  }
}

/**
 * Get a truncated product description for previews
 */
export function getTruncatedDescription(
  description: string,
  maxLength: number = 150
): string {
  if (description.length <= maxLength) {
    return description;
  }
  
  return `${description.substring(0, maxLength).trim()}...`;
}

/**
 * Calculate distance between two geographic coordinates (using Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format the distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  
  return `${distance.toFixed(1)} km`;
}

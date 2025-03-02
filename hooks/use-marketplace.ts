"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  condition: string;
  images: string[];
  location?: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  status: string;
  sellerId: string;
  seller?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface UseMarketplaceOptions {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMarketplace(options: UseMarketplaceOptions = {}) {
  const { enableAutoRefresh = false, refreshInterval = 60000 } = options;
  
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch products with optional filtering
  const fetchProducts = useCallback(async (
    filters: Record<string, any> = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query string from filters
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
      
      const response = await fetch(`/api/marketplace/products?${searchParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data.items || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch product by ID
  const fetchProductById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/marketplace/products/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch product');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch product');
      toast.error('Failed to load product details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a new product
  const createProduct = useCallback(async (productData: Omit<Product, 'id' | 'sellerId' | 'status' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/marketplace/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }
      
      const data = await response.json();
      toast.success('Product created successfully');
      
      // Navigate to the product page
      router.push(`/marketplace/${data.id}`);
      
      return data;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
      toast.error('Failed to create product');
      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  // Update an existing product
  const updateProduct = useCallback(async (id: string, productData: Partial<Product>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/marketplace/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }
      
      const data = await response.json();
      toast.success('Product updated successfully');
      
      return data;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
      toast.error('Failed to update product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Delete a product
  const deleteProduct = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/marketplace/products/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }
      
      toast.success('Product deleted successfully');
      router.push('/marketplace');
      
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      toast.error('Failed to delete product');
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/marketplace/categories');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Not setting error state to avoid UI disruption for category failures
      toast.error('Failed to load categories');
    }
  }, []);
  
  // Create order for a product
  const createOrder = useCallback(async (orderData: {
    productId: string;
    quantity: number;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    paymentMethod: 'credit_card' | 'bank_transfer' | 'cash_on_delivery';
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }
      
      const data = await response.json();
      toast.success('Order placed successfully');
      
      // Navigate to order confirmation page (can be implemented later)
      router.push(`/marketplace/orders/${data.id}`);
      
      return data;
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      toast.error('Failed to place order');
      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  // Set up auto-refresh if enabled
  useEffect(() => {
    if (enableAutoRefresh) {
      const interval = setInterval(() => {
        fetchProducts();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [enableAutoRefresh, fetchProducts, refreshInterval]);
  
  // Initialize categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  return {
    products,
    categories,
    loading,
    error,
    fetchProducts,
    fetchProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createOrder,
  };
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

interface Props {
  limit?: number;
  showViewAll?: boolean;
}

export const RecentlyViewedProducts = ({ limit = 6, showViewAll = true }: Props) => {
  const [serverProducts, setServerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const { recentlyViewed: clientProducts, clearRecentlyViewed } = useRecentlyViewed();
  
  // Determine which products to show - use server data for logged in users, client data otherwise
  const products = session?.user ? serverProducts : clientProducts;

  useEffect(() => {
    // Only fetch server data if user is logged in
    if (!session?.user) {
      setLoading(false);
      return;
    }
    
    async function fetchRecentlyViewed() {
      try {
        setLoading(true);
        const res = await fetch("/api/marketplace/recommendations/recently-viewed");
        
        if (!res.ok) {
          throw new Error("Failed to fetch recently viewed products");
        }
        
        const data = await res.json();
        setServerProducts(data);
      } catch (error) {
        console.error("Error fetching recently viewed products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentlyViewed();
  }, [session]);

  // Don't show the component if there are no products
  if (!loading && products.length === 0) {
    return null;
  }
  
  // Limit the number of products to display
  const displayProducts = products.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recently Viewed</CardTitle>
        <div className="flex gap-2">
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearRecentlyViewed}>
              Clear History
            </Button>
          )}
          {showViewAll && products.length > limit && (
            <Button variant="link" size="sm" asChild>
              <Link href="/marketplace/history">View All</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayProducts.map((product: any) => (
              <Link 
                key={product.id} 
                href={`/marketplace/${product.id}`}
                className="group"
              >
                <div className="border rounded-md overflow-hidden transition-all duration-300 group-hover:shadow-md">
                  <div className="relative h-32 bg-gray-100">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium line-clamp-1 text-sm">{product.name}</h3>
                    <p className="text-sm font-semibold">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

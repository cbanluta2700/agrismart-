"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProductCard from "@/components/marketplace/ProductCard";
import ProductFilters from "@/components/marketplace/ProductFilters";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { BarChart3 } from "lucide-react";
import { Product } from "@/types/marketplace";
import { 
  PersonalizedRecommendations, 
  RecentlyViewedProducts, 
  SeasonalRecommendations 
} from "@/components/marketplace/recommendations";

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    // Check if the user has admin role
    if (session?.user) {
      fetch('/api/users/me')
        .then(res => res.json())
        .then(data => {
          setIsAdmin(data.roles?.includes('ADMIN') || false);
        })
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const queryString = searchParams.toString();
        const res = await fetch(`/api/marketplace/products${queryString ? `?${queryString}` : ""}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        
        const data = await res.json();
        setProducts(data.items || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [searchParams]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <div className="flex items-center gap-3">
          {session?.user && (
            <Button 
              variant="outline" 
              onClick={() => router.push("/marketplace/wishlists")}
              className="flex items-center gap-1"
            >
              <span>My Wishlists</span>
            </Button>
          )}
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => router.push("/marketplace/admin/insights")}
              className="flex items-center gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Insights</span>
            </Button>
          )}
          <Button 
            onClick={() => router.push("/marketplace/create")} 
            className="flex items-center gap-1"
          >
            <PlusIcon />
            <span>List a Product</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ProductFilters />
        </div>
        
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          ) : products.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters or search for something else</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add recommendations sections for authenticated users */}
      {session?.user && (
        <>
          <div className="mb-8">
            <RecentlyViewedProducts />
          </div>
          
          <div className="mb-8">
            <PersonalizedRecommendations />
          </div>
          
          <div className="mb-8">
            <SeasonalRecommendations />
          </div>
        </>
      )}
    </div>
  );
}

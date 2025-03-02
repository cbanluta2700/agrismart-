"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft, ExternalLink, User } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type WishlistItem = {
  id: string;
  addedAt: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
    status: string;
    category: {
      id: string;
      name: string;
    };
    seller: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
};

type Wishlist = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  user: {
    name: string | null;
  };
  items: WishlistItem[];
};

export default function SharedWishlistPage() {
  const router = useRouter();
  const params = useParams();
  const wishlistId = params.id as string;
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch wishlist details
  useEffect(() => {
    async function fetchWishlist() {
      if (!wishlistId) return;
      
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/wishlists/${wishlistId}/shared`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Wishlist not found");
          } else if (res.status === 403) {
            throw new Error("This wishlist is private and cannot be shared");
          } else {
            throw new Error("Failed to fetch wishlist");
          }
        }
        
        const data = await res.json();
        if (!data.isPublic) {
          throw new Error("This wishlist is private and cannot be shared");
        }
        
        setWishlist(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchWishlist();
  }, [wishlistId]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/marketplace")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </Button>
        </div>
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-10">
          <h3 className="text-lg font-medium mb-2">Wishlist not found</h3>
          <Button onClick={() => router.push("/marketplace")}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/marketplace")}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          <h1 className="text-3xl font-bold">{wishlist.name}</h1>
          <Badge variant="outline">Shared Wishlist</Badge>
        </div>
        
        {wishlist.description && (
          <p className="text-muted-foreground mt-1">{wishlist.description}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <User className="h-4 w-4" />
          <span>Created by {wishlist.user.name || "Anonymous"}</span>
          <span>·</span>
          <span>{wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
      
      <Separator className="mb-6" />
      
      {wishlist.items.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">This wishlist is empty</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <Link href={`/marketplace/${item.product.id}`}>
                <div className="relative h-48 w-full">
                  {item.product.images && item.product.images.length > 0 ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
              </Link>
              
              <CardContent className="p-4">
                <Link href={`/marketplace/${item.product.id}`} className="hover:underline">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:underline">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="font-bold text-xl mb-2">{formatCurrency(item.product.price)}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{item.product.category?.name || "Uncategorized"}</span>
                  <Badge variant={item.product.status === "active" ? "outline" : "secondary"}>
                    {item.product.status}
                  </Badge>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  Added {formatDate(item.addedAt)}
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  asChild
                >
                  <Link href={`/marketplace/${item.product.id}`} className="flex items-center gap-1">
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

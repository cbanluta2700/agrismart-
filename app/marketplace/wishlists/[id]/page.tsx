"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Heart, Share2, Trash, Lock, Globe, ArrowLeft, Edit, FileEdit, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

type WishlistItem = {
  id: string;
  notes: string | null;
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
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  items: WishlistItem[];
};

export default function WishlistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const wishlistId = params.id as string;
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/marketplace/wishlists");
    }
  }, [status, router]);

  // Fetch wishlist details
  useEffect(() => {
    async function fetchWishlist() {
      if (status !== "authenticated" || !wishlistId) return;
      
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/wishlists/${wishlistId}?includeItems=true`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Wishlist not found");
          } else if (res.status === 403) {
            throw new Error("You don't have access to this wishlist");
          } else {
            throw new Error("Failed to fetch wishlist");
          }
        }
        
        const data = await res.json();
        setWishlist(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchWishlist();
  }, [wishlistId, status]);

  const handleRemoveItem = async (itemId: string, productName: string) => {
    if (!confirm(`Remove ${productName} from this wishlist?`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/marketplace/wishlists/${wishlistId}/items/${itemId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove item");
      }
      
      // Update the wishlist in state
      if (wishlist) {
        setWishlist({
          ...wishlist,
          items: wishlist.items.filter(item => item.id !== itemId)
        });
      }
      
      toast({
        title: "Item removed",
        description: `${productName} has been removed from your wishlist.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };
  
  const handleShareWishlist = () => {
    if (!wishlist?.isPublic) {
      toast({
        title: "Cannot share",
        description: "This wishlist is private. Make it public in settings to share.",
        variant: "destructive",
      });
      return;
    }
    
    navigator.clipboard.writeText(`${window.location.origin}/marketplace/wishlists/${wishlist.id}/shared`);
    toast({
      title: "Link copied",
      description: "Wishlist link copied to clipboard",
    });
  };

  if (status === "loading" || loading) {
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
            onClick={() => router.push("/marketplace/wishlists")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Wishlists</span>
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
          <Button onClick={() => router.push("/marketplace/wishlists")}>
            Back to My Wishlists
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
          onClick={() => router.push("/marketplace/wishlists")}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wishlists</span>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{wishlist.name}</h1>
            {wishlist.isDefault && (
              <Badge variant="outline">Default</Badge>
            )}
            {wishlist.isPublic ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>Public</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Private</span>
              </Badge>
            )}
          </div>
          {wishlist.description && (
            <p className="text-muted-foreground mt-1">{wishlist.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'} · Created {formatDate(wishlist.createdAt)}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWishlist}
            className="flex items-center gap-1"
            disabled={!wishlist.isPublic}
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/marketplace/wishlists/${wishlist.id}/edit`)}
            className="flex items-center gap-1"
          >
            <FileEdit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
        </div>
      </div>
      
      <Separator className="mb-6" />
      
      {wishlist.items.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">This wishlist is empty</h3>
          <p className="text-gray-500 mb-4">Browse the marketplace to add items to your wishlist</p>
          <Button onClick={() => router.push("/marketplace")}>Browse Marketplace</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative">
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
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 bg-white hover:bg-white/90"
                  onClick={() => handleRemoveItem(item.id, item.product.name)}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              
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
                {item.notes && (
                  <div className="mt-4 border-t pt-2">
                    <h4 className="text-sm font-medium">Your Notes:</h4>
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  </div>
                )}
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

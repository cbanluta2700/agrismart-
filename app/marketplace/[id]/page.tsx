"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { 
  CalendarIcon, 
  PersonIcon, 
  PinIcon, 
  PencilIcon, 
  TrashIcon, 
  ShoppingCartIcon,
  ChatBubbleIcon
} from "@radix-ui/react-icons";
import { Product } from "@/types/marketplace";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { ReviewsList } from "@/components/marketplace/reviews/reviews-list";
import { useProductView } from "@/hooks/useProductView";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { SimilarProducts, AlsoBoughtProducts } from "@/components/marketplace/recommendations";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const [isOwner, setIsOwner] = useState(false);

  // Track product view
  useProductView(params.id);

  // Track recently viewed in localStorage
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/products/${params.id}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch product");
        }
        
        const data = await res.json();
        setProduct(data);
        
        // Add to recently viewed in localStorage
        if (data) {
          addToRecentlyViewed({
            id: data.id,
            name: data.name,
            price: data.price,
            image: data.images && data.images.length > 0 ? data.images[0] : undefined
          });
        }
        
        // Check if current user is the owner
        setIsOwner(user?.id === data.sellerId);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProduct();
    }
  }, [params.id, user]);

  const handleEdit = () => {
    router.push(`/marketplace/${params.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/marketplace/products/${params.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete product");
      }

      router.push("/marketplace");
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    }
  };

  const handleBuy = () => {
    router.push(`/marketplace/${params.id}/checkout`);
  };

  const handleContactSeller = () => {
    // Redirect to chat with this seller about this product
    router.push(`/marketplace/chat?productId=${params.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Alert variant="destructive" className="mb-4">
          {error || "Product not found"}
        </Alert>
        <Button onClick={() => router.push("/marketplace")}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => router.push("/marketplace")}
      >
        ← Back to Marketplace
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Image Gallery */}
        <div className="md:col-span-2">
          <div className="relative h-96 w-full rounded-lg overflow-hidden mb-4">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <div key={index} className="relative h-20 w-20 flex-shrink-0">
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              <div className="mb-4">
                <Badge>{product.condition}</Badge>
                <Badge className="ml-2">{product.category.name}</Badge>
              </div>
              
              <p className="text-3xl font-bold mb-4">
                {formatCurrency(product.price)}
              </p>
              
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <PersonIcon />
                <span>Seller: {product.seller.name}</span>
              </div>
              
              {product.location && (
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <PinIcon />
                  <span>Location: {product.location.address}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <CalendarIcon />
                <span>Listed: {formatDate(product.createdAt)}</span>
              </div>
              
              {isOwner ? (
                <div className="flex gap-2">
                  <Button onClick={handleEdit} className="flex-1">
                    <PencilIcon className="mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    className="flex-1"
                  >
                    <TrashIcon className="mr-1" /> Delete
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="default" 
                    onClick={handleBuy} 
                    className="w-full"
                  >
                    <ShoppingCartIcon className="mr-1" /> Buy Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleContactSeller} 
                    className="w-full"
                  >
                    <ChatBubbleIcon className="mr-1" /> Contact Seller
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="whitespace-pre-line">{product.description}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Product Reviews Section */}
      <div className="mt-8">
        <Card>
          <CardContent className="p-6">
            {product && (
              <ReviewsList productId={product.id} sellerId={product.sellerId} />
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Product Recommendations */}
      <div className="mt-8">
        <SimilarProducts productId={product.id} />
      </div>
      
      <div className="mt-8">
        <AlsoBoughtProducts productId={product.id} />
      </div>
    </div>
  );
}

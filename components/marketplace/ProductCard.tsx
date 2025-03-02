import { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PinIcon } from "@radix-ui/react-icons";
import { Product } from "@/types/marketplace";
import { formatCurrency, formatDate } from "@/lib/utils";
import SaveToWishlistButton from "./wishlist/SaveToWishlistButton";

interface ProductCardProps {
  product: Product;
}

const ProductCard: FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="relative group">
      <Link href={`/marketplace/${product.id}`}>
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Badge className="bg-white text-gray-800">
                {product.condition}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg line-clamp-1 mb-1">
              {product.name}
            </h3>
            <p className="font-bold text-xl mb-2">{formatCurrency(product.price)}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{product.category?.name || "Uncategorized"}</span>
              <span className="text-xs">{formatDate(product.createdAt)}</span>
            </div>
            {product.location && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <PinIcon className="mr-1 h-3 w-3" />
                <span className="truncate">{product.location.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
      
      {/* Save to wishlist button (positioned absolutely) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
        <SaveToWishlistButton 
          productId={product.id} 
          variant="outline"
          size="icon"
          className="bg-white hover:bg-white/90 shadow-sm"
          productName={product.name}
        />
      </div>
    </div>
  );
};

export default ProductCard;

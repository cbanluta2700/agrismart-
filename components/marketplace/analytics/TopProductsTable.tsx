import React from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface ProductData {
  id: string;
  name: string;
  image: string | null;
  price: number | any;
  totalSales: number;
  quantitySold: number;
  categoryName: string;
  sellerName: string;
  sellerId: string;
}

interface TopProductsTableProps {
  data: ProductData[];
}

const TopProductsTable: React.FC<TopProductsTableProps> = ({ data }) => {
  // Format price for display
  const formatPrice = (price: any) => {
    if (typeof price === 'object' && price !== null) {
      return formatCurrency(price.amount || 0);
    }
    return formatCurrency(price || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md overflow-hidden relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-muted h-full w-full flex items-center justify-center text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                    <div>
                      <Link 
                        href={`/marketplace/${product.id}`}
                        className="font-medium hover:underline line-clamp-2"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.categoryName}</TableCell>
                <TableCell>
                  <Link 
                    href={`/marketplace/seller/${product.sellerId}`}
                    className="hover:underline"
                  >
                    {product.sellerName}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {formatPrice(product.price)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.totalSales)}
                </TableCell>
                <TableCell className="text-right">
                  {product.quantitySold}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopProductsTable;

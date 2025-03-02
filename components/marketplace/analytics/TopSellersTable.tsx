import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface SellerData {
  id: string;
  name: string;
  avatar: string | null;
  totalSales: number;
  orderCount: number;
  productCount: number;
}

interface TopSellersTableProps {
  data: SellerData[];
}

const TopSellersTable: React.FC<TopSellersTableProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Sellers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seller</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={seller.avatar || ''} alt={seller.name} />
                      <AvatarFallback>
                        {seller.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/marketplace/seller/${seller.id}`}
                        className="font-medium hover:underline"
                      >
                        {seller.name}
                      </Link>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(seller.totalSales)}
                </TableCell>
                <TableCell className="text-right">
                  {seller.orderCount}
                </TableCell>
                <TableCell className="text-right">
                  {seller.productCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopSellersTable;

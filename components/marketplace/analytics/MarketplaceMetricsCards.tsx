import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  ShoppingCart, 
  CreditCard, 
  Users, 
  Package 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MarketplaceMetrics {
  totalOrders: number;
  totalSalesAmount: number;
  averageOrderValue: number;
  activeSellersCount: number;
  newProductsCount: number;
}

interface MarketplaceMetricsCardsProps {
  metrics: MarketplaceMetrics;
  timeframe: string;
}

const MarketplaceMetricsCards: React.FC<MarketplaceMetricsCardsProps> = ({
  metrics,
  timeframe
}) => {
  // Helper function to display timeframe in human-readable format
  const getTimeframeText = () => {
    switch (timeframe) {
      case '7days':
        return 'past 7 days';
      case '30days':
        return 'past 30 days';
      case '90days':
        return 'past 90 days';
      case 'year':
        return 'past year';
      default:
        return 'this period';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Total Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.totalSalesAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getTimeframeText()}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Total Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalOrders}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getTimeframeText()}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Average Order Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averageOrderValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            per order
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Sellers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.activeSellersCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            with sales in {getTimeframeText()}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            New Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.newProductsCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            added in {getTimeframeText()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceMetricsCards;

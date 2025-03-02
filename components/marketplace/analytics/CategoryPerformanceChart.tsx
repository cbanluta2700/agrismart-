import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryData {
  id: string;
  name: string;
  totalSales: number;
  orderCount: number;
  productCount: number;
}

interface CategoryPerformanceChartProps {
  data: CategoryData[];
  limit?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const CategoryPerformanceChart: React.FC<CategoryPerformanceChartProps> = ({ 
  data,
  limit = 10
}) => {
  // Sort by total sales and limit to specified number
  const chartData = [...data]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            Sales: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-secondary">
            Orders: {payload[1].payload.orderCount}
          </p>
          <p className="text-muted-foreground">
            Products: {payload[1].payload.productCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 70,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end"
                tick={{ fontSize: 12 }}
                height={70}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="totalSales" name="Sales Amount" fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryPerformanceChart;

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SalesTrendData {
  date: string;
  amount: number;
  count: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[];
  timeframe: string;
  title?: string;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ 
  data, 
  timeframe,
  title = "Sales Trends"
}) => {
  // Format the date string based on timeframe
  const formatXAxis = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (timeframe === 'year') {
        return format(date, 'MMM yyyy');
      } else if (timeframe === '90days' || timeframe === '30days') {
        return format(date, 'MMM dd');
      } else {
        return format(date, 'dd MMM');
      }
    } catch (e) {
      return dateStr;
    }
  };

  // Custom tooltip to show both amount and count
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      try {
        const date = parseISO(label);
        const formattedDate = format(date, 'MMMM d, yyyy');
        
        return (
          <div className="bg-background border rounded-md p-3 shadow-sm">
            <p className="font-medium">{formattedDate}</p>
            <p className="text-primary">
              Sales: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-secondary">
              Orders: {payload[1].value}
            </p>
          </div>
        );
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                name="Sales Amount"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name="Order Count"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesTrendChart;

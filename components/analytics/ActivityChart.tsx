'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface TimeSeriesData {
  timeSegment: string;
  count: number;
}

interface ActivityChartProps {
  data: TimeSeriesData[];
  period: string;
  startDate: string;
  endDate: string;
  title?: string;
  description?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-blue-600">
          Count: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    );
  }

  return null;
};

export function ActivityChart({
  data,
  period,
  startDate,
  endDate,
  title = 'Activity Over Time',
  description,
  height = 300,
}: ActivityChartProps) {
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  
  // Format dates for the description
  const formattedStartDate = format(new Date(startDate), 'MMM d, yyyy');
  const formattedEndDate = format(new Date(endDate), 'MMM d, yyyy');
  
  // Create a default description if none is provided
  const defaultDescription = `User activity from ${formattedStartDate} to ${formattedEndDate}`;

  // Format x-axis ticks based on the period
  const formatXAxisTick = (value: string) => {
    const dateObj = new Date(value);
    
    switch (period) {
      case 'day':
        return format(dateObj, 'HH:mm');
      case 'week':
        return format(dateObj, 'EEE');
      case 'month':
        return format(dateObj, 'd MMM');
      case 'year':
        return format(dateObj, 'MMM');
      default:
        return value;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description || defaultDescription}</CardDescription>
          </div>
          <Tabs 
            defaultValue="line" 
            className="w-[200px]"
            onValueChange={(value) => setChartType(value as 'line' | 'bar')}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          {data.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-400">
              No data available for this period
            </div>
          ) : chartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="timeSegment" 
                  tickFormatter={formatXAxisTick}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Activity Count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="timeSegment" 
                  tickFormatter={formatXAxisTick}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Activity Count"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ActivityChart;

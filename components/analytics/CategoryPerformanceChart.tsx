import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface CategoryData {
  category: string;
  count: number;
  totalViews: number;
}

interface CategoryPerformanceChartProps {
  data: CategoryData[];
}

export const CategoryPerformanceChart: React.FC<CategoryPerformanceChartProps> = ({ data }) => {
  // Sort data by total views in descending order and take top 10
  const sortedData = [...data]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);
  
  // Format category names to handle long names
  const formattedData = sortedData.map(item => ({
    ...item,
    category: item.category.length > 15 
      ? `${item.category.substring(0, 12)}...` 
      : item.category
  }));

  if (formattedData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No category data available
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          layout="vertical"
          margin={{
            top: 5,
            right: 30,
            left: 100, // Extra space for category names
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="category" 
            type="category" 
            tick={{ fontSize: 12 }}
            width={100}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'Content Items') {
                return [`${value} items`, name];
              }
              return [`${value.toLocaleString()} views`, name];
            }}
            labelFormatter={(label) => `Category: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="count" 
            name="Content Items" 
            fill="#0ea5e9" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="totalViews" 
            name="Total Views" 
            fill="#f59e0b" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

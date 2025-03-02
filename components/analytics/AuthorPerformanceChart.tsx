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

interface AuthorData {
  author: string;
  count: number;
  totalViews: number;
}

interface AuthorPerformanceChartProps {
  data: AuthorData[];
}

export const AuthorPerformanceChart: React.FC<AuthorPerformanceChartProps> = ({ data }) => {
  // Sort data by total views in descending order and take top 10
  const sortedData = [...data]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);
  
  // Format author names to handle long names
  const formattedData = sortedData.map(item => ({
    ...item,
    author: item.author.length > 20 
      ? `${item.author.substring(0, 17)}...` 
      : item.author
  }));

  if (formattedData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No author data available
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
            left: 100, // Extra space for author names
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="author" 
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
            labelFormatter={(label) => `Author: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="count" 
            name="Content Items" 
            fill="#8b5cf6" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="totalViews" 
            name="Total Views" 
            fill="#ec4899" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

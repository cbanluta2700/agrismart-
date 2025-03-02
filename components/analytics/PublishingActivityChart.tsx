import React, { useEffect, useState } from 'react';
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

interface DataPoint {
  date: string;
  count: number;
}

interface PublishingActivityChartProps {
  data: DataPoint[];
}

export const PublishingActivityChart: React.FC<PublishingActivityChartProps> = ({ data }) => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  
  useEffect(() => {
    // Format data for chart display
    if (data && data.length > 0) {
      // Sort data by date
      const sortedData = [...data].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Format dates to be more readable
      const formattedData = sortedData.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      }));
      
      setChartData(formattedData);
    } else {
      // Provide empty data if no data is available
      setChartData([]);
    }
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No publishing data available for the selected time period
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval={'preserveStartEnd'}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            formatter={(value: number) => [`${value} items`, 'Published']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="count" 
            name="Published Items" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

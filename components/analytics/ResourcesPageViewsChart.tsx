import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
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

interface ResourcesPageViewsChartProps {
  data: DataPoint[];
}

export const ResourcesPageViewsChart: React.FC<ResourcesPageViewsChartProps> = ({ data }) => {
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
        No data available for the selected time period
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            // Show fewer ticks on smaller screens
            interval={'preserveStartEnd'}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            // Format numbers (e.g. 1000 -> 1K)
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
              }
              return value;
            }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value} views`, 'Views']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name="Page Views"
            stroke="#16a34a"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

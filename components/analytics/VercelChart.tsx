import React, { useEffect, useRef, useState } from 'react';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  Bar, 
  Line, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

// Recharts is a charting library recommended by Vercel for data visualization
// It's commonly used with Vercel applications

export type ChartType = 'line' | 'bar' | 'pie';

interface ChartDataPoint {
  [key: string]: any;
}

interface VercelChartProps {
  data: ChartDataPoint[];
  type?: ChartType;
  xAxisKey: string;
  yAxisKeys: string[];
  colors?: string[];
  height?: number;
  width?: string | number;
  title?: string;
  loading?: boolean;
}

const DEFAULT_COLORS = [
  '#0070f3', // Vercel blue
  '#50e3c2', // Teal
  '#f5a623', // Orange
  '#7928ca', // Purple
  '#ff0080', // Pink
  '#ff4d4d', // Red
];

export default function VercelChart({
  data,
  type = 'line',
  xAxisKey,
  yAxisKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  width = '100%',
  title,
  loading = false
}: VercelChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  useEffect(() => {
    setChartData(data);
  }, [data]);
  
  if (loading) {
    return (
      <div 
        className="bg-white p-4 rounded-lg shadow animate-pulse" 
        style={{ height: `${height}px`, width }}
      >
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-full bg-gray-100 rounded-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow" style={{ width }}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yAxisKeys[0]}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

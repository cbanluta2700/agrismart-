import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface StatusData {
  status: string;
  count: number;
}

interface ContentStatusChartProps {
  data: StatusData[];
}

export const ContentStatusChart: React.FC<ContentStatusChartProps> = ({ data }) => {
  // Define colors for different status types
  const COLORS = {
    published: '#22c55e', // green
    draft: '#f97316',    // orange
    review: '#3b82f6',   // blue
    archived: '#64748b', // slate
    scheduled: '#a855f7', // purple
    rejected: '#ef4444', // red
  };

  // Format status labels for better display
  const formattedData = data.map(item => ({
    ...item,
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
  }));

  if (formattedData.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-gray-500">
        No status data available
      </div>
    );
  }

  // Custom renderer for pie chart labels
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show percentage if it's significant enough (>=.05)
    return percent >= 0.05 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="w-full h-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="status"
          >
            {formattedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.status.toLowerCase() as keyof typeof COLORS] || '#9ca3af'}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value} items`, 'Count']}
          />
          <Legend 
            formatter={(value: string) => <span style={{ color: '#6b7280' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

import React from 'react';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAI } from 'ai/react';
import { Card } from '@/components/ui/card';

interface LineChartProps {
  /**
   * Data to be displayed in the chart
   */
  data: any[];
  /**
   * Categories to be displayed (series)
   */
  categories: string[];
  /**
   * Index field in data for x-axis
   */
  index: string;
  /**
   * Color for each category
   */
  colors?: string[];
  /**
   * Height of the chart, defaults to 300px
   */
  height?: number;
  /**
   * Format values for display
   */
  valueFormatter?: (value: number) => string;
  /**
   * Optional AI enhancements for the chart
   */
  aiEnhanced?: boolean;
  /**
   * Chart description for AI processing
   */
  description?: string;
  /**
   * Optional title for the chart
   */
  title?: string;
  /**
   * Optional CSS class name for additional styling
   */
  className?: string;
}

type ChartInsight = {
  text: string;
  type: 'info' | 'warning' | 'success';
};

/**
 * Line chart component using Recharts with optional Vercel AI SDK enhancement
 */
export function LineChart({
  data,
  categories,
  index,
  colors = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#8b5cf6'],
  height = 300,
  valueFormatter = (value) => `${value}`,
  aiEnhanced = false,
  description = '',
  title,
  className = '',
}: LineChartProps) {
  // Use Vercel AI SDK for enhanced visualization if enabled
  const { messages, append, isLoading } = useAI();
  const [insights, setInsights] = React.useState<ChartInsight[]>([]);
  const [highlightedSeries, setHighlightedSeries] = React.useState<string[]>([]);

  // Function to analyze data with AI (when aiEnhanced is true)
  React.useEffect(() => {
    if (aiEnhanced && data?.length > 0 && !isLoading && insights.length === 0) {
      // In a production app, we would call the Vercel AI API here
      // For now, we'll simulate some insights
      setTimeout(() => {
        // Find the category with the steepest slope (highest growth)
        const growthByCategory = categories.map(category => {
          if (data.length < 2) return { category, growth: 0 };
          const first = data[0][category] || 0;
          const last = data[data.length - 1][category] || 0;
          return { 
            category, 
            growth: ((last - first) / Math.max(1, first)) * 100
          };
        });
        
        const highestGrowth = growthByCategory.reduce(
          (max, curr) => (curr.growth > max.growth ? curr : max),
          { category: '', growth: -Infinity }
        );
        
        const newInsights: ChartInsight[] = [
          { 
            text: `${highestGrowth.category} shows the highest growth rate of ${highestGrowth.growth.toFixed(1)}%`, 
            type: 'success' 
          },
          { 
            text: 'Trend indicates continued pattern through next quarter',
            type: 'info'
          }
        ];
        
        setInsights(newInsights);
        setHighlightedSeries([highestGrowth.category]);
      }, 1000);
    }
  }, [aiEnhanced, data, isLoading, insights.length, categories]);

  if (!data || data.length === 0) {
    return (
      <Card className={`flex h-full items-center justify-center ${className}`}>
        <p className="text-muted-foreground p-4">No data available</p>
      </Card>
    );
  }

  // Determine if a line should be highlighted
  const getLineOpacity = (dataKey: string) => {
    if (aiEnhanced && highlightedSeries.length > 0) {
      return highlightedSeries.includes(dataKey) ? 1 : 0.4;
    }
    return 1;
  };

  const getLineWidth = (dataKey: string) => {
    if (aiEnhanced && highlightedSeries.length > 0) {
      return highlightedSeries.includes(dataKey) ? 2 : 1;
    }
    return 1.5;
  };

  return (
    <Card className={`w-full p-4 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={index}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tickFormatter={valueFormatter}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value), '']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            wrapperStyle={{ bottom: 0, fontSize: 12, color: '#64748b' }}
            formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
          />
          {categories.map((category, catIndex) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={colors[catIndex % colors.length]}
              strokeWidth={getLineWidth(category)}
              strokeOpacity={getLineOpacity(category)}
              dot={{
                r: 3,
                strokeWidth: 1,
                fill: '#fff',
                stroke: colors[catIndex % colors.length],
              }}
              activeDot={{ r: 5, strokeWidth: 0, fill: colors[catIndex % colors.length] }}
              isAnimationActive={true}
              animationDuration={1000}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
      
      {/* AI-powered insights section */}
      {aiEnhanced && insights.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-medium mb-2">AI Insights</h3>
          <ul className="space-y-1 text-sm">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start">
                <span className={`inline-block w-4 h-4 mr-2 ${
                  insight.type === 'info' ? 'text-blue-500' : 
                  insight.type === 'success' ? 'text-green-500' : 
                  'text-amber-500'
                }`}>•</span>
                <span className={
                  insight.type === 'info' ? 'text-blue-700' : 
                  insight.type === 'success' ? 'text-green-700' : 
                  'text-amber-700'
                }>{insight.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

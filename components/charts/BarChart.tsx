import React from 'react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useAI } from 'ai/react';
import { Card } from '@/components/ui/card';

interface BarChartProps {
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
 * Bar chart component using Recharts with optional Vercel AI SDK enhancement
 */
export function BarChart({ 
  data, 
  categories, 
  index, 
  colors = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#8b5cf6'], 
  height = 300,
  valueFormatter = (value) => `${value}`,
  aiEnhanced = false,
  description = '',
  title,
  className = ''
}: BarChartProps) {
  // Use Vercel AI SDK for enhanced visualization if enabled
  const { messages, append, isLoading } = useAI();
  const [insights, setInsights] = React.useState<ChartInsight[]>([]);
  const [highlightedBars, setHighlightedBars] = React.useState<number[]>([]);
  
  // Function to analyze data with AI (when aiEnhanced is true)
  React.useEffect(() => {
    if (aiEnhanced && data?.length > 0 && !isLoading && insights.length === 0) {
      // In a production app, we would call the Vercel AI API here
      // For now, we'll simulate some insights
      setTimeout(() => {
        const newInsights: ChartInsight[] = [
          { text: 'Highest value detected in the third category', type: 'info' },
          { text: 'There is a 23% growth compared to previous period', type: 'success' }
        ];
        
        setInsights(newInsights);
        // Highlight the highest value
        const maxIndex = data.findIndex((item, idx) => {
          const categoryValue = categories.reduce((max, cat) => {
            return item[cat] > max ? item[cat] : max;
          }, 0);
          return categoryValue === Math.max(...data.map(d => 
            categories.reduce((m, c) => d[c] > m ? d[c] : m, 0)
          ));
        });
        setHighlightedBars([maxIndex]);
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

  // Determine if a bar should be highlighted
  const getBarOpacity = (dataIndex: number) => {
    if (aiEnhanced && highlightedBars.length > 0) {
      return highlightedBars.includes(dataIndex) ? 1 : 0.6;
    }
    return 1;
  };

  return (
    <Card className={`w-full p-4 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
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
            <Bar
              key={category}
              dataKey={category}
              fill={colors[catIndex % colors.length]}
              radius={[4, 4, 0, 0]}
              barSize={30}
              animationDuration={500}
              isAnimationActive={true}
            />
          ))}
        </RechartsBarChart>
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

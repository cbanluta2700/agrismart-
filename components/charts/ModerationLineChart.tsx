'use client';

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI } from '@vercel/ai';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface ModerationTrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
  }[];
  timeframe: string;
}

interface ModerationLineChartProps {
  title: string;
  description?: string;
  data: ModerationTrendData;
  height?: number;
  showAIInsights?: boolean;
}

export default function ModerationLineChart({
  title,
  description,
  data,
  height = 300,
  showAIInsights = true,
}: ModerationLineChartProps) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    hover: {
      mode: 'nearest',
      intersect: true,
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Generate insights prompt based on the data
  const insightsPrompt = useMemo(() => {
    // Calculate trends
    const trends = data.datasets.map(ds => {
      const values = ds.data;
      if (values.length < 2) return { label: ds.label, trend: 'stable' };
      
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const percentChange = ((lastValue - firstValue) / firstValue) * 100;
      
      let trend = 'stable';
      if (percentChange > 10) trend = 'increasing';
      else if (percentChange < -10) trend = 'decreasing';
      
      return {
        label: ds.label,
        trend,
        percentChange: isFinite(percentChange) ? percentChange.toFixed(1) : '0',
      };
    });

    return `
      Based on the moderation trends data in this chart:
      - Time period: ${data.timeframe}
      - Time points: ${data.labels.join(', ')}
      - Trends: ${trends.map(t => `${t.label} is ${t.trend} (${t.percentChange}%)`).join('; ')}
      
      Provide 2-3 short, valuable insights about the moderation trends and suggest actionable steps or areas to monitor.
    `;
  }, [data]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Line options={options} data={data} />
        </div>
        
        {showAIInsights && (
          <Tabs defaultValue="insights" className="mt-4">
            <TabsList>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>
            <TabsContent value="insights">
              <Card className="bg-muted/50 p-4">
                <AI prompt={insightsPrompt}>
                  {({ completion }) => (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {completion || (
                        <div className="text-muted-foreground text-sm italic">
                          Analyzing trends...
                        </div>
                      )}
                    </div>
                  )}
                </AI>
              </Card>
            </TabsContent>
            <TabsContent value="raw">
              <div className="text-sm overflow-auto max-h-40">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border">Date</th>
                      {data.datasets.map((ds) => (
                        <th key={ds.label} className="text-left p-2 border">
                          {ds.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.labels.map((label, i) => (
                      <tr key={label}>
                        <td className="p-2 border">{label}</td>
                        {data.datasets.map((ds) => (
                          <td key={`${label}-${ds.label}`} className="p-2 border">
                            {ds.data[i]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

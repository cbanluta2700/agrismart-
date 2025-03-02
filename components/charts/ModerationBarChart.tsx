'use client';

import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI } from '@vercel/ai';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface ModerationData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
  timeframe: string;
}

interface ModerationBarChartProps {
  title: string;
  description?: string;
  data: ModerationData;
  height?: number;
  showAIInsights?: boolean;
}

export default function ModerationBarChart({
  title,
  description,
  data,
  height = 300,
  showAIInsights = true,
}: ModerationBarChartProps) {
  const options: ChartOptions<'bar'> = {
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
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Generate insights prompt based on the data
  const insightsPrompt = useMemo(() => {
    return `
      Based on the moderation data shown in this chart:
      - Time period: ${data.timeframe}
      - Categories: ${data.labels.join(', ')}
      - Values: ${data.datasets.map(ds => `${ds.label} (${ds.data.join(', ')})`).join('; ')}
      
      Provide 2-3 short, valuable insights about content moderation trends and actionable recommendations.
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
          <Bar options={options} data={data} />
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
                          Generating insights...
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
                      <th className="text-left p-2 border">Category</th>
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

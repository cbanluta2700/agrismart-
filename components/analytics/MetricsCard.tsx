'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricValue {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
}

interface MetricsCardProps {
  title: string;
  description?: string;
  metrics: MetricValue[];
  columns?: 1 | 2 | 3 | 4;
}

export function MetricsCard({
  title,
  description,
  metrics,
  columns = 4,
}: MetricsCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div 
          className={`grid gap-4 ${
            columns === 1 
              ? 'grid-cols-1' 
              : columns === 2 
                ? 'grid-cols-1 sm:grid-cols-2' 
                : columns === 3 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
          }`}
        >
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            
            return (
              <Card key={index} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium text-gray-500">{metric.label}</span>
                      <span className="text-2xl font-bold">{metric.value.toLocaleString()}</span>
                      
                      {metric.change && (
                        <div className={`text-xs flex items-center ${
                          metric.change.isPositive ? 'text-green-500' : 'text-red-500'
                        }`}>
                          <span>
                            {metric.change.isPositive ? '↑' : '↓'} {Math.abs(metric.change.value)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`p-2 rounded-full ${metric.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricsCard;

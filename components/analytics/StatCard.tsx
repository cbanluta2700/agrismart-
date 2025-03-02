import { ReactNode } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  changeLabel?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  changeLabel = 'from last period',
  changeDirection = 'neutral',
  loading = false
}: StatCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0 mr-3">
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500 truncate">
              {title}
            </p>
            <div className="mt-1 flex items-baseline">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                <p className="text-2xl font-semibold text-gray-900">
                  {value}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {change !== undefined && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="flex items-center">
            {changeDirection === 'up' && (
              <ArrowUpIcon
                className="flex-shrink-0 h-5 w-5 text-green-500"
                aria-hidden="true"
              />
            )}
            {changeDirection === 'down' && (
              <ArrowDownIcon
                className="flex-shrink-0 h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            )}
            <span
              className={`text-sm font-medium ${
                changeDirection === 'up'
                  ? 'text-green-600'
                  : changeDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
              } ml-2`}
            >
              <span className="sr-only">
                {changeDirection === 'up' ? 'Increased' : 'Decreased'} by
              </span>
              {change}% {changeLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

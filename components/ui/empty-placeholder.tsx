'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyPlaceholder({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
      {...props}
    >
      {icon && <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">{icon}</div>}
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      {description && <p className="mt-2 mb-4 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>}
      {action && action}
    </div>
  );
}

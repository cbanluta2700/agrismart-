'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DataExportProps {
  endpoint: string;
  queryParams?: Record<string, string>;
  filename?: string;
  label?: string;
  disabled?: boolean;
}

export function DataExport({
  endpoint,
  queryParams = {},
  filename = 'analytics-export',
  label = 'Export Data',
  disabled = false,
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams({ ...queryParams, export: 'true' });
    return params.toString();
  };

  const exportData = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    
    try {
      const params = buildQueryString();
      const response = await fetch(`${endpoint}?${params}&format=${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      
      // Get the file from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Set the file name with appropriate extension
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${extension}`;
      
      // Add to the DOM and trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Data exported as ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Choose format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportData('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportData('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DataExport;

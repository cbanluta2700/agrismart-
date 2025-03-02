import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type ExportDataType = 'sales' | 'categories' | 'sellers' | 'products' | 'all';

interface DataExportButtonProps {
  timeframe: string;
}

const DataExportButton: React.FC<DataExportButtonProps> = ({ timeframe }) => {
  const [isExporting, setIsExporting] = useState<ExportDataType | null>(null);

  const handleExport = async (type: ExportDataType) => {
    setIsExporting(type);
    
    try {
      // API call to export data
      const response = await fetch(`/api/marketplace/analytics/export?type=${type}&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agrismart-${type}-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      toast({
        title: 'Export Successful',
        description: `The ${type} data has been exported successfully.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'There was a problem exporting the data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          disabled={isExporting !== null}
          onClick={() => handleExport('sales')}
        >
          {isExporting === 'sales' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Sales Data
        </DropdownMenuItem>
        <DropdownMenuItem 
          disabled={isExporting !== null}
          onClick={() => handleExport('categories')}
        >
          {isExporting === 'categories' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Category Performance
        </DropdownMenuItem>
        <DropdownMenuItem 
          disabled={isExporting !== null}
          onClick={() => handleExport('sellers')}
        >
          {isExporting === 'sellers' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Seller Performance
        </DropdownMenuItem>
        <DropdownMenuItem 
          disabled={isExporting !== null}
          onClick={() => handleExport('products')}
        >
          {isExporting === 'products' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Product Performance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          disabled={isExporting !== null}
          onClick={() => handleExport('all')}
        >
          {isExporting === 'all' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Export All Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataExportButton;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import analyticsService from '@/server/src/lib/services/analyticsService';
import { Prisma } from '@prisma/client';

/**
 * Export analytics data in CSV or Excel format
 * GET /api/analytics/export?period=week&format=csv
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'year') || 'week';
    const groupId = searchParams.get('groupId') || undefined;
    const format = (searchParams.get('format') as 'csv' | 'excel') || 'csv';
    const dataType = searchParams.get('dataType') || 'events';
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    // Get data based on the requested type
    let data;
    let headers: string[];
    let filename: string;

    switch (dataType) {
      case 'events':
        // Get raw analytics events
        data = await analyticsService.getEventsForExport(period, groupId, limit);
        headers = ['Type', 'Entity Type', 'Entity ID', 'User ID', 'Group ID', 'Timestamp', 'Metadata'];
        filename = `analytics-events-${period}`;
        break;
        
      case 'users':
        // Get user activity data
        data = await analyticsService.getUserActivityForExport(period, groupId, limit);
        headers = ['User ID', 'User Name', 'Event Count', 'Last Activity', 'First Activity'];
        filename = `user-activity-${period}`;
        break;
        
      case 'content':
        // Get content performance data
        data = await analyticsService.getContentPerformanceForExport(period, groupId, limit);
        headers = ['Content ID', 'Title', 'Type', 'Views', 'Likes', 'Comments', 'Author'];
        filename = `content-performance-${period}`;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid data type requested' },
          { status: 400 }
        );
    }

    // Convert data to the requested format
    if (format === 'csv') {
      const csv = convertToCSV(data, headers);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // For Excel format, we'll use a simplified CSV approach that Excel can open
      // In a real implementation, you'd use a library like exceljs or xlsx
      const csv = convertToCSV(data, headers);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

// Helper function to convert data to CSV format
function convertToCSV(data: any[], headers: string[]): string {
  // Create CSV header row
  let csv = headers.join(',') + '\r\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const key = header.toLowerCase().replace(/\s+/g, '_');
      let value = item[key];
      
      // Handle special case for metadata which is JSON
      if (key === 'metadata' && typeof value === 'object') {
        value = JSON.stringify(value).replace(/"/g, '""');
      }
      
      // Format date values
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Escape and quote values with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value !== undefined && value !== null ? String(value) : '';
    });
    
    csv += row.join(',') + '\r\n';
  });
  
  return csv;
}

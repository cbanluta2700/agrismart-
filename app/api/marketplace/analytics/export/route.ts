import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { stringify } from 'csv-stringify/sync';

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user has admin rights
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        roles: true,
      },
    });
    
    if (!user || !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { message: "Access denied. Admin rights required." },
        { status: 403 }
      );
    }
    
    // Get export type and timeframe from query parameters
    const url = new URL(req.url);
    const exportType = url.searchParams.get("type") || "all";
    const timeframe = url.searchParams.get("timeframe") || "30days";
    
    // Determine date range based on timeframe
    let startDate = new Date();
    const endDate = new Date();
    
    switch (timeframe) {
      case "7days":
        startDate = subDays(startDate, 7);
        break;
      case "30days":
        startDate = subDays(startDate, 30);
        break;
      case "90days":
        startDate = subDays(startDate, 90);
        break;
      case "year":
        startDate = subYears(startDate, 1);
        break;
      default:
        startDate = subDays(startDate, 30);
    }
    
    // Format as ISO strings
    const startDateISO = startOfDay(startDate).toISOString();
    const endDateISO = endOfDay(endDate).toISOString();
    
    let csvData: string = '';
    let fileName = `agrismart-export-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    switch (exportType) {
      case "sales":
        csvData = await generateSalesExport(startDateISO, endDateISO, timeframe);
        fileName = `agrismart-sales-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      case "categories":
        csvData = await generateCategoryExport(startDateISO, endDateISO);
        fileName = `agrismart-categories-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      case "sellers":
        csvData = await generateSellerExport(startDateISO, endDateISO);
        fileName = `agrismart-sellers-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      case "products":
        csvData = await generateProductExport(startDateISO, endDateISO);
        fileName = `agrismart-products-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      case "all":
        // For "all", we'll create a combined export with multiple sections
        const salesData = await generateSalesExport(startDateISO, endDateISO, timeframe);
        const categoryData = await generateCategoryExport(startDateISO, endDateISO);
        const sellerData = await generateSellerExport(startDateISO, endDateISO);
        const productData = await generateProductExport(startDateISO, endDateISO);
        
        csvData = "AGRISMART MARKETPLACE EXPORT\n";
        csvData += `Export Date: ${format(new Date(), 'yyyy-MM-dd')}\n`;
        csvData += `Timeframe: ${timeframe}\n\n`;
        
        csvData += "SALES DATA\n";
        csvData += salesData;
        csvData += "\n\nCATEGORY PERFORMANCE\n";
        csvData += categoryData;
        csvData += "\n\nSELLER PERFORMANCE\n";
        csvData += sellerData;
        csvData += "\n\nPRODUCT PERFORMANCE\n";
        csvData += productData;
        
        fileName = `agrismart-complete-export-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      default:
        return NextResponse.json(
          { message: "Invalid export type" },
          { status: 400 }
        );
    }
    
    // Return CSV file
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
  } catch (error) {
    console.error("Error generating export:", error);
    return NextResponse.json(
      { message: "An error occurred while generating the export" },
      { status: 500 }
    );
  }
}

// Helper function to generate sales data export
async function generateSalesExport(startDate: string, endDate: string, timeframe: string): Promise<string> {
  // Get all orders within date range
  const orders = await db.marketplaceOrder.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      product: {
        select: {
          name: true,
        },
      },
      seller: {
        select: {
          name: true,
        },
      },
      buyer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  // Format order data for CSV
  const ordersFormatted = orders.map(order => ({
    'Order ID': order.id,
    'Product': order.product.name,
    'Seller': order.seller.name,
    'Buyer': order.buyer.name,
    'Status': order.status,
    'Amount': typeof order.totalAmount === 'object' 
      ? (order.totalAmount as any).amount || 0 
      : order.totalAmount || 0,
    'Date': format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  }));
  
  // Generate CSV
  return stringify(ordersFormatted, { header: true });
}

// Helper function to generate category performance export
async function generateCategoryExport(startDate: string, endDate: string): Promise<string> {
  // Get category performance data
  const categories = await db.marketplaceCategory.findMany({
    select: {
      id: true,
      name: true,
      products: {
        select: {
          id: true,
          orders: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
              status: {
                notIn: ["cancelled", "refunded"],
              },
            },
            select: {
              id: true,
              totalAmount: true,
            },
          },
        },
      },
    },
  });
  
  // Format category data for CSV
  const categoriesFormatted = categories.map(category => {
    let totalSales = 0;
    let orderCount = 0;
    
    category.products.forEach(product => {
      orderCount += product.orders.length;
      
      product.orders.forEach(order => {
        const amount = typeof order.totalAmount === "object"
          ? (order.totalAmount as any).amount || 0
          : order.totalAmount || 0;
        
        totalSales += Number(amount);
      });
    });
    
    return {
      'Category ID': category.id,
      'Category Name': category.name,
      'Total Sales': totalSales,
      'Order Count': orderCount,
      'Product Count': category.products.length,
      'Average Order Value': orderCount > 0 ? (totalSales / orderCount).toFixed(2) : 0,
    };
  });
  
  // Sort by total sales descending
  categoriesFormatted.sort((a, b) => b['Total Sales'] - a['Total Sales']);
  
  // Generate CSV
  return stringify(categoriesFormatted, { header: true });
}

// Helper function to generate seller performance export
async function generateSellerExport(startDate: string, endDate: string): Promise<string> {
  // Get seller performance data
  const sellers = await db.user.findMany({
    where: {
      roles: {
        has: "SELLER",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      sellerOrders: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      },
      sellerProducts: {
        select: {
          id: true,
        },
      },
    },
  });
  
  // Format seller data for CSV
  const sellersFormatted = sellers.map(seller => {
    // Calculate completed orders count
    const completedOrders = seller.sellerOrders.filter(order => 
      !["cancelled", "refunded"].includes(order.status)
    );
    
    // Calculate total sales
    const totalSales = completedOrders.reduce((sum, order) => {
      const amount = typeof order.totalAmount === "object"
        ? (order.totalAmount as any).amount || 0
        : order.totalAmount || 0;
      
      return sum + Number(amount);
    }, 0);
    
    return {
      'Seller ID': seller.id,
      'Seller Name': seller.name,
      'Email': seller.email,
      'Total Sales': totalSales,
      'Total Orders': seller.sellerOrders.length,
      'Completed Orders': completedOrders.length,
      'Cancellation Rate': seller.sellerOrders.length > 0 
        ? ((seller.sellerOrders.length - completedOrders.length) / seller.sellerOrders.length * 100).toFixed(2) + '%'
        : '0%',
      'Product Count': seller.sellerProducts.length,
      'Average Order Value': completedOrders.length > 0 
        ? (totalSales / completedOrders.length).toFixed(2) 
        : 0,
    };
  });
  
  // Sort by total sales descending
  sellersFormatted.sort((a, b) => b['Total Sales'] - a['Total Sales']);
  
  // Generate CSV
  return stringify(sellersFormatted, { header: true });
}

// Helper function to generate product performance export
async function generateProductExport(startDate: string, endDate: string): Promise<string> {
  // Get product performance data
  const products = await db.marketplaceProduct.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      createdAt: true,
      category: {
        select: {
          name: true,
        },
      },
      seller: {
        select: {
          name: true,
        },
      },
      orders: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          quantity: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
    },
  });
  
  // Format product data for CSV
  const productsFormatted = products.map(product => {
    // Calculate completed orders
    const completedOrders = product.orders.filter(order => 
      !["cancelled", "refunded"].includes(order.status)
    );
    
    // Calculate total sales
    const totalSales = completedOrders.reduce((sum, order) => {
      const amount = typeof order.totalAmount === "object"
        ? (order.totalAmount as any).amount || 0
        : order.totalAmount || 0;
      
      return sum + Number(amount);
    }, 0);
    
    // Calculate quantity sold
    const quantitySold = completedOrders.reduce((sum, order) => {
      return sum + (order.quantity || 1);
    }, 0);
    
    // Calculate average rating
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;
    
    // Format price
    const price = typeof product.price === "object"
      ? (product.price as any).amount || 0
      : product.price || 0;
    
    return {
      'Product ID': product.id,
      'Product Name': product.name,
      'Category': product.category?.name || 'Uncategorized',
      'Seller': product.seller.name,
      'Price': price,
      'Total Sales': totalSales,
      'Quantity Sold': quantitySold,
      'Order Count': completedOrders.length,
      'Average Rating': averageRating.toFixed(1),
      'Review Count': product.reviews.length,
      'Added Date': format(new Date(product.createdAt), 'yyyy-MM-dd'),
    };
  });
  
  // Sort by total sales descending
  productsFormatted.sort((a, b) => b['Total Sales'] - a['Total Sales']);
  
  // Generate CSV
  return stringify(productsFormatted, { header: true });
}

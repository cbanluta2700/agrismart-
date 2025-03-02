import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

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
    
    const userId = session.user.id;
    
    // Check if user is a seller
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        roles: true,
      },
    });
    
    if (!user || !user.roles.includes("SELLER")) {
      return NextResponse.json(
        { message: "Access denied. Seller account required." },
        { status: 403 }
      );
    }
    
    // Get timeframe from query parameter
    const url = new URL(req.url);
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
    
    // Get total sales for the period
    const sales = await db.marketplaceOrder.findMany({
      where: {
        sellerId: userId,
        createdAt: {
          gte: startDateISO,
          lte: endDateISO,
        },
        status: {
          notIn: ["cancelled", "refunded"],
        },
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        status: true,
      },
    });
    
    // Calculate total sales amount
    const totalSales = sales.reduce((sum, order) => {
      const amount = typeof order.totalAmount === "object"
        ? (order.totalAmount as any).amount || 0
        : order.totalAmount || 0;
      return sum + Number(amount);
    }, 0);
    
    // Calculate average order value
    const averageOrderValue = sales.length > 0 ? totalSales / sales.length : 0;
    
    // Get pending orders count
    const pendingOrdersCount = await db.marketplaceOrder.count({
      where: {
        sellerId: userId,
        status: {
          in: ["pending", "confirmed", "payment_pending"],
        },
      },
    });
    
    // Fetch sales data grouped by date
    const salesByDate = await generateSalesByDateData(userId, startDateISO, endDateISO, timeframe);
    
    // Get top products
    const topProducts = await db.marketplaceProduct.findMany({
      where: {
        sellerId: userId,
      },
      select: {
        id: true,
        name: true,
        images: true,
        orders: {
          where: {
            createdAt: {
              gte: startDateISO,
              lte: endDateISO,
            },
            status: {
              notIn: ["cancelled", "refunded"],
            },
          },
          select: {
            id: true,
            totalAmount: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        orders: {
          _count: "desc",
        },
      },
      take: 10,
    });
    
    // Calculate total sales and quantity sold for each product
    const formattedTopProducts = topProducts.map((product) => {
      const totalSales = product.orders.reduce((sum, order) => {
        const amount = typeof order.totalAmount === "object"
          ? (order.totalAmount as any).amount || 0
          : order.totalAmount || 0;
        return sum + Number(amount);
      }, 0);
      
      const quantitySold = product.orders.reduce((sum, order) => {
        return sum + (order.quantity || 1);
      }, 0);
      
      return {
        id: product.id,
        name: product.name,
        totalSales,
        quantitySold,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
      };
    });
    
    // Get recent orders with details
    const recentOrders = await db.marketplaceOrder.findMany({
      where: {
        sellerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
    
    // Format orders
    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      productName: order.product.name,
      productImage: order.product.images && order.product.images.length > 0 
        ? order.product.images[0]
        : null,
      buyerName: order.buyer.name,
      buyerId: order.buyer.id,
      buyerImage: order.buyer.avatar,
      status: order.status,
      totalAmount: typeof order.totalAmount === "object"
        ? (order.totalAmount as any).amount || 0
        : order.totalAmount || 0,
      createdAt: order.createdAt,
    }));
    
    // Prepare the dashboard data
    const dashboardData = {
      totalSales,
      salesCount: sales.length,
      averageOrderValue,
      pendingOrdersCount,
      salesByDate,
      topProducts: formattedTopProducts,
      recentOrders: formattedOrders,
    };
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching seller dashboard data:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching dashboard data" },
      { status: 500 }
    );
  }
}

// Helper function to generate sales data by date
async function generateSalesByDateData(
  userId: string,
  startDate: string,
  endDate: string,
  timeframe: string
) {
  // Get all orders within date range
  const orders = await db.marketplaceOrder.findMany({
    where: {
      sellerId: userId,
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
      createdAt: true,
    },
  });
  
  // Group orders by date
  const ordersByDate = orders.reduce((acc, order) => {
    // Format date based on timeframe
    let dateKey;
    const orderDate = new Date(order.createdAt);
    
    if (timeframe === "year") {
      // Group by month for yearly view
      dateKey = format(orderDate, "yyyy-MM-01");
    } else {
      // Group by day for other timeframes
      dateKey = format(orderDate, "yyyy-MM-dd");
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        amount: 0,
        count: 0,
      };
    }
    
    const amount = typeof order.totalAmount === "object"
      ? (order.totalAmount as any).amount || 0
      : order.totalAmount || 0;
    
    acc[dateKey].amount += Number(amount);
    acc[dateKey].count += 1;
    
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);
  
  // Generate date range based on timeframe
  const dateRange: string[] = [];
  let currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  while (currentDate <= lastDate) {
    let dateKey;
    
    if (timeframe === "year") {
      // Format as first day of month for yearly view
      dateKey = format(currentDate, "yyyy-MM-01");
      // Move to next month
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    } else {
      // Format as full date for other timeframes
      dateKey = format(currentDate, "yyyy-MM-dd");
      // Move to next day
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    
    if (!dateRange.includes(dateKey)) {
      dateRange.push(dateKey);
    }
  }
  
  // Create final sales data array with all dates
  const salesByDate = dateRange.map((date) => ({
    date,
    amount: ordersByDate[date]?.amount || 0,
    count: ordersByDate[date]?.count || 0,
  }));
  
  return salesByDate;
}

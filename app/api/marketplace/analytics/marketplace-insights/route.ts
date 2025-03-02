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
    
    // Check if user has admin rights to view marketplace insights
    const user = await db.user.findUnique({
      where: {
        id: userId,
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
    
    // 1. Overall Marketplace Health Metrics
    
    // Total orders in the timeframe
    const totalOrders = await db.marketplaceOrder.count({
      where: {
        createdAt: {
          gte: startDateISO,
          lte: endDateISO,
        },
        status: {
          notIn: ["cancelled", "refunded"],
        },
      },
    });
    
    // Total sales amount
    const salesResult = await db.marketplaceOrder.findMany({
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
        totalAmount: true,
      },
    });
    
    const totalSalesAmount = salesResult.reduce((sum, order) => {
      const amount = typeof order.totalAmount === "object"
        ? (order.totalAmount as any).amount || 0
        : order.totalAmount || 0;
      return sum + Number(amount);
    }, 0);
    
    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalSalesAmount / totalOrders : 0;
    
    // Active seller count
    const activeSellersCount = await db.$queryRaw<number>`
      SELECT COUNT(DISTINCT "sellerId") 
      FROM "MarketplaceOrder" 
      WHERE "createdAt" >= ${startDateISO} 
      AND "createdAt" <= ${endDateISO}
      AND "status" NOT IN ('cancelled', 'refunded')
    `;
    
    // New products added in timeframe
    const newProductsCount = await db.marketplaceProduct.count({
      where: {
        createdAt: {
          gte: startDateISO,
          lte: endDateISO,
        },
      },
    });
    
    // 2. Category Performance
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
              },
            },
          },
        },
      },
    });
    
    const categoryPerformance = categories.map(category => {
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
        id: category.id,
        name: category.name,
        totalSales,
        orderCount,
        productCount: category.products.length,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
    
    // 3. Top Sellers
    const topSellers = await db.user.findMany({
      where: {
        roles: {
          has: "SELLER",
        },
        sellerOrders: {
          some: {
            createdAt: {
              gte: startDateISO,
              lte: endDateISO,
            },
            status: {
              notIn: ["cancelled", "refunded"],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        sellerOrders: {
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
          },
        },
        sellerProducts: {
          select: {
            id: true,
          },
        },
      },
      take: 10,
    });
    
    const formattedTopSellers = topSellers
      .map(seller => {
        const totalSales = seller.sellerOrders.reduce((sum, order) => {
          const amount = typeof order.totalAmount === "object"
            ? (order.totalAmount as any).amount || 0
            : order.totalAmount || 0;
          
          return sum + Number(amount);
        }, 0);
        
        return {
          id: seller.id,
          name: seller.name,
          avatar: seller.avatar,
          totalSales,
          orderCount: seller.sellerOrders.length,
          productCount: seller.sellerProducts.length,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
    
    // 4. Sales Trends
    const salesTrends = await generateSalesTrendData(startDateISO, endDateISO, timeframe);
    
    // 5. Top Products
    const topProducts = await db.marketplaceProduct.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: startDateISO,
              lte: endDateISO,
            },
            status: {
              notIn: ["cancelled", "refunded"],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
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
      take: 10,
    });
    
    const formattedTopProducts = topProducts
      .map(product => {
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
          price: product.price,
          categoryName: product.category.name,
          sellerName: product.seller.name,
          sellerId: product.seller.id,
          totalSales,
          quantitySold,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
    
    // Prepare the insights data
    const insightsData = {
      overallMetrics: {
        totalOrders,
        totalSalesAmount,
        averageOrderValue,
        activeSellersCount,
        newProductsCount,
      },
      categoryPerformance,
      topSellers: formattedTopSellers,
      salesTrends,
      topProducts: formattedTopProducts,
    };
    
    return NextResponse.json(insightsData);
  } catch (error) {
    console.error("Error fetching marketplace insights data:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching marketplace insights" },
      { status: 500 }
    );
  }
}

// Helper function to generate sales trend data
async function generateSalesTrendData(
  startDate: string,
  endDate: string,
  timeframe: string
) {
  // Get all orders within date range
  const orders = await db.marketplaceOrder.findMany({
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
  const salesTrends = dateRange.map((date) => ({
    date,
    amount: ordersByDate[date]?.amount || 0,
    count: ordersByDate[date]?.count || 0,
  }));
  
  return salesTrends;
}

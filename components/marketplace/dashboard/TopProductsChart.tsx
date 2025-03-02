"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatCurrency } from "@/lib/marketplace-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Product {
  id: string;
  name: string;
  totalSales: number;
  quantitySold: number;
  image: string | null;
}

interface TopProductsChartProps {
  products: Product[];
  showTable?: boolean;
}

export default function TopProductsChart({
  products,
  showTable = false,
}: TopProductsChartProps) {
  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (context.dataset.label === "Sales Amount") {
              return `Sales: ${formatCurrency(context.parsed.x)}`;
            } else {
              return `Quantity: ${context.parsed.x}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Sales Amount",
        },
        ticks: {
          callback: function (value) {
            return formatCurrency(value as number);
          },
        },
      },
      y: {
        title: {
          display: true,
          text: "Product",
        },
      },
    },
  };

  // Sort products by sales amount and take top 5
  const topProducts = [...products]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  const labels = topProducts.map((product) => 
    product.name.length > 20
      ? product.name.substring(0, 20) + "..."
      : product.name
  );
  
  const data = {
    labels,
    datasets: [
      {
        label: "Sales Amount",
        data: topProducts.map((product) => product.totalSales),
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  return (
    <div>
      <div className="h-[300px]">
        <Bar options={options} data={data} />
      </div>
      
      {showTable && (
        <div className="mt-8 rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity Sold</TableHead>
                <TableHead>Sales Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.image ? (
                        <div className="w-8 h-8 rounded overflow-hidden">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                          No img
                        </div>
                      )}
                      <span className="truncate max-w-[200px]">
                        {product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{product.quantitySold}</TableCell>
                  <TableCell>{formatCurrency(product.totalSales)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/marketplace/products/${product.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

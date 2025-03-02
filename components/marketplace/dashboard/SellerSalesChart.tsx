"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/marketplace-utils";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SalesData {
  date: string;
  amount: number;
  count: number;
}

interface SellerSalesChartProps {
  salesData: SalesData[];
  timeframe: string;
}

export default function SellerSalesChart({
  salesData,
  timeframe,
}: SellerSalesChartProps) {
  const formatDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    switch (timeframe) {
      case "7days":
        return format(date, "EEE");
      case "30days":
        return format(date, "MMM d");
      case "90days":
        return format(date, "MMM d");
      case "year":
        return format(date, "MMM yyyy");
      default:
        return format(date, "MMM d");
    }
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (context.dataset.label === "Sales") {
              return `Sales: ${formatCurrency(context.parsed.y)}`;
            } else {
              return `Orders: ${context.parsed.y}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: "left",
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
      y1: {
        beginAtZero: true,
        position: "right",
        title: {
          display: true,
          text: "Number of Orders",
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
    },
  };

  const labels = salesData.map((item) => formatDateLabel(item.date));
  
  const data = {
    labels,
    datasets: [
      {
        label: "Sales",
        data: salesData.map((item) => item.amount),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Orders",
        data: salesData.map((item) => item.count),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        yAxisID: "y1",
      },
    ],
  };

  return (
    <div className="h-[300px]">
      <Line options={options} data={data} />
    </div>
  );
}

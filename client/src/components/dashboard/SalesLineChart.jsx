import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Legend,
  Tooltip,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { AlertCircle, AlertTriangle } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Legend,
  Tooltip
);

export default function SalesLineChart({ data }) {
  const defaultLabels = ["May 1", "May 8", "May 15", "May 22", "May 31"];
  const thisMonthData = data?.thisMonth || [45, 90, 110, 155, 185];
  const lastMonthData = data?.lastMonth || [30, 60, 85, 120, 140];

  const chartData = {
    labels: data?.labels || defaultLabels,
    datasets: [
      {
        label: "This Month",
        data: thisMonthData,
        borderColor: "#16803C",
        backgroundColor: "rgba(22, 128, 60, 0.08)",
        borderWidth: 2.5,
        pointBackgroundColor: "#16803C",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.35,
        fill: true,
      },
      {
        label: "Last Month",
        data: lastMonthData,
        borderColor: "#9CA3AF",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.35,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Custom legend in card header
      },
      tooltip: {
        backgroundColor: "#0F3D2E",
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 200,
        ticks: {
          stepSize: 50,
          color: "#9CA3AF",
          font: { size: 11 },
        },
        grid: {
          color: "#F3F4F6",
        },
        border: {
          dash: [4, 4],
        },
      },
      x: {
        ticks: {
          color: "#9CA3AF",
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="w-full h-56 sm:h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}

export function CategoryDoughnut({ categories }) {
  const defaultCategories = [
    { name: "Vegetables", percentage: 35, color: "#16803C" },
    { name: "Fruits", percentage: 25, color: "#3B82F6" },
    { name: "Grains & Pulses", percentage: 15, color: "#F59E0B" },
    { name: "Dairy Products", percentage: 15, color: "#10B981" },
    { name: "Others", percentage: 10, color: "#EC4899" },
  ];

  const items = categories || defaultCategories;

  const chartData = {
    labels: items.map((c) => c.name),
    datasets: [
      {
        data: items.map((c) => c.percentage),
        backgroundColor: items.map((c) => c.color),
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}%`,
        },
      },
    },
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut with Center Total */}
      <div className="relative w-40 h-40 shrink-0">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
          <span className="text-2xl font-extrabold text-gray-900 leading-tight">48</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 flex-1 w-full text-xs">
        {items.map((cat, i) => (
          <div key={i} className="flex items-center justify-between text-gray-600">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium">{cat.name}</span>
            </div>
            <span className="font-bold text-gray-900">{cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryAlertsList({ alerts }) {
  const defaultAlerts = [
    {
      name: "Organic Carrots",
      stock: "Stock low (5 kg)",
      badge: "Low Stock",
      type: "danger",
    },
    {
      name: "A2 Cow Milk",
      stock: "Stock low (3 L)",
      badge: "Low Stock",
      type: "danger",
    },
    {
      name: "Fresh Spinach",
      stock: "Reorder soon (12 kg)",
      badge: "Reorder",
      type: "warning",
    },
  ];

  const list = alerts || defaultAlerts;

  return (
    <div className="space-y-3">
      {list.map((item, idx) => {
        const isDanger = item.type === "danger" || item.badge?.includes("Low");
        return (
          <div
            key={idx}
            className="p-3 rounded-xl border border-gray-100 bg-gray-50/40 flex items-center justify-between gap-3 hover:border-gray-200 transition"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {isDanger ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 leading-snug">
                  {item.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.stock}</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDanger
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {item.badge || item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

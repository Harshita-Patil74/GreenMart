import React from "react";
import { Chart as ChartJS, ArcElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip);

function SalesTrend({ labels = [], values = [], orderValues }) {
  const datasets = [{
    label: "Revenue",
    data: values,
    borderColor: "#16803C",
    backgroundColor: "rgba(22,128,60,.10)",
    fill: true,
    tension: 0.35,
    pointRadius: 3,
    yAxisID: "y",
  }];
  if (orderValues) datasets.push({
    label: "Orders",
    data: orderValues,
    borderColor: "#F59E0B",
    backgroundColor: "#F59E0B",
    tension: 0.35,
    pointRadius: 3,
    yAxisID: "orders",
  });
  const data = {
    labels,
    datasets,
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: Boolean(orderValues), position: "bottom" } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value) => `₹${value}` } },
      x: { grid: { display: false } },
      ...(orderValues ? { orders: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, ticks: { precision: 0 } } } : {}),
    },
  };
  return <div className="h-52">{labels.length ? <Line data={data} options={options} /> : <p className="flex h-full items-center justify-center text-xs text-gray-500">No sales data for this period.</p>}</div>;
}

function CategoryShare({ categories = [] }) {
  const colors = ["#16803C", "#3B82F6", "#F59E0B", "#10B981", "#EC4899", "#8B5CF6", "#0EA5E9"];
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const data = {
    labels: categories.map((category) => category.name),
    datasets: [{ data: categories.map((category) => category.count), backgroundColor: categories.map((_, index) => colors[index % colors.length]), borderWidth: 2, borderColor: "#fff" }],
  };
  return <div className="flex flex-wrap items-center gap-4">
    <div className="relative h-36 w-36 shrink-0">{categories.length ? <Doughnut data={data} options={{ responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false } } }} /> : <p className="flex h-full items-center justify-center rounded-full bg-gray-50 text-[10px] text-gray-400">No data</p>}<span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{total}</span></div>
    <div className="min-w-36 flex-1 space-y-2">{categories.map((category, index) => <div key={category.name} className="flex items-center justify-between gap-2 text-[10px]"><span className="flex min-w-0 items-center gap-2 truncate text-gray-600"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{category.name}</span><span className="font-semibold text-gray-800">{category.count}</span></div>)}</div>
  </div>;
}

export default { SalesTrend, CategoryShare };

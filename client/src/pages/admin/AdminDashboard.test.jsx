import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

vi.mock("../../api/adminApi.js", () => ({ default: {
  stats: vi.fn(),
  lowStock: vi.fn(),
} }));
vi.mock("../../api/orderApi.js", () => ({ default: { adminAll: vi.fn() } }));
vi.mock("../../api/productApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../components/admin/AdminCharts.jsx", () => ({ default: { SalesTrend: () => null, CategoryShare: () => null } }));

import adminApi from "../../api/adminApi.js";
import orderApi from "../../api/orderApi.js";
import productApi from "../../api/productApi.js";

describe("Admin Dashboard page", () => {
  const preloaded = { auth: { user: { name: "Admin", email: "admin@demo.test", role: "admin" } }, cart: { items: [], deliveryCharge: 30 } };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.stats.mockResolvedValue({ data: { totalProducts: 48, totalOrders: 124, totalFarmers: 12, totalUsers: 86 } });
    adminApi.lowStock.mockResolvedValue({ data: [{ _id: "low-1", name: "Carrots", stock: 3 }] });
    orderApi.adminAll.mockResolvedValue({ data: [{ _id: "order-1", orderNumber: "GM12345", status: "Delivered", total: 80, createdAt: new Date().toISOString() }] });
    productApi.list.mockResolvedValue({ data: { items: [{ _id: "product-1", category: "Vegetables" }] } });
  });

  it("loads real platform metrics, orders, inventory activity, and chart categories", async () => {
    renderWithStore(<AdminDashboard />, preloaded);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: /Admin Dashboard/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("48")).toBeInTheDocument());
    expect(screen.getByText(/Total Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Customers/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Farmers/i)).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText(/#GM12345/)).toBeInTheDocument();
    expect(screen.getByText("Products by Category")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GreenMart Organic Products" })).toHaveClass("text-white");
    expect(screen.getByTestId("admin-dashboard-banner")).toHaveAttribute("src", "/images/banners/hero-basket.jpg");
  });
});

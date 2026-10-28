import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import farmerApi from "../../api/farmerApi";
import orderApi from "../../api/orderApi";
import productApi from "../../api/productApi";
import FarmerDashboard from "./FarmerDashboard.jsx";

vi.mock("../../api/productApi", () => ({
  default: {
    mine: vi.fn(() => Promise.resolve({ data: [
      { _id: "product-1", name: "Sample crop", stock: 4, lowStockThreshold: 5 },
      { _id: "product-2", name: "Another crop", stock: 20, lowStockThreshold: 5 },
    ] })),
  },
}));

vi.mock("../../api/orderApi", () => ({
  default: {
    farmer: vi.fn(() => Promise.resolve({ data: [
      {
        _id: "order-1",
        orderNumber: "GM-TEST-1",
        status: "Order Placed",
        createdAt: "2026-10-25T10:00:00.000Z",
        items: [{ name: "Sample crop", quantity: 2, price: 50, farmer: "farmer-1" }],
      },
      {
        _id: "order-2",
        orderNumber: "GM-TEST-2",
        status: "Delivered",
        createdAt: "2026-10-24T10:00:00.000Z",
        items: [{ name: "Another crop", quantity: 5, price: 100, farmer: "farmer-1" }],
      },
    ] })),
  },
}));

vi.mock("../../api/farmerApi", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { farmName: "Test farm", address: "Test location" } })),
  },
}));

describe("Farmer Dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows authenticated farmer metrics and orders from the farmer APIs", async () => {
    renderWithStore(<FarmerDashboard />, {
      auth: { user: { _id: "farmer-1", name: "Test Farmer", role: "farmer" }, token: "test-token" },
      cart: { items: [], deliveryCharge: 30 },
    });

    expect(screen.getByText("Farmer Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Test Farmer/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("GM-TEST-1")).toBeInTheDocument());
    expect(screen.getByText("Recent Orders")).toBeInTheDocument();
    expect(screen.getByText("Test farm")).toBeInTheDocument();
    expect(screen.getByText("Pending Orders").parentElement.textContent).toContain("1");
    expect(screen.getByText("Total Earnings").parentElement.textContent).toContain("500");
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("shows an admin-safe farmer dashboard without requesting a farmer's private data", () => {
    renderWithStore(<FarmerDashboard />, {
      auth: { user: { _id: "admin-1", name: "Admin", role: "admin" }, token: "admin-token" },
      cart: { items: [], deliveryCharge: 30 },
    });

    expect(screen.getByRole("heading", { name: "Farmer Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage farmers/i })).toHaveAttribute("href", "/admin/farmers");
    expect(productApi.mine).not.toHaveBeenCalled();
    expect(orderApi.farmer).not.toHaveBeenCalled();
    expect(farmerApi.get).not.toHaveBeenCalled();
  });
});

import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import CustomerDashboard from "./CustomerDashboard.jsx";

vi.mock("../../api/productApi.js", () => ({ default: { storefront: vi.fn() } }));
vi.mock("../../api/offerApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/orderApi.js", () => ({ default: { mine: vi.fn() } }));
vi.mock("../../api/addressApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/farmerApi.js", () => ({ default: { list: vi.fn() } }));

import productApi from "../../api/productApi.js";
import offerApi from "../../api/offerApi.js";
import orderApi from "../../api/orderApi.js";
import addressApi from "../../api/addressApi.js";
import farmerApi from "../../api/farmerApi.js";

const mockProducts = [
  { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg", category: "Vegetables", stock: 12, ratingAverage: 4.8, ratingCount: 12 },
  { _id: "product-b", name: "Fresh Spinach", price: 25, unit: "bunch", category: "Vegetables", stock: 8 },
];

describe("Customer Dashboard page", () => {
  const preloaded = {
    auth: { user: { name: "Harshita Patil", email: "harshita@example.test", role: "customer" }, token: null },
    cart: { items: [{ quantity: 2 }, { quantity: 1 }], deliveryCharge: 30, loaded: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    productApi.storefront.mockResolvedValue({ data: { items: mockProducts, total: 2 } });
    orderApi.mine.mockResolvedValue({ data: [] });
    addressApi.list.mockResolvedValue({ data: [] });
    farmerApi.list.mockResolvedValue({ data: [] });
  });

  it("loads customer-specific dashboard sections and featured products", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);
    expect(screen.getByText(/Welcome back, Harshita Patil/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Wishlist/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Active Cart Items/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Recent Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended for You/i)).toBeInTheDocument();
    expect(screen.getByText("AI Shopping Assistant")).toBeInTheDocument();
    expect(screen.queryByText("Fresh Deals from Our Farmers")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Fresh Organic Products/i })).toHaveClass("text-white");
    expect(productApi.storefront).toHaveBeenCalledWith({ limit: 5, inStock: "true" });
    await waitFor(() => expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument());
    expect(screen.getByText("Fresh Spinach")).toBeInTheDocument();
  });

  it("renders an empty recent orders state when the account has no orders", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);
    expect(screen.getByText(/Recent Orders/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/No orders yet/i)).toBeInTheDocument());
    expect(orderApi.mine).toHaveBeenCalled();
  });

  it("switches between Active and Coming Soon tabs", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);

    // Both tabs exist with (0) count when no offers loaded
    expect(screen.getByRole("button", { name: "Active (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coming Soon (0)" })).toBeInTheDocument();

    // Active tab is selected by default
    expect(screen.getByRole("button", { name: "Active (0)" })).toHaveClass(/bg-\[#16803C\]/);
    expect(screen.getByRole("button", { name: "Coming Soon (0)" })).not.toHaveClass(/bg-\[#16803C\]/);

    // Switch to Coming Soon
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (0)" }));
    expect(screen.getByRole("button", { name: "Coming Soon (0)" })).toHaveClass(/bg-\[#16803C\]/);
    expect(screen.getByRole("button", { name: "Active (0)" })).not.toHaveClass(/bg-\[#16803C\]/);

    // Switch back to Active
    fireEvent.click(screen.getByRole("button", { name: "Active (0)" }));
    expect(screen.getByRole("button", { name: "Active (0)" })).toHaveClass(/bg-\[#16803C\]/);
    expect(screen.getByRole("button", { name: "Coming Soon (0)" })).not.toHaveClass(/bg-\[#16803C\]/);
  });

  it("uses smaller text size for tab labels", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);

    const activeButton = screen.getByRole("button", { name: "Active (0)" });
    const upcomingButton = screen.getByRole("button", { name: "Coming Soon (0)" });

    expect(activeButton).toHaveClass("text-xs");
    expect(upcomingButton).toHaveClass("text-xs");
  });
});

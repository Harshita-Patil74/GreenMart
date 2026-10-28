import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import CustomerDashboard from "./CustomerDashboard.jsx";

vi.mock("../../api/productApi.js", () => ({ default: { storefront: vi.fn() } }));
vi.mock("../../api/orderApi.js", () => ({ default: { mine: vi.fn() } }));
vi.mock("../../api/addressApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/farmerApi.js", () => ({ default: { list: vi.fn() } }));

import productApi from "../../api/productApi.js";
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
    expect(screen.getByText(/Wishlist/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Cart Items/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Recent Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended for You/i)).toBeInTheDocument();
    expect(screen.getByText("AI Shopping Assistant")).toBeInTheDocument();
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
});

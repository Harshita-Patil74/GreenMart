import React from "react";
import { screen, waitFor } from "@testing-library/react";
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
const mockOffers = [{
  _id: "offer-a",
  title: "Tomato Harvest Deal",
  type: "Seasonal Offer",
  discountType: "Percentage",
  discountPercent: 20,
  discountAmount: 8,
  originalPrice: 40,
  offerPrice: 32,
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-11-30T00:00:00.000Z",
  effectiveStatus: "Active",
  product: { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg", stock: 12, images: ["/uploads/tomatoes.jpg"] },
  farmer: { _id: "farmer-a", name: "Green Valley Farm" },
}];

describe("Customer Dashboard page", () => {
  const preloaded = {
    auth: { user: { name: "Harshita Patil", email: "harshita@example.test", role: "customer" }, token: null },
    cart: { items: [{ quantity: 2 }, { quantity: 1 }], deliveryCharge: 30, loaded: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    productApi.storefront.mockResolvedValue({ data: { items: mockProducts, total: 2 } });
    offerApi.list.mockResolvedValue({ data: { active: mockOffers, upcoming: [], serverTime: new Date().toISOString() } });
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
    expect(await screen.findByRole("heading", { name: "Fresh Deals from Our Farmers" })).toBeInTheDocument();
    expect(screen.getByText("Discover fresh organic products at special prices.")).toBeInTheDocument();
    expect(screen.getByText("Green Valley Farm")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View All Offers/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /View All Offers/ })[0]).toHaveAttribute("href", "/customer/offers");
    expect(offerApi.list).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: /Fresh Organic Products/i })).toHaveClass("text-white");
    expect(productApi.storefront).toHaveBeenCalledWith({ limit: 5, inStock: "true" });
    await waitFor(() => expect(screen.getAllByText("Organic Tomatoes")).toHaveLength(2));
    expect(screen.getByText("Fresh Spinach")).toBeInTheDocument();
  });

  it("renders an empty recent orders state when the account has no orders", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);
    expect(screen.getByText(/Recent Orders/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/No orders yet/i)).toBeInTheDocument());
    expect(orderApi.mine).toHaveBeenCalled();
  });
});

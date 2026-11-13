import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import CustomerDashboard from "./CustomerDashboard.jsx";

vi.mock("../../api/productApi.js", () => ({ default: { storefront: vi.fn() } }));
vi.mock("../../api/offerApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/orderApi.js", () => ({ default: { mine: vi.fn() } }));
vi.mock("../../api/addressApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/farmerApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../api/newsletterApi.js", () => ({
  default: {
    preferences: vi.fn(),
    subscriptionMe: vi.fn(),
    customerExclusiveOffers: vi.fn(),
  },
}));

import productApi from "../../api/productApi.js";
import offerApi from "../../api/offerApi.js";
import orderApi from "../../api/orderApi.js";
import addressApi from "../../api/addressApi.js";
import farmerApi from "../../api/farmerApi.js";
import newsletterApi from "../../api/newsletterApi.js";

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
    newsletterApi.preferences.mockResolvedValue({ data: { subscribed: false } });
    newsletterApi.subscriptionMe.mockResolvedValue({ data: { subscribed: false } });
    newsletterApi.customerExclusiveOffers.mockResolvedValue({ data: { items: [] } });
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
    expect(productApi.storefront).toHaveBeenCalledWith({ limit: 1000, inStock: "true" });
    await waitFor(() =>
      expect(screen.getAllByText("Organic Tomatoes").length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText("Fresh Spinach").length).toBeGreaterThan(0);
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

  it("restores subscriber-exclusive products as regular-price teasers in current and upcoming offers", async () => {
    const makeTeaser = (id, name, effectiveStatus) => ({
      _id: id,
      title: "Subscriber Exclusive",
      type: "Seasonal Offer",
      audience: ["premium"],
      premiumExclusiveTeaser: true,
      originalPrice: 80,
      offerPrice: 80,
      discountAmount: 0,
      discountPercent: 0,
      discountType: null,
      discountValue: null,
      regularDiscountType: "Percentage",
      regularDiscountValue: 20,
      regularDiscountAmount: 16,
      regularDiscountPercent: 20,
      premiumDiscountAmount: 5,
      minimumQuantity: 1,
      minimumAmount: 0,
      effectiveStatus,
      startDate: "2026-12-01T00:00:00.000Z",
      endDate: "2026-12-10T00:00:00.000Z",
      product: { _id: id, name, price: 80, unit: "kg", stock: 12, images: [] },
    });
    offerApi.list.mockResolvedValue({
      data: {
        active: [makeTeaser("current-exclusive", "Current Premium Product", "Active")],
        upcoming: [makeTeaser("upcoming-exclusive", "Upcoming Premium Product", "Scheduled")],
        serverTime: new Date().toISOString(),
      },
    });

    renderWithStore(<CustomerDashboard />, preloaded);

    expect(await screen.findByText("Current Premium Product")).toBeInTheDocument();
    expect(screen.getByText("Premium members only")).toBeInTheDocument();
    expect(screen.getByText(/80\.00 \/ kg/)).toBeInTheDocument();
    expect(screen.getByText(/Offer discount: 20%/)).toBeInTheDocument();
    expect(screen.getAllByText(/Premium extra/).length).toBeGreaterThan(0);
    expect(screen.queryByText("0% OFF")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    expect(screen.getByText("Upcoming Premium Product")).toBeInTheDocument();
  });

  it("shows a public offer price and labels additional Premium savings separately", async () => {
    offerApi.list.mockResolvedValue({
      data: {
        active: [{
          _id: "public-premium-extra",
          title: "Marigold Special",
          type: "Seasonal Offer",
          audience: ["public"],
          originalPrice: 80,
          offerPrice: 64,
          discountType: "Percentage",
          discountPercent: 20,
          discountAmount: 16,
          premiumDiscountAmount: 5,
          minimumQuantity: 1,
          minimumAmount: 0,
          effectiveStatus: "Active",
          product: { _id: "marigold", name: "Fresh Marigold Flowers", price: 80, unit: "kg", stock: 12, images: [] },
          farmer: { name: "Test Farm" },
        }],
        upcoming: [],
        serverTime: new Date().toISOString(),
      },
    });

    renderWithStore(<CustomerDashboard />, preloaded);

    expect(await screen.findByText("Fresh Marigold Flowers")).toBeInTheDocument();
    expect(screen.getByText("₹64.00 / kg")).toBeInTheDocument();
    expect(screen.getByText("₹80.00 / kg")).toHaveClass("line-through");
    expect(screen.getByText("Regular 20% OFF")).toBeInTheDocument();
    expect(screen.getByText(/Premium members save extra: ₹5\.00 \/ kg/)).toBeInTheDocument();
  });

  it("uses smaller text size for tab labels", async () => {
    renderWithStore(<CustomerDashboard />, preloaded);

    const activeButton = screen.getByRole("button", { name: "Active (0)" });
    const upcomingButton = screen.getByRole("button", { name: "Coming Soon (0)" });

    expect(activeButton).toHaveClass("text-xs");
    expect(upcomingButton).toHaveClass("text-xs");
  });

  it("uses the server-rounded total subscriber discount percentage", async () => {
    newsletterApi.subscriptionMe.mockResolvedValue({ data: { subscribed: true } });
    newsletterApi.customerExclusiveOffers.mockResolvedValue({
      data: {
        items: [{
          _id: "exclusive-honey-offer",
          title: "Subscriber Green Gram Deal",
          type: "Limited-Time Deal",
          audience: ["premium"],
          discountType: "Percentage",
          discountPercent: 58,
          discountAmount: 28.75,
          originalPrice: 50,
          publicPrice: 25,
          exclusivePrice: 21.25,
          offerPrice: 21.25,
          publicDiscountAmount: 25,
          publicDiscountPercent: 50,
          exclusiveDiscountAmount: 3.75,
          additionalSavings: 3.75,
          minimumQuantity: 1,
          product: { _id: "green-gram", name: "Green Gram", price: 50, unit: "kg", images: [] },
          farmer: { name: "Test Farm" },
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2027-01-01T00:00:00.000Z",
        }],
      },
    });

    renderWithStore(<CustomerDashboard />, preloaded);

    expect(await screen.findByText("Green Gram")).toBeInTheDocument();
    expect(await screen.findByText("58% OFF")).toBeInTheDocument();
    expect(screen.getByText("₹50.00 / kg")).toBeInTheDocument();
    expect(screen.getByText("₹21.25 / kg")).toBeInTheDocument();
    expect(screen.getByText(/Offer discount: 50% off/)).toBeInTheDocument();
    expect(screen.getByText(/Regular price: ₹25\.00 \/ kg/)).toBeInTheDocument();
    expect(screen.getAllByText(/Premium extra/).length).toBeGreaterThan(0);
  });
});

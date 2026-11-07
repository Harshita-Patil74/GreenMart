import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import AdminAnalytics from "./AdminAnalytics.jsx";

vi.mock("../../api/adminApi.js", () => ({ default: { analytics: vi.fn() } }));

import adminApi from "../../api/adminApi.js";
import { getImageUrl } from "../../utils/imageUrl.js";

describe("Admin analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const today = new Date().toISOString();
    adminApi.analytics.mockResolvedValue({
      data: {
        totalSales: 100,
        totalOrders: 2,
        averageOrderValue: 50,
        salesOverview: { totalSales: 100, totalOrders: 2, averageOrderValue: 50, from: "2026-10-01", to: "2026-10-31" },
        salesByCategory: [{ category: "Vegetables", revenue: 100 }],
        topSellingProducts: [{
          name: "Organic Tomatoes",
          image: "/uploads/products/tomatoes.png",
          category: "Vegetables",
          quantity: 2,
          revenue: 100,
        }],
      },
    });
  });

  it("shows product images served from the API uploads path", async () => {
    render(<MemoryRouter><AdminAnalytics /></MemoryRouter>);

    const image = await waitFor(() => screen.getByRole("img", { name: "Organic Tomatoes product" }));
    expect(image).toHaveAttribute("src", getImageUrl("/uploads/products/tomatoes.png"));
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("₹ 50")).toBeInTheDocument();
  });
});

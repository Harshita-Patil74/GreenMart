import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import AdminAnalytics from "./AdminAnalytics.jsx";

vi.mock("../../api/orderApi.js", () => ({ default: { adminAll: vi.fn() } }));
vi.mock("../../api/productApi.js", () => ({ default: { list: vi.fn() } }));
vi.mock("../../components/admin/AdminCharts.jsx", () => ({
  default: { SalesTrend: () => null, CategoryShare: () => null },
}));

import orderApi from "../../api/orderApi.js";
import productApi from "../../api/productApi.js";
import { getImageUrl } from "../../utils/imageUrl.js";

describe("Admin analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const today = new Date().toISOString();
    orderApi.adminAll.mockResolvedValue({
      data: [{
        _id: "order-1",
        createdAt: today,
        total: 50,
        items: [{
          name: "Organic Tomatoes",
          product: {
            _id: "product-1",
            images: ["/uploads/products/tomatoes.png"],
            category: "Vegetables",
          },
          price: 50,
          quantity: 1,
        }],
      }],
    });
    productApi.list.mockResolvedValue({ data: { items: [] } });
  });

  it("shows product images served from the API uploads path", async () => {
    render(<MemoryRouter><AdminAnalytics /></MemoryRouter>);

    const image = await waitFor(() => screen.getByRole("img", { name: "Organic Tomatoes product" }));
    expect(image).toHaveAttribute("src", getImageUrl("/uploads/products/tomatoes.png"));
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
  });
});

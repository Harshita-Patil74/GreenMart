import React from "react";
import { screen } from "@testing-library/react";
import ProductDetail from "./ProductDetail.jsx";
import productApi from "../../api/productApi.js";
import reviewApi from "../../api/reviewApi.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/productApi.js", () => ({ default: { storefrontGet: vi.fn() } }));
vi.mock("../../api/reviewApi.js", () => ({
  default: { list: vi.fn(), eligibility: vi.fn() },
}));

describe("Product detail offer information", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.storefrontGet.mockResolvedValue({
      data: {
        _id: "product-a",
        name: "Organic Tomatoes",
        category: "Vegetables",
        description: "Fresh tomatoes",
        price: 40,
        unit: "kg",
        stock: 12,
        images: [],
        farmer: { _id: "farmer-a", name: "Green Valley Farm" },
        offer: {
          _id: "offer-a",
          title: "Tomato Harvest Deal",
          type: "Seasonal Offer",
          discountType: "Percentage",
          discountPercent: 20,
          discountValue: 20,
          discountAmount: 8,
          totalSavings: 16,
          offerPrice: 32,
          minimumEligiblePrice: 32,
          minimumQuantity: 2,
          minimumAmount: 100,
          maximumDiscount: 16,
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2026-11-30T00:00:00.000Z",
          appliesToSingleUnit: false,
        },
      },
    });
    reviewApi.list.mockResolvedValue({ data: [] });
    reviewApi.eligibility.mockResolvedValue({ data: { eligible: false } });
  });

  it("shows actual offer price, savings, validity and purchase conditions", async () => {
    renderWithStore(<ProductDetail />, {
      auth: { user: { role: "customer" }, token: null },
    });

    expect(await screen.findByText("Tomato Harvest Deal · Seasonal Offer")).toBeInTheDocument();
    expect(screen.getByText(/Original price ₹40\.00 · Offer price ₹32\.00/)).toBeInTheDocument();
    expect(screen.getByText(/save ₹16\.00 at minimum quantity/)).toBeInTheDocument();
    expect(screen.getByText(/Requires 2 or more units/)).toBeInTheDocument();
    expect(screen.getByText("Maximum savings: ₹16.00.")).toBeInTheDocument();
  });
});

import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Shop from "./Shop.jsx";
import productApi from "../../api/productApi.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/productApi", () => ({
  default: { storefront: vi.fn() },
}));

const products = [
  {
    _id: "product-offer",
    name: "Organic Tomatoes",
    price: 40,
    unit: "kg",
    stock: 12,
    images: [],
    offer: {
      _id: "offer-1",
      title: "Tomato Harvest Deal",
      type: "Seasonal Offer",
      discountType: "Percentage",
      discountPercent: 20,
      discountAmount: 8,
      offerPrice: 32,
      minimumEligiblePrice: 32,
      appliesToSingleUnit: true,
    },
  },
  { _id: "product-regular", name: "Fresh Spinach", price: 25, unit: "bunch", stock: 8, images: [], offer: null },
];

describe("Shop offer integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.storefront.mockResolvedValue({ data: { items: products, total: products.length, pages: 1 } });
  });

  it("shows offer price and badge while keeping products without offers at their normal price", async () => {
    renderWithStore(<Shop />);

    expect(await screen.findByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("20% OFF")).toBeInTheDocument();
    expect(screen.getByText("₹ 32.00")).toBeInTheDocument();
    expect(screen.getByText("₹ 40.00")).toHaveClass("line-through");
    expect(screen.getByText("₹ 25 / bunch")).toBeInTheDocument();
  });

  it("combines Offers only with the supported discount sort in the existing listing API", async () => {
    renderWithStore(<Shop />);
    await screen.findByText("Organic Tomatoes");

    fireEvent.click(screen.getByRole("checkbox", { name: "Offers only" }));
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({ hasOffer: "true" })));

    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), { target: { value: "discount_desc" } });
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({
      hasOffer: "true",
      sort: "discount_desc",
    })));
  });
});

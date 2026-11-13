import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Shop from "./Shop.jsx";
import productApi from "../../api/productApi.js";
import categoryApi from "../../api/categoryApi";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/productApi", () => ({
  default: { storefront: vi.fn() },
}));

vi.mock("../../api/categoryApi", () => ({
  default: { list: vi.fn() },
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
    categoryApi.list.mockResolvedValue({ data: [{ _id: "vegetables", name: "Vegetables", isActive: true }] });
  });

  it("shows offer price and badge while keeping products without offers at their normal price", async () => {
    renderWithStore(<Shop />);

    expect(screen.getByRole("heading", { name: "Shop organic favourites" })).toBeInTheDocument();
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

describe("Shop availability filters", () => {
  const availabilityProducts = [
    { _id: "in-stock-1", name: "Tomatoes", category: "Vegetables", price: 20, stock: 5, images: [] },
    { _id: "out-stock-1", name: "Spinach", category: "Vegetables", price: 15, stock: 0, images: [] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    categoryApi.list.mockResolvedValue({ data: [{ _id: "vegetables", name: "Vegetables", isActive: true }] });
    productApi.storefront.mockImplementation((params = {}) => {
      let matching = availabilityProducts;
      if (params.inStock === "true") matching = matching.filter((product) => product.stock > 0);
      if (params.inStock === "false") matching = matching.filter((product) => product.stock <= 0);
      return Promise.resolve({
        data: { items: matching, total: matching.length, pages: Math.ceil(matching.length / 12) },
      });
    });
  });

  it("filters in-stock and out-of-stock products, and treats both or neither selected as all", async () => {
    renderWithStore(<Shop />);

    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "In Stock" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Out of Stock" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Out of Stock" }));
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({ inStock: "false", page: 1 })));
    expect(await screen.findByText("Spinach")).toBeInTheDocument();
    expect(screen.queryByText("Tomatoes")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Out of Stock" })).toBeChecked();
    expect(screen.getByText("Showing 1–1 of 1 products")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "In Stock" }));
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({ inStock: undefined, page: 1 })));
    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "In Stock" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Out of Stock" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Out of Stock" }));
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({ inStock: "true", page: 1 })));
    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Spinach")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "In Stock" }));
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({ inStock: undefined, page: 1 })));
    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();
  });

  it("combines availability with search, category, price, offers, and sorting", async () => {
    renderWithStore(<Shop />);
    await screen.findByText("Tomatoes");

    fireEvent.click(screen.getByRole("checkbox", { name: "Out of Stock" }));
    fireEvent.change(screen.getByPlaceholderText("Search products..."), { target: { value: "  Spinach  " } });
    fireEvent.click(await screen.findByRole("button", { name: "Vegetables" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Offers only" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), { target: { value: "price_desc" } });

    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith(expect.objectContaining({
      inStock: "false",
      search: "Spinach",
      category: "Vegetables",
      maxPrice: 500,
      hasOffer: "true",
      sort: "price_desc",
      page: 1,
    })), { timeout: 2000 });
  });
});

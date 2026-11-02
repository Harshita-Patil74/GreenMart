import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import CustomerOffers from "./CustomerOffers.jsx";
import productApi from "../../api/productApi.js";
import categoryApi from "../../api/categoryApi.js";
import { addItem } from "../../features/cart/cartSlice.js";
import { toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/productApi.js", () => ({
  default: { storefrontOffers: vi.fn(), serverTime: vi.fn() },
}));
vi.mock("../../api/categoryApi.js", () => ({
  default: { list: vi.fn() },
}));
vi.mock("../../features/cart/cartSlice.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    addItem: vi.fn((product) => () => ({ unwrap: () => Promise.resolve(product) })),
  };
});
vi.mock("../../features/wishlist/wishlistSlice.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchWishlist: vi.fn(() => () => ({})),
    toggleWishlist: vi.fn((product) => () => ({ unwrap: () => Promise.resolve(product) })),
  };
});

const offers = [
  {
    _id: "offer-mango",
    title: "Mango Harvest Deal",
    type: "Seasonal Offer",
    discountType: "Percentage",
    discountPercent: 17,
    discountAmount: 20,
    originalPrice: 120,
    offerPrice: 100,
    minimumQuantity: 1,
    minimumAmount: 0,
    endDate: "2026-11-30T00:00:00.000Z",
    createdAt: "2026-10-25T00:00:00.000Z",
    effectiveStatus: "Active",
    product: {
      _id: "product-mango",
      name: "Alphonso Mango",
      category: "Fruits",
      price: 120,
      unit: "kg",
      stock: 50,
      images: ["/uploads/mango.jpg"],
      farmer: { _id: "farmer-mango", name: "Mango Farm" },
    },
    farmer: { _id: "farmer-mango", name: "Mango Farm" },
  },
  {
    _id: "offer-tomato",
    title: "Farmer Tomato Special",
    type: "Farmer Special",
    discountType: "Percentage",
    discountPercent: 25,
    discountAmount: 15,
    originalPrice: 60,
    offerPrice: 45,
    minimumQuantity: 1,
    minimumAmount: 0,
    endDate: "2026-11-10T00:00:00.000Z",
    createdAt: "2026-10-27T00:00:00.000Z",
    effectiveStatus: "Active",
    product: {
      _id: "product-tomato",
      name: "Organic Tomatoes",
      category: "Vegetables",
      price: 60,
      unit: "kg",
      stock: 30,
      images: [],
      farmer: { _id: "farmer-tomato", name: "Tomato Farm" },
    },
    farmer: { _id: "farmer-tomato", name: "Tomato Farm" },
  },
  {
    _id: "offer-future",
    title: "Future Greens Deal",
    type: "Limited-Time Deal",
    discountType: "Fixed Amount",
    discountPercent: 20,
    discountAmount: 10,
    originalPrice: 50,
    offerPrice: 40,
    minimumQuantity: 1,
    minimumAmount: 0,
    endDate: "2026-12-10T00:00:00.000Z",
    createdAt: "2026-10-28T00:00:00.000Z",
    effectiveStatus: "Scheduled",
    product: {
      _id: "product-greens",
      name: "Fresh Greens",
      category: "Vegetables",
      price: 50,
      unit: "bunch",
      stock: 20,
      images: [],
      farmer: { _id: "farmer-greens", name: "Greens Farm" },
    },
    farmer: { _id: "farmer-greens", name: "Greens Farm" },
  },
];

describe("Customer Offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.storefrontOffers.mockResolvedValue({ data: { items: offers } });
    productApi.serverTime.mockResolvedValue({ data: { serverTime: new Date().toISOString() } });
    categoryApi.list.mockResolvedValue({
      data: [
        { _id: "fruits", name: "Fruits" },
        { _id: "vegetables", name: "Vegetables" },
        { _id: "grains", name: "Grains & Pulses" },
        { _id: "dairy", name: "Dairy & Eggs" },
        { _id: "spices", name: "Spices & Herbs" },
        { _id: "eco", name: "Eco Friendly" },
        { _id: "others", name: "Others" },
      ],
    });
  });

  const renderPage = () => renderWithStore(<CustomerOffers />, {
    auth: { user: { _id: "customer-1", role: "customer" }, token: "customer-token" },
    wishlist: { items: [], loading: false, loaded: true, error: null },
  });

  it("renders the produce banner, active offers, actual images and saved price data", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Fresh Deals from Our Farmers" })).toBeInTheDocument();
    expect(screen.getByText("Organic. Fresh. Affordable.")).toBeInTheDocument();
    expect(categoryApi.list).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img", { name: "Fresh produce at a farmers market" })).toHaveAttribute("src", "/images/banners/hero-basket.jpg");
    expect(await screen.findByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Mango Farm")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Alphonso Mango" })).toHaveAttribute("src", expect.stringContaining("/uploads/mango.jpg"));
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText("17% OFF")).toBeInTheDocument();
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();
  });

  it("filters offers by type, product category, search, active toggle and sort", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    fireEvent.click(screen.getByRole("button", { name: "Farmer Special" }));
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Filter product category" }), { target: { value: "Vegetables" } });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "Tomato Farm" } });
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All Offers" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Filter product category" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "" } });
    const categoryFilter = screen.getByRole("combobox", { name: "Filter product category" });
    expect(within(categoryFilter).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All Categories",
      "Dairy & Eggs",
      "Eco Friendly",
      "Fruits",
      "Grains & Pulses",
      "Others",
      "Spices & Herbs",
      "Vegetables",
    ]);
    fireEvent.change(categoryFilter, { target: { value: "Fruits" } });
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.queryByText("Organic Tomatoes")).not.toBeInTheDocument();

    fireEvent.change(categoryFilter, { target: { value: "Grains & Pulses" } });
    expect(screen.getByText("No offers match your filters.")).toBeInTheDocument();
    fireEvent.change(categoryFilter, { target: { value: "" } });
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "Tomato Farm" } });
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "" } });
    const activeSwitch = screen.getByRole("switch", { name: "Only Active" });
    expect(activeSwitch).toHaveAttribute("aria-checked", "true");
    fireEvent.click(activeSwitch);
    expect(activeSwitch).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Fresh Greens")).toBeInTheDocument();
    const switchTrack = activeSwitch.querySelector("span");
    expect(switchTrack).toHaveClass("bg-[#AAB6AD]");
    expect(switchTrack.firstElementChild).toHaveClass("left-0", "translate-x-[2px]");
    fireEvent.click(activeSwitch);
    expect(activeSwitch).toHaveAttribute("aria-checked", "true");
    expect(activeSwitch.querySelector("span")).toHaveClass("bg-[#16803C]");
    expect(activeSwitch.querySelector("span").firstElementChild).toHaveClass("translate-x-[16px]");
    fireEvent.change(screen.getByRole("combobox", { name: "Sort offers" }), { target: { value: "price_asc" } });
    expect(screen.getByRole("combobox", { name: "Sort offers" })).toHaveValue("price_asc");
  });

  it("uses the current cart and wishlist Redux actions", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    const mangoCard = screen.getByRole("img", { name: "Alphonso Mango" }).closest("article");
    fireEvent.click(within(mangoCard).getByRole("button", { name: "Add to Cart" }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(offers[0].product));

    fireEvent.click(within(mangoCard).getByRole("button", { name: "Add Alphonso Mango to wishlist" }));
    await waitFor(() => expect(toggleWishlist).toHaveBeenCalledWith(offers[0].product));
  });

  it("shows an empty state when no offers are available", async () => {
    productApi.storefrontOffers.mockResolvedValueOnce({ data: { items: [] } });
    renderPage();

    expect(await screen.findByText("No farmer offers are available right now.")).toBeInTheDocument();
  });

  it("never renders pending or rejected offers returned unexpectedly by the offers API", async () => {
    productApi.storefrontOffers.mockResolvedValueOnce({
      data: {
        items: [
          ...offers,
          { ...offers[0], _id: "pending-offer", title: "Pending offer", effectiveStatus: "Pending" },
          { ...offers[0], _id: "rejected-offer", title: "Rejected offer", effectiveStatus: "Rejected" },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.queryByText("Pending offer")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected offer")).not.toBeInTheDocument();
  });

  it("shows an error state and retries the offers request", async () => {
    productApi.storefrontOffers
      .mockRejectedValueOnce(new Error("Offers are temporarily unavailable."))
      .mockResolvedValueOnce({ data: { items: offers } });
    renderPage();

    expect(await screen.findByText("Offers are temporarily unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Alphonso Mango")).toBeInTheDocument();
    expect(productApi.storefrontOffers).toHaveBeenCalledTimes(2);
  });

  it("shows category loading and an explicit fallback when category loading fails", async () => {
    let resolveCategories;
    categoryApi.list.mockReturnValueOnce(new Promise((resolve) => { resolveCategories = resolve; }));
    renderPage();

    const categoryFilter = screen.getByRole("combobox", { name: "Filter product category" });
    expect(categoryFilter).toBeDisabled();
    expect(screen.getByText("Loading categories…")).toBeInTheDocument();
    await act(async () => {
      resolveCategories({ data: [{ name: "Fruits" }] });
    });
    expect(await screen.findByRole("option", { name: "Fruits" })).toBeInTheDocument();
    expect(categoryFilter).toBeEnabled();
  });

  it("falls back to categories present in eligible offers and explains category API failure", async () => {
    categoryApi.list.mockRejectedValueOnce(new Error("Categories unavailable"));
    renderPage();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Categories couldn't be loaded. Showing categories from available offers."
    );
    const categoryFilter = screen.getByRole("combobox", { name: "Filter product category" });
    expect(within(categoryFilter).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All Categories",
      "Fruits",
      "Vegetables",
    ]);
  });
});

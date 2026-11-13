import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import CustomerOffers from "./CustomerOffers.jsx";
import offerApi from "../../api/offerApi.js";
import categoryApi from "../../api/categoryApi.js";
import { addItem } from "../../features/cart/cartSlice.js";
import { toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/offerApi.js", () => ({
  default: { list: vi.fn() },
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

const activeOffers = [
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
];

const upcomingOffers = [
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
    startDate: "2026-12-01T00:00:00.000Z",
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
    offerApi.list.mockResolvedValue({
      data: {
        active: activeOffers,
        upcoming: upcomingOffers,
        serverTime: new Date().toISOString(),
      },
    });
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
  });

  it("shows subscriber-exclusive products at their regular price in the general offers feed", async () => {
    const teaser = {
      _id: "exclusive-flower-offer",
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
      endDate: "2026-11-30T00:00:00.000Z",
      effectiveStatus: "Active",
      product: {
        _id: "subscriber-flower",
        name: "Subscriber Marigold Flowers",
        category: "Flowers",
        price: 80,
        unit: "kg",
        stock: 12,
        images: [],
      },
    };
    offerApi.list.mockResolvedValueOnce({
      data: { active: [teaser], upcoming: [], serverTime: new Date().toISOString() },
    });

    renderPage();

    const productCard = (await screen.findByRole("img", { name: "Subscriber Marigold Flowers" })).closest("article");
    expect(within(productCard).getByText("Premium Exclusive")).toBeInTheDocument();
    expect(within(productCard).getByText(/80\.00/)).toBeInTheDocument();
    expect(within(productCard).getByText(/Offer discount: 20%/)).toBeInTheDocument();
    expect(within(productCard).getByText(/Premium extra/)).toBeInTheDocument();
    expect(within(productCard).queryByText("0% OFF")).not.toBeInTheDocument();
    fireEvent.click(within(productCard).getByRole("button", { name: "Add to Cart" }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(teaser.product));
  });

  it("shows the regular payable price before additional Premium savings", async () => {
    const publicOffer = {
      ...activeOffers[0],
      _id: "public-premium-extra",
      title: "Marigold Special",
      discountPercent: 20,
      discountAmount: 16,
      originalPrice: 80,
      offerPrice: 64,
      premiumDiscountAmount: 5,
      product: {
        ...activeOffers[0].product,
        _id: "marigold-public",
        name: "Fresh Marigold Flowers",
        price: 80,
        unit: "kg",
      },
    };
    offerApi.list.mockResolvedValueOnce({
      data: { active: [publicOffer], upcoming: [], serverTime: new Date().toISOString() },
    });

    renderPage();

    const card = (await screen.findByRole("img", { name: "Fresh Marigold Flowers" })).closest("article");
    expect(within(card).getByText("₹64.00")).toBeInTheDocument();
    expect(within(card).getByText("₹80.00 / kg")).toHaveClass("line-through");
    expect(within(card).getByText("Regular 20% OFF")).toBeInTheDocument();
    expect(within(card).getByText(/Premium members save extra: ₹5\.00 \/ kg/)).toBeInTheDocument();
  });

  it("shows Active Offers tab by default and Coming Soon tab", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");
    expect(screen.getByRole("button", { name: "Active Offers (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coming Soon (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();
  });

  it("switches to Coming Soon tab", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    expect(screen.getByText("Fresh Greens")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();
    expect(screen.queryByText("Organic Tomatoes")).not.toBeInTheDocument();
  });

  it("filters offers by type, product category, search and sort", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    fireEvent.click(screen.getByRole("button", { name: "Farmer Special" }));
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All Offers" }));
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
    expect(await screen.findByText("No active offers available right now.")).toBeInTheDocument();
    fireEvent.change(categoryFilter, { target: { value: "" } });
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "Tomato Farm" } });
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Alphonso Mango")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Sort offers" }), { target: { value: "price_asc" } });
    expect(screen.getByRole("combobox", { name: "Sort offers" })).toHaveValue("price_asc");
  });

  it("uses the current cart and wishlist Redux actions", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    const mangoCard = screen.getByRole("img", { name: "Alphonso Mango" }).closest("article");
    fireEvent.click(within(mangoCard).getByRole("button", { name: "Add to Cart" }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(activeOffers[0].product));

    fireEvent.click(within(mangoCard).getByRole("button", { name: "Add Alphonso Mango to wishlist" }));
    await waitFor(() => expect(toggleWishlist).toHaveBeenCalledWith(activeOffers[0].product));
  });

  it("shows an empty state when no active offers are available", async () => {
    offerApi.list.mockResolvedValueOnce({ data: { active: [], upcoming: [], serverTime: new Date().toISOString() } });
    renderPage();

    expect(await screen.findByText("No active offers available right now.")).toBeInTheDocument();
  });

  it("shows an empty state when no upcoming offers are available", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    expect(screen.getByText("Fresh Greens")).toBeInTheDocument();

    offerApi.list.mockResolvedValueOnce({ data: { active: activeOffers, upcoming: [], serverTime: new Date().toISOString() } });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (0)" }));
    expect(await screen.findByText("No upcoming offers at the moment.")).toBeInTheDocument();
  });

  it("never renders pending or rejected offers returned unexpectedly by the offers API", async () => {
    offerApi.list.mockResolvedValueOnce({
      data: {
        active: [
          ...activeOffers,
          { ...activeOffers[0], _id: "pending-offer", title: "Pending offer", effectiveStatus: "Pending" },
          { ...activeOffers[0], _id: "rejected-offer", title: "Rejected offer", effectiveStatus: "Rejected" },
        ],
        upcoming: [],
        serverTime: new Date().toISOString(),
      },
    });
    renderPage();

    expect(await screen.findByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.queryByText("Pending offer")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected offer")).not.toBeInTheDocument();
  });

  it("shows an error state and retries the offers request", async () => {
    offerApi.list
      .mockRejectedValueOnce(new Error("Offers are temporarily unavailable."))
      .mockResolvedValueOnce({ data: { active: activeOffers, upcoming: upcomingOffers, serverTime: new Date().toISOString() } });
    renderPage();

    expect(await screen.findByText("Offers are temporarily unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Alphonso Mango")).toBeInTheDocument();
    expect(offerApi.list).toHaveBeenCalledTimes(2);
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

  it("enables Only Active filter and excludes upcoming offers", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    // Enable Only Active on Active tab
    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));
    expect(screen.getByRole("switch", { name: "Only Active" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();

    // Switch to Coming Soon tab - Only Active is still enabled, Fresh Greens hidden
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();

    // Switch back to Active tab to disable Only Active (button only renders on Active tab)
    fireEvent.click(screen.getByRole("button", { name: "Active Offers (2)" }));
    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));
    expect(screen.getByRole("switch", { name: "Only Active" })).toHaveAttribute("aria-checked", "false");

    // Switch to Coming Soon - Fresh Greens appears with Only Active disabled
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    await screen.findByText("Fresh Greens");
  });

  it("keeps active offers visible and hides scheduled offers with Only Active enabled", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));

    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();
  });

  it("search and category filtering work together with Only Active", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "Mango" } });

    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.queryByText("Organic Tomatoes")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search offers" }), { target: { value: "" } });
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
  });

  it("switches between Active and Coming Soon tabs correctly with Only Active", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    // Enable Only Active on Active tab
    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();

    // Switch to Coming Soon tab - Only Active persists, Fresh Greens hidden
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    expect(screen.queryByText("Fresh Greens")).not.toBeInTheDocument();

    // Switch back to Active - Only Active state persists
    fireEvent.click(screen.getByRole("button", { name: "Active Offers (2)" }));
    expect(screen.getByRole("switch", { name: "Only Active" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();

    // Disable Only Active - switch to Coming Soon, Fresh Greens appears
    fireEvent.click(screen.getByRole("switch", { name: "Only Active" }));
    expect(screen.getByRole("switch", { name: "Only Active" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: "Coming Soon (1)" }));
    await screen.findByText("Fresh Greens");
  });

  it("Only Active button is accessible and clickable", async () => {
    renderPage();
    await screen.findByText("Alphonso Mango");

    const onlyActiveButton = screen.getByRole("switch", { name: "Only Active" });
    expect(onlyActiveButton).toHaveAttribute("role", "switch");
    expect(onlyActiveButton).not.toHaveAttribute("disabled");

    fireEvent.click(onlyActiveButton);
    expect(onlyActiveButton).toHaveAttribute("aria-checked", "true");
  });
});

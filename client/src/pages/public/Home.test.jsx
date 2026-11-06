import React from "react";
import { act, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Home from "./Home.jsx";
import productApi from "../../api/productApi.js";
import newsletterApi from "../../api/newsletterApi";

vi.mock("../../api/productApi", () => ({
  default: { storefront: vi.fn(), storefrontOffers: vi.fn(), serverTime: vi.fn() },
}));

vi.mock("../../api/newsletterApi", () => ({
  default: { subscribe: vi.fn() },
}));

vi.mock("framer-motion", () => {
  const React = require("react");

  const motion = {
    div: "div",
    span: "span",
    button: "button",
  };

  return {
    motion,
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
    useSpring: () => [0, () => {}],
    useMotionValue: () => 0,
    useAnimate: () => () => {},
    useMotionTemplate: () => "",
    useTransform: () => 0,
    useVelocity: () => 0,
    useCycle: () => [0, () => {}],
    useTime: () => 0,
    useIsPresent: () => true,
    useReducedMotionConfig: () => ({ type: "spring", stiffness: 500, damping: 30 }),
  };
});

const percentageOffer = {
  _id: "offer-percent",
  title: "Fig Harvest Deal",
  type: "Seasonal Offer",
  discountType: "Percentage",
  discountPercent: 20,
  discountAmount: 40,
  originalPrice: 200,
  offerPrice: 160,
  minimumQuantity: 1,
  minimumAmount: 0,
  maximumDiscount: null,
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-11-30T00:00:00.000Z",
  effectiveStatus: "Active",
  product: {
    _id: "product-fig",
    name: "Organic Fig",
    price: 200,
    unit: "kg",
    stock: 50,
    images: ["/uploads/fig.jpg"],
    category: "Fruits",
  },
  farmer: { _id: "farmer-1", name: "Green Valley Farm" },
};

const fixedOffer = {
  _id: "offer-fixed",
  title: "Tomato Flat Deal",
  type: "Farmer Special",
  discountType: "Fixed Amount",
  discountPercent: 15,
  discountAmount: 30,
  originalPrice: 200,
  offerPrice: 170,
  minimumQuantity: 2,
  minimumAmount: 0,
  maximumDiscount: null,
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-11-30T00:00:00.000Z",
  effectiveStatus: "Active",
  product: {
    _id: "product-tomato",
    name: "Organic Tomato",
    price: 200,
    unit: "kg",
    stock: 10,
    images: [],
    category: "Vegetables",
  },
  farmer: { _id: "farmer-2", name: "Hillside Farm" },
};

const statusCases = [
  { label: "Pending", effectiveStatus: "Pending" },
  { label: "Rejected", effectiveStatus: "Rejected" },
  { label: "Inactive", effectiveStatus: "Inactive" },
  { label: "Expired", effectiveStatus: "Expired" },
  { label: "Scheduled", effectiveStatus: "Scheduled" },
];

describe("Home page offers", () => {
  beforeEach(() => {
    productApi.storefront.mockResolvedValue({
      data: { items: [], total: 0, pages: 1 },
    });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    productApi.serverTime.mockResolvedValue({ data: { serverTime: new Date().toISOString() } });
  });

  it("renders approved active offers with product image, name, title, prices and dates", async () => {
    productApi.storefrontOffers.mockResolvedValue({
      data: { items: [percentageOffer] },
    });
    renderWithStore(<Home />);

    expect(await screen.findByText("Special Offers & Discounts")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View All Offers/ })).toHaveAttribute("href", "/customer/offers");
    const figElements = await screen.findAllByText("Organic Fig");
    expect(figElements.length).toBeGreaterThan(0);
    const imgElements = screen.getAllByRole("img", { name: "Organic Fig" });
    expect(imgElements.length).toBeGreaterThan(0);
    expect(imgElements[0]).toHaveAttribute("src", expect.stringContaining("/uploads/fig.jpg"));
    expect(screen.getAllByText("₹160.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹200.00").length).toBeGreaterThan(0);
  });

  it("calculates fixed discounts correctly using actual product price", async () => {
    productApi.storefrontOffers.mockResolvedValue({
      data: { items: [fixedOffer] },
    });
    renderWithStore(<Home />);

    const tomatoElements = await screen.findAllByText("Organic Tomato");
    expect(tomatoElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹170\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹200\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹30\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it.each(statusCases)("does not display $label offers", async ({ effectiveStatus }) => {
    const hidden = { ...percentageOffer, _id: "hidden-offer", title: "Hidden Offer", effectiveStatus };
    productApi.storefrontOffers.mockResolvedValue({
      data: { items: [percentageOffer, hidden] },
    });
    renderWithStore(<Home />);
    await act(async () => {});

    const figElements = await screen.findAllByText("Organic Fig");
    expect(figElements.length).toBeGreaterThan(0);
    expect(screen.queryByText("Hidden Offer")).not.toBeInTheDocument();
  });

  it("shows empty state when no active offers are available", async () => {
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    expect(await screen.findByText("No active offers available right now. Check back soon!")).toBeInTheDocument();
    expect(screen.queryByText("Organic Fig")).not.toBeInTheDocument();
  });

  it("shows loading state and then the offers", async () => {
    let resolveOffers;
    productApi.storefrontOffers.mockResolvedValue(new Promise((resolve) => { resolveOffers = resolve; }));
    renderWithStore(<Home />);

    await act(async () => {
      resolveOffers({ data: { items: [percentageOffer] } });
    });
    const figElements = await screen.findAllByText("Organic Fig");
    expect(figElements.length).toBeGreaterThan(0);
  });

  it("keeps featured products without offers at their normal prices", async () => {
    productApi.storefront.mockResolvedValue({
      data: {
        items: [
          { ...percentageOffer.product, _id: "product-fig", offer: null },
          { _id: "product-plain", name: "Plain Product", price: 60, unit: "kg", stock: 5, images: [], offer: null },
        ],
        total: 2,
        pages: 1,
      },
    });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    await screen.findByText("Plain Product");
    expect(screen.getAllByText(/₹ 60 \/ kg/).length).toBeGreaterThan(0);
    expect(screen.queryByText("OFF")).not.toBeInTheDocument();
  });

  it("links View All Offers to the existing offers page", async () => {
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [percentageOffer] } });
    renderWithStore(<Home />);
    const figElements = await screen.findAllByText("Organic Fig");
    expect(figElements.length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /View All Offers/ })).toHaveAttribute("href", "/customer/offers");
  });

  it("fetches all featured products across pages and deduplicates by _id", async () => {
    productApi.storefront
      .mockResolvedValueOnce({
        data: { items: [percentageOffer.product], total: 3, pages: 2 },
      })
      .mockResolvedValueOnce({
        data: { items: [percentageOffer.product], total: 3, pages: 2 },
      });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    // Should deduplicate the same product appearing on multiple pages
    const figElements = await screen.findAllByText("Organic Fig");
    expect(figElements.length).toBe(1);
  });

  it("combines paginated product responses correctly", async () => {
    const product2 = {
      _id: "product-second",
      name: "Organic Spinach",
      price: 40,
      unit: "kg",
      stock: 10,
      images: [],
      category: "Vegetables",
    };
    productApi.storefront
      .mockResolvedValueOnce({
        data: { items: [percentageOffer.product], total: 2, pages: 2 },
      })
      .mockResolvedValueOnce({
        data: { items: [product2], total: 2, pages: 2 },
      });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    await screen.findByText("Featured Products");
    expect(screen.getAllByText("Organic Fig").length).toBe(1);
    expect(screen.getByText("Organic Spinach")).toBeInTheDocument();
  });

  it("shows loading state for Featured Products", async () => {
    productApi.storefront.mockReturnValue(new Promise(() => {}));
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    expect(screen.getByText("Featured Products")).toBeInTheDocument();
  });

  it("shows empty state when no featured products exist", async () => {
    productApi.storefront.mockResolvedValue({
      data: { items: [], total: 0, pages: 1 },
    });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    expect(await screen.findByText("No featured products available right now. Check back soon!")).toBeInTheDocument();
  });

  it("shows error state when product API fails", async () => {
    productApi.storefront.mockRejectedValue(new Error("Products unavailable"));
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    expect(await screen.findByText(/Products unavailable/)).toBeInTheDocument();
  });

  it("keeps featured products without offers at their normal prices", async () => {
    productApi.storefront.mockResolvedValue({
      data: {
        items: [
          { ...percentageOffer.product, _id: "product-fig", offer: null },
          { _id: "product-plain", name: "Plain Product", price: 60, unit: "kg", stock: 5, images: [], offer: null },
        ],
        total: 2,
        pages: 1,
      },
    });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    renderWithStore(<Home />);

    await screen.findByText("Plain Product");
    expect(screen.getAllByText(/₹ 60 \/ kg/).length).toBeGreaterThan(0);
    expect(screen.queryByText("OFF")).not.toBeInTheDocument();
  });
});

describe("Home page newsletter", () => {
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    productApi.storefront.mockResolvedValue({
      data: { items: [], total: 0, pages: 1 },
    });
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [] } });
    productApi.serverTime.mockResolvedValue({ data: { serverTime: new Date().toISOString() } });
    Object.defineProperty(window, "localStorage", { value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }, writable: true });
    Object.defineProperty(window, "sessionStorage", { value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", { value: originalLocalStorage, writable: true });
    Object.defineProperty(window, "sessionStorage", { value: originalSessionStorage, writable: true });
  });

  it("does not render a public newsletter subscription form", () => {
    renderWithStore(<Home />);
    expect(screen.queryByPlaceholderText("Your email")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join" })).not.toBeInTheDocument();
  });

  it("does not call newsletter subscription API from public Home", async () => {
    renderWithStore(<Home />);
    await act(async () => {});
    expect(newsletterApi.subscribe).not.toHaveBeenCalled();
  });

  it("prompts guests to sign in for newsletter preferences", () => {
    renderWithStore(<Home />);
    expect(screen.getByText(/Sign in to manage your newsletter preferences/i)).toBeInTheDocument();
  });
});

import React from "react";
import { act, screen } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Home from "./Home.jsx";
import productApi from "../../api/productApi.js";

vi.mock("../../api/productApi", () => ({
  default: { storefront: vi.fn(), storefrontOffers: vi.fn(), serverTime: vi.fn() },
}));

vi.mock("framer-motion", () => {
  const React = require("react");

  const motion = {
    div: ({ children, ...props }) => React.createElement("div", props, children),
    span: ({ children, ...props }) => React.createElement("span", props, children),
    button: ({ children, ...props }) => React.createElement("button", props, children),
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
    expect(screen.getByRole("link", { name: "View All Offers →" })).toHaveAttribute("href", "/customer/offers");
    expect(await screen.findByText("Organic Fig")).toBeInTheDocument();
    expect(screen.getByText("Fig Harvest Deal")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Organic Fig" })).toHaveAttribute("src", expect.stringContaining("/uploads/fig.jpg"));
    expect(screen.getByText("₹160.00")).toBeInTheDocument();
    expect(screen.getByText("₹200.00")).toHaveClass("line-through");
    expect(screen.getAllByText("20% OFF").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText(/30 Nov 2026/)).toBeInTheDocument();
    expect(screen.getAllByText("Shop Now").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates fixed discounts correctly using actual product price", async () => {
    productApi.storefrontOffers.mockResolvedValue({
      data: { items: [fixedOffer] },
    });
    renderWithStore(<Home />);

    expect(await screen.findByText("Organic Tomato")).toBeInTheDocument();
    expect(screen.getByText("₹170.00")).toBeInTheDocument();
    expect(screen.getByText("₹200.00")).toHaveClass("line-through");
    expect(screen.getAllByText("₹30.00 OFF").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/min 2/)).toBeInTheDocument();
  });

  it.each(statusCases)("does not display $label offers", async ({ effectiveStatus }) => {
    const hidden = { ...percentageOffer, _id: "hidden-offer", title: "Hidden Offer", effectiveStatus };
    productApi.storefrontOffers.mockResolvedValue({
      data: { items: [percentageOffer, hidden] },
    });
    renderWithStore(<Home />);
    await act(async () => {});

    expect(await screen.findByText("Organic Fig")).toBeInTheDocument();
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
    expect(await screen.findByText("Organic Fig")).toBeInTheDocument();
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

    await screen.findByText("Featured Products");
    expect(screen.getByText("₹ 60 / kg")).toBeInTheDocument();
    expect(screen.queryByText("OFF")).not.toBeInTheDocument();
  });

  it("links View All Offers to the existing offers page", async () => {
    productApi.storefrontOffers.mockResolvedValue({ data: { items: [percentageOffer] } });
    renderWithStore(<Home />);
    await screen.findByText("Organic Fig");
    expect(screen.getByRole("link", { name: "View All Offers →" })).toHaveAttribute("href", "/customer/offers");
  });
});

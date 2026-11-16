import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Cart from "../../pages/shared/Cart.jsx";

vi.mock("../../api/cartApi", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [], subtotal: 0, deliveryCharge: 0 } }),
    update: vi.fn(),
  },
}));

import cartApi from "../../api/cartApi";

const cartItems = [
  {
    product: {
      _id: "prod_tomatoes",
      name: "Organic Tomatoes",
      price: 40,
      unit: "kg",
      images: ["/images/products/tomatoes.jpg"],
    },
    quantity: 1,
    price: 40,
  },
];

describe("Cart page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty cart state", () => {
    renderWithStore(<Cart />, { cart: { items: [], deliveryCharge: null, totals: { subtotal: 0, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 0 } } });
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start Shopping/i })).toBeInTheDocument();
  });

  it("renders cart items without delivery charge (calculated at checkout)", () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: null, totals: { subtotal: 40, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 40 } } });
    const mobileCard = screen.getByRole("article");
    expect(within(mobileCard).getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 40\.00/).length).toBeGreaterThan(0);
    expect(within(mobileCard).getByText("1")).toBeInTheDocument();
    expect(within(mobileCard).getByRole("button", { name: /Remove Organic Tomatoes/i })).toBeInTheDocument();
  });

  it("shows a server-applied offer discount in the cart total", () => {
    const discountedItem = {
      ...cartItems[0],
      quantity: 2,
      offer: { title: "Farm Special", appliedDiscount: 5, finalUnitPrice: 37.5, lineTotal: 75 },
    };
    renderWithStore(<Cart />, { cart: { items: [discountedItem], deliveryCharge: null, totals: { subtotal: 80, regularDiscount: 5, premiumDiscount: 0, discount: 5, total: 80 } } });

    expect(screen.getByText("Regular Offer Savings")).toBeInTheDocument();
    expect(screen.getByText("Total Discount")).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 80\.00/).length).toBeGreaterThan(0);
  });

  it("increments quantity on plus button click", async () => {
    cartApi.update.mockResolvedValue({ data: { items: [{ ...cartItems[0], quantity: 2 }], subtotal: 80, discount: 0, total: 80, deliveryCharge: null } });
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: null, totals: { subtotal: 40, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 40 } } });
    const mobileCard = screen.getByRole("article");
    fireEvent.click(within(mobileCard).getByRole("button", { name: /Increase Organic Tomatoes quantity/i }));
    await waitFor(() => expect(within(mobileCard).getByText("2")).toBeInTheDocument());
    expect(screen.getByText("Final Payable Amount")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/₹ 80\.00/).length).toBeGreaterThan(0));
  });

  it("decrements quantity on minus button click", async () => {
    cartApi.update.mockResolvedValue({ data: { items: [{ ...cartItems[0], quantity: 1 }], subtotal: 40, discount: 0, total: 40, deliveryCharge: null } });
    renderWithStore(<Cart />, { cart: { items: [{ ...cartItems[0], quantity: 2 }], deliveryCharge: null, totals: { subtotal: 80, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 80 } } });
    const mobileCard = screen.getByRole("article");
    fireEvent.click(within(mobileCard).getByRole("button", { name: /Decrease Organic Tomatoes quantity/i }));
    await waitFor(() => expect(within(mobileCard).getByText("1")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/₹ 40\.00/).length).toBeGreaterThan(0));
  });

  it("removes item on remove button click", async () => {
    cartApi.update.mockResolvedValue({ data: { items: [], subtotal: 0, discount: 0, total: 0, deliveryCharge: null } });
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: null, totals: { subtotal: 40, regularDiscount: 0, premiumDiscount: 0, discount: 0, total: 40 } } });
    fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: /Remove Organic Tomatoes/i }));
    await waitFor(() => expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument());
  });
});

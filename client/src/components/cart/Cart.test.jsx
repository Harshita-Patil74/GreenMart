import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Cart from "../../pages/shared/Cart.jsx";

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
  it("renders empty cart state", () => {
    renderWithStore(<Cart />, { cart: { items: [], deliveryCharge: 30 } });
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start Shopping/i })).toBeInTheDocument();
  });

  it("renders cart items with quantity controls and remove", () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: 30 } });
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
    renderWithStore(<Cart />, { cart: { items: [discountedItem], deliveryCharge: 30 } });

    expect(screen.getByText("Regular Offer Savings")).toBeInTheDocument();
    expect(screen.getByText("Total Discount")).toBeInTheDocument();
    expect(screen.getByText("₹ 105.00")).toBeInTheDocument();
  });

  it("increments quantity on plus button click", async () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: 30 } });
    const mobileCard = screen.getByRole("article");
    fireEvent.click(within(mobileCard).getByRole("button", { name: /Increase Organic Tomatoes quantity/i }));
    await waitFor(() => expect(within(mobileCard).getByText("2")).toBeInTheDocument());
    expect(screen.getByText("Final Payable Amount")).toBeInTheDocument();
    expect(screen.getByText("₹ 110.00")).toBeInTheDocument();
  });

  it("decrements quantity on minus button click", async () => {
    renderWithStore(<Cart />, { cart: { items: [{ ...cartItems[0], quantity: 2 }], deliveryCharge: 30 } });
    const mobileCard = screen.getByRole("article");
    fireEvent.click(within(mobileCard).getByRole("button", { name: /Decrease Organic Tomatoes quantity/i }));
    await waitFor(() => expect(within(mobileCard).getByText("1")).toBeInTheDocument());
    expect(screen.getByText("₹ 70.00")).toBeInTheDocument();
  });

  it("removes item on remove button click", async () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: 30 } });
    fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: /Remove Organic Tomatoes/i }));
    await waitFor(() => expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument());
  });
});

import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 40/).length).toBeGreaterThan(0);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove Organic Tomatoes/i })).toBeInTheDocument();
  });

  it("increments quantity on plus button click", async () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: 30 } });
    const buttons = screen.getAllByRole("button", { name: /Increase Organic Tomatoes quantity/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("decrements quantity on minus button click", async () => {
    renderWithStore(<Cart />, { cart: { items: [{ ...cartItems[0], quantity: 2 }], deliveryCharge: 30 } });
    const buttons = screen.getAllByRole("button", { name: /Decrease Organic Tomatoes quantity/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("removes item on remove button click", async () => {
    renderWithStore(<Cart />, { cart: { items: cartItems, deliveryCharge: 30 } });
    fireEvent.click(screen.getByRole("button", { name: /Remove Organic Tomatoes/i }));
    await waitFor(() => expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument());
  });
});

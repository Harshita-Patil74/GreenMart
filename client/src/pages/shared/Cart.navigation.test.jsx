import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import authReducer from "../../features/auth/authSlice.js";
import cartReducer from "../../features/cart/cartSlice.js";
import Cart from "../../pages/shared/Cart.jsx";

vi.mock("../../api/cartApi", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { items: [], subtotal: 0, deliveryCharge: 0 } }) },
}));
vi.mock("../../api/productApi", () => ({ default: { list: vi.fn().mockResolvedValue({ data: { items: [] } }) } }));

describe("Cart navigation", () => {
  it("navigates to checkout when Proceed is clicked", async () => {
    const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer }, preloadedState: { auth: { token: "t", user: { role: "customer" } }, cart: { items: [{ product: { _id: "p1", name: "P", price: 10 }, quantity: 1 }], subtotal: 10, deliveryCharge: 0, loaded: true, loading: false } } });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/cart"]}>
          <Routes>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<div>Checkout Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    const btn = await screen.findByText(/Proceed to Checkout/i);
    fireEvent.click(btn);
    expect(await screen.findByText("Checkout Page")).toBeInTheDocument();
  });
});

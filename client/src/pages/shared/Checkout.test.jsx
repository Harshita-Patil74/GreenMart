import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Checkout from "./Checkout.jsx";

vi.mock("../../api/addressApi.js", () => ({
  default: { list: vi.fn(), create: vi.fn() },
}));
vi.mock("../../api/orderApi.js", () => ({
  default: { create: vi.fn() },
}));

import addressApi from "../../api/addressApi.js";
import orderApi from "../../api/orderApi.js";

describe("Checkout page", () => {
  const preloaded = {
    auth: { user: { name: "Customer", email: "customer@example.test", role: "customer" }, token: "test-token" },
    cart: {
      items: [{ product: { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg" }, quantity: 2, price: 40 }],
      deliveryCharge: 30,
      loaded: true,
    },
  };
  const addresses = [{ _id: "address-a", name: "Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100" }];

  beforeEach(() => {
    vi.clearAllMocks();
    addressApi.list.mockResolvedValue({ data: addresses });
    orderApi.create.mockResolvedValue({ data: { _id: "order-a" } });
  });

  it("renders saved delivery address, supported payment method, and summary", async () => {
    renderWithStore(<Checkout />, preloaded);
    expect(screen.getByText(/Delivery Address/i)).toBeInTheDocument();
    expect(await screen.findByText("1 Market Road, Gadag")).toBeInTheDocument();
    expect(screen.getByText(/Cash on Delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeInTheDocument();
  });

  it("shows the backend-applied offer discount in the checkout summary", async () => {
    const discounted = {
      ...preloaded,
      cart: {
        ...preloaded.cart,
        items: [{
          product: { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg" },
          quantity: 2,
          offer: { title: "Farm Special", appliedDiscount: 5, finalUnitPrice: 37.5, lineTotal: 75 },
        }],
      },
    };
    renderWithStore(<Checkout />, discounted);

    expect(await screen.findByText("Offer savings")).toBeInTheDocument();
    expect(screen.getByText("₹ 105")).toBeInTheDocument();
  });

  it("creates a real order with the selected address and clears the cart after success", async () => {
    const { store } = renderWithStore(<Checkout />, preloaded);
    const placeOrder = await screen.findByRole("button", { name: /Place Order/i });
    await waitFor(() => expect(placeOrder).toBeEnabled());
    fireEvent.click(placeOrder);
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith({
      address: { name: "Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100" },
      paymentMethod: "cod",
      paymentConfirmed: false,
    }));
    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
  });
});

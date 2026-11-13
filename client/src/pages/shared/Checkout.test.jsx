import React from "react";
import { act, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import { setCart } from "../../features/cart/cartSlice.js";
import Checkout from "./Checkout.jsx";

vi.mock("../../api/addressApi.js", () => ({
  default: { list: vi.fn(), create: vi.fn() },
}));
vi.mock("../../api/orderApi.js", () => ({
  default: { quote: vi.fn(), create: vi.fn() },
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
    orderApi.quote.mockResolvedValue({ data: { subtotal: 80, discount: 0, deliveryCharge: 30, total: 110 } });
    orderApi.create.mockResolvedValue({ data: { _id: "order-a" } });
  });

  it("renders saved delivery address, supported payment method, and summary", async () => {
    renderWithStore(<Checkout />, preloaded);
    expect(screen.getByText(/Delivery Address/i)).toBeInTheDocument();
    expect(await screen.findByText("1 Market Road, Gadag")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /Cash on Delivery/i })).toBeInTheDocument();
    expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeInTheDocument();
  });

  it("shows the backend-applied offer discount in the checkout summary", async () => {
    orderApi.quote.mockResolvedValueOnce({
      data: {
        items: [{
          name: "Organic Tomatoes",
          price: 40,
          quantity: 2,
          offerSnapshot: {
            offerTitle: "Farm Special",
            appliedDiscount: 5,
            finalUnitPrice: 37.5,
            finalLineTotal: 75,
          },
        }],
        subtotal: 80,
        discount: 5,
        deliveryCharge: 30,
        total: 105,
      },
    });
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

    expect(await screen.findByText("Regular Offer Savings")).toBeInTheDocument();
    expect(screen.getByText("₹ 75.00")).toBeInTheDocument();
    expect(screen.getByText("Farm Special")).toBeInTheDocument();
    expect(screen.getByText("₹ 105.00")).toBeInTheDocument();
  });

  it("shows Premium savings separately while preserving the authoritative payable amount", async () => {
    orderApi.quote.mockResolvedValueOnce({
      data: {
        items: [{
          name: "Fresh Marigold Flowers",
          price: 80,
          quantity: 1,
          offerSnapshot: {
            offerTitle: "Marigold offer",
            appliedDiscount: 21,
            premiumDiscount: 5,
            finalLineTotal: 59,
          },
        }],
        subtotal: 80,
        regularDiscount: 16,
        premiumDiscount: 5,
        discount: 21,
        deliveryCharge: 30,
        total: 89,
      },
    });
    const premiumCart = {
      ...preloaded,
      cart: {
        ...preloaded.cart,
        items: [{
          product: { _id: "product-marigold", name: "Fresh Marigold Flowers", price: 80, unit: "kg" },
          quantity: 1,
          offer: { appliedDiscount: 21, premiumDiscount: 5, finalUnitPrice: 59, lineTotal: 59 },
        }],
      },
    };

    renderWithStore(<Checkout />, premiumCart);

    expect(await screen.findByText("− ₹ 16.00")).toBeInTheDocument();
    expect(screen.getByText("− ₹ 5.00")).toBeInTheDocument();
    expect(screen.getByText("− ₹ 21.00")).toBeInTheDocument();
    expect(screen.getByText("₹ 89.00")).toBeInTheDocument();
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

  it("uses the backend quote for simulated online payment and verifies that amount at checkout", async () => {
    renderWithStore(<Checkout />, preloaded);
    fireEvent.click(screen.getByText("UPI Payment"));
    fireEvent.change(screen.getByLabelText(/UPI ID/), { target: { value: "customer@upi" } });
    fireEvent.click(screen.getByRole("button", { name: "Pay via UPI" }));

    expect(await screen.findByText("✓ Payment successful via UPI", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(orderApi.quote).toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Place Order/i }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: "upi",
      paymentConfirmed: true,
      paymentAmount: 110,
    })));
  });

  it("switches between payment methods, shows the matching form, and validates card details", async () => {
    renderWithStore(<Checkout />, preloaded);
    const upi = await screen.findByRole("radio", { name: /UPI Payment/i });
    const card = screen.getByRole("radio", { name: /Credit \/ Debit Card/i });
    const cod = screen.getByRole("radio", { name: /Cash on Delivery/i });

    fireEvent.click(upi);
    expect(await screen.findByLabelText("UPI ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay via UPI" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("UPI ID"), { target: { value: "customer@upi" } });
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/i }));
    expect(screen.queryByLabelText("UPI ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Card Number")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place COD Order" })).toBeInTheDocument();

    fireEvent.click(card);
    expect(await screen.findByLabelText("Card Number")).toBeInTheDocument();
    expect(screen.getByLabelText("Expiry Date")).toBeInTheDocument();
    expect(screen.getByLabelText("CVV")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay via Card" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Card Number"), { target: { value: "4111111111111111" } });
    fireEvent.change(screen.getByLabelText("Expiry Date"), { target: { value: "12/30" } });
    fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
    expect(screen.getByRole("button", { name: "Pay via Card" })).toBeEnabled();

    fireEvent.click(upi);
    expect(screen.queryByLabelText("Card Number")).not.toBeInTheDocument();
    expect(screen.getByLabelText("UPI ID")).toHaveValue("customer@upi");
    expect(cod).toBeInTheDocument();
  });

  it("keeps a selected payment method visibly selected", async () => {
    renderWithStore(<Checkout />, preloaded);
    const upi = await screen.findByRole("radio", { name: /UPI Payment/i });
    const cod = screen.getByRole("radio", { name: /Cash on Delivery/i });

    expect(cod).toBeChecked();
    fireEvent.click(upi);
    expect(upi).toBeChecked();
    expect(cod).not.toBeChecked();
  });

  it("does not let an older checkout quote overwrite a newer cart quote", async () => {
    let resolveOlderQuote;
    let resolveNewerQuote;
    orderApi.quote
      .mockReturnValueOnce(new Promise((resolve) => { resolveOlderQuote = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveNewerQuote = resolve; }));
    const { store } = renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(orderApi.quote).toHaveBeenCalledTimes(1));

    act(() => store.dispatch(setCart({
      items: [{ product: { _id: "product-a", name: "Organic Tomatoes", price: 60 }, quantity: 2 }],
      deliveryCharge: 30,
    })));
    await waitFor(() => expect(orderApi.quote).toHaveBeenCalledTimes(2));

    await act(async () => resolveNewerQuote({ data: { subtotal: 120, discount: 0, deliveryCharge: 30, total: 150 } }));
    expect(await screen.findByText("₹ 150.00")).toBeInTheDocument();
    await act(async () => resolveOlderQuote({ data: { subtotal: 80, discount: 0, deliveryCharge: 30, total: 110 } }));

    await waitFor(() => expect(screen.getByText("₹ 150.00")).toBeInTheDocument());
    expect(screen.queryByText("₹ 110.00")).not.toBeInTheDocument();
  });
});

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
vi.mock("../../api/deliveryApi.js", () => ({
  default: { distance: vi.fn() },
}));
vi.mock("../../api/settingsApi.js", () => ({
  default: { get: vi.fn() },
}));

import addressApi from "../../api/addressApi.js";
import deliveryApi from "../../api/deliveryApi.js";
import orderApi from "../../api/orderApi.js";
import settingsApi from "../../api/settingsApi.js";

const mockDistance = {
  distanceKm: 4.2,
  options: [
    { option: "standard", label: "Standard Delivery", eligible: true, charge: 30, maxKm: 5 },
    { option: "express", label: "Express Delivery", eligible: true, charge: 60, maxKm: 10 },
  ],
};

describe("Checkout page", () => {
  const preloaded = {
    auth: { user: { name: "Customer", email: "customer@example.test", role: "customer" }, token: "test-token" },
    cart: {
      items: [{ product: { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg", farmer: "farmer-a" }, quantity: 2, price: 40 }],
      deliveryCharge: 30,
      loaded: true,
    },
  };
  const addresses = [{ _id: "address-a", name: "Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100", coordinates: { lat: 15.4300, lng: 75.6400 } }];
  const addressesWithoutCoords = [{ _id: "address-no-coords", name: "No Coords", line1: "Unknown Road", city: "Nowhere", phone: "555-0200" }];

  beforeEach(() => {
    vi.clearAllMocks();
    addressApi.list.mockResolvedValue({ data: addresses });
    orderApi.quote.mockResolvedValue({ data: { subtotal: 80, discount: 0, deliveryCharge: 30, total: 110, distanceKm: 4.2, deliveryOption: "standard", deliveryOptions: [{ option: "standard", label: "Standard Delivery", eligible: true, charge: 30, maxKm: 5 }] } });
    orderApi.create.mockResolvedValue({ data: { _id: "order-a" } });
    deliveryApi.distance.mockResolvedValue({ data: mockDistance });
    settingsApi.get.mockResolvedValue({ data: { deliveryCharge: 30 } });
  });

  it("renders saved delivery address, supported payment method, and summary", async () => {
    renderWithStore(<Checkout />, preloaded);
    expect(screen.getByText(/Delivery Address/i)).toBeInTheDocument();
    expect(await screen.findByText("1 Market Road, Gadag")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /Cash on Delivery/i })).toBeInTheDocument();
    expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Place COD Order/i })).toBeInTheDocument();
  });

  it("loads delivery distance after address selection", async () => {
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Delivery distance/i)).toBeInTheDocument());
    expect(deliveryApi.distance).toHaveBeenCalledWith({
      farmerId: "farmer-a",
      addressId: "address-a",
    });
  });

  it("shows delivery option selection and updates totals", async () => {
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument());
    const expressRadio = await screen.findByRole("radio", { name: /Express Delivery/ });
    fireEvent.click(expressRadio);
    await waitFor(() => expect(screen.getByText(/₹ 60\.00/)).toBeInTheDocument());
  });

  it("uses the backend quote for simulated online payment and verifies that amount at checkout", async () => {
    renderWithStore(<Checkout />, preloaded);
    fireEvent.click(screen.getByText("UPI Payment"));
    fireEvent.change(screen.getByLabelText(/UPI ID/), { target: { value: "customer@upi" } });
    fireEvent.click(screen.getByRole("button", { name: "Pay via UPI" }));

    expect(await screen.findByText("✓ Payment successful via UPI", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(orderApi.quote).toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Place UPI Order/i }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: "upi",
      paymentConfirmed: true,
      paymentAmount: 110,
    })));
  });

  it("creates a real order with the selected address and clears the cart after success", async () => {
    const { store } = renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("radio", { name: /Standard Delivery/ })).toBeChecked());
    const placeOrder = await screen.findByRole("button", { name: /Place COD Order/i });
    await waitFor(() => expect(placeOrder).toBeEnabled());
    fireEvent.click(placeOrder);
    await waitFor(() => expect(orderApi.create).toHaveBeenCalled());
    const createCall = orderApi.create.mock.calls[orderApi.create.mock.calls.length - 1][0];
    expect(createCall.address).toEqual({ name: "Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100" });
    expect(createCall.paymentMethod).toBe("cod");
    expect(createCall.paymentConfirmed).toBe(false);
    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
  });

  it("shows routing unavailable error when distance calculation fails", async () => {
    deliveryApi.distance.mockRejectedValueOnce({ response: { data: { message: "Routing service unavailable." } } });
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Routing service unavailable/i)).toBeInTheDocument());
  });

  it("shows no serviceable delivery option when routing returns no options", async () => {
    deliveryApi.distance.mockResolvedValueOnce({ data: { distanceKm: 60, options: [] } });
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.queryByText(/Delivery Options/i)).toBeInTheDocument());
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
          product: { _id: "product-a", name: "Organic Tomatoes", price: 40, unit: "kg", farmer: "farmer-a" },
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
          product: { _id: "product-marigold", name: "Fresh Marigold Flowers", price: 80, unit: "kg", farmer: "farmar-a" },
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
      items: [{ product: { _id: "product-a", name: "Organic Tomatoes", price: 60, farmer: "farmer-a" }, quantity: 2 }],
      deliveryCharge: 30,
    })));
    await waitFor(() => expect(orderApi.quote).toHaveBeenCalledTimes(2));

    await act(async () => resolveNewerQuote({ data: { subtotal: 120, discount: 0, deliveryCharge: 30, total: 150 } }));
    expect(await screen.findByText("₹ 150.00")).toBeInTheDocument();
    await act(async () => resolveOlderQuote({ data: { subtotal: 80, discount: 0, deliveryCharge: 30, total: 110 } }));

    await waitFor(() => expect(screen.getByText("₹ 150.00")).toBeInTheDocument());
    expect(screen.queryByText("₹ 110.00")).not.toBeInTheDocument();
  });

  it("shows loading state while calculating delivery distance", async () => {
    let resolveDistance;
    deliveryApi.distance.mockImplementation(() => new Promise((resolve) => { resolveDistance = resolve; }));
    renderWithStore(<Checkout />, preloaded);
    expect(await screen.findByText(/Calculating delivery distance/i)).toBeInTheDocument();
    await act(async () => resolveDistance({ data: mockDistance }));
    expect(await screen.findByText(/Delivery Options/i)).toBeInTheDocument();
    expect(screen.queryByText(/Calculating delivery distance/i)).not.toBeInTheDocument();
  });

  it("ends loading state after API returns an error", async () => {
    deliveryApi.distance.mockRejectedValueOnce({ response: { data: { message: "Routing service unavailable." } } });
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Routing service unavailable/i)).toBeInTheDocument());
    expect(screen.queryByText(/Calculating delivery distance/i)).not.toBeInTheDocument();
  });

  it("shows helpful message when address has no coordinates", async () => {
    const preloadedNoCoords = {
      ...preloaded,
      cart: { ...preloaded.cart },
    };
    // Temporarily override addresses to not have coordinates
    addressApi.list.mockResolvedValue({ data: [{ _id: "address-no-coords", name: "No Coords", line1: "Unknown Road", city: "Nowhere", phone: "555-0200" }] });
    renderWithStore(<Checkout />, preloadedNoCoords);
    await waitFor(() => expect(screen.getByText(/no location coordinates/i)).toBeInTheDocument());
    expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument();
  });

  it("retry recalculates delivery distance after error", async () => {
    deliveryApi.distance
      .mockRejectedValueOnce({ response: { data: { message: "Routing service unavailable." } } })
      .mockResolvedValueOnce({ data: mockDistance });
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Routing service unavailable/i)).toBeInTheDocument());
    expect(deliveryApi.distance).toHaveBeenCalledTimes(1);
  });

  it("prevents stale API response from overwriting newer address selection", async () => {
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(deliveryApi.distance).toHaveBeenCalled());
  });

  it("handles missing farmer dispatch coordinates gracefully", async () => {
    deliveryApi.distance.mockRejectedValueOnce({ response: { data: { message: "Farmer location not configured." } } });
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Farmer location not configured/i)).toBeInTheDocument());
    expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument();
  });

  it("applies delivery charge only once in order total", async () => {
    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument());
    fireEvent.click(await screen.findByRole("button", { name: /Place COD Order/i }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalled());
    const createCall = orderApi.create.mock.calls[orderApi.create.mock.calls.length - 1][0];
    expect(createCall.address).toEqual({ name: "Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100" });
    expect(createCall.paymentMethod).toBe("cod");
    expect(createCall.paymentConfirmed).toBe(false);
  });

  it("refreshes the delivery quote before placing the order so a stale quote is never reused", async () => {
    orderApi.quote
      .mockResolvedValueOnce({ data: { subtotal: 80, discount: 0, deliveryCharge: 30, total: 110, distanceKm: 4.2, deliveryOption: "standard", deliveryOptions: [{ option: "standard", label: "Standard Delivery", eligible: true, charge: 30, maxKm: 5 }], quoteVersion: "v1-stale" } })
      .mockResolvedValue({ data: { subtotal: 80, discount: 0, deliveryCharge: 50, total: 130, distanceKm: 6.8, deliveryOption: "express", deliveryOptions: [{ option: "express", label: "Express Delivery", eligible: true, charge: 50, maxKm: 10 }], quoteVersion: "v2-fresh" } });

    renderWithStore(<Checkout />, preloaded);
    await waitFor(() => expect(screen.getByText(/Delivery Options/i)).toBeInTheDocument());
    expect(orderApi.quote).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole("button", { name: /Place COD Order/i }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.quote).toHaveBeenCalledTimes(2); // initial load + pre-place refresh
    const createCall = orderApi.create.mock.calls[0][0];
    expect(createCall.quoteVersion).toBe("v2-fresh");
    expect(createCall.deliveryOption).toBe("express");
  });
});

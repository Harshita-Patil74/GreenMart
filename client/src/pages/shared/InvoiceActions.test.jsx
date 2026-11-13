import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import orderApi from "../../api/orderApi";
import OrderDetails from "./OrderDetails.jsx";
import MyOrders from "../customer/MyOrders.jsx";

vi.mock("../../api/orderApi", () => ({
  default: {
    get: vi.fn(),
    mine: vi.fn(),
    downloadInvoice: vi.fn(),
  },
}));

const order = {
  _id: "order-1",
  orderNumber: "GM123456",
  createdAt: "2026-10-30T09:00:00.000Z",
  status: "Order Placed",
  paymentMethod: "Cash on Delivery",
  items: [{ name: "Organic Figs", quantity: 1, price: 60 }],
  total: 90,
  address: { name: "Test Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0100" },
};

const preloadedState = {
  auth: { user: { _id: "customer-1", name: "Test Customer", role: "customer" }, token: "test-token" },
  cart: { items: [], deliveryCharge: 30 },
};

describe("customer invoice actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderApi.get.mockResolvedValue({ data: order });
    orderApi.mine.mockResolvedValue({ data: [order] });
  });

  it("shows one Download Invoice action and no View Invoice action on order details", async () => {
    renderWithStore(<OrderDetails />, preloadedState);

    await screen.findByText("Order GM123456");
    expect(screen.getAllByRole("button", { name: /Download Invoice/i })).toHaveLength(1);
    expect(screen.queryByText("View Invoice")).not.toBeInTheDocument();
  });

  it("shows the saved discounted line and order totals", async () => {
    orderApi.get.mockResolvedValueOnce({
      data: {
        ...order,
        subtotal: 1998,
        discount: 199.8,
        deliveryCharge: 30,
        total: 1828.2,
        items: [{
          name: "Organic Figs",
          quantity: 2,
          price: 999,
          offerSnapshot: {
            offerTitle: "10% off",
            appliedDiscount: 199.8,
            finalUnitPrice: 899.1,
            finalLineTotal: 1798.2,
          },
        }],
      },
    });
    renderWithStore(<OrderDetails />, preloadedState);

    expect(await screen.findByText("₹ 1,798.20")).toBeInTheDocument();
    expect(screen.getByText("− ₹ 199.80")).toBeInTheDocument();
    expect(screen.getByText("₹ 1,828.20")).toBeInTheDocument();
  });

  it("shows one Download Invoice action and no View Invoice action in customer order history", async () => {
    renderWithStore(<MyOrders />, preloadedState);

    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledOnce());
    expect(await screen.findByText("#GM123456")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Download Invoice/i })).toHaveLength(1);
    expect(screen.queryByText("View Invoice")).not.toBeInTheDocument();
  });
});

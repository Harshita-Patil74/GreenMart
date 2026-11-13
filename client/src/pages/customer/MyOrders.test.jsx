import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import MyOrders from "./MyOrders.jsx";

vi.mock("../../api/orderApi", () => ({
  default: {
    mine: vi.fn(),
    downloadInvoice: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("../../socket/socketClient.js", () => ({
  subscribeOrderStatus: vi.fn(() => () => {}),
}));

vi.mock("../../utils/alertUtils", () => ({
  showConfirm: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

import orderApi from "../../api/orderApi";

const response = {
  data: {
    items: [{
      _id: "order-1",
      orderNumber: "GM-12345",
      createdAt: "2026-01-15T00:00:00.000Z",
      total: 25,
      status: "Order Placed",
      items: [{ name: "Tomato Soup" }],
    }],
    total: 1,
    page: 1,
    pages: 1,
    limit: 10,
  },
};

describe("Customer My Orders search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderApi.mine.mockResolvedValue(response);
  });

  it("debounces a complete multi-word query and keeps the input mounted while loading", async () => {
    renderWithStore(<MyOrders />);
    const search = await screen.findByRole("searchbox", { name: "Search orders" });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(1));

    fireEvent.change(search, { target: { value: "Tomato" } });
    fireEvent.change(search, { target: { value: "Tomato Soup" } });
    expect(search).toHaveValue("Tomato Soup");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(orderApi.mine).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({
      search: "Tomato Soup",
      page: 1,
    }));
    expect(screen.getByRole("searchbox", { name: "Search orders" })).toHaveValue("Tomato Soup");
  });

  it("submits a single-word query after the debounce delay", async () => {
    renderWithStore(<MyOrders />);
    const search = await screen.findByRole("searchbox", { name: "Search orders" });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(1));

    fireEvent.change(search, { target: { value: "Tomatoes" } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Tomatoes", page: 1 }));
  });

  it("shows a separate Product ID for each ordered product", async () => {
    orderApi.mine.mockResolvedValue({
      data: {
        items: [{
          ...response.data.items[0],
          items: [
            { name: "Tomato Soup", product: { _id: "product-a" } },
            { name: "Green Gram", product: { _id: "product-b" } },
          ],
        }],
        total: 1,
      },
    });

    renderWithStore(<MyOrders />);

    expect(await screen.findByText("Product ID: product-a")).toBeInTheDocument();
    expect(screen.getByText("Product ID: product-b")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Copy Product ID" })).toHaveLength(2);
  });

  it("trims surrounding whitespace, clears the query, and resets pagination on status changes", async () => {
    renderWithStore(<MyOrders />);
    const search = await screen.findByRole("searchbox", { name: "Search orders" });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(1));

    fireEvent.change(search, { target: { value: "  Tomato Soup  " } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Tomato Soup", page: 1 }));

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(3), { timeout: 1500 });
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "", page: 1 }));
    expect(screen.getByRole("searchbox", { name: "Search orders" })).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Delivered" }));
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(4));
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ status: "Delivered", page: 1 }));
  });

  it("ignores an older response after a newer search has started", async () => {
    let resolveOlder;
    let resolveNewer;
    orderApi.mine
      .mockResolvedValueOnce(response)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOlder = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewer = resolve; }));

    renderWithStore(<MyOrders />);
    const search = await screen.findByRole("searchbox", { name: "Search orders" });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(1));

    fireEvent.change(search, { target: { value: "first" } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(2), { timeout: 1500 });
    fireEvent.change(search, { target: { value: "second" } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(3), { timeout: 1500 });

    resolveOlder({ data: { ...response.data, items: [{ ...response.data.items[0], orderNumber: "SECOND-OLD-RESULT" }] } });
    resolveNewer({ data: { ...response.data, items: [{ ...response.data.items[0], orderNumber: "SECOND-NEW-RESULT" }] } });

    await waitFor(() => expect(screen.getByText("#SECOND-NEW-RESULT")).toBeInTheDocument());
    expect(screen.queryByText("#SECOND-OLD-RESULT")).not.toBeInTheDocument();
  });

  it("preserves the applied search when navigating pages and changing page size", async () => {
    orderApi.mine.mockResolvedValue({
      data: { ...response.data, total: 25, pages: 3 },
    });

    renderWithStore(<MyOrders />);
    const search = await screen.findByRole("searchbox", { name: "Search orders" });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(1));
    fireEvent.change(search, { target: { value: "Tomato Soup" } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Tomato Soup", page: 1 }));

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(3));
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Tomato Soup", page: 2 }));

    fireEvent.change(screen.getByRole("combobox", { name: "Page size" }), { target: { value: "20" } });
    await waitFor(() => expect(orderApi.mine).toHaveBeenCalledTimes(4));
    expect(orderApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Tomato Soup", page: 1, limit: 20 }));
  });
});

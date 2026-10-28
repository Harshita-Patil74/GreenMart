import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import orderApi from "../../api/orderApi";
import FarmerOrders from "./FarmerOrders.jsx";

const order = {
  _id: "order-1",
  orderNumber: "GM-1001",
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "Order Placed",
  items: [{ _id: "item-1", farmer: "farmer-1", name: "Tomatoes", price: 40, quantity: 1, fulfillmentStatus: "Order Placed" }],
};

function renderOrders() {
  const store = configureStore({ reducer: { auth: () => ({ user: { id: "farmer-1" } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <FarmerOrders />
      </MemoryRouter>
    </Provider>
  );
}

describe("Farmer order status management", () => {
  afterEach(() => vi.restoreAllMocks());

  it("offers only the next valid action and refreshes the order after success", async () => {
    vi.spyOn(orderApi, "farmer").mockResolvedValue({ data: [order] });
    vi.spyOn(orderApi, "updateStatus").mockResolvedValue({
      data: { ...order, status: "Packed", items: [{ ...order.items[0], fulfillmentStatus: "Packed" }] },
    });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: "View" }));
    expect(screen.getByRole("button", { name: "Mark as Packed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as Delivered" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark as Packed" }));

    await waitFor(() => expect(orderApi.updateStatus).toHaveBeenCalledWith("order-1", { status: "Packed", reason: "" }));
    await waitFor(() => expect(screen.getAllByText("Packed").length).toBeGreaterThan(0));
  });

  it("requires a reason before confirming a failed delivery", async () => {
    vi.spyOn(orderApi, "farmer").mockResolvedValue({
      data: [{ ...order, status: "Out for Delivery", items: [{ ...order.items[0], fulfillmentStatus: "Out for Delivery" }] }],
    });
    const update = vi.spyOn(orderApi, "updateStatus").mockResolvedValue({
      data: { ...order, status: "Delivery Failed", items: [{ ...order.items[0], fulfillmentStatus: "Delivery Failed", deliveryFailureReason: "Customer unavailable" }] },
    });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as Delivery Failed" }));
    const reason = screen.getByLabelText("Reason for failed delivery");
    expect(screen.getByRole("button", { name: "Confirm failure" })).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: "Customer unavailable" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm failure" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith("order-1", { status: "Delivery Failed", reason: "Customer unavailable" }));
  });
});

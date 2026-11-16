import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import orderApi from "../../api/orderApi";
import FarmerOrders from "./FarmerOrders.jsx";

vi.mock("../../utils/alertUtils", () => ({
  showConfirm: vi.fn().mockResolvedValue({ isConfirmed: true }),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

const order = {
  _id: "order-1",
  orderNumber: "GM-1001",
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "Order Placed",
  items: [{ _id: "item-1", farmer: "farmer-1", name: "Tomatoes", price: 40, quantity: 1, fulfillmentStatus: "Order Placed" }],
};

const orderWithDelivery = {
  _id: "order-1",
  orderNumber: "GM-1001",
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "Order Placed",
  address: { name: "Customer", line1: "Gokul Road", city: "Hubli", phone: "555-0100" },
  deliverySnapshot: {
    option: "Standard Delivery",
    distanceKm: 4.2,
    charge: 30,
    dispatchLocations: [
      { farmerId: "farmer-1", location: { lat: 15.43, lng: 75.64 }, distanceKm: 4.2 },
    ],
  },
  items: [{ _id: "item-1", farmer: "farmer-1", name: "Tomatoes", price: 40, quantity: 1, fulfillmentStatus: "Order Placed" }],
};

const orderWithoutDelivery = {
  _id: "order-2",
  orderNumber: "GM-1002",
  createdAt: "2026-10-02T00:00:00.000Z",
  status: "Order Placed",
  items: [{ _id: "item-2", farmer: "farmer-1", name: "Potatoes", price: 30, quantity: 2, fulfillmentStatus: "Order Placed" }],
};

function renderOrders(initialEntries = ["/farmer/orders"]) {
  const store = configureStore({ reducer: { auth: () => ({ user: { id: "farmer-1" } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
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

    fireEvent.click(await screen.findByRole("button", { name: /View/ }));
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

    fireEvent.click(await screen.findByRole("button", { name: /View/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as Delivery Failed" }));
    const reason = screen.getByLabelText("Reason for failed delivery");
    expect(screen.getByRole("button", { name: "Confirm failure" })).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: "Customer unavailable" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm failure" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith("order-1", { status: "Delivery Failed", reason: "Customer unavailable" }));
  });

  it("loads an order search passed from a notification link", async () => {
    const list = vi.spyOn(orderApi, "farmer").mockResolvedValue({ data: [order] });
    renderOrders(["/farmer/orders?search=GM-1001"]);

    await screen.findByText("GM-1001");
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ search: "GM-1001" })));
  });
});

describe("Farmer delivery information", () => {
  afterEach(() => vi.restoreAllMocks());

  it("displays delivery information for orders with snapshots", async () => {
    vi.spyOn(orderApi, "farmer").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: /View/ }));

    expect(await screen.findByText("Delivery & Shipment Information")).toBeInTheDocument();
    expect(screen.getByText("Customer Address")).toBeInTheDocument();
    expect(screen.getByText("Shipment Distance")).toBeInTheDocument();
    expect(screen.getByText("4.20 km")).toBeInTheDocument();
    expect(screen.getByText("Delivery Option")).toBeInTheDocument();
    expect(screen.getByText("Standard Delivery")).toBeInTheDocument();
    expect(screen.getByText("Delivery Charge")).toBeInTheDocument();
    expect(screen.getByText("₹30.00")).toBeInTheDocument();
    expect(screen.getByText("Dispatch Location")).toBeInTheDocument();
    expect(screen.getByText("15.43, 75.64")).toBeInTheDocument();
  });

  it("shows 'Delivery information unavailable' for orders without snapshots", async () => {
    vi.spyOn(orderApi, "farmer").mockResolvedValue({ data: [orderWithoutDelivery] });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: /View/ }));

    expect(screen.getByText("Delivery information unavailable for this order.")).toBeInTheDocument();
  });

  it("does not expose other farmers' dispatch details", async () => {
    const otherFarmerOrder = {
      ...orderWithDelivery,
      _id: "order-3",
      orderNumber: "GM-1003",
      deliverySnapshot: {
        option: "Express Delivery",
        distanceKm: 8.5,
        charge: 60,
        dispatchLocations: [
          { farmerId: "farmer-2", location: { lat: 16.5, lng: 74.5 }, distanceKm: 8.5 },
        ],
      },
    };
    vi.spyOn(orderApi, "farmer").mockResolvedValue({ data: [otherFarmerOrder] });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: /View/ }));

    // Should show the farmer-1 shipment (which doesn't exist for this order), so distance should be "—"
    expect(screen.queryByText("8.50 km")).not.toBeInTheDocument();
  });
});

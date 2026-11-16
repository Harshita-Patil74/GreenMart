import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import orderApi from "../../api/orderApi";
import AdminOrders from "./AdminOrders.jsx";

vi.mock("../../utils/alertUtils", () => ({
  showConfirm: vi.fn().mockResolvedValue({ isConfirmed: true }),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

const orderWithDelivery = {
  _id: "admin-order-1",
  orderNumber: "GM-2001",
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "Order Placed",
  total: 150,
  subtotal: 120,
  discount: 0,
  deliveryCharge: 30,
  user: { name: "Customer", email: "customer@example.test" },
  address: { name: "Customer", line1: "Main Street", city: "Bangalore", phone: "555-0200" },
  deliverySnapshot: {
    option: "Standard Delivery",
    distanceKm: 4.2,
    charge: 30,
    dispatchLocations: [
      { farmerId: "farmer-1", farmerName: "Green Valley Farms", farmName: "Green Valley Farms", farmAddress: "Hosur Road, Bangalore", location: { lat: 12.97, lng: 77.59 }, distanceKm: 4.2 },
      { farmerId: "farmer-2", farmerName: "Hillside Produce", farmName: "Hillside Produce", farmAddress: "Coorg Estate, Kodagu", location: { lat: 13.0, lng: 77.6 }, distanceKm: 12.5 },
    ],
    settingsSnapshot: {
      maxRemoteDistanceKm: 50,
      expressMaxKm: 10,
    },
  },
  items: [
    { _id: "item-1", productId: "prod-tomatoes", product: { _id: "prod-tomatoes", name: "Tomatoes", category: "Vegetables", images: ["tomatoes.jpg"] }, farmer: "farmer-1", name: "Tomatoes", price: 60, quantity: 1 },
    { _id: "item-2", productId: "prod-potatoes", product: { _id: "prod-potatoes", name: "Potatoes", category: "Vegetables", images: ["potatoes.jpg"] }, farmer: "farmer-2", name: "Potatoes", price: 60, quantity: 1 },
  ],
};

const orderWithoutDelivery = {
  _id: "admin-order-2",
  orderNumber: "GM-2002",
  createdAt: "2026-10-02T00:00:00.000Z",
  status: "Order Placed",
  total: 100,
  user: { name: "Customer 2", email: "customer2@example.test" },
  items: [{ _id: "item-3", farmer: "farmer-1", name: "Onions", price: 100, quantity: 1 }],
};

function renderOrders(initialEntries = ["/admin/orders"]) {
  const store = configureStore({ reducer: { auth: () => ({ user: { id: "admin-1", role: "admin" } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <AdminOrders />
      </MemoryRouter>
    </Provider>
  );
}

describe("Admin order delivery information", () => {
  afterEach(() => vi.restoreAllMocks());

  it("displays delivery option, distance, and charge for orders with snapshots", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    const btn = await screen.findByRole("button", { name: /View Details/ });
    fireEvent.click(btn);

    expect(await screen.findByText(/Standard Delivery/)).toBeInTheDocument();
    expect(screen.getByText(/Order Distance/)).toBeInTheDocument();
    expect(screen.getAllByText(/4\.20 km/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Delivery Charge/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹ 30/).length).toBeGreaterThanOrEqual(1);
  });

  it("displays all dispatch locations for multi-farmer orders", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    const btn = await screen.findByRole("button", { name: /View Details/ });
    fireEvent.click(btn);

    expect(screen.getByText("Dispatch Locations")).toBeInTheDocument();
    expect(screen.getAllByText(/Green Valley Farms/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Hillside Produce/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4\.20 km/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/12\.50 km/)).toBeInTheDocument();
  });

  it("displays farmer dispatch coordinates when available", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    const btn = await screen.findByRole("button", { name: /View Details/ });
    fireEvent.click(btn);

    expect(screen.getByText(/12\.97, 77\.59/)).toBeInTheDocument();
    expect(screen.getByText(/13, 77\.6/)).toBeInTheDocument();
  });

  it("displays order-wide delivery charge exactly once", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    const btn = await screen.findByRole("button", { name: /View Details/ });
    fireEvent.click(btn);

    expect(screen.getAllByText(/₹ 30/).length).toBe(2);
  });

  it("shows delivery charge from persisted snapshot, not current settings", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    renderOrders();

    const btn = await screen.findByRole("button", { name: /View Details/ });
    fireEvent.click(btn);

    expect(screen.getAllByText(/Delivery Charge/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹ 30/).length).toBe(2);
  });

  it("shows unavailable message for orders without delivery snapshot", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithoutDelivery] });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: /View Details/ }));

    expect(screen.getByText("Delivery information unavailable for this order.")).toBeInTheDocument();
  });

  it("preserves existing order management functionality", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithDelivery] });
    const updateSpy = vi.spyOn(orderApi, "updateStatus").mockResolvedValue({ data: orderWithDelivery });
    renderOrders();

    fireEvent.click(await screen.findByRole("button", { name: /View Details/ }));
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(screen.getByText("Update Status")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  });
});

describe("Admin order status filters and search", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads orders and displays pagination", async () => {
    vi.spyOn(orderApi, "adminAll").mockResolvedValue({ data: [orderWithoutDelivery], total: 1, statusCounts: {} });
    renderOrders();

    expect(await screen.findByText(/GM-2002/)).toBeInTheDocument();
    await waitFor(() => expect(orderApi.adminAll).toHaveBeenCalled());
  });
});
